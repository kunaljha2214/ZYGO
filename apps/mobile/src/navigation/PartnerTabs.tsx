import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { PartnerTabParamList } from './types';
import { PartnerHubScreen } from '../screens/PartnerHubScreen';
import { PartnerAccountScreen } from '../screens/PartnerAccountScreen';
import { MenuStack } from './MenuStack';
import { ShopOrdersStack } from './ShopOrdersStack';
import { ShopInsightsStack } from './ShopInsightsStack';
import { useAuthStore } from '../store/authStore';
import { Text } from 'react-native';
import { tabScreenOptions } from '../theme';

const Tab = createBottomTabNavigator<PartnerTabParamList>();

export function PartnerTabs() {
  const role = useAuthStore((s) => s.user?.role);
  const isShopOwner = role === 'shop_owner';

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, ...tabScreenOptions }}>
      <Tab.Screen
        name="PartnerHub"
        component={PartnerHubScreen}
        options={{ tabBarLabel: 'Hub', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚡</Text> }}
      />
      {isShopOwner ? (
        <>
          <Tab.Screen
            name="ShopOrders"
            component={ShopOrdersStack}
            options={{ tabBarLabel: 'Orders', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text> }}
          />
          <Tab.Screen
            name="ShopInsights"
            component={ShopInsightsStack}
            options={{ tabBarLabel: 'Insights', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text> }}
          />
          <Tab.Screen
            name="ShopMenu"
            component={MenuStack}
            options={{ tabBarLabel: 'Menu', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🍽</Text> }}
          />
        </>
      ) : null}
      <Tab.Screen
        name="PartnerAccount"
        component={PartnerAccountScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}
