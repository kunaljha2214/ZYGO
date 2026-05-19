import { useAlertStore, type AlertButton } from './store/alertStore';

/** Drop-in replacement for React Native Alert — Stitch Zygo Neon Dark styling. */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    useAlertStore.getState().show(title, message, buttons);
  },
};

export type { AlertButton, AlertButtonStyle, AlertVariant } from './store/alertStore';
