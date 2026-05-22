import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList, RootStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { VerifyEmailScreen } from '../screens/VerifyEmailScreen';
import { MainTabs } from './MainTabs';
import { PartnerStack } from './PartnerStack';
import { AdminShellStack } from './AdminShellStack';
import type { AuthUser } from '../store/authStore';
import { usesAdminHome, usesCustomerHome } from './homeRole';
import { stackScreenOptions } from '../theme';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={stackScreenOptions}>
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Verify email' }} />
    </AuthStack.Navigator>
  );
}

type Props = {
  isAuthed: boolean;
  user: AuthUser | null;
};

export function RootNavigator({ isAuthed, user }: Props) {
  const role = user?.role ?? null;
  const customerHome = usesCustomerHome(role);
  const adminHome = usesAdminHome(role);
  const stackKey = isAuthed
    ? customerHome
      ? 'app-customer'
      : adminHome
        ? 'app-admin'
        : 'app-partner'
    : 'auth';

  return (
    <RootStack.Navigator key={stackKey} screenOptions={{ headerShown: false }}>
      {isAuthed ? (
        customerHome ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : adminHome ? (
          <RootStack.Screen name="AdminMain" component={AdminShellStack} />
        ) : (
          <RootStack.Screen name="PartnerMain" component={PartnerStack} />
        )
      ) : (
        <RootStack.Screen name="Auth" component={AuthFlow} />
      )}
    </RootStack.Navigator>
  );
}
