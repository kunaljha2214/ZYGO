import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { PartnerTabParamList } from '../navigation/types';
import { AccountScreen } from './AccountScreen';

type Props = BottomTabScreenProps<PartnerTabParamList, 'PartnerAccount'>;

export function PartnerAccountScreen(_props: Props) {
  return <AccountScreen />;
}
