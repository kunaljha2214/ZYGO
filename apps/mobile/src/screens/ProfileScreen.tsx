import React from 'react';
import type { ProfileStackProps } from '../navigation/types';
import { RoleProfileScreen } from './profile/RoleProfileScreen';

type Props = ProfileStackProps<'ProfileMain'>;

export function ProfileScreen({}: Props) {
  return <RoleProfileScreen />;
}
