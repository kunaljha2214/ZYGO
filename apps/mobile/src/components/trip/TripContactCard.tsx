import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Card } from '../Card';
import { colors, radii, spacing } from '../../theme';

type Props = {
  title: string;
  name: string;
  onCall: () => Promise<void>;
};

export function TripContactCard({ title, name, onCall }: Props) {
  const [calling, setCalling] = useState(false);

  const onPressCall = async () => {
    if (calling) return;
    setCalling(true);
    try {
      await onCall();
    } finally {
      setCalling(false);
    }
  };

  return (
    <Card glow style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.hint}>Number hidden in app · opens your phone dialer</Text>
        </View>
        <Pressable
          style={[styles.callBtn, calling && styles.callBtnBusy]}
          onPress={() => void onPressCall()}
          disabled={calling}
          accessibilityLabel={`Call ${name}`}
        >
          {calling ? (
            <ActivityIndicator size="small" color={colors.primaryBright} />
          ) : (
            <>
              <Text style={styles.callIcon}>📞</Text>
              <Text style={styles.callText}>Call</Text>
            </>
          )}
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.lavender,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 22,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 22,
  },
  hint: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  callBtn: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  callBtnBusy: {
    opacity: 0.85,
  },
  callIcon: {
    fontSize: 16,
  },
  callText: {
    color: colors.primaryBright,
    fontWeight: '800',
    fontSize: 13,
  },
});
