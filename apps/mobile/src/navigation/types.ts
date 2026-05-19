import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type Place = {
  label: string;
  line1: string;
  coordinates: { lat: number; lng: number };
};

export type HomeStackParamList = {
  HomeMenu: undefined;
  RestaurantList: undefined;
  RestaurantDetail: { id: string; title?: string };
  Cart: undefined;
  Checkout: undefined;
  OrderTrack: { orderId: string };
  RidePlan: undefined;
  RideFare: { pickup: Place; drop: Place };
  RideTrack: { rideId: string };
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  FoodOrderDetail: { orderId: string };
  RideDetail: { rideId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { sessionId: string; emailMask: string };
};

export type PartnerTabParamList = {
  PartnerHub: undefined;
  ShopOrders: undefined;
  ShopInsights: undefined;
  ShopMenu: undefined;
  PartnerAccount: undefined;
};

export type DeliveryPartnerTabParamList = {
  DeliveryHub: undefined;
  DeliveryTrip: undefined;
  PartnerAccount: undefined;
};

export type DeliveryPartnerStackParamList = {
  DeliveryTabs: undefined;
  DeliveryActive: undefined;
  DeliveryEarnings: undefined;
  DeliveryWallet: undefined;
  DeliveryHistory: undefined;
};

export type DriverPartnerTabParamList = {
  DriverHub: undefined;
  DriverTrip: undefined;
  PartnerAccount: undefined;
};

export type DriverPartnerStackParamList = {
  DriverTabs: undefined;
  DriverActive: undefined;
  DriverEarnings: undefined;
  DriverWallet: undefined;
  DriverHistory: undefined;
};

export type ShopInsightsStackParamList = {
  InsightsHub: undefined;
  Analytics: undefined;
  Crm: undefined;
  CustomerDetail: { userId: string };
  Offers: undefined;
  EditOffer: { offerId?: string };
};

export type ShopOrdersStackParamList = {
  OrdersHome: undefined;
  ShopOrderDetail: { orderId: string };
  KitchenDisplay: undefined;
};

export type MenuStackParamList = {
  MenuHome: undefined;
  EditMenuItem: { itemId?: string };
};

export type AdminTabParamList = {
  AdminApprovals: undefined;
  AdminAccount: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  PartnerMain: NavigatorScreenParams<PartnerTabParamList>;
  AdminMain: NavigatorScreenParams<AdminTabParamList>;
};

export type HomeStackProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>;

export type AuthStackProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type OrdersStackProps<T extends keyof OrdersStackParamList> = NativeStackScreenProps<
  OrdersStackParamList,
  T
>;

export type ProfileStackProps<T extends keyof ProfileStackParamList> = NativeStackScreenProps<
  ProfileStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
