import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { AdminTabParamList } from './types';
import { AdminApprovalsScreen } from '../screens/admin/AdminApprovalsScreen';
import { AdminAccountStack } from './AdminAccountStack';
import { tabScreenOptions } from '../theme';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, ...tabScreenOptions }}>
      <Tab.Screen
        name="AdminApprovals"
        component={AdminApprovalsScreen}
        options={{
          tabBarLabel: 'Approvals',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>✅</Text>,
        }}
      />
      <Tab.Screen
        name="AdminAccount"
        component={AdminAccountStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
