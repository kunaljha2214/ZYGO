import { create } from 'zustand';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

export type AlertVariant = 'info' | 'success' | 'error' | 'warning';

export type AlertOptions = {
  /** Fired when the user taps outside the card or presses Android back. */
  onBackdrop?: () => void;
};

export type AlertPayload = {
  id: string;
  title: string;
  message?: string;
  buttons: AlertButton[];
  variant: AlertVariant;
  onBackdrop?: () => void;
};

type AlertState = {
  current: AlertPayload | null;
  queue: AlertPayload[];
  show: (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => void;
  dismiss: () => void;
};

let alertSeq = 0;

function inferVariant(title: string): AlertVariant {
  const t = title.toLowerCase();
  if (/\b(error|failed|invalid|missing)\b/.test(t)) return 'error';
  if (/\b(approved|saved|delivered|exported|imported|uploaded)\b/.test(t)) return 'success';
  if (/\b(delete|remove|approve|reject|required|reason|confirm)\b/.test(t)) return 'warning';
  return 'info';
}

function normalizeButtons(buttons?: AlertButton[]): AlertButton[] {
  if (!buttons?.length) return [{ text: 'OK', style: 'default' }];
  return buttons.map((b) => ({
    text: b.text ?? 'OK',
    onPress: b.onPress,
    style: b.style ?? 'default',
  }));
}

export const useAlertStore = create<AlertState>((set, get) => ({
  current: null,
  queue: [],

  show: (title, message, buttons, options) => {
    const payload: AlertPayload = {
      id: `alert-${++alertSeq}`,
      title,
      message: message?.trim() || undefined,
      buttons: normalizeButtons(buttons),
      variant: inferVariant(title),
      onBackdrop: options?.onBackdrop,
    };

    const { current, queue } = get();
    if (!current) {
      set({ current: payload });
      return;
    }
    set({ queue: [...queue, payload] });
  },

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
      return;
    }
    set({ current: null, queue: [] });
  },
}));
