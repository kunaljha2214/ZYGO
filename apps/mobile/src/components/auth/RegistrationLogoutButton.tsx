import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { colors, radii } from '../../theme';

export function RegistrationLogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  const [busy, setBusy] = useState(false);

  async function onPress() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      style={[styles.btn, busy && styles.btnBusy]}
      onPress={() => void onPress()}
      disabled={busy}
      hitSlop={12}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primaryBright} />
      ) : (
        <Text style={styles.text}>Log out</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 72,
    alignItems: 'center',
    zIndex: 10,
    elevation: 4,
  },
  btnBusy: { opacity: 0.7 },
  text: {
    color: colors.primaryBright,
    fontWeight: '700',
    fontSize: 13,
  },
});
