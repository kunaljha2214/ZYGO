import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ShopInsightsStackParamList } from './types';
import { InsightsHubScreen } from '../screens/shop/insights/InsightsHubScreen';
import { AnalyticsScreen } from '../screens/shop/insights/AnalyticsScreen';
import { CrmScreen } from '../screens/shop/insights/CrmScreen';
import { CustomerDetailScreen } from '../screens/shop/insights/CustomerDetailScreen';
import { OffersScreen } from '../screens/shop/insights/OffersScreen';
import { EditOfferScreen } from '../screens/shop/insights/EditOfferScreen';
import { stackScreenOptions } from '../theme';

const Stack = createNativeStackNavigator<ShopInsightsStackParamList>();

export function ShopInsightsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="InsightsHub"
        component={InsightsHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="Crm" component={CrmScreen} options={{ title: 'Customers' }} />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Customer' }}
      />
      <Stack.Screen name="Offers" component={OffersScreen} options={{ title: 'Offers' }} />
      <Stack.Screen
        name="EditOffer"
        component={EditOfferScreen}
        options={({ route }) => ({ title: route.params?.offerId ? 'Edit offer' : 'New offer' })}
      />
    </Stack.Navigator>
  );
}
