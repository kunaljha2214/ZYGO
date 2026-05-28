import React, { useCallback, useRef, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../../components/layout/AppScreen';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { DriverOnlineToggle } from '../../components/driver/DriverOnlineToggle';
import { DriverHubMap } from '../../components/driver/DriverHubMap';
import { DriverMenuLink } from '../../components/driver/DriverMenuLink';
import {
  fetchActiveRide,
  fetchDriverProfile,
  fetchDriverEarningsDashboard,
  fetchIncomingRide,
  setDriverOnline,
  updateDriverLocation,
} from '../../api/driver';
import { getDriverHubCache, setDriverHubCache } from '../../store/driverHubCache';
import { setDriverProfileCache } from '../../store/partnerProfileCache';
import { useDriverRequestStore } from '../../store/driverRequestStore';
import type { DriverPartnerStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';
import { startBackgroundLocation, stopBackgroundLocation } from '../../services/backgroundLocation';

type Nav = NativeStackNavigationProp<DriverPartnerStackParamList>;

export function DriverHubScreen() {
  const navigation = useNavigation<Nav>();
  const cached = getDriverHubCache();
  const hasLoadedOnce = useRef(!!cached);
  const busyFixDone = useRef(false);

  const [refreshing, setRefreshing] = useState(!cached);
  const [online, setOnline] = useState(cached?.online ?? false);
  const [togglePending, setTogglePending] = useState(false);
  const toggleLock = useRef(false);
  const [mapGestureActive, setMapGestureActive] = useState(false);
  const [earnings, setEarnings] = useState(cached?.earnings ?? null);
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
    (fast = false): Promise<{ lat: number; lng: number } | null> =>
      new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          fast
            ? { enableHighAccuracy: false, timeout: 5000, maximumAge: 120_000 }
            : { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      }),
    []
  );

  const load = useCallback(
    async (silent: boolean) => {
      if (silent || hasLoadedOnce.current) {
        setRefreshing(true);
      }

      try {
        const [p, e, active] = await Promise.all([
          fetchDriverProfile(),
          fetchDriverEarningsDashboard(),
          fetchActiveRide(),
        ]);

        setOnline(p.isOnline);
        setDriverOnlineStore(p.isOnline);
        setDriverProfileCache(p);
        setEarnings(e);
        setDriverHubCache({ online: p.isOnline, earnings: e });
        hasLoadedOnce.current = true;

        if (p.isBusy && !active && !busyFixDone.current) {
          busyFixDone.current = true;
          const coords = await readCoords(true);
          await setDriverOnline(false);
          if (coords) {
            await updateDriverLocation(coords.lat, coords.lng);
            const again = await setDriverOnline(true, coords);
            setOnline(again.isOnline);
            setDriverOnlineStore(again.isOnline);
            setDriverHubCache({
              online: again.isOnline,
              earnings: e,
            });
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
        } else if (!silent) {
          setIncoming(null);
        }

        if (active && !silent) {
          navigation.navigate('DriverActive');
        }
      } finally {
        setRefreshing(false);
      }
    },
    [navigation, pushLocation, readCoords, setDriverOnlineStore, setIncoming]
  );

  useFocusEffect(
    useCallback(() => {
      void load(hasLoadedOnce.current);
      return undefined;
    }, [load])
  );

  const toggleOnline = useCallback(
    async (value: boolean) => {
      if (toggleLock.current) return;
      toggleLock.current = true;

      const previous = online;
      setOnline(value);
      setDriverOnlineStore(value);
      setTogglePending(true);

      try {
        let coords: { lat: number; lng: number } | null = null;

        if (value) {
          const granted = await ensureLocationPermission();
          if (!granted) {
            setOnline(false);
            setDriverOnlineStore(false);
            AppAlert.alert('Location needed', 'Allow location access to receive ride requests near you.');
            return;
          }
          coords = await readCoords(true);
        }

        const res = await setDriverOnline(value, coords ?? undefined);
        setOnline(res.isOnline);
        setDriverOnlineStore(res.isOnline);
        if (earnings) {
          setDriverHubCache({ online: res.isOnline, earnings });
        }

        if (value) {
          if (res.incomingRequest) setIncoming(res.incomingRequest);
          void fetchIncomingRide().then((req) => {
            if (req) setIncoming(req);
          });
          pushLocation();
          await startBackgroundLocation('driver');
        } else {
          setIncoming(null);
          await stopBackgroundLocation();
        }
      } catch (e) {
        setOnline(previous);
        setDriverOnlineStore(previous);
        AppAlert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setTogglePending(false);
        toggleLock.current = false;
      }
    },
    [online, ensureLocationPermission, readCoords, setDriverOnlineStore, setIncoming, pushLocation, earnings]
  );

  return (
    <AppScreen
      scroll
      scrollEnabled={!mapGestureActive}
      nestedScrollEnabled
      tab
      eyebrow="Rides"
      title="Driver Hub"
      subtitle="Go online to receive real-time ride requests"
    >
      {refreshing ? (
        <View style={styles.refreshRow}>
          <ActivityIndicator size="small" color={colors.primaryBright} />
          <Text style={styles.refreshText}>Updating…</Text>
        </View>
      ) : null}

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

      <DriverOnlineToggle online={online} pending={togglePending} onToggle={(v) => void toggleOnline(v)} />
      <View
        onTouchStart={() => setMapGestureActive(true)}
        onTouchEnd={() => setMapGestureActive(false)}
        onTouchCancel={() => setMapGestureActive(false)}
      >
        <DriverHubMap online={online} />
      </View>

      <Text style={styles.section}>Quick stats</Text>
      <View style={styles.metrics}>
        <MetricCard label="Today" value={formatInr(earnings?.todayEarnings)} accent={colors.primaryBright} />
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
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  refreshText: { color: colors.textMuted, fontSize: 12 },
  logoutRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  hint: { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  hintActive: { color: '#4ade80', fontWeight: '700', marginBottom: spacing.md },
  section: {
    color: colors.lavender,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  metrics: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
});
