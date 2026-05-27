/**
 * End-to-end ride + push verification against production API.
 * Usage: node scripts/e2e-ride-push.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'https://zygo.onrender.com/api/v1').replace(/\/$/, '');

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
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('API:', BASE);

  try {
    const pushStatus = await req('GET', '/config/push-status');
    console.log('push-status:', pushStatus);
  } catch (e) {
    console.warn('push-status check failed:', e.message);
  }

  const customer = await req('POST', '/auth/login', {
    phone: '9999999999',
    password: 'password123',
  });
  const driver = await req('POST', '/auth/login', {
    phone: '9222222222',
    password: 'password123',
  });
  const customerToken = customer.accessToken;
  const driverToken = driver.accessToken;

  // Requires latest API deploy (returns pushEnabledOnServer)
  try {
    const reg = await req(
      'POST',
      '/users/push-tokens',
      { token: 'e2e-probe-token', platform: 'android' },
      driverToken
    );
    console.log('push-tokens probe:', reg);
  } catch (e) {
    console.warn('push-tokens probe:', e.message);
  }
  console.log('customer', customer.user?.id, customer.user?.role);
  console.log('driver', driver.user?.id, driver.user?.role);

  const pickup = { lat: 12.9716, lng: 77.5946 };
  const drop = { lat: 12.9352, lng: 77.6245 };

  await req(
    'PATCH',
    '/driver/online',
    { online: true, lat: pickup.lat, lng: pickup.lng },
    driverToken
  );
  console.log('driver online');

  const ride = await req(
    'POST',
    '/rides',
    {
      pickup: {
        line1: 'MG Road',
        coordinates: pickup,
      },
      drop: {
        line1: 'Koramangala',
        coordinates: drop,
      },
      vehicleType: 'bike',
    },
    customerToken
  );
  const rideId = ride.id || ride._id;
  console.log('ride created', rideId);

  await new Promise((r) => setTimeout(r, 3000));

  const incoming = await req('GET', '/driver/incoming', null, driverToken);
  console.log('driver incoming', incoming?.request?.rideId || incoming);

  await req('POST', `/driver/rides/${rideId}/accept`, {}, driverToken);
  console.log('ride accepted');

  for (const status of ['arriving', 'arrived', 'in_progress', 'completed']) {
    await req('PATCH', `/driver/rides/${rideId}/status`, { status }, driverToken);
    console.log('status →', status);
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('\nDone. Check phones for: ride_accepted, driver_moving, driver_arrived, ride_started, ride_completed, ride_completed_earnings');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
