import type { FoodServiceType, RestaurantAddress } from './shopOwner';

export type PendingDeliveryPartner = {
  id: string;
  partnerId: string;
  name?: string;
  phone?: string;
  submittedAt?: string;
};

export type PendingDriver = {
  id: string;
  driverId: string;
  name?: string;
  phone?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
  submittedAt?: string;
};

export type PendingShopRequest = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  name: string;
  foodType: FoodServiceType;
  cuisine: string[];
  address: RestaurantAddress;
  gstNumber: string;
  panNumber: string;
  fssaiNumber: string;
  submittedAt: string | null;
  kycStatus: string;
};
