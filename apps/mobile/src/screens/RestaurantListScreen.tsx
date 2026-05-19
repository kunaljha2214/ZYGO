import React from 'react';

import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useAppInsets } from '../hooks/useAppInsets';

import { useQuery } from '@tanstack/react-query';

import type { HomeStackProps } from '../navigation/types';

import { api } from '../api/client';

import { Card } from '../components/Card';

import { colors } from '../theme';

import { shared } from '../theme/styles';



type Restaurant = {

  id: string;

  name: string;

  cuisine: string[];

  rating: number;

  image?: string;

};



type Props = HomeStackProps<'RestaurantList'>;



export function RestaurantListScreen({ navigation }: Props) {
  const inset = useAppInsets({ header: true });

  const { data, isLoading, error } = useQuery({

    queryKey: ['restaurants'],

    queryFn: async () => {

      const { data: list } = await api.get<Restaurant[]>('/restaurants');

      return list;

    }});



  if (isLoading) {

    return (

      <View style={shared.center}>

        <ActivityIndicator size="large" color={colors.primary} />

      </View>

    );

  }



  if (error) {

    return (

      <View style={shared.center}>

        <Text style={shared.err}>{error instanceof Error ? error.message : 'Error'}</Text>

      </View>

    );

  }



  return (

    <FlatList

      contentContainerStyle={inset.listContent}

      data={data ?? []}

      keyExtractor={(item) => item.id}

      ListEmptyComponent={
        <View style={shared.center}>
          <Text style={shared.muted}>No restaurants available right now.</Text>
          <Text style={[shared.muted, { marginTop: 8, fontSize: 13 }]}>
            Shops may be closed or still awaiting approval.
          </Text>
        </View>
      }

      renderItem={({ item }) => (

        <Pressable onPress={() => navigation.navigate('RestaurantDetail', { id: item.id, title: item.name })}>

          <Card glow>

            <Text style={shared.name}>{item.name}</Text>

            <Text style={shared.meta}>

              ★ {item.rating.toFixed(1)} · {item.cuisine.join(', ')}

            </Text>

          </Card>

        </Pressable>

      )}

    />

  );

}

