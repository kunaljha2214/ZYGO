export type ShopDashboardSummary = {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  cancelledToday: number;
};

export type TopSellingItem = {
  name: string;
  quantity: number;
  revenue: number;
};

export type LiveOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

export type DailySale = {
  label: string;
  date: string;
  revenue: number;
  orders: number;
};

export type WeeklyTrend = {
  label: string;
  revenue: number;
  orders: number;
};

export type PeakHour = {
  hour: number;
  label: string;
  count: number;
};

export type ShopDashboard = {
  shopName: string;
  restaurantId: string;
  customerRating: number;
  ratingLabel: string;
  summary: ShopDashboardSummary;
  topSellingItems: TopSellingItem[];
  liveOrders: LiveOrder[];
  dailySales: DailySale[];
  weeklyTrends: WeeklyTrend[];
  peakOrderTimes: PeakHour[];
};
