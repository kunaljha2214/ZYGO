import React from 'react';

import { View, Text, FlatList, Pressable } from 'react-native';
import { useAppInsets } from '../hooks/useAppInsets';

import { useQuery } from '@tanstack/react-query';

import type { OrdersStackProps } from '../navigation/types';

import { api } from '../api/client';

import { Card } from '../components/Card';

import { shared } from '../theme/styles';



type FoodRow = {

  id: string;

  type: 'food';

  orderNumber: string;

  total: number;

  status: string;

  createdAt: string;

};



type RideRow = {

  id: string;

  type: 'ride';

  fare: number;

  status: string;

  createdAt: string;

  drop: { line1: string };

};



type Row = (FoodRow | RideRow) & { sortKey: number };



type Props = OrdersStackProps<'OrdersList'>;



export function OrdersListScreen({ navigation }: Props) {
  const inset = useAppInsets({ tab: true });

  const { data, isLoading, refetch, isRefetching } = useQuery({

    queryKey: ['orders-unified'],

    queryFn: async () => {

      const [foodRes, rideRes] = await Promise.all([

        api.get<FoodRow[]>('/orders'),

        api.get<RideRow[]>('/rides'),

      ]);

      const food: Row[] = foodRes.data.map((o) => ({

        ...o,

        sortKey: new Date(o.createdAt).getTime()}));

      const rides: Row[] = rideRes.data.map((r) => ({

        ...r,

        sortKey: new Date(r.createdAt).getTime()}));

      return [...food, ...rides].sort((a, b) => b.sortKey - a.sortKey);

    }});



  if (isLoading) {

    return (

      <View style={shared.center}>

        <Text style={shared.muted}>Loading…</Text>

      </View>

    );

  }



  return (

    <FlatList

      contentContainerStyle={inset.listContent}

      data={data}

      onRefresh={() => void refetch()}

      refreshing={isRefetching}

      keyExtractor={(item) => item.id}

      renderItem={({ item }) => (

        <Pressable

          onPress={() => {

            if (item.type === 'food') {

              navigation.navigate('FoodOrderDetail', { orderId: item.id });

            } else {

              navigation.navigate('RideDetail', { rideId: item.id });

            }

          }}

        >

          <Card glow>

            {item.type === 'food' ? (

              <>

                <Text style={shared.listTitle}>Food · {item.orderNumber}</Text>

                <Text style={shared.meta}>

                  ₹{item.total.toFixed(2)} · {item.status.replace(/_/g, ' ')}

                </Text>

              </>

            ) : (

              <>

                <Text style={shared.listTitle}>Ride · {item.drop.line1}</Text>

                <Text style={shared.meta}>

                  ₹{item.fare.toFixed(2)} · {item.status.replace(/_/g, ' ')}

                </Text>

              </>

            )}

          </Card>

        </Pressable>

      )}

      ListEmptyComponent={<Text style={shared.centerText}>No orders yet.</Text>}

    />

  );

}

