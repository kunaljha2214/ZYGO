import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from './types';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SavedAddressesScreen } from '../screens/profile/SavedAddressesScreen';
import { ReferAndEarnScreen } from '../screens/profile/ReferAndEarnScreen';
import { ProfileDetailsScreen } from '../screens/profile/ProfileDetailsScreen';
import { stackScreenOptions } from '../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNav() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProfileDetails"
        component={ProfileDetailsScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="SavedAddresses"
        component={SavedAddressesScreen}
        options={{ title: 'Saved addresses' }}
      />
      <Stack.Screen
        name="ReferAndEarn"
        component={ReferAndEarnScreen}
        options={{ title: 'Refer & earn' }}
      />
    </Stack.Navigator>
  );
}
