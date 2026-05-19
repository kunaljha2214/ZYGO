import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';

type Options = {
  /** Tab root screens — extra top breathing room */
  tab?: boolean;
  /** Stack screens with native header — skip top safe inset */
  header?: boolean;
};

export function useAppInsets(opts: Options = {}) {
  const insets = useSafeAreaInsets();
  const topBase = opts.header ? spacing.screenTop : Math.max(insets.top, spacing.sm) + (opts.tab ? spacing.screenTopTab : spacing.screenTop);
  const bottomBase = Math.max(insets.bottom, spacing.sm) + spacing.screenBottom;

  const scrollContent = {
    paddingHorizontal: spacing.screenX,
    paddingTop: topBase,
    paddingBottom: bottomBase,
    flexGrow: 1 as const,
  };

  const listContent = {
    paddingHorizontal: spacing.screenX,
    paddingTop: topBase,
    paddingBottom: bottomBase,
  };

  return {
    top: topBase,
    bottom: bottomBase,
    horizontal: spacing.screenX,
    scrollContent,
    listContent,
    gap: spacing.stackGap,
    cardGap: spacing.cardGap,
  };
}
