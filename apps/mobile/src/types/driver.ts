export type DriverApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'blocked';

export type DriverProfile = {
  driverId: string;
  name: string;
  phone: string;
  vehicleType?: string | null;
  vehicleModel?: string | null;
  vehicleNumber?: string | null;
  approvalStatus: DriverApprovalStatus;
  approvalLabel: string;
  rejectionReason?: string | null;
  submittedAt?: string;
  documents: {
    aadhaar: boolean;
    pan: boolean;
    drivingLicense: boolean;
    rc: boolean;
    insurance: boolean;
    selfie: boolean;
  };
  rating: number;
  totalRides: number;
  acceptanceRate: number;
  cancellationRate: number;
  completionRate: number;
  wallet: { pending: number; totalEarned: number; withdrawable: number };
  isOnline: boolean;
  isBusy: boolean;
};

export type RideRequest = {
  requestId: string;
  rideId: string;
  pickup: { label: string; line1: string; coordinates: { lat: number; lng: number } };
  drop: { label: string; line1: string; coordinates: { lat: number; lng: number } };
  vehicleType: string;
  distanceToPickupKm: number;
  tripDistanceKm: number;
  estimatedEarnings: number;
  estimatedFare: number;
  platformFee: number;
  driverEarned: number;
  estimatedMinutes: number;
  expiresAt: string;
  timeoutSeconds: number;
  rideType: string;
};

export type RidePeerSummary = {
  id: string;
  name: string;
};

export type DriverRide = {
  id: string;
  pickup: { label: string; line1: string; coordinates: { lat: number; lng: number } };
  drop: { label: string; line1: string; coordinates: { lat: number; lng: number } };
  vehicleType: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  platformFee: number;
  driverEarned: number;
  surgeMultiplier?: number;
  tollCharges?: number;
  status: string;
  estimatedDriverEarnings?: number;
  rideOtpVerifiedAt?: string | null;
  createdAt: string;
  customer?: RidePeerSummary | null;
};

export type DriverEarningsDashboard = {
  todayEarnings: number;
  todayRides: number;
  weeklyEarnings: number;
  weeklyRides: number;
  onlineHours: number;
  incentives: number;
  incentiveProgress: number;
  walletPending: number;
  walletTotalEarned: number;
  rating: number;
  acceptanceRate: number;
  cancellationRate: number;
  completionRate: number;
};
