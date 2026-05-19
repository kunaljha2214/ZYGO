import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { AuthStackProps } from '../navigation/types';
import { Button } from '../components/Button';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenShell } from '../components/ScreenShell';
import { BrandMark } from '../components/BrandMark';
import { GlassCard } from '../components/neon/GlassCard';
import { SectionHeader } from '../components/neon/SectionHeader';
import { api } from '../api/client';
import { API_BASE_URL } from '../config/env';
import { colors, radii } from '../theme';

type Props = AuthStackProps<'Register'>;

type AccountType = 'customer' | 'delivery_partner' | 'shop_owner' | 'driver';
type Vehicle = 'bike' | 'auto' | 'car';

const ACCOUNT_CHIPS: { id: AccountType; label: string }[] = [
  { id: 'customer', label: 'User' },
  { id: 'delivery_partner', label: 'Delivery' },
  { id: 'shop_owner', label: 'Shop' },
  { id: 'driver', label: 'Driver' },
];

const VEHICLE_CHIPS: { id: Vehicle; label: string }[] = [
  { id: 'bike', label: 'Bike' },
  { id: 'auto', label: 'Auto' },
  { id: 'car', label: 'Car' },
];

export function RegisterScreen({ navigation }: Props) {
  const [accountType, setAccountType] = useState<AccountType>('customer');
  const [vehicle, setVehicle] = useState<Vehicle>('bike');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        accountType};
      if (accountType === 'driver') {
        body.driverVehicleType = vehicle;
      }
      const { data } = await api.post<{ sessionId: string; emailMask: string }>(
        '/auth/register/start',
        body
      );
      navigation.navigate('VerifyEmail', {
        sessionId: data.sessionId,
        emailMask: data.emailMask});
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'Registration failed';
      if (msg === 'Network Error') {
        msg =
          `Cannot reach API (${API_BASE_URL}). Start the API, then run:\n` +
          `adb reverse tcp:4000 tcp:4000`;
      }
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell scroll keyboard contentStyle={styles.content}>
      <BrandMark subtitle="Join Zygo in a few steps" />

      <GlassCard style={styles.card}>
        <SectionHeader title="Account type" />
        <View style={styles.chipRow}>
          {ACCOUNT_CHIPS.map((c) => {
            const active = accountType === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setAccountType(c.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {accountType === 'driver' ? (
          <>
            <SectionHeader title="Vehicle" />
            <View style={styles.chipRow}>
              {VEHICLE_CHIPS.map((v) => {
                const active = vehicle === v.id;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => setVehicle(v.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {v.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <SectionHeader title="Your details" />
        <AppTextInput label="Full name" placeholder="As on your ID" value={name} onChangeText={setName} />
        <AppTextInput
          label="Email"
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <AppTextInput
          label="Phone"
          placeholder="10+ digits"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <AppTextInput
          label="Password"
          placeholder="Min. 6 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.lastField}
        />
      </GlassCard>

      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Button title="Send verification code" onPress={onSubmit} loading={loading} />
      <View style={styles.gap} />
      <Button title="Back to sign in" variant="ghost" onPress={() => navigation.goBack()} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20 },
  card: { marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.glassBorder},
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4},
  chipText: { fontWeight: '600', color: colors.textSecondary, fontSize: 14 },
  chipTextActive: { color: colors.text, fontWeight: '700' },
  lastField: { marginBottom: 0 },
  err: { color: colors.error, marginBottom: 14, lineHeight: 20 },
  gap: { height: 12 }});
