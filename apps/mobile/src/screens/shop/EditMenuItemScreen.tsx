import React, { useEffect, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthField } from '../../components/auth/AuthField';
import {
  createMenuItem,
  fetchMenuManagement,
  updateMenuItem} from '../../api/menuManagement';
import type { MenuStackParamList } from '../../navigation/types';
import { StackScroll } from '../../components/layout/StackScroll';
import type { MenuAddOn, MenuItemPayload, MenuVariant, SpicyLevel } from '../../types/menu';
import { colors, radii, placeholderColor } from '../../theme';
import { PhotoUploadRow } from '../../components/media/PhotoUploadRow';
import { pickImageWithChoice } from '../../utils/pickImage';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

type Props = NativeStackScreenProps<MenuStackParamList, 'EditMenuItem'>;

const SPICY_LABELS = ['None', 'Mild', 'Medium', 'Hot'] as const;

function emptyRow(): MenuVariant {
  return { name: '', price: 0 };
}

export function EditMenuItemScreen({ navigation, route }: Props) {
  const itemId = route.params?.itemId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [calories, setCalories] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [spicyLevel, setSpicyLevel] = useState<SpicyLevel>(0);
  const [variants, setVariants] = useState<MenuVariant[]>([]);
  const [addOns, setAddOns] = useState<MenuAddOn[]>([]);
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'out_of_stock'>('in_stock');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [autoDisableHours, setAutoDisableHours] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchMenuManagement();
        setCategories(data.categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })));
        if (itemId) {
          const item = data.items.find((i) => i.id === itemId);
          if (item) {
            setName(item.name);
            setPrice(String(item.price));
            setCategoryId(item.categoryId);
            setDescription(item.description);
            setPrepTime(String(item.preparationTimeMinutes));
            setCalories(item.calories != null ? String(item.calories) : '');
            setIsVeg(item.isVeg);
            setSpicyLevel(item.spicyLevel);
            setVariants(item.variants.length ? item.variants : []);
            setAddOns(item.addOns.length ? item.addOns : []);
            setStockStatus(item.stockStatus);
            setAvailableFrom(item.availableFrom ?? '');
            setAvailableUntil(item.availableUntil ?? '');
            setIsAvailable(item.isAvailable);
            setImagePreview(resolveMediaUrl(item.imageUrl));
          }
        } else if (data.categories[0]) {
          setCategoryId(data.categories[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]);

  function buildPayload(): MenuItemPayload {
    const priceNum = Number(price);
    let autoDisableAt: string | null = null;
    const hrs = Number(autoDisableHours);
    if (Number.isFinite(hrs) && hrs > 0) {
      autoDisableAt = new Date(Date.now() + hrs * 3600000).toISOString();
    }
    return {
      name: name.trim(),
      price: priceNum,
      categoryId,
      description: description.trim(),
      preparationTimeMinutes: Number(prepTime) || 15,
      isVeg,
      spicyLevel,
      calories: calories.trim() ? Number(calories) : null,
      variants: variants.filter((v) => v.name.trim() && v.price > 0),
      addOns: addOns.filter((a) => a.name.trim() && a.price >= 0),
      stockStatus,
      availableFrom: availableFrom.trim() || null,
      availableUntil: availableUntil.trim() || null,
      autoDisableAt,
      isAvailable,
      imageDataUrl: imageDataUrl ?? undefined};
  }

  async function pickItemPhoto() {
    const picked = await pickImageWithChoice();
    if (!picked) return;
    setImageDataUrl(picked.dataUrl);
    setImagePreview(picked.uri);
  }

  async function onSave() {
    const payload = buildPayload();
    if (!payload.name) {
      AppAlert.alert('Name required');
      return;
    }
    if (!payload.price || payload.price < 1) {
      AppAlert.alert('Valid price required');
      return;
    }
    if (!payload.categoryId) {
      AppAlert.alert('Category required', 'Create a category first from the Categories tab.');
      return;
    }
    if (!itemId && !imageDataUrl) {
      AppAlert.alert('Photo required', 'Add a photo for this menu item.');
      return;
    }
    setSaving(true);
    try {
      if (itemId) {
        await updateMenuItem(itemId, payload);
      } else {
        await createMenuItem({ ...payload, imageDataUrl: imageDataUrl! });
      }
      navigation.goBack();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function updateVariant(idx: number, field: 'name' | 'price', value: string) {
    setVariants((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      if (field === 'name') row.name = value;
      else row.price = Number(value) || 0;
      next[idx] = row;
      return next;
    });
  }

  function updateAddOn(idx: number, field: 'name' | 'price', value: string) {
    setAddOns((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      if (field === 'name') row.name = value;
      else row.price = Number(value) || 0;
      next[idx] = row;
      return next;
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} />
      </View>
    );
  }

  return (
    <StackScroll keyboardShouldPersistTaps="handled">
      <AuthField label="Dish name" large>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={placeholderColor} />
      </AuthField>
      <AuthField label="Base price (₹)" large>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          placeholderTextColor={placeholderColor}
        />
      </AuthField>

      <Text style={styles.section}>Category</Text>
      <View style={styles.chips}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, categoryId === c.id && styles.chipOn]}
            onPress={() => setCategoryId(c.id)}
          >
            <Text style={[styles.chipText, categoryId === c.id && styles.chipTextOn]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      <AuthField label="Description" large>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholderTextColor={placeholderColor}
        />
      </AuthField>

      <View style={styles.row}>
        <View style={styles.half}>
          <AuthField label="Prep (min)" large>
            <TextInput style={styles.input} value={prepTime} onChangeText={setPrepTime} keyboardType="number-pad" placeholderTextColor={placeholderColor} />
          </AuthField>
        </View>
        <View style={styles.half}>
          <AuthField label="Calories" large>
            <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholderTextColor={placeholderColor} />
          </AuthField>
        </View>
      </View>

      <View style={styles.vegRow}>
        <Text style={styles.vegLabel}>Vegetarian</Text>
        <Switch value={isVeg} onValueChange={setIsVeg} trackColor={{ true: colors.primary }} />
      </View>

      <Text style={styles.section}>Spicy level</Text>
      <View style={styles.chips}>
        {SPICY_LABELS.map((label, idx) => (
          <Pressable
            key={label}
            style={[styles.chip, spicyLevel === idx && styles.chipOn]}
            onPress={() => setSpicyLevel(idx as SpicyLevel)}
          >
            <Text style={[styles.chipText, spicyLevel === idx && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Variants (Small / Medium / Large)</Text>
      {variants.map((v, idx) => (
        <View key={idx} style={styles.pairRow}>
          <TextInput
            style={styles.pairInput}
            placeholder="Size name"
            placeholderTextColor={placeholderColor}
            value={v.name}
            onChangeText={(t) => updateVariant(idx, 'name', t)}
          />
          <TextInput
            style={styles.pairPrice}
            placeholder="₹"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            value={v.price ? String(v.price) : ''}
            onChangeText={(t) => updateVariant(idx, 'price', t)}
          />
          <Pressable onPress={() => setVariants((p) => p.filter((_, i) => i !== idx))}>
            <Text style={styles.danger}>×</Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.miniBtn} onPress={() => setVariants((p) => [...p, emptyRow()])}>
        <Text style={styles.miniBtnText}>+ Add variant</Text>
      </Pressable>

      <Text style={styles.section}>Add-ons (cheese, sauce, combo)</Text>
      {addOns.map((a, idx) => (
        <View key={idx} style={styles.pairRow}>
          <TextInput
            style={styles.pairInput}
            placeholder="Add-on name"
            placeholderTextColor={placeholderColor}
            value={a.name}
            onChangeText={(t) => updateAddOn(idx, 'name', t)}
          />
          <TextInput
            style={styles.pairPrice}
            placeholder="₹"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            value={a.price ? String(a.price) : ''}
            onChangeText={(t) => updateAddOn(idx, 'price', t)}
          />
          <Pressable onPress={() => setAddOns((p) => p.filter((_, i) => i !== idx))}>
            <Text style={styles.danger}>×</Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.miniBtn} onPress={() => setAddOns((p) => [...p, emptyRow()])}>
        <Text style={styles.miniBtnText}>+ Add add-on</Text>
      </Pressable>

      <Text style={styles.section}>Availability</Text>
      <View style={styles.vegRow}>
        <Text style={styles.vegLabel}>Listed / enabled</Text>
        <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
      </View>
      <View style={styles.vegRow}>
        <Text style={styles.vegLabel}>In stock</Text>
        <Switch
          value={stockStatus === 'in_stock'}
          onValueChange={(v) => setStockStatus(v ? 'in_stock' : 'out_of_stock')}
          trackColor={{ true: colors.primary }}
        />
      </View>
      <AuthField label="Available from (HH:mm)" large>
        <TextInput style={styles.input} value={availableFrom} onChangeText={setAvailableFrom} placeholder="09:00" placeholderTextColor={placeholderColor} />
      </AuthField>
      <AuthField label="Available until (HH:mm)" large>
        <TextInput style={styles.input} value={availableUntil} onChangeText={setAvailableUntil} placeholder="22:00" placeholderTextColor={placeholderColor} />
      </AuthField>
      <AuthField label="Auto-disable after (hours)" large>
        <TextInput
          style={styles.input}
          value={autoDisableHours}
          onChangeText={setAutoDisableHours}
          keyboardType="number-pad"
          placeholder="e.g. 8"
          placeholderTextColor={placeholderColor}
        />
      </AuthField>

      <PhotoUploadRow
        label="Item photo"
        hint={itemId ? 'Optional — replaces current photo' : 'Required for new items'}
        previewUri={imagePreview}
        uploaded={!!imagePreview}
        loading={saving}
        onPress={() => void pickItemPhoto()}
      />

      <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={onSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.saveText}>{itemId ? 'Save changes' : 'Create item'}</Text>
        )}
      </Pressable>
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  input: { flex: 1, color: colors.text, fontSize: 16 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10},
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBg},
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: '600' },
  chipTextOn: { color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  vegRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12},
  vegLabel: { color: colors.text, fontWeight: '600' },
  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pairInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    padding: 10},
  pairPrice: {
    width: 72,
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    padding: 10},
  danger: { color: colors.error, fontSize: 22, fontWeight: '700', paddingHorizontal: 4 },
  miniBtn: { marginBottom: 8 },
  miniBtnText: { color: colors.primaryBright, fontWeight: '700' },
  saveBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center'},
  saveText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 }});
