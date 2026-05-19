import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ShopOrdersStackParamList } from './types';
import { ShopOrdersScreen } from '../screens/shop/ShopOrdersScreen';
import { ShopOrderDetailScreen } from '../screens/shop/ShopOrderDetailScreen';
import { KitchenDisplayScreen } from '../screens/shop/KitchenDisplayScreen';
import { stackScreenOptions } from '../theme';

const Stack = createNativeStackNavigator<ShopOrdersStackParamList>();

export function ShopOrdersStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="OrdersHome"
        component={ShopOrdersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShopOrderDetail"
        component={ShopOrderDetailScreen}
        options={{ title: 'Order' }}
      />
      <Stack.Screen
        name="KitchenDisplay"
        component={KitchenDisplayScreen}
        options={{ title: 'Kitchen display' }}
      />
    </Stack.Navigator>
  );
}
