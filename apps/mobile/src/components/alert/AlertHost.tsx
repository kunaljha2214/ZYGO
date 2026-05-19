import React from 'react';
import { AlertMessageCard } from './AlertMessageCard';
import { useAlertStore, type AlertButton } from '../../store/alertStore';

export function AlertHost() {
  const current = useAlertStore((s) => s.current);
  const dismiss = useAlertStore((s) => s.dismiss);

  if (!current) return null;

  const onButtonPress = (button: AlertButton) => {
    dismiss();
    button.onPress?.();
  };

  return (
    <AlertMessageCard
      alert={current}
      onDismiss={() => {
        const cancel = current.buttons.find((b) => b.style === 'cancel');
        dismiss();
        cancel?.onPress?.();
      }}
      onButtonPress={onButtonPress}
    />
  );
}
