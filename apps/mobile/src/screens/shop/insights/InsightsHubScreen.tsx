import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../../../components/layout/AppScreen';
import type { ShopInsightsStackParamList } from '../../../navigation/types';
import { colors, radii, spacing } from '../../../theme';

type Nav = NativeStackNavigationProp<ShopInsightsStackParamList, 'InsightsHub'>;

const CARDS = [
  {
    route: 'Analytics' as const,
    icon: '📈',
    title: 'Analytics & reporting',
    desc: 'Sales, items, peak hours, retention, forecasts'},
  {
    route: 'Crm' as const,
    icon: '👥',
    title: 'Customer management',
    desc: 'History, loyalty, reviews, personalized offers'},
  {
    route: 'Offers' as const,
    icon: '🎟',
    title: 'Offers & promotions',
    desc: 'Coupons, happy hour, festivals, AI targeting'},
];

export function InsightsHubScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <AppScreen
      scroll
      tab
      title="Insights"
      subtitle="CRM, analytics, and promotions for your restaurant"
    >
      {CARDS.map((c) => (
        <Pressable
          key={c.route}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate(c.route)}
        >
          <Text style={styles.icon}>{c.icon}</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardDesc}>{c.desc}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    gap: spacing.md},
  cardPressed: { opacity: 0.92 },
  icon: { fontSize: 28 },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  cardDesc: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, lineHeight: 18 },
  chevron: { color: colors.primaryBright, fontSize: 24, fontWeight: '300' }});
