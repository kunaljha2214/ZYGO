export type CrmOverview = {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  totalLoyaltyPoints: number;
  reviewCount: number;
  averageRating: number | null;
};

export type CrmCustomer = {
  userId: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  isRepeat: boolean;
};

export type CrmCustomerDetail = CrmCustomer & {
  firstOrderAt?: string;
  orderHistory: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    itemCount: number;
    createdAt: string;
  }[];
  reviews: { id: string; rating: number; comment: string; createdAt: string }[];
};

export type CrmReview = {
  id: string;
  userId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type PersonalizedOffer = {
  userId: string;
  customerName: string;
  suggestedOffer: {
    title: string;
    offerType: 'percentage' | 'flat' | 'free_delivery' | 'combo';
    discountValue: number;
    minOrderAmount: number;
    reason: string;
  };
};

export type ShopAnalytics = {
  period: string;
  salesReport: {
    totalRevenue: number;
    orderCount: number;
    deliveredCount: number;
    avgOrderValue: number;
    daily: { date: string; label: string; revenue: number; orders: number }[];
  };
  itemWiseReport: { name: string; quantity: number; revenue: number; sharePercent: number }[];
  peakHours: { hour: number; label: string; count: number; revenue: number }[];
  customerRetention: {
    totalCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    newCustomers: number;
  };
  cancellationAnalysis: {
    cancelledCount: number;
    totalOrders: number;
    cancellationRate: number;
    reasons: { reason: string; count: number }[];
  };
  advanced: {
    demandForecast: { date: string; label: string; predictedOrders: number }[];
    inventoryForecast: {
      itemName: string;
      avgDailyQty: number;
      suggestedStock: number;
      daysCover: number;
    }[];
    profitMargin: {
      revenue: number;
      estimatedCost: number;
      grossProfit: number;
      marginPercent: number;
      byItem: { name: string; revenue: number; marginPercent: number }[];
    };
  };
};

export type ShopOfferType = 'flat' | 'percentage' | 'free_delivery' | 'combo';
export type ShopCampaignType = 'standard' | 'happy_hour' | 'festival';

export type ShopOffer = {
  id: string;
  title: string;
  code: string;
  offerType: ShopOfferType;
  discountValue: number;
  minOrderAmount: number;
  comboItemNames: string[];
  isActive: boolean;
  startDate: string;
  endDate: string;
  happyHourStart?: string;
  happyHourEnd?: string;
  campaignType: ShopCampaignType;
  festivalName?: string;
  maxUses?: number;
  usageCount: number;
  targetCustomerIds: string[];
  createdAt: string;
};

export type OfferCampaign = {
  id: string;
  title: string;
  code: string;
  campaignType: ShopCampaignType;
  festivalName?: string;
  happyHourStart?: string;
  happyHourEnd?: string;
  offerType: ShopOfferType;
  discountValue: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
};
