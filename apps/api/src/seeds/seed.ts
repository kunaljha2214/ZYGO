import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../config/db';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { VerificationSession } from '../models/VerificationSession';
import { OwnerRestaurant } from '../models/OwnerRestaurant';
import { FoodOrder } from '../models/FoodOrder';
import { ShopReview } from '../models/ShopReview';
import { ShopOffer } from '../models/ShopOffer';
import { ShopCustomerProfile } from '../models/ShopCustomerProfile';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile';
import { DriverProfile } from '../models/DriverProfile';
import { Types } from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}

const bangaloreCenter = { lat: 12.9716, lng: 77.5946 };

const restaurantsData = [
  {
    name: 'Zygo Biryani House',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
    cuisine: ['Indian', 'Biryani'],
    rating: 4.6,
    offset: [0.01, 0.02],
  },
  {
    name: 'South Spice',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    cuisine: ['South Indian', 'Vegetarian'],
    rating: 4.4,
    offset: [-0.015, 0.01],
  },
  {
    name: 'Metro Pizza Co',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    cuisine: ['Italian', 'Fast Food'],
    rating: 4.2,
    offset: [0.02, -0.01],
  },
  {
    name: 'Green Bowl',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    cuisine: ['Healthy', 'Salads'],
    rating: 4.5,
    offset: [-0.02, -0.02],
  },
  {
    name: 'Midnight Mughlai',
    image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400',
    cuisine: ['North Indian', 'Kebabs'],
    rating: 4.3,
    offset: [0.008, -0.018],
  },
];

