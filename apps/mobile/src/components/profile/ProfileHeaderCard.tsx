import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { GlassCard } from '../neon/GlassCard';
import { colors, radii } from '../../theme';

type Props = {
  name: string;
  phone: string;
  roleLabel: string;
  email?: string | null;
  rating?: number | null;
  vehicleLabel?: string | null;
  profilePhotoUrl?: string | null;
  onPressProfile?: () => void;
  onPressRating?: () => void;
  onPressAvatar?: () => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ProfileHeaderCard({
  name,
  phone,
  roleLabel,
  email,
  rating,
  vehicleLabel,
  profilePhotoUrl,
  onPressProfile,
  onPressRating,
  onPressAvatar,
}: Props) {
  const showRating = rating != null && Number.isFinite(rating);
  const photoUri = resolveMediaUrl(profilePhotoUrl);

  return (
    <GlassCard glow style={styles.card} noPadding>
      <Pressable
        onPress={onPressProfile}
        disabled={!onPressProfile}
        style={({ pressed }) => [styles.top, pressed && styles.pressed]}
      >
        <Pressable
          onPress={onPressAvatar}
          disabled={!onPressAvatar}
          style={styles.avatar}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarText}>{initials(name)}</Text>
          )}
        </Pressable>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.phone}>{phone}</Text>
          <Text style={styles.role}>{roleLabel}</Text>
          {email ? (
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          {vehicleLabel ? (
            <Text style={styles.vehicle} numberOfLines={1}>
              {vehicleLabel}
            </Text>
          ) : null}
        </View>
        {onPressProfile ? <Text style={styles.chevron}>›</Text> : null}
      </Pressable>

      {showRating ? (
        <>
          <View style={styles.divider} />
          <Pressable
            onPress={onPressRating}
            disabled={!onPressRating}
            style={({ pressed }) => [styles.ratingRow, pressed && styles.pressed]}
          >
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingText}>
              {rating!.toFixed(2)} <Text style={styles.ratingMuted}>My rating</Text>
            </Text>
            {onPressRating ? <Text style={styles.chevron}>›</Text> : null}
          </Pressable>
        </>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: colors.primaryBright,
    fontWeight: '800',
    fontSize: 18,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  identity: { flex: 1, minWidth: 0 },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  phone: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  role: {
    color: colors.lavender,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  email: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  vehicle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: '300',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassBorder,
    marginHorizontal: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  star: {
    color: '#fbbf24',
    fontSize: 20,
    marginRight: 10,
  },
  ratingText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  ratingMuted: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
