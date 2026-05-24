export type ShopOrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type ShopOrderItem = {
  name: string;
  price: number;
  quantity: number;
};

export type OrderPeerSummary = {
  id: string;
  name: string;
};

export type ShopOrder = {
  id: string;
  orderNumber: string;
  status: ShopOrderStatus;
  items: ShopOrderItem[];
  itemCount: number;
  total: number;
  deliveryAddress: { label: string; line1: string };
  customerNotes: string | null;
  shopNotes: string | null;
  rejectReason: string | null;
  estimatedPrepMinutes: number | null;
  kitchenStation: string | null;
  batchId: string | null;
  delayRiskMinutes: number | null;
  invoicePrintedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  nextAction: ShopOrderStatus | null;
  shouldPrintInvoice: boolean;
  customer?: OrderPeerSummary | null;
};

export type OrderBatch = {
  batchId: string;
  orderIds: string[];
  reason: string;
  suggestedStartTogether: boolean;
};

export type ShopOrdersList = {
  orders: ShopOrder[];
  batches: OrderBatch[];
  statusFlow: ShopOrderStatus[];
};

export type OrderAlerts = {
  alerts: ShopOrder[];
  pendingCount: number;
  polledAt: string;
};

export type KitchenDisplay = {
  stations: { station: string; orders: ShopOrder[] }[];
  orders: ShopOrder[];
};

export type ShopOrderInsights = {
  smartBatching: OrderBatch[];
  autoKitchenRouting: { orderId: string; orderNumber: string; station: string }[];
  delayPredictions: {
    orderId: string;
    orderNumber: string;
    delayRiskMinutes: number;
    estimatedPrepMinutes: number | null;
  }[];
};
