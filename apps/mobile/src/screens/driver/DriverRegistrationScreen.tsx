import React, { useState } from 'react';
import { AppAlert } from '../../alert';
import { Text, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import { DriverDocUploadRow } from '../../components/driver/DriverDocUploadRow';
import { SAMPLE_DOC_DATA_URL } from '../../constants/restaurantRegistration';
import {
  submitDriverForReview,
  updateDriverVehicle,
  uploadDriverDocument} from '../../api/driver';
import type { DriverProfile } from '../../types/driver';
import { colors, radii, spacing } from '../../theme';

const DOCS = [
  { type: 'aadhaar', label: 'Aadhaar', optional: false },
  { type: 'pan', label: 'PAN', optional: false },
  { type: 'driving_license', label: 'Driving license', optional: false },
  { type: 'rc', label: 'RC', optional: false },
  { type: 'insurance', label: 'Insurance', optional: true },
  { type: 'selfie', label: 'Selfie verification', optional: false },
] as const;

type Props = {
  initial?: DriverProfile | null;
  onSubmitted: (p: DriverProfile) => void;
};

export function DriverRegistrationScreen({ initial, onSubmitted }: Props) {
  const [profile, setProfile] = useState<DriverProfile | null>(initial ?? null);
  const [vehicleModel, setVehicleModel] = useState(initial?.vehicleModel ?? '');
  const [vehicleNumber, setVehicleNumber] = useState(initial?.vehicleNumber ?? '');
  const [busy, setBusy] = useState(false);

  const saveVehicle = async () => {
    if (!vehicleModel.trim() || !vehicleNumber.trim()) {
      AppAlert.alert('Vehicle', 'Enter model and registration number');
      return;
    }
    setBusy(true);
    try {
      const p = await updateDriverVehicle(vehicleModel.trim(), vehicleNumber.trim());
      setProfile(p);
      AppAlert.alert('Saved', 'Vehicle details updated.');
    } catch (e) {
      AppAlert.alert('Vehicle', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (type: string, label: string) => {
    setBusy(true);
    try {
      const p = await uploadDriverDocument(type, SAMPLE_DOC_DATA_URL, `${label}.png`);
      setProfile(p);
    } catch (e) {
      AppAlert.alert('Upload', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!vehicleModel.trim() || !vehicleNumber.trim()) {
      AppAlert.alert('Vehicle', 'Save vehicle model and number first');
      return;
    }
    setBusy(true);
    try {
      await updateDriverVehicle(vehicleModel.trim(), vehicleNumber.trim());
      const p = await submitDriverForReview();
      onSubmitted(p);
    } catch (e) {
      AppAlert.alert('Submit', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const docs = profile?.documents;

  return (
    <AppScreen scroll tab eyebrow="Verification" title="Driver onboarding">
      <RegistrationLogoutButton />
      <Text style={styles.sub}>
        Add vehicle details and KYC documents. Admin must approve before you can go online.
      </Text>
      <AuthHeroCard>
        <Text style={styles.section}>Vehicle details</Text>
        <TextInput
          style={styles.input}
          placeholder="Bike / car model"
          placeholderTextColor={colors.textMuted}
          value={vehicleModel}
          onChangeText={setVehicleModel}
        />
        <TextInput
          style={styles.input}
          placeholder="Vehicle number (e.g. KA01AB1234)"
          placeholderTextColor={colors.textMuted}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
        />
        <Pressable style={styles.secondaryBtn} onPress={() => void saveVehicle()} disabled={busy}>
          <Text style={styles.secondaryBtnText}>Save vehicle</Text>
        </Pressable>

        <Text style={[styles.section, { marginTop: spacing.lg }]}>Documents</Text>
        {DOCS.map((d) => {
          const key =
            d.type === 'driving_license'
              ? 'drivingLicense'
              : d.type === 'selfie'
                ? 'selfie'
                : d.type;
          const done = docs?.[key as keyof typeof docs];
          return (
            <DriverDocUploadRow
              key={d.type}
              label={d.label}
              done={!!done}
              optional={d.optional}
              disabled={busy}
              onPress={() => void upload(d.type, d.label)}
            />
          );
        })}
        <Pressable style={styles.submit} onPress={() => void submit()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.submitText}>Submit for admin review</Text>
          )}
        </Pressable>
      </AuthHeroCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  section: {
    color: colors.lavender,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm},
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    padding: 14,
    color: colors.text,
    marginBottom: spacing.sm},
  secondaryBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: spacing.sm},
  secondaryBtnText: { color: colors.primaryBright, fontWeight: '700' },
  submit: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center'},
  submitText: { color: colors.text, fontWeight: '800' }});
