import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radii } from '../../theme';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

type Props = {
  label: string;
  hint?: string;
  previewUri?: string | null;
  uploaded?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function PhotoUploadRow({
  label,
  hint,
  previewUri,
  uploaded,
  loading,
  onPress,
}: Props) {
  const resolved = resolveMediaUrl(previewUri ?? null);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.thumb}>
        {resolved ? (
          <Image source={{ uri: resolved }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.plus}>+</Text>
        )}
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : null}
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label}>
          {label} {uploaded ? '✓' : ''}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <Text style={styles.action}>{uploaded ? 'Change photo' : 'Camera or gallery'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: 14,
  },
  pressed: { opacity: 0.85 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  plus: { color: colors.primaryBright, fontSize: 24, fontWeight: '300' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  label: { color: colors.lavender, fontWeight: '700', fontSize: 15 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  action: { color: colors.primaryBright, fontSize: 12, marginTop: 4, fontWeight: '600' },
});
