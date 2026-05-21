import React, { useState } from 'react';
import { AppAlert } from '../alert';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthStackProps } from '../navigation/types';
import { GoogleIcon } from '../components/auth/GoogleIcon';
import { ScreenShell } from '../components/ScreenShell';
import { BrandMark } from '../components/BrandMark';
import { AuthHeroCard } from '../components/auth/AuthHeroCard';
import { AuthField, FieldIcon } from '../components/auth/AuthField';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config/env';
import { colors, radii, placeholderColor } from '../theme';

type Props = AuthStackProps<'Login'>;

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phone, setPhone] = useState('9999999999');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, '');
      const normalized =
        digits.length === 12 && digits.startsWith('91')
          ? digits.slice(2)
          : digits.length === 11 && digits.startsWith('0')
            ? digits.slice(1)
            : digits;
      const payload = { phone: normalized, password };
      const { data } = await api.post<{
        accessToken: string;
        user: {
          id: string;
          phone: string;
          name: string;
          role: string;
          email?: string | null;
          emailVerified?: boolean;
          driverVehicleType?: 'bike' | 'auto' | 'car' | null;
        };
      }>('/auth/login', payload);
      await setAuth(data.accessToken, data.user);
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'Login failed';
      if (msg === 'Invalid credentials') {
        msg =
          'Invalid phone or password. Demo rider: 9444444444 / password123 — run `npm run seed:users` if this account was never created.';
      }
      if (msg === 'Network Error') {
        msg =
          `Cannot reach API (${API_BASE_URL}). Check your internet connection and that the server is running.`;
      }
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  function onSocial(provider: string) {
    AppAlert.alert('Coming soon', `${provider} sign-in will be available in a future update.`);
  }

  const phoneValid = phone.trim().length >= 10;

  return (
    <ScreenShell
      keyboard
      auth
      scroll
      contentStyle={[
        styles.screen,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16},
      ]}
    >
      <BrandMark subtitle="Food & rides, one account" large centered compact />

      <AuthHeroCard compact>
        <Text style={styles.welcomeTitle}>Welcome back! 👋</Text>
        <Text style={styles.welcomeSub}>Sign in to continue to Zygo</Text>

        <AuthField label="Phone number" large>
          <FieldIcon>
            <Text style={styles.iconPurple}>📱</Text>
          </FieldIcon>
          <Pressable style={styles.dialCode}>
            <Text style={styles.dialText}>+91</Text>
            <Text style={styles.dialArrow}>▾</Text>
          </Pressable>
          <TextInput
            style={styles.inputFlex}
            placeholder="9999999999"
            placeholderTextColor={placeholderColor}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          {phoneValid ? (
            <FieldIcon>
              <Text style={styles.check}>✓</Text>
            </FieldIcon>
          ) : null}
        </AuthField>

        <AuthField label="Password" large>
          <FieldIcon>
            <Text style={styles.iconPurple}>🔒</Text>
          </FieldIcon>
          <TextInput
            style={styles.inputFlex}
            placeholder="Your password"
            placeholderTextColor={placeholderColor}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            <Text style={styles.eye}>{showPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </AuthField>

        <View style={styles.rowBetween}>
          <Pressable style={styles.remember} onPress={() => setRemember((v) => !v)}>
            <View style={[styles.checkbox, remember && styles.checkboxOn]}>
              {remember ? <Text style={styles.checkSmall}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              AppAlert.alert('Reset password', 'Contact support to reset your password.')
            }
          >
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        </View>

        {err ? (
          <Text style={styles.err} numberOfLines={3}>
            {err}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.signInBtn, loading && styles.signInDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            <Text style={styles.signInText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
            <Text style={styles.signInArrow}>→</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.googleBtn} onPress={() => onSocial('Google')}>
            <GoogleIcon size={24} />
            <Text style={styles.googleLabel}>Sign in with Google</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </AuthHeroCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingHorizontal: 18,
    gap: 20},
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryBright,
    marginBottom: 8},
  welcomeSub: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24},
  iconPurple: { fontSize: 18 },
  dialCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.glassBorder,
    gap: 4},
  dialText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  dialArrow: { color: colors.textMuted, fontSize: 10 },
  inputFlex: {
    flex: 1,
    fontSize: 17,
    color: colors.text,
    paddingVertical: 12},
  check: { color: colors.primaryBright, fontWeight: '800', fontSize: 18 },
  eye: { fontSize: 20, opacity: 0.85 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 6},
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'},
  checkboxOn: { backgroundColor: colors.primary },
  checkSmall: { color: colors.text, fontSize: 12, fontWeight: '800' },
  rememberText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  forgot: { color: colors.primaryBright, fontSize: 14, fontWeight: '600' },
  err: { color: colors.error, marginBottom: 12, lineHeight: 20, fontSize: 13 },
  actions: {
    marginTop: 20},
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gradientEnd,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    gap: 8},
  signInDisabled: { opacity: 0.65 },
  signInText: { color: colors.text, fontSize: 17, fontWeight: '800' },
  signInArrow: { color: colors.text, fontSize: 20, fontWeight: '700' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20},
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.glassBorder },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8},
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    marginBottom: 10},
  googleLabel: {
    color: '#3c4043',
    fontWeight: '600',
    fontSize: 16},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap'},
  footerText: { color: colors.textSecondary, fontSize: 15 },
  footerLink: { color: colors.primaryBright, fontSize: 15, fontWeight: '700' }});
