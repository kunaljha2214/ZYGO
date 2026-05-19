import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

type Props = { size?: number };

const googleG = require('../../assets/google-g.png');

/** Official multicolor Google "G" logo. */
export function GoogleIcon({ size = 22 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={googleG}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Google"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
