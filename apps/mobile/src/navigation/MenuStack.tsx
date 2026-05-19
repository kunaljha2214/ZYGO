import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MenuStackParamList } from './types';
import { MenuManagementScreen } from '../screens/shop/MenuManagementScreen';
import { EditMenuItemScreen } from '../screens/shop/EditMenuItemScreen';
import { stackScreenOptions } from '../theme';

const Stack = createNativeStackNavigator<MenuStackParamList>();

export function MenuStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="MenuHome"
        component={MenuManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditMenuItem"
        component={EditMenuItemScreen}
        options={({ route }) => ({
          title: route.params?.itemId ? 'Edit item' : 'Add item',
          headerShown: true,
        })}
      />
    </Stack.Navigator>
  );
}
