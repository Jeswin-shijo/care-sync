import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

// Rendered from src/constants/brandLogo.ts by scripts/generate-icons.js.
const LOGO = require('../../../assets/logo.png');

/** The CareSync app mark (rounded blue tile). */
export const AppLogo: React.FC<{ size?: number; style?: StyleProp<ImageStyle> }> = ({ size = 44, style }) => (
  <Image
    source={LOGO}
    style={[{ width: size, height: size }, style]}
    resizeMode="contain"
    accessibilityLabel="CareSync logo"
  />
);
