export type PartnerApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type DeliveryPartnerProfile = {
  partnerId: string;
  name: string;
  phone: string;
  approvalStatus: PartnerApprovalStatus;
  rejectionReason?: string | null;
  submittedAt?: string;
  documents: {
    aadhaar: boolean;
    pan: boolean;
    drivingLicense: boolean;
    rc: boolean;
    profilePhoto: boolean;
  };
  rating: number;
  totalDeliveries: number;
  acceptanceRate: number;
  cancellationRate: number;
  onTimeRate: number;
  wallet: { pending: number; totalEarned: number };
  isOnline: boolean;
  isBusy: boolean;
};

export type DeliveryRequest = {
  requestId: string;
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantCoords: { lat: number; lng: number };
  customerAddress: string;
  customerCoords: { lat: number; lng: number };
  distanceToRestaurantKm: number;
  distanceToCustomerKm: number;
  estimatedEarnings: number;
  estimatedMinutes: number;
  expiresAt: string;
  timeoutSeconds: number;
  items: { name: string; quantity: number; price: number }[];
};

export type PartnerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryStatus: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  customerNotes?: string | null;
  deliveryAddress: { label: string; line1: string; coordinates: { lat: number; lng: number } };
  restaurantName?: string;
  restaurantCoords?: { lat: number; lng: number };
  estimatedRiderEarnings?: number;
  deliveryEtaMinutes?: number;
  createdAt: string;
  customer?: { id: string; name: string } | null;
};

export type EarningsDashboard = {
  todayEarnings: number;
  todayDeliveries: number;
  weeklyEarnings: number;
  weeklyDeliveries: number;
  incentives: number;
  walletPending: number;
  walletTotalEarned: number;
  rating: number;
  acceptanceRate: number;
  cancellationRate: number;
  onTimeRate: number;
};
