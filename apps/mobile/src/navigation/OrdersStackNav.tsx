import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OrdersStackParamList } from './types';
import { OrdersListScreen } from '../screens/OrdersListScreen';
import { OrderTrackScreen } from '../screens/OrderTrackScreen';
import { RideTrackScreen } from '../screens/RideTrackScreen';
import { stackScreenOptions } from '../theme';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStackNav() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="OrdersList" component={OrdersListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FoodOrderDetail" component={OrderTrackScreen} options={{ title: 'Food order' }} />
      <Stack.Screen name="RideDetail" component={RideTrackScreen} options={{ title: 'Ride' }} />
    </Stack.Navigator>
  );
}
