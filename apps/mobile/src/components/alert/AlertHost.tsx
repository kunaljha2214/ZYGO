import React from 'react';
import { AlertMessageCard } from './AlertMessageCard';
import { useAlertStore, type AlertButton } from '../../store/alertStore';

export function AlertHost() {
  const current = useAlertStore((s) => s.current);
  const dismiss = useAlertStore((s) => s.dismiss);

  if (!current) return null;

  const onButtonPress = (button: AlertButton) => {
    button.onPress?.();
    dismiss();
  };

  return (
    <AlertMessageCard
      alert={current}
      onDismiss={() => {
        current.onBackdrop?.();
        dismiss();
      }}
      onButtonPress={onButtonPress}
    />
  );
}
