/**
 * Zygo customer app — food + rides MVP
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/queryClient';
import { navigationRef } from './src/navigation/navigationRef';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { AlertHost } from './src/components/alert/AlertHost';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { colors, navigationTheme } from './src/theme';
import { ensureMapboxInitialized } from './src/config/mapboxInit';
function AppBootstrap() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void ensureMapboxInitialized().catch(() => {});
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <RootNavigator isAuthed={Boolean(token)} user={user} />;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const navKey = token ? `navigation-authed-${userId ?? 'user'}` : 'navigation-guest';

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef} key={navKey} theme={navigationTheme}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          <AppBootstrap />
          <AlertHost />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
