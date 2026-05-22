import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import type { ProfileStackProps } from '../../navigation/types';
import { fetchSavedAddresses, setDefaultSavedAddress, deleteSavedAddress } from '../../api/addresses';
import type { SavedAddress } from '../../api/addresses';
import { SavedAddressCard } from '../../components/profile/SavedAddressCard';
import { GlassCard } from '../../components/neon/GlassCard';
import { AppAlert } from '../../alert';
import { getFreshMapCoordinates } from '../../services/location';
import { distanceKm } from '../../utils/addressDisplay';
import { colors, radii, spacing } from '../../theme';

type Props = ProfileStackProps<'SavedAddresses'>;

export function SavedAddressesScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: addresses, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchSavedAddresses,
  });

  useFocusEffect(
    useCallback(() => {
      void getFreshMapCoordinates()
        .then(setUserCoords)
        .catch(() => setUserCoords(null));
      void refetch();
    }, [refetch])
  );

  function distanceLabel(addr: SavedAddress): string | null {
    if (!userCoords || !addr.coordinates.lat) return null;
    const km = distanceKm(userCoords, addr.coordinates);
    if (km == null) return null;
    if (km < 0.15) return null;
    return `${km.toFixed(2)} km`;
  }

  function isHere(addr: SavedAddress): boolean {
    if (!userCoords || !addr.coordinates.lat) return Boolean(addr.isDefault);
    const km = distanceKm(userCoords, addr.coordinates);
    return km != null && km < 0.15;
  }

  function onMore(addr: SavedAddress) {
    AppAlert.alert(addr.label, undefined, [
      {
        text: 'Set as default',
        onPress: () => {
          void setDefaultSavedAddress(addr._id)
            .then(() => {
              void qc.invalidateQueries({ queryKey: ['addresses'] });
              void refetch();
            })
            .catch((e) =>
              AppAlert.alert('Error', e instanceof Error ? e.message : 'Could not update')
            );
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          AppAlert.alert('Delete address', `Remove ${addr.label}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                void deleteSavedAddress(addr._id)
                  .then(() => {
                    void qc.invalidateQueries({ queryKey: ['addresses'] });
                    void refetch();
                  })
                  .catch((e) =>
                    AppAlert.alert('Error', e instanceof Error ? e.message : 'Could not delete')
                  );
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  const list = addresses ?? [];

  return (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>Your saved addresses</Text>
      <FlatList
        data={list}
        keyExtractor={(a) => a._id}
        contentContainerStyle={styles.list}
        onRefresh={() => void refetch()}
        refreshing={isRefetching}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <GlassCard style={styles.empty}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySub}>Add home, work, or other places for faster checkout.</Text>
          </GlassCard>
        }
        renderItem={({ item }) => (
          <SavedAddressCard
            address={item}
            distanceLabel={distanceLabel(item)}
            isHere={isHere(item)}
            onPin={() => {
              void setDefaultSavedAddress(item._id)
                .then(() => {
                  void qc.invalidateQueries({ queryKey: ['addresses'] });
                  void refetch();
                })
                .catch((e) =>
                  AppAlert.alert('Error', e instanceof Error ? e.message : 'Could not pin')
                );
            }}
            onMore={() => onMore(item)}
          />
        )}
        ListFooterComponent={
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={() => navigation.navigate('AddSavedAddress')}
          >
            <Text style={styles.addPlus}>+</Text>
            <Text style={styles.addText}>Add new address</Text>
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  list: { paddingBottom: spacing.xl * 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 36, marginBottom: spacing.md },
  emptyTitle: { color: colors.lavender, fontWeight: '800', fontSize: 18 },
  emptySub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    gap: 10,
  },
  addBtnPressed: { opacity: 0.88 },
  addPlus: {
    color: colors.primaryBright,
    fontSize: 22,
    fontWeight: '800',
  },
  addText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
