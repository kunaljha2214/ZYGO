import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../../components/layout/AppScreen';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { DriverOnlineToggle } from '../../components/driver/DriverOnlineToggle';
import { DriverMapPlaceholder } from '../../components/driver/DriverMapPlaceholder';
import { DriverMenuLink } from '../../components/driver/DriverMenuLink';
import {
  fetchActiveRide,
  fetchDriverProfile,
  fetchDriverEarningsDashboard,
  fetchIncomingRide,
  setDriverOnline,
  updateDriverLocation} from '../../api/driver';
import { useDriverRequestStore } from '../../store/driverRequestStore';
import type { DriverPartnerStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Nav = NativeStackNavigationProp<DriverPartnerStackParamList>;

export function DriverHubScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [earnings, setEarnings] = useState<Awaited<ReturnType<typeof fetchDriverEarningsDashboard>> | null>(
    null
  );
  const incoming = useDriverRequestStore((s) => s.incoming);
  const setIncoming = useDriverRequestStore((s) => s.setIncoming);
  const setDriverOnlineStore = useDriverRequestStore((s) => s.setDriverOnline);

  const ensureLocationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return g === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const pushLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (pos) => {
        void updateDriverLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  }, []);

  const readCoords = useCallback(
    (): Promise<{ lat: number; lng: number } | null> =>
      new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e, active] = await Promise.all([
        fetchDriverProfile(),
        fetchDriverEarningsDashboard(),
        fetchActiveRide(),
      ]);
      setOnline(p.isOnline);
      setDriverOnlineStore(p.isOnline);
      setEarnings(e);
      if (p.isBusy && !active) {
        const coords = await readCoords();
        await setDriverOnline(false);
        if (coords) {
          await updateDriverLocation(coords.lat, coords.lng);
          const again = await setDriverOnline(true, coords);
          setOnline(again.isOnline);
          setDriverOnlineStore(again.isOnline);
          if (again.incomingRequest) setIncoming(again.incomingRequest);
        }
        AppAlert.alert(
          'Availability fixed',
          'Stuck “busy” state was cleared. Stay Online to receive bike ride requests.'
        );
      }
      if (p.isOnline) {
        pushLocation();
        const req = await fetchIncomingRide();
        if (req) setIncoming(req);
      }
      if (active) navigation.navigate('DriverActive');
    } finally {
      setLoading(false);
    }
  }, [navigation, pushLocation, readCoords, setDriverOnlineStore, setIncoming]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggleOnline = async (value: boolean) => {
    setBusy(true);
    try {
      let coords: { lat: number; lng: number } | null = null;
      if (value) {
        const granted = await ensureLocationPermission();
        if (!granted) {
          AppAlert.alert('Location needed', 'Allow location access to receive ride requests near you.');
          return;
        }
        coords = await readCoords();
        if (coords) {
          await updateDriverLocation(coords.lat, coords.lng);
        }
      }
      const res = await setDriverOnline(value, coords ?? undefined);
      setOnline(res.isOnline);
      setDriverOnlineStore(res.isOnline);
      if (value) {
        if (res.incomingRequest) {
          setIncoming(res.incomingRequest);
        } else {
          const req = await fetchIncomingRide();
          if (req) setIncoming(req);
        }
        AppAlert.alert(
          'You are online',
          'Stay on this app with Online ON. When a customer books a Bike ride, Accept/Reject appears within ~90 seconds. If you booked first on another device, the offer is re-sent now.'
        );
      } else {
        setIncoming(null);
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
      tab
      eyebrow="Rides"
      title="Driver Hub"
      subtitle="Go online to receive real-time ride requests"
    >
      <View style={styles.logoutRow}>
        <RegistrationLogoutButton />
      </View>
      {!online ? (
        <Text style={styles.hint}>
          Turn on Online to receive ride requests. Use phone 9222222222 (ride driver), not the food delivery
          rider account 9444444444.
        </Text>
      ) : incoming ? (
        <Text style={styles.hintActive}>Incoming ride — Accept or Reject on the sheet below.</Text>
      ) : (
        <Text style={styles.hint}>Online — waiting for rides near you…</Text>
      )}

      <DriverOnlineToggle online={online} busy={busy} onToggle={(v) => void toggleOnline(v)} />
      <DriverMapPlaceholder online={online} />

      <Text style={styles.section}>Quick stats</Text>
      <View style={styles.metrics}>
        <MetricCard label="Today" value={`₹${earnings?.todayEarnings ?? 0}`} accent={colors.primaryBright} />
        <MetricCard label="Rides" value={String(earnings?.todayRides ?? 0)} />
      </View>
      <View style={styles.metrics}>
        <MetricCard label="Rating" value={`${earnings?.rating?.toFixed(1) ?? '—'}★`} />
        <MetricCard label="Incentive" value={`${earnings?.incentiveProgress ?? 0}%`} />
      </View>

      <Text style={styles.section}>More</Text>
      <DriverMenuLink
        icon="📊"
        label="Earnings dashboard"
        hint="Today, week, performance"
        onPress={() => navigation.navigate('DriverEarnings')}
      />
      <DriverMenuLink
        icon="💳"
        label="Wallet"
        hint="Pending & withdrawable balance"
        onPress={() => navigation.navigate('DriverWallet')}
      />
      <DriverMenuLink
        icon="🛣️"
        label="Ride history"
        hint="Past trips & ratings"
        onPress={() => navigation.navigate('DriverHistory')}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  logoutRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  hint: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  hintActive: { color: '#4ade80', fontWeight: '700', marginBottom: spacing.md },
  section: {
    color: colors.lavender,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.xs},
  metrics: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }});
