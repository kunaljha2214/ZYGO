import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { DriverPartnerTabParamList } from './types';
import { DriverHubScreen } from '../screens/driver/DriverHubScreen';
import { DriverActiveScreen } from '../screens/driver/DriverActiveScreen';
import { PartnerAccountScreen } from '../screens/PartnerAccountScreen';
import { tabScreenOptions } from '../theme';

const Tab = createBottomTabNavigator<DriverPartnerTabParamList>();

export function DriverPartnerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, ...tabScreenOptions }}>
      <Tab.Screen
        name="DriverHub"
        component={DriverHubScreen}
        options={{ tabBarLabel: 'Hub', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚘</Text> }}
      />
      <Tab.Screen
        name="DriverTrip"
        component={DriverActiveScreen}
        options={{ tabBarLabel: 'Trip', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛣️</Text> }}
      />
      <Tab.Screen
        name="PartnerAccount"
        component={PartnerAccountScreen}
        options={{ tabBarLabel: 'Account', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}
