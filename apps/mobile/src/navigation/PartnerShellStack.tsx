import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PartnerTabs } from './PartnerTabs';
import { ReferAndEarnScreen } from '../screens/profile/ReferAndEarnScreen';
import { stackScreenOptions } from '../theme';

export type PartnerShellParamList = {
  Tabs: undefined;
  ReferAndEarn: undefined;
};

const Stack = createNativeStackNavigator<PartnerShellParamList>();

export function PartnerShellStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Tabs" component={PartnerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ReferAndEarn" component={ReferAndEarnScreen} options={{ title: 'Refer & earn' }} />
    </Stack.Navigator>
  );
}