async function run(): Promise<void> {
  await connectDb(uri!);

  await VerificationSession.deleteMany({});
  await FoodOrder.deleteMany({});
  await ShopReview.deleteMany({});
  await ShopOffer.deleteMany({});
  await ShopCustomerProfile.deleteMany({});
  await OwnerRestaurant.deleteMany({});
  await MenuItem.deleteMany({});
  await Restaurant.deleteMany({});
  await DeliveryPartnerProfile.deleteMany({});
  await User.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  const customer = await User.create({
    phone: '9999999999',
    email: 'customer@test.zygo.dev',
    emailVerified: true,
    passwordHash,
    name: 'Test Customer',
    role: 'customer',
    savedAddresses: [
      {
        label: 'Home',
        line1: 'Indiranagar, Bangalore',
        coordinates: bangaloreCenter,
      },
    ],
  });

  await User.create({
    phone: '9666666666',
    email: 'owner@test.zygo.dev',
    emailVerified: true,
    passwordHash,
    name: 'Shop Owner Demo',
    role: 'shop_owner',
    savedAddresses: [],
  });

  await User.create({
    phone: '9555555555',
    email: 'admin@test.zygo.dev',
    emailVerified: true,
    passwordHash,
    name: 'Zygo Admin',
    role: 'admin',
    savedAddresses: [],
  });

  const rider1 = await User.create({
    phone: '9444444444',
    email: 'rider1@test.zygo.dev',
    emailVerified: true,
    passwordHash,
    name: 'Rider Rahul',
    role: 'delivery_partner',
    savedAddresses: [],
    isDeliveryOnline: true,
    isDeliveryBusy: false,
    currentLocation: {
      type: 'Point',
      coordinates: [bangaloreCenter.lng + 0.008, bangaloreCenter.lat + 0.006],
    },
  });

  const rider2 = await User.create({
    phone: '9333333333',
    email: 'rider2@test.zygo.dev',
    emailVerified: true,
    passwordHash,
    name: 'Rider Priya',
    role: 'delivery_partner',
    savedAddresses: [],
    isDeliveryOnline: true,
    isDeliveryBusy: false,
    currentLocation: {
      type: 'Point',
      coordinates: [bangaloreCenter.lng - 0.006, bangaloreCenter.lat + 0.004],
    },
  });

  const docStub = {
    fileName: 'seed-doc.png',
    mimeType: 'image/png',
    url: '/uploads/seed-doc.png',
    uploadedAt: new Date(),
  };

  await DeliveryPartnerProfile.create([
    {
      partnerId: rider1._id,
      approvalStatus: 'approved',
      adminReviewedAt: new Date(),
      submittedAt: new Date(),
      aadhaarDocument: docStub,
      panDocument: docStub,
      drivingLicenseDocument: docStub,
      rcDocument: docStub,
      profilePhotoDocument: docStub,
      rating: 4.8,
      totalDeliveries: 42,
      acceptanceRate: 92,
      cancellationRate: 3,
      onTimeRate: 88,
    },
    {
      partnerId: rider2._id,
      approvalStatus: 'approved',
      adminReviewedAt: new Date(),
      submittedAt: new Date(),
      aadhaarDocument: docStub,
      panDocument: docStub,
      drivingLicenseDocument: docStub,
      rcDocument: docStub,
      profilePhotoDocument: docStub,
      rating: 4.6,
      totalDeliveries: 28,
      acceptanceRate: 89,
      cancellationRate: 5,
      onTimeRate: 85,
    },
  ]);

  const driver1 = await User.create({
    phone: '9222222222',
    email: 'driver1@test.zygo.dev',
    emailVerified: true,
    passwordHash,
    name: 'Driver Arjun',
    role: 'driver',
    driverVehicleType: 'bike',
    savedAddresses: [],
    isDriverOnline: true,
    isDriverBusy: false,
    currentLocation: {
      type: 'Point',
      coordinates: [bangaloreCenter.lng + 0.005, bangaloreCenter.lat + 0.003],
    },
  });

  await DriverProfile.create({
    driverId: driver1._id,
    approvalStatus: 'approved',
    adminReviewedAt: new Date(),
    submittedAt: new Date(),
    vehicleModel: 'Honda Activa',
    vehicleNumber: 'KA01AB1234',
    aadhaarDocument: docStub,
    panDocument: docStub,
    drivingLicenseDocument: docStub,
    rcDocument: docStub,
    selfieDocument: docStub,
    rating: 4.9,
    totalRides: 156,
    acceptanceRate: 94,
    cancellationRate: 2,
    completionRate: 97,
  });

  await User.create([
    {
      phone: '9888888888',
      passwordHash,
      name: 'Captain Ravi',
      role: 'captain',
      savedAddresses: [],
      isCaptainAvailable: true,
      currentLocation: {
        type: 'Point',
        coordinates: [bangaloreCenter.lng + 0.01, bangaloreCenter.lat + 0.01],
      },
    },
    {
      phone: '9777777777',
      passwordHash,
      name: 'Captain Neha',
      role: 'captain',
      savedAddresses: [],
      isCaptainAvailable: true,
      currentLocation: {
        type: 'Point',
        coordinates: [bangaloreCenter.lng - 0.01, bangaloreCenter.lat - 0.01],
      },
    },
  ]);

  for (const r of restaurantsData) {
    const [dx, dy] = r.offset;
    const restaurant = await Restaurant.create({
      name: r.name,
      image: r.image,
      cuisine: r.cuisine,
      rating: r.rating,
      location: {
        type: 'Point',
        coordinates: [bangaloreCenter.lng + dx, bangaloreCenter.lat + dy],
      },
      isActive: true,
    });

    const items = [
      { name: 'Chef Special', price: 199, category: 'Starters', isVeg: false },
      { name: 'Classic Thali', price: 249, category: 'Meals', isVeg: true },
      { name: 'Family Pack', price: 499, category: 'Combos', isVeg: false },
      { name: 'Fresh Juice', price: 89, category: 'Beverages', isVeg: true },
    ];
    const menuDocs = await MenuItem.insertMany(
      items.map((m) => ({
        restaurantId: restaurant._id,
        name: `${m.name} @ ${restaurant.name.split(' ')[0]}`,
        price: m.price + Math.round(r.rating * 3),
        category: m.category,
        isVeg: m.isVeg,
        isAvailable: true,
      }))
    );

    const statuses = [
      'delivered',
      'delivered',
      'preparing',
      'placed',
      'confirmed',
      'cancelled',
      'ready_for_pickup',
      'out_for_delivery',
      'delivered',
    ] as const;
    const now = Date.now();
    for (let i = 0; i < 12; i++) {
      const menuItem = menuDocs[i % menuDocs.length];
      const daysAgo = i % 7;
      const hour = 11 + (i % 10);
      const created = new Date(now - daysAgo * 86400000);
      created.setHours(hour, 30, 0, 0);
      const qty = 1 + (i % 3);
      const status = statuses[i % statuses.length];
      await FoodOrder.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        orderNumber: `ZY${Date.now().toString(36).toUpperCase()}${i}`,
        items: [
          {
            menuItemId: menuItem._id as Types.ObjectId,
            name: menuItem.name,
            price: menuItem.price,
            quantity: qty,
          },
        ],
        subtotal: Math.round(menuItem.price * qty * 100) / 100,
        discountAmount: 0,
        total: Math.round(menuItem.price * qty * 100) / 100,
        status,
        deliveryAddress: {
          label: 'Home',
          line1: 'Indiranagar, Bangalore',
          coordinates: bangaloreCenter,
        },
        createdAt: created,
        updatedAt: created,
      });
    }

    if (r.name === 'Zygo Biryani House') {
      await ShopReview.create([
        {
          restaurantId: restaurant._id,
          userId: customer._id,
          rating: 5,
          comment: 'Amazing biryani, fast delivery!',
        },
        {
          restaurantId: restaurant._id,
          userId: customer._id,
          rating: 4,
          comment: 'Good portion size. Will order again.',
        },
      ]);
      await ShopCustomerProfile.create({
        restaurantId: restaurant._id,
        userId: customer._id,
        loyaltyPoints: 120,
        totalOrders: 8,
        totalSpent: 2400,
        lastOrderAt: new Date(),
        firstOrderAt: new Date(Date.now() - 30 * 86400000),
      });
      const start = new Date();
      const end = new Date(Date.now() + 30 * 86400000);
      await ShopOffer.insertMany([
        {
          restaurantId: restaurant._id,
          title: 'Flat ₹50 off',
          code: 'FLAT50',
          offerType: 'flat',
          discountValue: 50,
          minOrderAmount: 299,
          comboItemNames: [],
          isActive: true,
          startDate: start,
          endDate: end,
          campaignType: 'standard',
        },
        {
          restaurantId: restaurant._id,
          title: 'Happy hour 20% off',
          code: 'HAPPY20',
          offerType: 'percentage',
          discountValue: 20,
          minOrderAmount: 199,
          comboItemNames: [],
          isActive: true,
          startDate: start,
          endDate: end,
          happyHourStart: '15:00',
          happyHourEnd: '18:00',
          campaignType: 'happy_hour',
        },
        {
          restaurantId: restaurant._id,
          title: 'Diwali feast combo',
          code: 'DIWALI25',
          offerType: 'combo',
          discountValue: 25,
          minOrderAmount: 499,
          comboItemNames: ['Family Pack', 'Fresh Juice'],
          isActive: true,
          startDate: start,
          endDate: end,
          campaignType: 'festival',
          festivalName: 'Diwali',
        },
      ]);
    }
  }

  console.log(
    'Seed complete.\n' +
      '  Customer: 9999999999 / password123\n' +
      '  Shop owner: 9666666666 / password123 (register restaurant after login)\n' +
      '  Admin: 9555555555 / password123\n' +
      '  Delivery partner (approved, online): 9444444444 / password123\n' +
      '  Delivery partner 2: 9333333333 / password123\n' +
      '  Ride driver (approved, online, bike): 9222222222 / password123'
  );
  await disconnectDb();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
