import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { DriverPartnerTabParamList } from './types';
import { DriverHubScreen } from '../screens/driver/DriverHubScreen';
import { DriverTripScreen } from '../screens/driver/DriverTripScreen';
import { PartnerAccountScreen } from '../screens/PartnerAccountScreen';
import { tabScreenOptions } from '../theme';

const Tab = createBottomTabNavigator<DriverPartnerTabParamList>();

export function DriverPartnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        ...tabScreenOptions,
        lazy: true,
      }}
      detachInactiveScreens={false}
    >
      <Tab.Screen
        name="DriverHub"
        component={DriverHubScreen}
        options={{ tabBarLabel: 'Hub', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚘</Text> }}
      />
      <Tab.Screen
        name="DriverTrip"
        component={DriverTripScreen}
        options={{ tabBarLabel: 'Trip', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛣️</Text> }}
      />
      <Tab.Screen
        name="PartnerAccount"
        component={PartnerAccountScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}
