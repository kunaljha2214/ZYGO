import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { HomeStackProps } from '../navigation/types';
import { api } from '../api/client';
import { AppScreen } from '../components/layout/AppScreen';
import { StackBackHeader } from '../components/layout/StackBackHeader';
import { GlassCard } from '../components/neon/GlassCard';
import { RestaurantListCard } from '../components/food/RestaurantListCard';
import { colors, spacing } from '../theme';

type Restaurant = {
  id: string;
  name: string;
  cuisine: string[];
  rating: number;
  image?: string;
};

type Props = HomeStackProps<'RestaurantList'>;

export function RestaurantListScreen({ navigation }: Props) {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const { data: list } = await api.get<Restaurant[]>('/restaurants');
      return list;
    },
  });

  if (isLoading) {
    return (
      <AppScreen scroll={false}>
        <StackBackHeader title="Restaurants" subtitle="Loading menus…" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryBright} />
        </View>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen scroll={false}>
        <StackBackHeader title="Restaurants" />
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Could not load restaurants'}
          </Text>
        </GlassCard>
      </AppScreen>
    );
  }

  const count = data?.length ?? 0;

  return (
    <AppScreen scroll={false}>
      <StackBackHeader
        title="Restaurants"
        subtitle={count ? `${count} near you` : 'Food delivery'}
      />
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
            <Text style={styles.emptyTitle}>No restaurants available</Text>
            <Text style={styles.emptySub}>
              Shops may be closed or still awaiting approval. Pull down to refresh.
            </Text>
          </GlassCard>
        }
        renderItem={({ item }) => (
          <RestaurantListCard
            name={item.name}
            rating={item.rating}
            cuisines={item.cuisine}
            onPress={() =>
              navigation.navigate('RestaurantDetail', { id: item.id, title: item.name })
            }
          />
        )}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
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
