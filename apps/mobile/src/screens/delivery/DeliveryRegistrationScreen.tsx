import React, { useState } from 'react';
import { AppAlert } from '../../alert';
import { View, Text, StyleSheet, Pressable, ActivityIndicator} from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import { SAMPLE_DOC_DATA_URL } from '../../constants/restaurantRegistration';
import {
  fetchDeliveryProfile,
  submitPartnerForReview,
  uploadPartnerDocument} from '../../api/deliveryPartner';
import type { DeliveryPartnerProfile } from '../../types/deliveryPartner';
import { colors, radii, spacing } from '../../theme';

const DOCS = [
  { type: 'aadhaar', label: 'Aadhaar' },
  { type: 'pan', label: 'PAN' },
  { type: 'driving_license', label: 'Driving license' },
  { type: 'rc', label: 'RC' },
  { type: 'profile_photo', label: 'Profile photo' },
] as const;

type Props = {
  initial?: DeliveryPartnerProfile | null;
  onSubmitted: (p: DeliveryPartnerProfile) => void;
};

export function DeliveryRegistrationScreen({ initial, onSubmitted }: Props) {
  const [profile, setProfile] = useState<DeliveryPartnerProfile | null>(initial ?? null);
  const [busy, setBusy] = useState(false);

  const upload = async (type: string, label: string) => {
    setBusy(true);
    try {
      const p = await uploadPartnerDocument(type, SAMPLE_DOC_DATA_URL, `${label}.png`);
      setProfile(p);
    } catch (e) {
      AppAlert.alert('Upload', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const p = await submitPartnerForReview();
      onSubmitted(p);
    } catch (e) {
      AppAlert.alert('Submit', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const docs = profile?.documents;

  return (
    <AppScreen scroll tab>
      <RegistrationLogoutButton />
      <Text style={styles.title}>Delivery partner verification</Text>
      <Text style={styles.sub}>Upload documents for admin approval before you can go online.</Text>
      <AuthHeroCard>
        {DOCS.map((d) => {
          const key =
            d.type === 'driving_license'
              ? 'drivingLicense'
              : d.type === 'profile_photo'
                ? 'profilePhoto'
                : d.type;
          const done = docs?.[key as keyof typeof docs];
          return (
            <Pressable
              key={d.type}
              style={styles.docBtn}
              onPress={() => void upload(d.type, d.label)}
              disabled={busy}
            >
              <Text style={styles.docText}>
                {d.label} {done ? '✓' : ''}
              </Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.submit} onPress={() => void submit()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.submitText}>Submit for review</Text>
          )}
        </Pressable>
      </AuthHeroCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { color: colors.textSecondary, marginBottom: spacing.lg, marginTop: spacing.xs },
  docBtn: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
  docText: { color: colors.lavender, fontWeight: '600' },
  submit: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center'},
  submitText: { color: colors.text, fontWeight: '800' }});
