import React from 'react';

import { View, Text } from 'react-native';
import { StackScroll } from '../components/layout/StackScroll';

import { useRoute, type RouteProp } from '@react-navigation/native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { HomeStackParamList, OrdersStackParamList } from '../navigation/types';

import { api } from '../api/client';

import { StatusStepper } from '../components/StatusStepper';

import { Button } from '../components/Button';

import { Card } from '../components/Card';

import { shared } from '../theme/styles';



type Ride = {

  id: string;

  type: 'ride';

  pickup: { line1: string };

  drop: { line1: string };

  vehicleType: string;

  fare: number;

  status: string;

};



type R = RouteProp<HomeStackParamList, 'RideTrack'> | RouteProp<OrdersStackParamList, 'RideDetail'>;



export function RideTrackScreen() {

  const { rideId } = useRoute<R>().params;

  const qc = useQueryClient();



  const { data, isLoading, error } = useQuery({

    queryKey: ['ride', rideId],

    queryFn: async () => {

      const { data: r } = await api.get<Ride>(`/rides/${rideId}`);

      return r;

    },

    refetchInterval: 4000});



  const cancelMut = useMutation({

    mutationFn: async () => {

      await api.patch(`/rides/${rideId}/cancel`);

    },

    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ride', rideId] })});



  if (isLoading || !data) {

    return (

      <View style={shared.center}>

        <Text style={shared.muted}>{error ? String(error) : 'Loading…'}</Text>

      </View>

    );

  }



  const cancellable = data.status !== 'in_progress' && data.status !== 'completed';



  return (

    <StackScroll>

      <Text style={shared.fareAccent}>₹{data.fare.toFixed(2)}</Text>

      <Text style={shared.metaCap}>

        {data.vehicleType} · {data.status.replace(/_/g, ' ')}

      </Text>

      <StatusStepper kind="ride" status={data.status} />

      <Card glow style={shared.block}>

        <Text style={shared.h}>Pickup</Text>

        <Text style={shared.line}>{data.pickup.line1}</Text>

      </Card>

      <Card style={shared.block}>

        <Text style={shared.h}>Drop</Text>

        <Text style={shared.line}>{data.drop.line1}</Text>

      </Card>

      {cancellable && data.status !== 'cancelled' ? (

        <Button

          title="Cancel ride"

          variant="ghost"

          onPress={() => cancelMut.mutate()}

          loading={cancelMut.isPending}

        />

      ) : null}

    </StackScroll>

  );

}

