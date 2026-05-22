import React from 'react';
import { View, Text, Pressable, StyleSheet, Share } from 'react-native';
import type { SavedAddress } from '../../api/addresses';
import { GlassCard } from '../neon/GlassCard';
import {
  addressKindIcon,
  addressLines,
  distanceKm,
  formatPhoneDisplay,
  shareAddressText,
} from '../../utils/addressDisplay';
import { colors, radii } from '../../theme';

type Props = {
  address: SavedAddress;
  distanceLabel?: string | null;
  isHere?: boolean;
  onPin: () => void;
  onMore: () => void;
};

export function SavedAddressCard({
  address,
  distanceLabel,
  isHere,
  onPin,
  onMore,
}: Props) {
  const icon = addressKindIcon(address.addressKind, address.label);
  const lines = addressLines(address);
  const phone = address.contactPhone?.trim();

  async function onShare() {
    try {
      await Share.share({ message: shareAddressText(address), title: address.label });
    } catch {
      /* cancelled */
    }
  }

  return (
    <GlassCard style={styles.card} noPadding>
      <View style={styles.topRow}>
        <View style={styles.iconCol}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>{icon}</Text>
          </View>
          {isHere ? (
            <View style={styles.hereBadge}>
              <Text style={styles.hereText}>You're here</Text>
            </View>
          ) : distanceLabel ? (
            <Text style={styles.distText}>{distanceLabel}</Text>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{address.label}</Text>
            <Pressable
              onPress={onPin}
              hitSlop={10}
              style={[styles.pinBtn, address.isDefault && styles.pinBtnActive]}
              accessibilityLabel={address.isDefault ? 'Pinned address' : 'Pin this address'}
            >
              <Text style={[styles.pinIcon, address.isDefault && styles.pinIconActive]}>📌</Text>
            </Pressable>
          </View>
          {lines.map((line, i) => (
            <Text key={`${line}-${i}`} style={styles.line} numberOfLines={3}>
              {line}
            </Text>
          ))}
          {phone ? (
            <Text style={styles.phone}>
              Phone number: <Text style={styles.phoneBold}>{formatPhoneDisplay(phone)}</Text>
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onMore} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>⋯</Text>
        </Pressable>
        <Pressable onPress={() => void onShare()} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>↗</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 14 },
  topRow: { flexDirection: 'row', padding: 16, paddingBottom: 8 },
  iconCol: { alignItems: 'center', marginRight: 14, width: 72 },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 28 },
  hereBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.45)',
  },
  hereText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700',
  },
  distText: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  pinBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
  },
  pinBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBright,
  },
  pinIcon: { fontSize: 18, opacity: 0.55 },
  pinIconActive: { opacity: 1 },
  line: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  phone: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 10,
  },
  phoneBold: {
    color: colors.text,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  actionIcon: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: '700',
  },
});
