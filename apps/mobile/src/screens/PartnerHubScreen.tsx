import React, { useEffect, useState } from 'react';

import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type { PartnerTabParamList } from '../navigation/types';

import { Card } from '../components/Card';

import { AppScreen } from '../components/layout/AppScreen';

import { useAuthStore } from '../store/authStore';

import { fetchMyRestaurantRegistration } from '../api/shopOwner';

import type { OwnerRestaurantRegistration } from '../types/shopOwner';

import { ShopOwnerDashboard } from './shop/ShopOwnerDashboard';

import { colors, spacing } from '../theme';



type Props = BottomTabScreenProps<PartnerTabParamList, 'PartnerHub'>;



function hubCopy(role: string | undefined, vehicle?: string | null): { title: string; subtitle: string } {

  switch (role) {

    case 'delivery_partner':

      return {

        title: 'Delivery partner',

        subtitle: 'Accept deliveries, stay online, and manage your runs from here.'};

    case 'shop_owner':

      return {

        title: 'Restaurant dashboard',

        subtitle: 'Orders, revenue, and live tracking for your shop.'};

    case 'driver':

      return {

        title: vehicle ? `Driver · ${vehicle}` : 'Driver',

        subtitle: 'You are listed for ride assignments when you are available.'};

    case 'captain':

      return { title: 'Captain', subtitle: 'Ride assignments and availability.' };

    case 'restaurant':

      return { title: 'Restaurant', subtitle: 'Kitchen and menu operations.' };

    default:

      return { title: 'Partner hub', subtitle: 'Zygo partner workspace.' };

  }

}



export function PartnerHubScreen({}: Props) {

  const user = useAuthStore((s) => s.user);

  const { title, subtitle } = hubCopy(user?.role, user?.driverVehicleType);

  const [reg, setReg] = useState<OwnerRestaurantRegistration | null>(null);

  const [loadingReg, setLoadingReg] = useState(user?.role === 'shop_owner');



  useEffect(() => {

    if (user?.role !== 'shop_owner') return;

    setLoadingReg(true);

    fetchMyRestaurantRegistration()

      .then(setReg)

      .catch(() => setReg(null))

      .finally(() => setLoadingReg(false));

  }, [user?.role]);



  if (user?.role === 'shop_owner') {

    if (loadingReg) {

      return (

        <View style={styles.center}>

          <ActivityIndicator size="large" color={colors.primaryBright} />

        </View>

      );

    }



    if (reg?.approvalStatus === 'approved') {

      return (

        <AppScreen scroll={false} tab contentStyle={styles.dashboard}>

          <ShopOwnerDashboard shopName={reg.name} />

        </AppScreen>

      );

    }



    return (

      <AppScreen scroll tab title={title} subtitle={subtitle}>

        <Card glow>

          <Text style={styles.cardTitle}>Restaurant</Text>

          {reg ? (

            <>

              <Text style={styles.restName}>{reg.name}</Text>

              <Text style={styles.cardMuted}>

                {reg.approvalStatus === 'pending_review'

                  ? 'Pending admin approval — complete Menu after approval.'

                  : 'Complete registration to go live on Zygo.'}

              </Text>

            </>

          ) : (

            <Text style={styles.cardMuted}>Complete restaurant registration first.</Text>

          )}

        </Card>

      </AppScreen>

    );

  }



  return (

    <AppScreen scroll tab title={title} subtitle={subtitle}>

      <Card glow>

        <Text style={styles.cardTitle}>Quick status</Text>

        <Text style={styles.cardMuted}>

          Signed in as <Text style={styles.strong}>{user?.name}</Text>

        </Text>

      </Card>

      <Card>

        <Text style={styles.cardTitle}>Coming next</Text>

        <Text style={styles.cardMuted}>Partner dashboards will plug in here.</Text>

      </Card>

    </AppScreen>

  );

}



const styles = StyleSheet.create({

  center: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: colors.background},

  dashboard: { gap: spacing.stackGap },

  cardTitle: { fontWeight: '700', fontSize: 16, marginBottom: spacing.sm, color: colors.text },

  cardMuted: { color: colors.textSecondary, lineHeight: 20 },

  strong: { fontWeight: '700', color: colors.text },

  restName: {

    color: colors.primaryBright,

    fontSize: 18,

    fontWeight: '800',

    marginTop: 6,

    marginBottom: 6}});


