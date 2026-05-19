import React, { useState } from 'react';

import {

  View,

  Text,

  TextInput,

  KeyboardAvoidingView,

  Platform,

  ScrollView} from 'react-native';

import { CommonActions } from '@react-navigation/native';

import type { AuthStackProps } from '../navigation/types';

import { Button } from '../components/Button';

import { api } from '../api/client';

import { useAuthStore } from '../store/authStore';

import { placeholderColor } from '../theme';

import { shared } from '../theme/styles';



type Props = AuthStackProps<'VerifyEmail'>;



export function VerifyEmailScreen({ navigation, route }: Props) {

  const { sessionId, emailMask } = route.params;

  const setAuth = useAuthStore((s) => s.setAuth);

  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);



  function goBackToRegister() {

    navigation.dispatch(

      CommonActions.reset({

        index: 1,

        routes: [{ name: 'Login' }, { name: 'Register' }]})

    );

  }



  async function onVerify() {

    setErr(null);

    setLoading(true);

    try {

      const { data } = await api.post<{

        accessToken: string;

        user: {

          id: string;

          phone: string;

          name: string;

          role: string;

          email?: string | null;

          emailVerified?: boolean;

          driverVehicleType?: 'bike' | 'auto' | 'car' | null;

        };

      }>('/auth/register/verify', { sessionId, otp: otp.trim() });

      await setAuth(data.accessToken, data.user);

    } catch (e) {

      const msg = e instanceof Error ? e.message : 'Verification failed';

      setErr(msg);

      if (

        msg.includes('Too many incorrect') ||

        msg.includes('Code expired') ||

        msg.includes('Session expired or invalid') ||

        msg.includes('registered while you verified')

      ) {

        goBackToRegister();

      }

    } finally {

      setLoading(false);

    }

  }



  async function onResend() {

    setErr(null);

    setResendLoading(true);

    try {

      await api.post('/auth/register/resend-otp', { sessionId });

    } catch (e) {

      setErr(e instanceof Error ? e.message : 'Could not resend code');

    } finally {

      setResendLoading(false);

    }

  }



  return (

    <KeyboardAvoidingView

      style={shared.flex}

      behavior={Platform.OS === 'ios' ? 'padding' : undefined}

    >

      <ScrollView contentContainerStyle={shared.scrollContentAuth} keyboardShouldPersistTaps="handled">

        <Text style={shared.title}>Check your inbox</Text>

        <Text style={shared.sub}>

          Enter the 6-digit code we sent to{' '}

          <Text style={shared.emphasis}>{emailMask}</Text>

        </Text>

        <TextInput

          style={shared.otp}

          placeholder="000000"

          placeholderTextColor={placeholderColor}

          keyboardType="number-pad"

          maxLength={6}

          value={otp}

          onChangeText={setOtp}

        />

        {err ? <Text style={shared.err}>{err}</Text> : null}

        <Button title="Verify & continue" onPress={onVerify} loading={loading} />

        <View style={shared.spacer} />

        <Button title="Resend code" variant="ghost" onPress={onResend} loading={resendLoading} />

        <View style={shared.spacer} />

        <Button title="Edit registration details" variant="ghost" onPress={goBackToRegister} />

      </ScrollView>

    </KeyboardAvoidingView>

  );

}

