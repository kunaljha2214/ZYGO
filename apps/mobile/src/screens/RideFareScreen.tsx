import React, { useEffect, useState } from 'react';

import { View, Text, Pressable } from 'react-native';
import { StackScroll } from '../components/layout/StackScroll';

import type { HomeStackProps } from '../navigation/types';

import { api } from '../api/client';

import { Button } from '../components/Button';

import { Card } from '../components/Card';

import { shared } from '../theme/styles';



type Vehicle = { id: string; label: string; baseFare: number; perKm: number; perMin: number };



type Props = HomeStackProps<'RideFare'>;



export function RideFareScreen({ navigation, route }: Props) {

  const { pickup, drop } = route.params;

  const [vehicleType, setVehicleType] = useState<string>('bike');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [estimate, setEstimate] = useState<{ distanceKm: number; durationMin: number; fare: number } | null>(

    null

  );

  const [booking, setBooking] = useState(false);

  const [bookErr, setBookErr] = useState<string | null>(null);



  useEffect(() => {

    void (async () => {

      try {

        const { data } = await api.get<{ vehicleTypes: Vehicle[] }>('/config/vehicle-types');

        setVehicles(data.vehicleTypes);

      } catch {

        setVehicles([

          { id: 'bike', label: 'Bike', baseFare: 25, perKm: 8, perMin: 1.5 },

          { id: 'auto', label: 'Auto', baseFare: 40, perKm: 12, perMin: 2 },

          { id: 'car', label: 'Car', baseFare: 60, perKm: 18, perMin: 2.5 },

        ]);

      }

    })();

  }, []);



  useEffect(() => {

    let cancelled = false;

    void (async () => {

      try {

        const { data } = await api.post<{ distanceKm: number; durationMin: number; fare: number }>(

          '/rides/estimate',

          {

            pickup: { coordinates: pickup.coordinates },

            drop: { coordinates: drop.coordinates },

            vehicleType}

        );

        if (!cancelled) setEstimate(data);

      } catch {

        if (!cancelled) setEstimate(null);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, [pickup.coordinates.lat, pickup.coordinates.lng, drop.coordinates.lat, drop.coordinates.lng, vehicleType]);



  async function confirm() {

    setBookErr(null);

    setBooking(true);

    try {

      const { data } = await api.post<{ id: string }>('/rides', {

        pickup,

        drop,

        vehicleType});

      navigation.replace('RideTrack', { rideId: data.id });

    } catch (e) {

      setBookErr(e instanceof Error ? e.message : 'Booking failed');

    } finally {

      setBooking(false);

    }

  }



  return (

    <StackScroll>

      <Text style={shared.sectionLabel}>Vehicle</Text>

      <View style={shared.vehicleRow}>

        {vehicles.map((v) => (

          <Pressable

            key={v.id}

            onPress={() => setVehicleType(v.id)}

            style={[shared.vehicleChip, vehicleType === v.id && shared.vehicleChipOn]}

          >

            <Text style={[shared.vehicleChipTxt, vehicleType === v.id && shared.vehicleChipTxtOn]}>

              {v.label}

            </Text>

          </Pressable>

        ))}

      </View>

      {estimate ? (

        <Card glow style={shared.box}>

          <Text style={shared.meta}>

            ~{estimate.distanceKm} km · ~{estimate.durationMin} min

          </Text>

          <Text style={shared.fare}>₹{estimate.fare.toFixed(2)}</Text>

          <Text style={shared.muted}>Pay cash to captain (MVP)</Text>

        </Card>

      ) : (

        <Text style={shared.muted}>Calculating fare…</Text>

      )}

      <Button title="Confirm ride" onPress={() => void confirm()} loading={booking} />

      {bookErr ? <Text style={shared.err}>{bookErr}</Text> : null}

    </StackScroll>

  );

}

