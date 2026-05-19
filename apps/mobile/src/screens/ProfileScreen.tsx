import React, { useState } from 'react';

import { View, Text, FlatList } from 'react-native';
import { AppScreen } from '../components/layout/AppScreen';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { ProfileStackProps } from '../navigation/types';

import { useAuthStore } from '../store/authStore';

import { api } from '../api/client';

import { Button } from '../components/Button';

import { Card } from '../components/Card';

import { AppTextInput } from '../components/AppTextInput';

import { shared } from '../theme/styles';



type Address = {

  _id: string;

  label: string;

  line1: string;

  coordinates: { lat: number; lng: number };

};



type Props = ProfileStackProps<'ProfileMain'>;



function roleLabel(role: string | undefined): string {

  switch (role) {

    case 'customer':

      return 'Customer';

    case 'delivery_partner':

      return 'Food delivery partner';

    case 'shop_owner':

      return 'Shop owner';

    case 'driver':

      return 'Driver';

    case 'captain':

      return 'Captain';

    default:

      return role ?? '';

  }

}



export function ProfileScreen({}: Props) {

  const user = useAuthStore((s) => s.user);

  const logout = useAuthStore((s) => s.logout);

  const qc = useQueryClient();

  const [label, setLabel] = useState('Other');

  const [line1, setLine1] = useState('');

  const [lat, setLat] = useState('12.97');

  const [lng, setLng] = useState('77.59');



  const { data: addresses, refetch } = useQuery({

    queryKey: ['addresses'],

    queryFn: async () => {

      const { data } = await api.get<Address[]>('/users/addresses');

      return data;

    }});



  const addMut = useMutation({

    mutationFn: async () => {

      await api.post('/users/addresses', {

        label,

        line1,

        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }});

    },

    onSuccess: () => {

      void refetch();

      void qc.invalidateQueries({ queryKey: ['addresses'] });

      setLine1('');

    }});



  return (

    <AppScreen scroll tab title="Profile">

      <Text style={shared.profileName}>{user?.name}</Text>

      <Text style={shared.phone}>{user?.phone}</Text>

      {user?.email ? <Text style={shared.meta}>{user.email}</Text> : null}

      <Text style={shared.muted}>{roleLabel(user?.role)}</Text>

      {user?.driverVehicleType ? (

        <Text style={shared.muted}>Vehicle: {user.driverVehicleType}</Text>

      ) : null}

      <Text style={shared.section}>Saved addresses</Text>

      <FlatList

        data={addresses}

        scrollEnabled={false}

        keyExtractor={(a) => a._id}

        renderItem={({ item }) => (

          <Card>

            <Text style={shared.addrLabel}>{item.label}</Text>

            <Text style={shared.addrLine}>{item.line1}</Text>

          </Card>

        )}

        ListEmptyComponent={<Text style={shared.muted}>No saved addresses.</Text>}

      />

      <Text style={shared.section}>Add address</Text>

      <AppTextInput placeholder="Label" value={label} onChangeText={setLabel} />

      <AppTextInput placeholder="Line 1" value={line1} onChangeText={setLine1} />

      <View style={shared.row}>

        <AppTextInput style={shared.half} value={lat} onChangeText={setLat} keyboardType="decimal-pad" />

        <AppTextInput style={shared.half} value={lng} onChangeText={setLng} keyboardType="decimal-pad" />

      </View>

      <Button title="Save address" onPress={() => addMut.mutate()} loading={addMut.isPending} />

      <View style={shared.spacer} />

      <Button title="Log out" variant="ghost" onPress={() => void logout()} />

    </AppScreen>

  );

}

