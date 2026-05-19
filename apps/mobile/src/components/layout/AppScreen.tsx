import React, { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { ScreenShell } from '../ScreenShell';
import { PageHeader } from './PageHeader';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  tab?: boolean;
  header?: boolean;
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Standard app screen — Stitch neon shell + consistent gutters (not for auth). */
export function AppScreen({
  children,
  scroll = true,
  title,
  subtitle,
  eyebrow,
  tab,
  header,
  keyboard,
  contentStyle,
}: Props) {
  return (
    <ScreenShell
      scroll={scroll}
      keyboard={keyboard}
      tab={tab}
      header={header}
      contentStyle={contentStyle}
    >
      {title ? <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} /> : null}
      {children}
    </ScreenShell>
  );
}
