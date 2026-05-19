import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './types';
import { HomeMenuScreen } from '../screens/HomeMenuScreen';
import { RestaurantListScreen } from '../screens/RestaurantListScreen';
import { RestaurantDetailScreen } from '../screens/RestaurantDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderTrackScreen } from '../screens/OrderTrackScreen';
import { RidePlanScreen } from '../screens/RidePlanScreen';
import { RideFareScreen } from '../screens/RideFareScreen';
import { RideTrackScreen } from '../screens/RideTrackScreen';
import { stackScreenOptions } from '../theme';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNav() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="HomeMenu" component={HomeMenuScreen} options={{ title: 'Zygo' }} />
      <Stack.Screen name="RestaurantList" component={RestaurantListScreen} options={{ title: 'Restaurants' }} />
      <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} options={{ title: 'Menu' }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen name="OrderTrack" component={OrderTrackScreen} options={{ title: 'Order' }} />
      <Stack.Screen name="RidePlan" component={RidePlanScreen} options={{ title: 'Book ride' }} />
      <Stack.Screen name="RideFare" component={RideFareScreen} options={{ title: 'Fare' }} />
      <Stack.Screen name="RideTrack" component={RideTrackScreen} options={{ title: 'Your ride' }} />
    </Stack.Navigator>
  );
}
