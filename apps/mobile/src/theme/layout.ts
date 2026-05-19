import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';

export const layout = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenX,
  },
  /** Default scroll content (use with useAppInsets for safe area) */
  scroll: {
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.screenBottom,
    flexGrow: 1,
    gap: spacing.stackGap,
  },
  scrollTab: {
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.screenTopTab,
    paddingBottom: spacing.screenBottom,
    flexGrow: 1,
    gap: spacing.stackGap,
  },
  list: {
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.screenBottom,
  },
  listTab: {
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.screenTopTab,
    paddingBottom: spacing.screenBottom,
  },
  section: {
    marginTop: spacing.section,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
