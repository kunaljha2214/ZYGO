import React, { useMemo, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  PermissionsAndroid,
  ActivityIndicator} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { RideMapView } from '../../components/rides/RideMapView';
import { MapMarker } from '../../components/rides/MapMarker';
import { AppScreen } from '../../components/layout/AppScreen';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import { AuthField } from '../../components/auth/AuthField';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import { AppTextInput } from '../../components/AppTextInput';
import {
  CUISINE_OPTIONS,
  DAY_LABELS,
  DEFAULT_MAP,
  SAMPLE_DOC_DATA_URL,
  defaultOpeningHours} from '../../constants/restaurantRegistration';
import {
  saveRestaurantRegistration,
  submitRestaurantRegistration,
  uploadRestaurantDocument} from '../../api/shopOwner';
import type {
  FoodServiceType,
  OwnerRestaurantRegistration,
  RestaurantRegistrationPayload} from '../../types/shopOwner';
import { colors, radii } from '../../theme';

const STEPS = ['Basics', 'Location', 'Licenses', 'Bank', 'Hours', 'Review'] as const;

type Props = {
  initial?: OwnerRestaurantRegistration | null;
  onSubmitted: (reg: OwnerRestaurantRegistration) => void;
};

export function RestaurantRegistrationScreen({ initial, onSubmitted }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [cuisine, setCuisine] = useState<string[]>(initial?.cuisine ?? []);
  const [foodType, setFoodType] = useState<FoodServiceType>(initial?.foodType ?? 'both');

  const [line1, setLine1] = useState(initial?.address?.line1 ?? '');
  const [line2, setLine2] = useState(initial?.address?.line2 ?? '');
  const [city, setCity] = useState(initial?.address?.city ?? 'Bengaluru');
  const [state, setState] = useState(initial?.address?.state ?? 'Karnataka');
  const [pincode, setPincode] = useState(initial?.address?.pincode ?? '');
  const [lat, setLat] = useState(initial?.location?.coordinates?.[1] ?? DEFAULT_MAP.lat);
  const [lng, setLng] = useState(initial?.location?.coordinates?.[0] ?? DEFAULT_MAP.lng);

  const [gstNumber, setGstNumber] = useState(initial?.gstNumber ?? '');
  const [panNumber, setPanNumber] = useState(initial?.panNumber ?? '');
  const [fssaiNumber, setFssaiNumber] = useState(initial?.fssaiNumber ?? '');
  const [gstDoc, setGstDoc] = useState(!!initial?.gstDocument);
  const [panDoc, setPanDoc] = useState(!!initial?.panDocument);
  const [fssaiDoc, setFssaiDoc] = useState(!!initial?.fssaiDocument);

  const [accountHolderName, setAccountHolderName] = useState(
    initial?.bankDetails?.accountHolderName ?? ''
  );
  const [accountNumber, setAccountNumber] = useState(initial?.bankDetails?.accountNumber ?? '');
  const [ifsc, setIfsc] = useState(initial?.bankDetails?.ifsc ?? '');
  const [bankName, setBankName] = useState(initial?.bankDetails?.bankName ?? '');

  const [openingHours, setOpeningHours] = useState(
    initial?.openingHours?.length ? initial.openingHours : defaultOpeningHours()
  );

  const payload = useMemo(
    (): RestaurantRegistrationPayload => ({
      name: name.trim(),
      address: { line1: line1.trim(), line2: line2.trim(), city: city.trim(), state: state.trim(), pincode: pincode.trim() },
      lat,
      lng,
      cuisine,
      foodType,
      openingHours,
      gstNumber: gstNumber.trim(),
      panNumber: panNumber.trim(),
      fssaiNumber: fssaiNumber.trim(),
      bankDetails: {
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        bankName: bankName.trim()}}),
    [
      name,
      line1,
      line2,
      city,
      state,
      pincode,
      lat,
      lng,
      cuisine,
      foodType,
      openingHours,
      gstNumber,
      panNumber,
      fssaiNumber,
      accountHolderName,
      accountNumber,
      ifsc,
      bankName,
    ]
  );

  function toggleCuisine(c: string) {
    setCuisine((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function useCurrentLocation() {
    if (Platform.OS === 'android') {
      const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (g !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    Geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => AppAlert.alert('Location', 'Could not get current location'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function uploadDoc(type: 'gst' | 'pan' | 'fssai', label: string) {
    setSaving(true);
    setErr(null);
    try {
      await saveRestaurantRegistration(payload);
      await uploadRestaurantDocument(type, SAMPLE_DOC_DATA_URL, `${label}-document.png`);
      if (type === 'gst') setGstDoc(true);
      if (type === 'pan') setPanDoc(true);
      if (type === 'fssai') setFssaiDoc(true);
      AppAlert.alert('Uploaded', `${label} document saved. Replace with a real scan before production.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!name.trim()) return 'Restaurant name is required';
      if (!cuisine.length) return 'Select at least one cuisine';
      return null;
    }
    if (step === 1) {
      if (!line1.trim()) return 'Street address is required';
      if (pincode.trim().length !== 6) return 'Enter a 6-digit pincode';
      return null;
    }
    if (step === 2) {
      if (!gstNumber.trim() || !panNumber.trim() || !fssaiNumber.trim()) {
        return 'GST, PAN, and FSSAI numbers are required';
      }
      if (!gstDoc || !panDoc || !fssaiDoc) return 'Upload all three license documents';
      return null;
    }
    if (step === 3) {
      if (!accountHolderName.trim() || !accountNumber.trim() || !ifsc.trim() || !bankName.trim()) {
        return 'Complete all bank fields';
      }
      return null;
    }
    return null;
  }

  async function saveDraft() {
    setSaving(true);
    setErr(null);
    try {
      await saveRestaurantRegistration(payload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function onNext() {
    const v = validateStep();
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    try {
      await saveDraft();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch {
      // err set in saveDraft
    }
  }

  async function onBack() {
    setErr(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit() {
    setSaving(true);
    setErr(null);
    try {
      await saveRestaurantRegistration(payload);
      const reg = await submitRestaurantRegistration();
      onSubmitted(reg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <>
            <AuthField label="Restaurant name" large>
              <AppTextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Spice Route Kitchen" />
            </AuthField>
            <Text style={styles.sectionLabel}>Cuisine type</Text>
            <View style={styles.chips}>
              {CUISINE_OPTIONS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, cuisine.includes(c) && styles.chipOn]}
                  onPress={() => toggleCuisine(c)}
                >
                  <Text style={[styles.chipText, cuisine.includes(c) && styles.chipTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Veg / Non-veg</Text>
            <View style={styles.row}>
              {(['veg', 'non_veg', 'both'] as FoodServiceType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.foodChip, foodType === t && styles.chipOn]}
                  onPress={() => setFoodType(t)}
                >
                  <Text style={[styles.chipText, foodType === t && styles.chipTextOn]}>
                    {t === 'veg' ? 'Veg' : t === 'non_veg' ? 'Non-veg' : 'Both'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      case 1:
        return (
          <>
            <Text style={styles.stepHint}>Enter your shop address and pin it on the map.</Text>
            <AuthField label="Street address" large>
              <AppTextInput style={styles.input} value={line1} onChangeText={setLine1} placeholder="Building, street" />
            </AuthField>
            <AuthField label="Area (optional)" large>
              <AppTextInput style={styles.input} value={line2} onChangeText={setLine2} placeholder="Landmark" />
            </AuthField>
            <View style={styles.row}>
              <View style={styles.half}>
                <AuthField label="City" large>
                  <AppTextInput style={styles.input} value={city} onChangeText={setCity} />
                </AuthField>
              </View>
              <View style={styles.half}>
                <AuthField label="State" large>
                  <AppTextInput style={styles.input} value={state} onChangeText={setState} />
                </AuthField>
              </View>
            </View>
            <AuthField label="Pincode" large>
              <AppTextInput
                style={styles.input}
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </AuthField>
            <Pressable style={styles.linkBtn} onPress={useCurrentLocation}>
              <Text style={styles.linkBtnText}>Use current location on map</Text>
            </Pressable>
            <View style={styles.mapWrap}>
              <RideMapView
                style={styles.map}
                region={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                onPress={(e) => {
                  setLat(e.nativeEvent.coordinate.latitude);
                  setLng(e.nativeEvent.coordinate.longitude);
                }}
              >
                <MapMarker
                  coordinate={{ latitude: lat, longitude: lng }}
                  draggable
                  onDragEnd={(e) => {
                    setLat(e.nativeEvent.coordinate.latitude);
                    setLng(e.nativeEvent.coordinate.longitude);
                  }}
                />
              </RideMapView>
            </View>
          </>
        );
      case 2:
        return (
          <>
            <AuthField label="GST number" large>
              <AppTextInput style={styles.input} value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" />
            </AuthField>
            <DocRow label="GST certificate" uploaded={gstDoc} onUpload={() => uploadDoc('gst', 'GST')} loading={saving} />
            <AuthField label="PAN number" large>
              <AppTextInput style={styles.input} value={panNumber} onChangeText={setPanNumber} autoCapitalize="characters" />
            </AuthField>
            <DocRow label="PAN card" uploaded={panDoc} onUpload={() => uploadDoc('pan', 'PAN')} loading={saving} />
            <AuthField label="FSSAI license number" large>
              <AppTextInput style={styles.input} value={fssaiNumber} onChangeText={setFssaiNumber} />
            </AuthField>
            <DocRow label="FSSAI license" uploaded={fssaiDoc} onUpload={() => uploadDoc('fssai', 'FSSAI')} loading={saving} />
            <Text style={styles.hint}>Document upload uses a placeholder file for now. Wire a camera/gallery picker before production.</Text>
          </>
        );
      case 3:
        return (
          <>
            <AuthField label="Account holder name" large>
              <AppTextInput style={styles.input} value={accountHolderName} onChangeText={setAccountHolderName} />
            </AuthField>
            <AuthField label="Account number" large>
              <AppTextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
            </AuthField>
            <AuthField label="IFSC" large>
              <AppTextInput style={styles.input} value={ifsc} onChangeText={setIfsc} autoCapitalize="characters" />
            </AuthField>
            <AuthField label="Bank name" large>
              <AppTextInput style={styles.input} value={bankName} onChangeText={setBankName} />
            </AuthField>
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.sectionLabel}>Opening hours</Text>
            {openingHours.map((h, idx) => (
              <View key={h.day} style={styles.hourRow}>
                <Pressable
                  style={[styles.dayBtn, h.closed && styles.dayBtnOff]}
                  onPress={() => {
                    const next = [...openingHours];
                    next[idx] = { ...h, closed: !h.closed };
                    setOpeningHours(next);
                  }}
                >
                  <Text style={styles.dayBtnText}>{DAY_LABELS[h.day]}</Text>
                </Pressable>
                {!h.closed ? (
                  <View style={styles.hourInputs}>
                    <AppTextInput
                      style={styles.hourInput}
                      value={h.open}
                      onChangeText={(t) => {
                        const next = [...openingHours];
                        next[idx] = { ...h, open: t };
                        setOpeningHours(next);
                      }}
                      placeholder="09:00"
                    />
                    <Text style={styles.hourDash}>–</Text>
                    <AppTextInput
                      style={styles.hourInput}
                      value={h.close}
                      onChangeText={(t) => {
                        const next = [...openingHours];
                        next[idx] = { ...h, close: t };
                        setOpeningHours(next);
                      }}
                      placeholder="22:00"
                    />
                  </View>
                ) : (
                  <Text style={styles.closedLabel}>Closed</Text>
                )}
              </View>
            ))}
          </>
        );
      default:
        return (
          <>
            <Text style={styles.reviewLine}><Text style={styles.reviewKey}>Name: </Text>{name}</Text>
            <Text style={styles.reviewLine}><Text style={styles.reviewKey}>Cuisine: </Text>{cuisine.join(', ')}</Text>
            <Text style={styles.reviewLine}><Text style={styles.reviewKey}>Food: </Text>{foodType}</Text>
            <Text style={styles.reviewLine}><Text style={styles.reviewKey}>Address: </Text>{line1}, {city}</Text>
            <Text style={styles.reviewLine}><Text style={styles.reviewKey}>GST / PAN / FSSAI: </Text>Uploaded</Text>
            <Text style={styles.reviewLine}><Text style={styles.reviewKey}>Bank: </Text>{bankName} · {ifsc}</Text>
            <Text style={styles.hint}>Submitting sends your restaurant for KYC verification and admin approval.</Text>
          </>
        );
    }
  }

  return (
    <AppScreen scroll keyboard tab>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Register restaurant</Text>
          <Text style={styles.sub}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
        </View>
        <RegistrationLogoutButton />
      </View>

      <View style={styles.progress}>
        {STEPS.map((_, i) => (
          <View key={STEPS[i]} style={[styles.dot, i <= step && styles.dotOn]} />
        ))}
      </View>

      <AuthHeroCard compact>{renderStep()}</AuthHeroCard>

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <View style={styles.nav}>
        {step > 0 ? (
          <Pressable style={styles.secondaryBtn} onPress={onBack} disabled={saving}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}
        {step < STEPS.length - 1 ? (
          <Pressable style={styles.primaryBtn} onPress={onNext} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.primaryBtnText}>Save & next</Text>}
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={onSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.primaryBtnText}>Submit for approval</Text>}
          </Pressable>
        )}
      </View>
    </AppScreen>
  );
}

function DocRow({
  label,
  uploaded,
  onUpload,
  loading}: {
  label: string;
  uploaded: boolean;
  onUpload: () => void;
  loading: boolean;
}) {
  return (
    <View style={styles.docRow}>
      <Text style={styles.docLabel}>{label}</Text>
      {uploaded ? (
        <Text style={styles.docOk}>✓ Uploaded</Text>
      ) : (
        <Pressable style={styles.docBtn} onPress={onUpload} disabled={loading}>
          <Text style={styles.docBtnText}>Upload document</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4},
  headerText: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 14 },
  stepHint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14},
  progress: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.glassBorder },
  dotOn: { backgroundColor: colors.primary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4},
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBg},
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: colors.text },
  foodChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    backgroundColor: colors.inputBg},
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 4 },
  linkBtn: { marginBottom: 12 },
  linkBtnText: { color: colors.primaryBright, fontWeight: '600' },
  mapWrap: { height: 200, borderRadius: radii.lg, overflow: 'hidden', marginBottom: 8 },
  map: { flex: 1 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
  docLabel: { color: colors.text, fontWeight: '600', flex: 1 },
  docOk: { color: colors.primaryBright, fontWeight: '700' },
  docBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.primary},
  docBtnText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  hourRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  dayBtn: {
    width: 44,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center'},
  dayBtnOff: { opacity: 0.45 },
  dayBtnText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  hourInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hourInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14},
  hourDash: { color: colors.textMuted },
  closedLabel: { flex: 1, color: colors.textMuted, fontStyle: 'italic' },
  reviewLine: { color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 6 },
  reviewKey: { color: colors.text, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  err: { color: colors.error, marginTop: 12, lineHeight: 20 },
  nav: { flexDirection: 'row', gap: 12, marginTop: 20 },
  navSpacer: { flex: 1 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52},
  primaryBtnText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center'},
  secondaryBtnText: { color: colors.textSecondary, fontWeight: '700' }});
