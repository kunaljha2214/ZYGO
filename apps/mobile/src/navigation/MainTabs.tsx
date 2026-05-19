import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import type { MainTabParamList } from './types';

import { HomeStackNav } from './HomeStackNav';

import { OrdersStackNav } from './OrdersStackNav';

import { ProfileStackNav } from './ProfileStackNav';

import { Text, View, StyleSheet } from 'react-native';

import { tabScreenOptions, colors } from '../theme';

function TabIcon({ label, active }: { label: string; active?: boolean }) {
  return (
    <View style={[tabIconStyles.dot, active && tabIconStyles.dotActive]}>
      <Text style={[tabIconStyles.txt, active && tabIconStyles.txtActive]}>{label}</Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.primarySoft,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  txt: { fontSize: 16, opacity: 0.55 },
  txtActive: { opacity: 1 },
});



const Tab = createBottomTabNavigator<MainTabParamList>();



export function MainTabs() {

  return (

    <Tab.Navigator screenOptions={{ headerShown: false, ...tabScreenOptions }}>

      <Tab.Screen

        name="Home"

        component={HomeStackNav}

        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="⌂" active={focused} />,
        }}

      />

      <Tab.Screen

        name="Orders"

        component={OrdersStackNav}

        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ focused }) => <TabIcon label="≡" active={focused} />,
        }}

      />

      <Tab.Screen

        name="Profile"

        component={ProfileStackNav}

        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="◉" active={focused} />,
        }}

      />

    </Tab.Navigator>

  );

}

