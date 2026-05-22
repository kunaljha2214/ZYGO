import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProfileStackProps } from '../../navigation/types';
import { StackScroll } from '../../components/layout/StackScroll';
import { api } from '../../api/client';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AppTextInput } from '../../components/AppTextInput';
import { shared } from '../../theme/styles';

type Address = {
  _id: string;
  label: string;
  line1: string;
  coordinates: { lat: number; lng: number };
};

type Props = ProfileStackProps<'SavedAddresses'>;

export function SavedAddressesScreen({}: Props) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');

  const { data: addresses, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<Address[]>('/users/addresses');
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      await api.post('/users/addresses', {
        label,
        line1,
        coordinates: { lat: 0, lng: 0 },
      });
    },
    onSuccess: () => {
      void refetch();
      void qc.invalidateQueries({ queryKey: ['addresses'] });
      setLine1('');
    },
  });

  return (
    <StackScroll keyboardShouldPersistTaps="handled">
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
        ListEmptyComponent={<Text style={shared.muted}>No saved addresses yet.</Text>}
      />
      <Text style={shared.section}>Add address</Text>
      <AppTextInput placeholder="Label (Home, Work…)" value={label} onChangeText={setLabel} />
      <AppTextInput placeholder="Address line" value={line1} onChangeText={setLine1} />
      <Button title="Save address" onPress={() => addMut.mutate()} loading={addMut.isPending} />
    </StackScroll>
  );
}
