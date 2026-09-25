import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../../constants/theme';

interface AvatarProps {
  name: string;
  size?: number;
  showStatus?: boolean;
  statusColor?: string;
  style?: ViewStyle;
}

const AVATAR_COLORS = [
  '#1E6BFF',
  '#0D9488',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#10B981',
];

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 44,
  showStatus = false,
  statusColor = colors.success,
  style,
}) => {
  const getInitials = (text: string) => {
    if (!text) return 'CS';
    const parts = text.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const getColorIndex = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % AVATAR_COLORS.length;
  };

  const bgColor = AVATAR_COLORS[getColorIndex(name)];

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      </View>
      {showStatus && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: statusColor,
              width: Math.max(10, size * 0.26),
              height: Math.max(10, size * 0.26),
              borderRadius: size * 0.13,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
