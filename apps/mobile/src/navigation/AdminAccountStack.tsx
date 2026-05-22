import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AdminAccountStackParamList } from './types';
import { AccountScreen } from '../screens/AccountScreen';
import { ProfileDetailsScreen } from '../screens/profile/ProfileDetailsScreen';
import { stackScreenOptions } from '../theme';

const Stack = createNativeStackNavigator<AdminAccountStackParamList>();

export function AdminAccountStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="AdminAccountMain"
        component={AccountScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileDetails"
        component={ProfileDetailsScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
}
