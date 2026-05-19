import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Switch} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenShell } from '../../components/ScreenShell';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import { AuthField } from '../../components/auth/AuthField';
import { placeholderColor } from '../../theme';
import {
  createShopMenuItem,
  deleteShopMenuItem,
  fetchMyRestaurantRegistration,
  fetchMyShopMenu,
  type ShopMenuItem} from '../../api/shopOwner';
import { colors, radii } from '../../theme';

export function ShopMenuScreen() {
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Your shop is still pending for approval');
  const [items, setItems] = useState<ShopMenuItem[]>([]);
  const [shopName, setShopName] = useState('');

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('General');
  const [isVeg, setIsVeg] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reg, menu] = await Promise.all([
        fetchMyRestaurantRegistration(),
        fetchMyShopMenu(),
      ]);
      setShopName(reg?.name ?? 'Your shop');
      setApproved(menu.approved);
      setStatusMsg(menu.message ?? 'Your shop is still pending for approval');
      setItems(menu.items);
    } catch (e) {
      setApproved(false);
      setStatusMsg(e instanceof Error ? e.message : 'Could not load menu');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onAddItem() {
    const priceNum = Number(price);
    if (!name.trim()) {
      AppAlert.alert('Name required', 'Enter a dish name');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      AppAlert.alert('Price required', 'Enter a valid price');
      return;
    }
    setSaving(true);
    try {
      await createShopMenuItem({
        name: name.trim(),
        price: priceNum,
        category: category.trim() || 'General',
        isVeg});
      setName('');
      setPrice('');
      await load();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Could not add item');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: ShopMenuItem) {
    AppAlert.alert('Remove item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteShopMenuItem(item.id);
            await load();
          } catch (e) {
            AppAlert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  if (!approved) {
    return (
      <ScreenShell scroll contentStyle={styles.screen}>
        <Text style={styles.title}>Menu</Text>
        <AuthHeroCard compact>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Pending approval</Text>
          </View>
          <Text style={styles.pendingTitle}>{statusMsg}</Text>
          <Text style={styles.pendingSub}>
            {shopName} must be approved by Zygo admin before you can add menu items. Check the
            Hub tab for registration status, or wait for approval after submitting your shop
            details.
          </Text>
        </AuthHeroCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll keyboard contentStyle={styles.screen}>
      <Text style={styles.title}>Menu · {shopName}</Text>
      <Text style={styles.sub}>Add dishes customers can order from your restaurant.</Text>

      <AuthHeroCard compact>
        <Text style={styles.sectionTitle}>Add menu item</Text>
        <AuthField label="Dish name" large>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Masala Dosa"
            placeholderTextColor={placeholderColor}
          />
        </AuthField>
        <View style={styles.row}>
          <View style={styles.half}>
            <AuthField label="Price (₹)" large>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                placeholder="199"
                placeholderTextColor={placeholderColor}
              />
            </AuthField>
          </View>
          <View style={styles.half}>
            <AuthField label="Category" large>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Starters"
                placeholderTextColor={placeholderColor}
              />
            </AuthField>
          </View>
        </View>
        <View style={styles.vegRow}>
          <Text style={styles.vegLabel}>Vegetarian</Text>
          <Switch value={isVeg} onValueChange={setIsVeg} trackColor={{ true: colors.primary }} />
        </View>
        <Pressable style={[styles.addBtn, saving && styles.btnDisabled]} onPress={onAddItem} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.addBtnText}>Add to menu</Text>
          )}
        </Pressable>
      </AuthHeroCard>

      <Text style={styles.sectionTitle}>Your menu ({items.length})</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No items yet. Add your first dish above.</Text>
      ) : (
        items.map((item) => (
          <AuthHeroCard compact key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={styles.itemBody}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  ₹{item.price} · {item.category} · {item.isVeg ? 'Veg' : 'Non-veg'}
                </Text>
              </View>
              <Pressable onPress={() => onDelete(item)} hitSlop={8}>
                <Text style={styles.delete}>Remove</Text>
              </Pressable>
            </View>
          </AuthHeroCard>
        ))
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background},
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: 12},
  pendingBadgeText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryBright,
    marginBottom: 10,
    lineHeight: 26},
  pendingSub: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8},
  input: { flex: 1, color: colors.text, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  vegRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16},
  vegLabel: { color: colors.text, fontWeight: '600' },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center'},
  addBtnText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.65 },
  empty: { color: colors.textMuted, marginBottom: 24 },
  itemCard: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemBody: { flex: 1 },
  itemName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  itemMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  delete: { color: colors.error, fontWeight: '700', fontSize: 13 }});
