import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { HomeStackProps } from '../navigation/types';
import { fetchNearbyRestaurants, type NearbyRestaurant } from '../api/restaurants';
import { AppScreen } from '../components/layout/AppScreen';
import { StackBackHeader } from '../components/layout/StackBackHeader';
import { GlassCard } from '../components/neon/GlassCard';
import { RestaurantListCard } from '../components/food/RestaurantListCard';
import { FoodDeliveryLocationFilter } from '../components/food/FoodDeliveryLocationFilter';
import {
  FOOD_DELIVERY_RADIUS_KM,
  type FoodDeliveryLocation,
} from '../store/foodDeliveryLocationStore';
import { colors, spacing } from '../theme';

type Props = HomeStackProps<'RestaurantList'>;

export function RestaurantListScreen({ navigation }: Props) {
  const [deliveryLoc, setDeliveryLoc] = useState<FoodDeliveryLocation | null>(null);

  const onLocationReady = useCallback((loc: FoodDeliveryLocation) => {
    setDeliveryLoc(loc);
  }, []);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      'restaurants-nearby',
      deliveryLoc?.coordinates.lat,
      deliveryLoc?.coordinates.lng,
      FOOD_DELIVERY_RADIUS_KM,
    ],
    queryFn: () =>
      fetchNearbyRestaurants(
        deliveryLoc!.coordinates.lat,
        deliveryLoc!.coordinates.lng,
        FOOD_DELIVERY_RADIUS_KM
      ),
    enabled: Boolean(deliveryLoc?.coordinates.lat && deliveryLoc?.coordinates.lng),
  });

  const count = data?.length ?? 0;
  const subtitle = deliveryLoc
    ? count
      ? `${count} within ${FOOD_DELIVERY_RADIUS_KM} km`
      : `No restaurants within ${FOOD_DELIVERY_RADIUS_KM} km`
    : 'Choose delivery location';

  return (
    <AppScreen scroll={false}>
      <StackBackHeader title="Restaurants" subtitle={subtitle} />
      <FoodDeliveryLocationFilter onLocationReady={onLocationReady} />

      {!deliveryLoc ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryBright} />
          <Text style={styles.hint}>Getting your location…</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryBright} />
        </View>
      ) : error ? (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Could not load restaurants'}
          </Text>
        </GlassCard>
      ) : (
        <FlatList
          style={styles.list}
          data={data ?? []}
          keyExtractor={(item) => item.id}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <GlassCard style={styles.empty}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No restaurants nearby</Text>
              <Text style={styles.emptySub}>
                No open restaurants within {FOOD_DELIVERY_RADIUS_KM} km of {deliveryLoc.label}.
                Try another saved address or current location.
              </Text>
            </GlassCard>
          }
          renderItem={({ item }) => (
            <RestaurantListCard
              name={item.name}
              rating={item.rating}
              cuisines={item.cuisine}
              distanceKm={item.distanceKm}
              isOpenNow={item.isOpenNow}
              availabilityLabel={item.availabilityLabel}
              onPress={() =>
                navigation.navigate('RestaurantDetail', { id: item.id, title: item.name })
              }
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  hint: { color: colors.textMuted, marginTop: spacing.md, fontSize: 14 },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xl },
  errorCard: { paddingVertical: spacing.lg },
  errorText: { color: colors.error, textAlign: 'center', lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 1.5 },
  emptyEmoji: { fontSize: 36, marginBottom: spacing.md },
  emptyTitle: { color: colors.lavender, fontWeight: '800', fontSize: 18, marginBottom: spacing.sm },
  emptySub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
