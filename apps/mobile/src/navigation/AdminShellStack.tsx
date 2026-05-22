import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminTabs } from './AdminTabs';
import { ReferAndEarnScreen } from '../screens/profile/ReferAndEarnScreen';
import { stackScreenOptions } from '../theme';

export type AdminShellParamList = {
  Tabs: undefined;
  ReferAndEarn: undefined;
};

const Stack = createNativeStackNavigator<AdminShellParamList>();

export function AdminShellStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Tabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ReferAndEarn" component={ReferAndEarnScreen} options={{ title: 'Refer & earn' }} />
    </Stack.Navigator>
  );
}
