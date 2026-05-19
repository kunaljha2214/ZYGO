export type FoodServiceType = 'veg' | 'non_veg' | 'both';
export type KycStatus = 'pending' | 'submitted' | 'verified' | 'rejected';
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type OpeningHour = {
  day: number;
  open: string;
  close: string;
  closed: boolean;
};

export type RestaurantAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type DocumentRef = {
  fileName: string;
  mimeType: string;
  url: string;
  uploadedAt: string;
};

export type BankDetails = {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
};

export type OwnerRestaurantRegistration = {
  id: string;
  name: string;
  address: RestaurantAddress;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  cuisine: string[];
  foodType: FoodServiceType;
  openingHours: OpeningHour[];
  gstNumber: string;
  panNumber: string;
  fssaiNumber: string;
  gstDocument: DocumentRef | null;
  panDocument: DocumentRef | null;
  fssaiDocument: DocumentRef | null;
  bankDetails: BankDetails;
  kycStatus: KycStatus;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  adminReviewedAt: string | null;
  restaurantListingId: string | null;
};

export type RestaurantRegistrationPayload = {
  name: string;
  address: RestaurantAddress;
  lat: number;
  lng: number;
  cuisine: string[];
  foodType: FoodServiceType;
  openingHours: OpeningHour[];
  gstNumber: string;
  panNumber: string;
  fssaiNumber: string;
  bankDetails: BankDetails;
};
