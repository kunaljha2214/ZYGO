import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Switch} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../../components/layout/AppScreen';
import { spacing } from '../../theme/spacing';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import {
  createCategory,
  deleteCategory,
  deleteMenuItem,
  exportMenuCsv,
  fetchAiSuggestions,
  fetchMenuManagement,
  importMenuCsv,
  patchItemAvailability,
  updateCategory} from '../../api/menuManagement';
import type { MenuCategory, MenuItemFull } from '../../types/menu';
import type { MenuStackParamList } from '../../navigation/types';
import { colors, radii, placeholderColor } from '../../theme';
type Tab = 'categories' | 'items' | 'tools';
type Nav = NativeStackNavigationProp<MenuStackParamList, 'MenuHome'>;

const SPICY_LABELS = ['None', 'Mild', 'Medium', 'Hot'] as const;

export function MenuManagementScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('items');
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Your shop is still pending for approval');
  const [shopName, setShopName] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItemFull[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [aiNote, setAiNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMenuManagement();
      setApproved(data.approved);
      setStatusMsg(data.message ?? statusMsg);
      setShopName(data.shopName ?? 'Your shop');
      setCategories(data.categories);
      setItems(data.items);
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

  async function onAddCategory() {
    if (!newCatName.trim()) return;
    try {
      await createCategory(newCatName.trim());
      setNewCatName('');
      await load();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  }

  async function onDeleteCategory(cat: MenuCategory) {
    AppAlert.alert('Delete category', `Remove "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(cat.id);
            await load();
          } catch (e) {
            AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
          }
        },
      },
    ]);
  }

  async function toggleCategory(cat: MenuCategory) {
    try {
      await updateCategory(cat.id, { isActive: !cat.isActive });
      await load();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  }

  async function toggleStock(item: MenuItemFull) {
    try {
      await patchItemAvailability(item.id, {
        stockStatus: item.stockStatus === 'in_stock' ? 'out_of_stock' : 'in_stock'});
      await load();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  }

  async function onDeleteItem(item: MenuItemFull) {
    AppAlert.alert('Delete item', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMenuItem(item.id);
            await load();
          } catch (e) {
            AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
          }
        },
      },
    ]);
  }

  async function onImportCsv() {
    try {
      const result = await importMenuCsv(csvText);
      AppAlert.alert('Imported', `${result.imported} items added`);
      setCsvText('');
      await load();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Import failed');
    }
  }

  async function onExportCsv() {
    try {
      const csv = await exportMenuCsv();
      setCsvText(csv);
      AppAlert.alert('Exported', 'CSV loaded below — copy or share from here.');
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Export failed');
    }
  }

  async function onAiSuggestions() {
    try {
      const data = await fetchAiSuggestions();
      setAiNote(
        `${data.note}\n\nCombos:\n${data.combos.map((c) => `• ${c.title} (₹${c.suggestedPrice})`).join('\n')}\n\nPricing:\n${data.pricing.map((p) => `• ${p.itemName}: ₹${p.currentPrice} → ₹${p.suggestion}`).join('\n')}`
      );
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
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
      <AppScreen scroll tab title="Menu management">
        <AuthHeroCard compact>
          <Text style={styles.pendingTitle}>{statusMsg}</Text>
          <Text style={styles.pendingSub}>
            After admin approves {shopName}, you can manage categories, items, variants, and
            availability here.
          </Text>
        </AuthHeroCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} tab title={shopName} subtitle="Menu management" contentStyle={styles.screen}>

      <View style={styles.segments}>
        {(['categories', 'items', 'tools'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.segment, tab === t && styles.segmentOn]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.segmentText, tab === t && styles.segmentTextOn]}>
              {t === 'categories' ? 'Categories' : t === 'items' ? 'Items' : 'Tools'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
        {tab === 'categories' ? (
          <>
            <View style={styles.addRow}>
              <TextInput
                style={styles.catInput}
                placeholder="New category (Pizza, Drinks…)"
                placeholderTextColor={placeholderColor}
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <Pressable style={styles.addBtn} onPress={onAddCategory}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {categories.length === 0 ? (
              <Text style={styles.muted}>No categories yet. Add Pizza, Burgers, Drinks, etc.</Text>
            ) : (
              categories.map((cat) => (
                <AuthHeroCard compact key={cat.id} style={styles.cardGap}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{cat.name}</Text>
                      <Text style={styles.muted}>Order: {cat.sortOrder}</Text>
                    </View>
                    <Switch value={cat.isActive} onValueChange={() => toggleCategory(cat)} />
                    <Pressable onPress={() => onDeleteCategory(cat)}>
                      <Text style={styles.danger}>Delete</Text>
                    </Pressable>
                  </View>
                </AuthHeroCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'items' ? (
          <>
            <Pressable
              style={styles.fab}
              onPress={() => navigation.navigate('EditMenuItem', {})}
            >
              <Text style={styles.fabText}>+ Add food item</Text>
            </Pressable>
            {items.length === 0 ? (
              <Text style={styles.muted}>No menu items. Add your first dish.</Text>
            ) : (
              items.map((item) => (
                <AuthHeroCard compact key={item.id} style={styles.cardGap}>
                  <Pressable onPress={() => navigation.navigate('EditMenuItem', { itemId: item.id })}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.muted}>
                      {item.category} · ₹{item.price} · {item.isVeg ? 'Veg' : 'Non-veg'} ·{' '}
                      {SPICY_LABELS[item.spicyLevel]}
                    </Text>
                    {item.description ? (
                      <Text style={styles.desc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <Text style={styles.muted}>
                      Prep {item.preparationTimeMinutes}m
                      {item.calories != null ? ` · ${item.calories} cal` : ''}
                      {item.variants.length ? ` · ${item.variants.length} variants` : ''}
                      {item.addOns.length ? ` · ${item.addOns.length} add-ons` : ''}
                    </Text>
                    <Text
                      style={[
                        styles.stock,
                        item.stockStatus === 'out_of_stock' && styles.stockOff,
                      ]}
                    >
                      {item.stockStatus === 'in_stock' ? 'In stock' : 'Out of stock'}
                      {!item.isActiveNow ? ' · Hidden now' : ' · Live'}
                    </Text>
                  </Pressable>
                  <View style={styles.itemActions}>
                    <Pressable onPress={() => toggleStock(item)}>
                      <Text style={styles.link}>
                        {item.stockStatus === 'in_stock' ? 'Mark out of stock' : 'Mark in stock'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => onDeleteItem(item)}>
                      <Text style={styles.danger}>Delete</Text>
                    </Pressable>
                  </View>
                </AuthHeroCard>
              ))
            )}
          </>
        ) : null}

        {tab === 'tools' ? (
          <>
            <AuthHeroCard compact>
              <Text style={styles.sectionTitle}>Bulk CSV</Text>
              <Text style={styles.muted}>
                Header: name,price,category,description,isVeg,spicyLevel,prepTime,calories
              </Text>
              <TextInput
                style={styles.csvArea}
                multiline
                value={csvText}
                onChangeText={setCsvText}
                placeholder="Paste CSV or export to fill…"
                placeholderTextColor={placeholderColor}
              />
              <View style={styles.toolRow}>
                <Pressable style={styles.toolBtn} onPress={onImportCsv}>
                  <Text style={styles.toolBtnText}>Import</Text>
                </Pressable>
                <Pressable style={[styles.toolBtn, styles.toolBtnAlt]} onPress={onExportCsv}>
                  <Text style={styles.toolBtnText}>Export</Text>
                </Pressable>
              </View>
            </AuthHeroCard>

            <AuthHeroCard compact style={styles.cardGap}>
              <Text style={styles.sectionTitle}>AI suggestions</Text>
              <Text style={styles.muted}>Popular combos and smart pricing (demo).</Text>
              <Pressable style={styles.toolBtn} onPress={onAiSuggestions}>
                <Text style={styles.toolBtnText}>Get suggestions</Text>
              </Pressable>
              {aiNote ? <Text style={styles.aiOut}>{aiNote}</Text> : null}
            </AuthHeroCard>
          </>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background},
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 14 },
  pendingTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryBright, marginBottom: 8 },
  pendingSub: { color: colors.textSecondary, lineHeight: 22 },
  segments: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center'},
  segmentOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  segmentTextOn: { color: colors.text },
  panel: { paddingBottom: 40 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  catInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12},
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    justifyContent: 'center'},
  addBtnText: { color: colors.text, fontWeight: '800' },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16},
  fabText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  cardGap: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { color: colors.text, fontWeight: '800', fontSize: 17, marginBottom: 4 },
  muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  desc: { color: colors.textMuted, fontSize: 13, marginVertical: 4 },
  stock: { color: colors.primaryBright, fontWeight: '600', marginTop: 6, fontSize: 12 },
  stockOff: { color: colors.error },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder},
  link: { color: colors.primaryBright, fontWeight: '600' },
  danger: { color: colors.error, fontWeight: '700' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8},
  csvArea: {
    minHeight: 120,
    marginTop: 10,
    marginBottom: 12,
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top'},
  toolRow: { flexDirection: 'row', gap: 10 },
  toolBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center'},
  toolBtnAlt: { backgroundColor: colors.primarySoft },
  toolBtnText: { color: colors.text, fontWeight: '700' },
  aiOut: { color: colors.textSecondary, marginTop: 12, lineHeight: 20, fontSize: 13 }});
