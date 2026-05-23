import { useAlertStore, type AlertButton, type AlertOptions } from './store/alertStore';

/** Drop-in replacement for React Native Alert — Stitch Zygo Neon Dark styling. */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    useAlertStore.getState().show(title, message, buttons, options);
  },
};

export type { AlertButton, AlertButtonStyle, AlertVariant, AlertOptions } from './store/alertStore';
