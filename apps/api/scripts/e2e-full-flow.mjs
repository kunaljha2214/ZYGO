/**
 * End-to-end verification: food order + ride flows (API layer).
 * Usage: node scripts/e2e-full-flow.mjs [baseUrl]
 */
import crypto from 'node:crypto';
import 'dotenv/config';

const BASE = (process.argv[2] || 'http://localhost:4000/api/v1').replace(/\/$/, '');
const PASSWORD = 'password123';
const BANGALORE = { lat: 12.9716, lng: 77.5946 };
const KORAMANGALA = { lat: 12.9352, lng: 77.6245 };

const issues = [];
const passed = [];

function log(step, msg) {
  console.log(`  [${step}] ${msg}`);
}

function pass(step, msg) {
  passed.push({ step, msg });
  log(step, `✓ ${msg}`);
}

function fail(step, msg, detail) {
  issues.push({ step, msg, detail });
  log(step, `✗ ${msg}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function razorpaySignature(orderId, paymentId) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET missing');
  const body = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function login(phone) {
  const data = await req('POST', '/auth/login', { phone, password: PASSWORD });
  return { token: data.accessToken, user: data.user };
}

async function setPartnerLocation(token, lat, lng, prefix) {
  await req('PATCH', `/${prefix}/location`, { lat, lng }, token);
}

async function testFoodFlow() {
  console.log('\n=== FOOD ORDER FLOW ===');

  const customer = await login('9999999999');
  const shop = await login('9666666666');
  const rider = await login('9444444444');

  const riderWalletBefore = await req('GET', '/delivery-partner/wallet', null, rider.token);
  log('food', `Rider wallet before: pending=${riderWalletBefore.wallet?.pending ?? riderWalletBefore.pending}`);

  const shopRestaurant = await req('GET', '/shop/restaurant/mine', null, shop.token);
  const listingId = shopRestaurant?.registration?.restaurantListingId;
  if (!listingId) {
    fail('food', 'Shop owner has no linked restaurant listing');
    return;
  }

  const restaurants = await req('GET', '/restaurants', null, customer.token);
  const restaurant =
    restaurants.find((r) => (r.id || r._id)?.toString() === listingId.toString()) ?? null;
  if (!restaurant) {
    fail('food', `Shop restaurant listing ${listingId} not visible to customers`);
    return;
  }
  pass('food', `Using shop restaurant: ${restaurant.name}`);

  const detail = await req('GET', `/restaurants/${restaurant.id || restaurant._id}`, null, customer.token);
  const menu = detail.menu ?? detail.menuItems ?? [];
  const menuItem = menu.find((m) => m.isAvailable !== false) ?? menu[0];
  if (!menuItem) {
    fail('food', 'No menu items available');
    return;
  }

  const restCoords = detail.location?.coordinates
    ? { lat: detail.location.coordinates[1], lng: detail.location.coordinates[0] }
    : BANGALORE;

  const order = await req(
    'POST',
    '/orders',
    {
      restaurantId: restaurant.id || restaurant._id,
      items: [{ menuItemId: menuItem.id || menuItem._id, quantity: 1 }],
      deliveryAddress: {
        label: 'Home',
        line1: 'Koramangala 5th Block',
        coordinates: KORAMANGALA,
      },
    },
    customer.token
  );
  const orderId = order.id || order._id;
  pass('food', `Order created ${order.orderNumber} (payment_pending)`);

  const fakePaymentId = `pay_e2e_${Date.now()}`;
  const sig = razorpaySignature(order.payment.razorpayOrderId, fakePaymentId);
  await req(
    'POST',
    '/orders/payment/verify',
    {
      razorpay_order_id: order.payment.razorpayOrderId,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: sig,
    },
    customer.token
  );
  pass('food', 'Payment verified → status placed');

  await req('POST', `/shop/orders/${orderId}/accept`, { estimatedPrepMinutes: 15 }, shop.token);
  pass('food', 'Shop accepted order');

  await req('PATCH', `/shop/orders/${orderId}/status`, { status: 'preparing' }, shop.token);
  pass('food', 'Shop → preparing');

  await req('PATCH', `/shop/orders/${orderId}/status`, { status: 'ready_for_pickup' }, shop.token);
  pass('food', 'Shop → ready_for_pickup (dispatch started)');

  await req('PATCH', '/delivery-partner/online', { online: true }, rider.token);
  pass('food', 'Rider online');

  await new Promise((r) => setTimeout(r, 3000));

  let incoming;
  try {
    incoming = await req('GET', '/delivery-partner/incoming', null, rider.token);
  } catch (e) {
    fail('food', 'Rider did not receive dispatch request', e.message);
    return;
  }

  const incomingOrderId = incoming?.request?.orderId || incoming?.orderId;
  if (!incomingOrderId) {
    fail('food', 'No incoming delivery request for rider', JSON.stringify(incoming));
    return;
  }
  pass('food', `Rider received request for order ${incomingOrderId}`);

  await req('POST', `/delivery-partner/orders/${orderId}/accept`, {}, rider.token);
  pass('food', 'Rider accepted delivery');

  await setPartnerLocation(rider.token, restCoords.lat, restCoords.lng, 'delivery-partner');

  const deliveryStatuses = [
    'arriving_at_restaurant',
    'picked_up',
    'out_for_delivery',
    'arrived_at_customer',
  ];

  await req('POST', `/shop/orders/${orderId}/handoff`, {}, shop.token);
  pass('food', 'Shop confirmed handoff');

  for (const status of deliveryStatuses) {
    if (status === 'picked_up' || status === 'arriving_at_restaurant') {
      await setPartnerLocation(rider.token, restCoords.lat, restCoords.lng, 'delivery-partner');
    }
    if (status === 'arrived_at_customer') {
      await setPartnerLocation(rider.token, KORAMANGALA.lat, KORAMANGALA.lng, 'delivery-partner');
    }
    await req('PATCH', `/delivery-partner/orders/${orderId}/status`, { status }, rider.token);
    pass('food', `Rider status → ${status}`);
    await new Promise((r) => setTimeout(r, 500));
  }

  const customerOrder = await req('GET', `/orders/${orderId}`, null, customer.token);
  const otp = customerOrder.deliveryOtp;
  if (!otp) {
    fail('food', 'Customer order missing delivery OTP');
    return;
  }
  pass('food', `Delivery OTP generated: ${otp}`);

  await req('POST', `/delivery-partner/orders/${orderId}/otp/verify`, { otp }, rider.token);
  pass('food', 'Delivery OTP verified');

  await setPartnerLocation(rider.token, KORAMANGALA.lat, KORAMANGALA.lng, 'delivery-partner');
  await req('PATCH', `/delivery-partner/orders/${orderId}/status`, { status: 'delivered' }, rider.token);
  pass('food', 'Order delivered');

  const finalOrder = await req('GET', `/orders/${orderId}`, null, customer.token);
  if (finalOrder.status !== 'delivered') {
    fail('food', 'Final order status not delivered', finalOrder.status);
  } else {
    pass('food', 'Final order status: delivered');
  }

  const riderWalletAfter = await req('GET', '/delivery-partner/wallet', null, rider.token);
  const pendingBefore = riderWalletBefore.wallet?.pending ?? riderWalletBefore.pending ?? 0;
  const pendingAfter = riderWalletAfter.wallet?.pending ?? riderWalletAfter.pending ?? 0;
  if (pendingAfter <= pendingBefore) {
    fail('food', 'Rider wallet not credited after delivery', `before=${pendingBefore} after=${pendingAfter}`);
  } else {
    pass('food', `Rider wallet credited: ${pendingBefore} → ${pendingAfter}`);
  }
}

async function testRideFlow() {
  console.log('\n=== RIDE BOOKING FLOW ===');

  const customer = await login('9999999999');
  const driver = await login('9222222222');

  const driverWalletBefore = await req('GET', '/driver/wallet', null, driver.token);
  log('ride', `Driver wallet before: pending=${driverWalletBefore.wallet?.pending ?? driverWalletBefore.pending}`);

  await req(
    'PATCH',
    '/driver/online',
    { online: true, lat: BANGALORE.lat, lng: BANGALORE.lng },
    driver.token
  );
  pass('ride', 'Driver online');

  const ride = await req(
    'POST',
    '/rides',
    {
      pickup: { line1: 'MG Road', coordinates: BANGALORE },
      drop: { line1: 'Koramangala', coordinates: KORAMANGALA },
      vehicleType: 'bike',
    },
    customer.token
  );
  const rideId = ride.id || ride._id;
  pass('ride', `Ride created ${rideId}`);

  await new Promise((r) => setTimeout(r, 3000));

  const incoming = await req('GET', '/driver/incoming', null, driver.token);
  if (!incoming?.request?.rideId && !incoming?.rideId) {
    fail('ride', 'Driver did not receive ride request', JSON.stringify(incoming));
    return;
  }
  pass('ride', 'Driver received ride request');

  await req('POST', `/driver/rides/${rideId}/accept`, {}, driver.token);
  pass('ride', 'Driver accepted ride');

  await setPartnerLocation(driver.token, BANGALORE.lat, BANGALORE.lng, 'driver');

  for (const status of ['arriving', 'arrived']) {
    await setPartnerLocation(driver.token, BANGALORE.lat, BANGALORE.lng, 'driver');
    await req('PATCH', `/driver/rides/${rideId}/status`, { status }, driver.token);
    pass('ride', `Driver status → ${status}`);
    await new Promise((r) => setTimeout(r, 500));
  }

  await req('PATCH', `/driver/rides/${rideId}/status`, { status: 'in_progress' }, driver.token);
  pass('ride', 'Driver status → in_progress');

  await new Promise((r) => setTimeout(r, 1500));
  const customerRide = await req('GET', `/rides/${rideId}`, null, customer.token);
  const otp = customerRide.rideOtp;
  if (!otp) {
    fail('ride', 'Customer ride missing OTP');
    return;
  }
  pass('ride', `Ride OTP generated: ${otp}`);

  await req('POST', `/driver/rides/${rideId}/otp/verify`, { otp }, driver.token);
  pass('ride', 'Ride OTP verified');

  await setPartnerLocation(driver.token, KORAMANGALA.lat, KORAMANGALA.lng, 'driver');
  await req('PATCH', `/driver/rides/${rideId}/status`, { status: 'completed' }, driver.token);
  pass('ride', 'Ride completed');

  const finalRide = await req('GET', `/rides/${rideId}`, null, customer.token);
  if (finalRide.status !== 'completed') {
    fail('ride', 'Final ride status not completed', finalRide.status);
  } else {
    pass('ride', 'Final ride status: completed');
  }

  if (finalRide.paymentStatus === 'paid') {
    pass('ride', 'Payment auto-marked paid on completion (cash MVP)');
    if (finalRide.paymentStatus === 'paid') {
      issues.push({
        step: 'ride-ui',
        msg: 'Customer Pay button will never show — driver marks paymentStatus=paid on complete',
        detail: 'RideTrackScreen hides Pay when paymentStatus=paid, but online Razorpay flow exists',
      });
    }
  } else {
    pass('ride', `Payment pending — customer can pay online (status=${finalRide.paymentStatus})`);
    try {
      const checkout = await req('POST', `/rides/${rideId}/payment/checkout`, {}, customer.token);
      pass('ride', `Payment checkout available: ₹${checkout.fare}`);
    } catch (e) {
      fail('ride', 'Payment checkout failed', e.message);
    }
  }

  const driverWalletAfter = await req('GET', '/driver/wallet', null, driver.token);
  const pendingBefore = driverWalletBefore.wallet?.pending ?? driverWalletBefore.pending ?? 0;
  const pendingAfter = driverWalletAfter.wallet?.pending ?? driverWalletAfter.pending ?? 0;
  if (pendingAfter <= pendingBefore) {
    fail('ride', 'Driver wallet not credited after ride', `before=${pendingBefore} after=${pendingAfter}`);
  } else {
    pass('ride', `Driver wallet credited: ${pendingBefore} → ${pendingAfter}`);
  }
}

async function main() {
  console.log('Zygo E2E Full Flow Test');
  console.log('API:', BASE);

  try {
    await req('GET', '/config/payments');
    pass('setup', 'API reachable');
  } catch (e) {
    console.error('\nAPI not reachable. Start with: npm run dev:api');
    process.exit(1);
  }

  try {
    await testFoodFlow();
  } catch (e) {
    fail('food', 'Unexpected error', e.message);
  }

  try {
    await testRideFlow();
  } catch (e) {
    fail('ride', 'Unexpected error', e.message);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${passed.length}`);
  console.log(`Issues: ${issues.length}`);

  if (issues.length) {
    console.log('\nIssues found:');
    for (const i of issues) {
      console.log(`  • [${i.step}] ${i.msg}${i.detail ? `\n    ${i.detail}` : ''}`);
    }
  }

  process.exit(issues.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
