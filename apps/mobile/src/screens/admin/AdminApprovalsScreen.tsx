import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppScreen } from '../../components/layout/AppScreen';
import { spacing } from '../../theme/spacing';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import {
  approveDeliveryPartner,
  approveDriver,
  approveShopRequest,
  blockDriver,
  fetchPendingDeliveryPartners,
  fetchPendingDrivers,
  fetchPendingShopRequests,
  rejectDeliveryPartner,
  rejectDriver,
  rejectShopRequest} from '../../api/admin';
import type { PendingDeliveryPartner, PendingDriver, PendingShopRequest } from '../../types/admin';
import { colors, radii } from '../../theme';

export function AdminApprovalsScreen() {
  const [list, setList] = useState<PendingShopRequest[]>([]);
  const [partners, setPartners] = useState<PendingDeliveryPartner[]>([]);
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingShopRequest | null>(null);
  const [rejectPartner, setRejectPartner] = useState<PendingDeliveryPartner | null>(null);
  const [rejectDriverTarget, setRejectDriverTarget] = useState<PendingDriver | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shops, riderPending, driverPending] = await Promise.all([
        fetchPendingShopRequests(),
        fetchPendingDeliveryPartners(),
        fetchPendingDrivers(),
      ]);
      setList(shops);
      setPartners(riderPending);
      setDrivers(driverPending);
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Could not load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onApprove(item: PendingShopRequest) {
    AppAlert.alert('Approve shop', `Approve "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActing(item.id);
          try {
            await approveShopRequest(item.id);
            await load();
            AppAlert.alert('Approved', `${item.name} is now live. The owner can add menu items.`);
          } catch (e) {
            AppAlert.alert('Error', e instanceof Error ? e.message : 'Approve failed');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  async function confirmReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      AppAlert.alert('Reason required', 'Enter a rejection reason.');
      return;
    }
    if (rejectDriverTarget) {
      setActing(rejectDriverTarget.driverId);
      try {
        await rejectDriver(rejectDriverTarget.driverId, reason);
        setRejectDriverTarget(null);
        setRejectReason('');
        await load();
      } catch (e) {
        AppAlert.alert('Error', e instanceof Error ? e.message : 'Reject failed');
      } finally {
        setActing(null);
      }
      return;
    }
    if (rejectPartner) {
      setActing(rejectPartner.partnerId);
      try {
        await rejectDeliveryPartner(rejectPartner.partnerId, reason);
        setRejectPartner(null);
        setRejectReason('');
        await load();
      } catch (e) {
        AppAlert.alert('Error', e instanceof Error ? e.message : 'Reject failed');
      } finally {
        setActing(null);
      }
      return;
    }
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    try {
      await rejectShopRequest(rejectTarget.id, reason);
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setActing(null);
    }
  }

  async function onApproveDriverItem(item: PendingDriver) {
    setActing(item.driverId);
    try {
      await approveDriver(item.driverId);
      await load();
      AppAlert.alert('Approved', `${item.name ?? 'Driver'} can go online.`);
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setActing(null);
    }
  }

  async function onApprovePartner(item: PendingDeliveryPartner) {
    setActing(item.partnerId);
    try {
      await approveDeliveryPartner(item.partnerId);
      await load();
      AppAlert.alert('Approved', `${item.name ?? 'Rider'} can go online.`);
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setActing(null);
    }
  }

  function renderItem({ item }: { item: PendingShopRequest }) {
    const busy = acting === item.id;
    return (
      <AuthHeroCard compact style={styles.card}>
        <Text style={styles.shopName}>{item.name}</Text>
        <Text style={styles.meta}>
          Owner: {item.ownerName} · {item.ownerPhone}
        </Text>
        {item.ownerEmail ? <Text style={styles.meta}>{item.ownerEmail}</Text> : null}
        <Text style={styles.meta}>
          {item.address.line1}, {item.address.city} — {item.address.pincode}
        </Text>
        <Text style={styles.meta}>
          {item.cuisine.join(', ')} · {item.foodType.replace('_', ' ')}
        </Text>
        <Text style={styles.meta}>
          GST {item.gstNumber} · PAN {item.panNumber}
        </Text>
        <Text style={styles.meta}>FSSAI {item.fssaiNumber}</Text>
        {item.submittedAt ? (
          <Text style={styles.submitted}>
            Submitted {new Date(item.submittedAt).toLocaleString()}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.rejectBtn, busy && styles.btnDisabled]}
            onPress={() => {
              setRejectTarget(item);
              setRejectReason('');
            }}
            disabled={busy}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.approveBtn, busy && styles.btnDisabled]}
            onPress={() => onApprove(item)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.approveText}>Approve</Text>
            )}
          </Pressable>
        </View>
      </AuthHeroCard>
    );
  }

  return (
    <AppScreen
      scroll={false}
      tab
      title="Approvals"
      subtitle="Review shop, delivery partner, and ride driver registrations."
      contentStyle={styles.screen}
    >
      {loading && list.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primaryBright} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
          ListHeaderComponent={
            drivers.length > 0 || partners.length > 0 ? (
              <View style={styles.section}>
                {drivers.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>Ride drivers</Text>
                    {drivers.map((d) => {
                      const busy = acting === d.driverId;
                      return (
                        <AuthHeroCard compact key={d.driverId} style={styles.card}>
                          <Text style={styles.shopName}>{d.name ?? 'Driver'}</Text>
                          <Text style={styles.meta}>{d.phone}</Text>
                          {d.vehicleModel ? (
                            <Text style={styles.meta}>
                              {d.vehicleModel} · {d.vehicleNumber}
                            </Text>
                          ) : null}
                          {d.submittedAt ? (
                            <Text style={styles.submitted}>
                              Submitted {new Date(d.submittedAt).toLocaleString()}
                            </Text>
                          ) : null}
                          <View style={styles.actions}>
                            <Pressable
                              style={[styles.rejectBtn, busy && styles.btnDisabled]}
                              onPress={() => {
                                setRejectDriverTarget(d);
                                setRejectPartner(null);
                                setRejectTarget(null);
                                setRejectReason('');
                              }}
                              disabled={busy}
                            >
                              <Text style={styles.rejectText}>Reject</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.approveBtn, busy && styles.btnDisabled]}
                              onPress={() => void onApproveDriverItem(d)}
                              disabled={busy}
                            >
                              {busy ? (
                                <ActivityIndicator color={colors.text} />
                              ) : (
                                <Text style={styles.approveText}>Approve</Text>
                              )}
                            </Pressable>
                          </View>
                        </AuthHeroCard>
                      );
                    })}
                  </>
                ) : null}
                {partners.length > 0 ? (
                  <>
                <Text style={[styles.sectionTitle, drivers.length > 0 && { marginTop: spacing.lg }]}>
                  Delivery partners
                </Text>
                {partners.map((p) => {
                  const busy = acting === p.partnerId;
                  return (
                    <AuthHeroCard compact key={p.partnerId} style={styles.card}>
                      <Text style={styles.shopName}>{p.name ?? 'Rider'}</Text>
                      <Text style={styles.meta}>{p.phone}</Text>
                      {p.submittedAt ? (
                        <Text style={styles.submitted}>
                          Submitted {new Date(p.submittedAt).toLocaleString()}
                        </Text>
                      ) : null}
                      <View style={styles.actions}>
                        <Pressable
                          style={[styles.rejectBtn, busy && styles.btnDisabled]}
                          onPress={() => {
                            setRejectPartner(p);
                            setRejectTarget(null);
                            setRejectReason('');
                          }}
                          disabled={busy}
                        >
                          <Text style={styles.rejectText}>Reject</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.approveBtn, busy && styles.btnDisabled]}
                          onPress={() => void onApprovePartner(p)}
                          disabled={busy}
                        >
                          {busy ? (
                            <ActivityIndicator color={colors.text} />
                          ) : (
                            <Text style={styles.approveText}>Approve</Text>
                          )}
                        </Pressable>
                      </View>
                    </AuthHeroCard>
                  );
                })}
                <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Restaurants</Text>
                  </>
                ) : drivers.length > 0 ? (
                  <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Restaurants</Text>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            partners.length === 0 && drivers.length === 0 ? (
              <AuthHeroCard compact>
                <Text style={styles.emptyTitle}>No pending shop requests</Text>
                <Text style={styles.emptySub}>New shop owner submissions will appear here.</Text>
              </AuthHeroCard>
            ) : null
          }
        />
      )}

      <Modal
        visible={rejectTarget != null || rejectPartner != null || rejectDriverTarget != null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Reject {rejectDriverTarget?.name ?? rejectPartner?.name ?? rejectTarget?.name}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for rejection"
              placeholderTextColor={colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => {
                  setRejectTarget(null);
                  setRejectPartner(null);
                  setRejectDriverTarget(null);
                  setRejectReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmReject}>
                <Text style={styles.approveText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { marginBottom: spacing.md },
  sectionTitle: { color: colors.lavender, fontWeight: '800', fontSize: 16, marginBottom: spacing.md },
  list: { paddingBottom: spacing.xxxl, gap: spacing.md },
  card: { marginBottom: 14 },
  shopName: { fontSize: 20, fontWeight: '800', color: colors.primaryBright, marginBottom: 8 },
  meta: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 2 },
  submitted: { color: colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center'},
  rejectBtn: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error},
  approveText: { color: colors.text, fontWeight: '800' },
  rejectText: { color: colors.error, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 6 },
  emptySub: { color: colors.textSecondary, lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24},
  modalCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder},
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalInput: {
    minHeight: 80,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top'},
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder},
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.error}});
