import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../config/db';
import { User } from '../models/User';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile';
import { DriverProfile } from '../models/DriverProfile';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}

const bangaloreCenter = { lat: 12.9716, lng: 77.5946 };
const PASSWORD = 'password123';

const docStub = {
  fileName: 'seed-doc.png',
  mimeType: 'image/png',
  url: '/uploads/seed-doc.png',
  uploadedAt: new Date(),
};

async function upsertUser(
  phone: string,
  fields: {
    name: string;
    role: string;
    email?: string;
    isDeliveryOnline?: boolean;
    locationOffset?: [number, number];
  }
) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const coords = fields.locationOffset ?? [0, 0];
  return User.findOneAndUpdate(
    { phone },
    {
      $set: {
        phone,
        name: fields.name,
        role: fields.role,
        email: fields.email,
        emailVerified: true,
        passwordHash,
        savedAddresses: [],
        isDeliveryOnline: fields.isDeliveryOnline ?? false,
        isDeliveryBusy: false,
        currentLocation: {
          type: 'Point',
          coordinates: [bangaloreCenter.lng + coords[0], bangaloreCenter.lat + coords[1]],
        },
      },
    },
    { upsert: true, new: true }
  );
}

async function run(): Promise<void> {
  await connectDb(uri!);

  const accounts = [
    { phone: '9999999999', name: 'Test Customer', role: 'customer', email: 'customer@test.zygo.dev' },
    { phone: '9666666666', name: 'Shop Owner Demo', role: 'shop_owner', email: 'owner@test.zygo.dev' },
    { phone: '9555555555', name: 'Zygo Admin', role: 'admin', email: 'admin@test.zygo.dev' },
    {
      phone: '9444444444',
      name: 'Rider Rahul',
      role: 'delivery_partner',
      email: 'rider1@test.zygo.dev',
      isDeliveryOnline: true,
      locationOffset: [0.008, 0.006] as [number, number],
    },
    {
      phone: '9333333333',
      name: 'Rider Priya',
      role: 'delivery_partner',
      email: 'rider2@test.zygo.dev',
      isDeliveryOnline: true,
      locationOffset: [-0.006, 0.004] as [number, number],
    },
    {
      phone: '9222222222',
      name: 'Driver Arjun',
      role: 'driver',
      email: 'driver1@test.zygo.dev',
      locationOffset: [0.005, 0.003] as [number, number],
    },
  ];

  for (const a of accounts) {
    const user = await upsertUser(a.phone, a);
    console.log(`  ${a.role}: ${a.phone} (${user._id})`);

    if (a.role === 'driver') {
      await User.findByIdAndUpdate(user._id, {
        driverVehicleType: 'bike',
        isDriverOnline: true,
        isDriverBusy: false,
      });
      await DriverProfile.findOneAndUpdate(
        { driverId: user._id },
        {
          $set: {
            driverId: user._id,
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
          },
        },
        { upsert: true }
      );
    }

    if (a.role === 'delivery_partner') {
      await DeliveryPartnerProfile.findOneAndUpdate(
        { partnerId: user._id },
        {
          $set: {
            partnerId: user._id,
            approvalStatus: 'approved',
            adminReviewedAt: new Date(),
            submittedAt: new Date(),
            aadhaarDocument: docStub,
            panDocument: docStub,
            drivingLicenseDocument: docStub,
            rcDocument: docStub,
            profilePhotoDocument: docStub,
            rating: a.phone === '9444444444' ? 4.8 : 4.6,
            totalDeliveries: a.phone === '9444444444' ? 42 : 28,
            acceptanceRate: 90,
            cancellationRate: 4,
            onTimeRate: 86,
          },
        },
        { upsert: true }
      );
    }
  }

  console.log(`\nTest users ready. Password for all: ${PASSWORD}`);
  await disconnectDb();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
