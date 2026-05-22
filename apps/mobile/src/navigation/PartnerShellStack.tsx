import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PartnerTabs } from './PartnerTabs';
import { ReferAndEarnScreen } from '../screens/profile/ReferAndEarnScreen';
import { ProfileDetailsScreen } from '../screens/profile/ProfileDetailsScreen';
import { stackScreenOptions } from '../theme';

export type PartnerShellParamList = {
  Tabs: undefined;
  ReferAndEarn: undefined;
  ProfileDetails: undefined;
};

const Stack = createNativeStackNavigator<PartnerShellParamList>();

export function PartnerShellStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Tabs" component={PartnerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ReferAndEarn" component={ReferAndEarnScreen} options={{ title: 'Refer & earn' }} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}
