import React from 'react';
import { View, Text } from 'react-native';
import { AppScreen } from '../components/layout/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuthStore } from '../store/authStore';
import { shared } from '../theme/styles';

function roleLabel(role: string | undefined): string {
  switch (role) {
    case 'delivery_partner':
      return 'Food delivery partner';
    case 'shop_owner':
      return 'Shop owner';
    case 'driver':
      return 'Driver';
    case 'captain':
      return 'Captain';
    case 'restaurant':
      return 'Restaurant';
    case 'admin':
      return 'Zygo Admin';
    default:
      return role ?? 'Partner';
  }
}

export function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <AppScreen scroll tab title="Account">
      <Card glow>
        <Text style={shared.name}>{user?.name}</Text>
        <Text style={shared.phone}>{user?.phone}</Text>
        {user?.email ? <Text style={shared.meta}>{user.email}</Text> : null}
        <Text style={shared.badge}>{roleLabel(user?.role)}</Text>
        {user?.driverVehicleType ? (
          <Text style={shared.meta}>Vehicle: {user.driverVehicleType}</Text>
        ) : null}
      </Card>
      <View style={shared.spacer} />
      <Button
        title="Log out"
        variant="ghost"
        onPress={() => {
          void logout().catch((e) => {
            console.warn('Logout failed', e);
          });
        }}
      />
    </AppScreen>
  );
}
