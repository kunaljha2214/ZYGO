import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  ActivityIndicator,
  Platform,
  PermissionsAndroid} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../../components/layout/AppScreen';
import { DeliveryHubMap } from '../../components/delivery/DeliveryHubMap';
import { MetricCard } from '../../components/dashboard/MetricCard';
import {
  fetchActiveDelivery,
  fetchDeliveryProfile,
  fetchEarningsDashboard,
  setPartnerOnline,
  updatePartnerLocation} from '../../api/deliveryPartner';
import { useDeliveryRequestStore } from '../../store/deliveryRequestStore';
import type { DeliveryPartnerStackParamList, DeliveryPartnerTabParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<DeliveryPartnerTabParamList, 'DeliveryHub'>,
  NativeStackNavigationProp<DeliveryPartnerStackParamList>
>;

export function DeliveryHubScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [earnings, setEarnings] = useState<Awaited<ReturnType<typeof fetchEarningsDashboard>> | null>(null);
  const [mapGestureActive, setMapGestureActive] = useState(false);
  const incoming = useDeliveryRequestStore((s) => s.incoming);

  const ensureLocationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return g === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const pushLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (pos) => {
        void updatePartnerLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e, active] = await Promise.all([
        fetchDeliveryProfile(),
        fetchEarningsDashboard(),
        fetchActiveDelivery(),
      ]);
      setOnline(p.isOnline);
      setEarnings(e);
      if (active) navigation.navigate('DeliveryTrip');
    } catch {
      /* gated by PartnerStack */
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggleOnline = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) {
        await ensureLocationPermission();
        pushLocation();
      }
      const res = await setPartnerOnline(value);
      setOnline(res.isOnline);
      if (value) {
        AppAlert.alert(
          'You are online',
          'Keep this app open on the Hub tab. New orders appear when the shop marks them ready for pickup.'
        );
      }
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  return (
    <AppScreen
      scroll
      scrollEnabled={!mapGestureActive}
      nestedScrollEnabled
      tab
      eyebrow="Delivery"
      title="Delivery Hub"
      subtitle="Go online to receive real-time orders"
    >
      {!online ? (
        <Text style={styles.hint}>
          Turn on Online before the shop marks an order ready — otherwise you will not get delivery requests.
        </Text>
      ) : incoming ? (
        <Text style={styles.hintActive}>Incoming delivery request — use Accept / Reject below.</Text>
      ) : (
        <Text style={styles.hint}>Online — waiting for orders near you…</Text>
      )}
      <View style={styles.onlineRow}>
        <Text style={styles.onlineLabel}>{online ? 'You are online' : 'You are offline'}</Text>
        <Switch
          value={online}
          onValueChange={(v) => void toggleOnline(v)}
          disabled={busy}
          trackColor={{ true: colors.primary, false: colors.chip }}
        />
      </View>

      <View
        onTouchStart={() => setMapGestureActive(true)}
        onTouchEnd={() => setMapGestureActive(false)}
        onTouchCancel={() => setMapGestureActive(false)}
      >
        <DeliveryHubMap online={online} />
      </View>

      {earnings ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="Today" value={`₹${earnings.todayEarnings}`} accent={colors.primaryBright} />
            <MetricCard label="Deliveries" value={String(earnings.todayDeliveries)} />
          </View>
          <View style={styles.metrics}>
            <MetricCard label="Rating" value={`${earnings.rating}★`} />
            <MetricCard label="Accept %" value={`${earnings.acceptanceRate}%`} />
          </View>
        </>
      ) : null}

      <Pressable style={styles.link} onPress={() => navigation.navigate('DeliveryEarnings')}>
        <Text style={styles.linkText}>Earnings dashboard →</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate('DeliveryWallet')}>
        <Text style={styles.linkText}>Wallet & payouts →</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate('DeliveryHistory')}>
        <Text style={styles.linkText}>Delivery history →</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  onlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg},
  hint: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  hintActive: { color: colors.primaryBright, marginBottom: spacing.md, fontWeight: '700' },
  onlineLabel: { color: colors.text, fontWeight: '700', fontSize: 16 },
  metrics: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  link: { paddingVertical: spacing.md },
  linkText: { color: colors.primaryBright, fontWeight: '700' }});
