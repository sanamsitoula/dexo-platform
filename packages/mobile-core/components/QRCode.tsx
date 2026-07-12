import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing } from '../lib/theme';

/**
 * Premium QR component.
 *
 * Renders a real scannable QR via `react-native-qrcode-svg` when it's installed
 * (add it with: `npx expo install react-native-svg react-native-qrcode-svg`).
 * Until then it degrades gracefully to an Apple-Wallet-style code chip so the UI
 * is never broken and the check-in code is still readable/enterable.
 */
let QRLib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QRLib = require('react-native-qrcode-svg').default;
} catch {
  QRLib = null;
}

export default function QRCode({
  value,
  size = 200,
  color = '#0B0F19',
  background = '#FFFFFF',
}: {
  value: string;
  size?: number;
  color?: string;
  background?: string;
}) {
  if (QRLib && value) {
    return (
      <View style={[styles.wrap, { width: size + 24, height: size + 24, backgroundColor: background }]}>
        <QRLib value={value} size={size} color={color} backgroundColor={background} />
      </View>
    );
  }

  // Fallback — styled, still functional (code is shown for manual entry).
  return (
    <View style={[styles.wrap, { width: size + 24, backgroundColor: background }]}>
      <View style={[styles.fallbackGrid, { width: size, height: size }]}>
        {Array.from({ length: 36 }).map((_, i) => {
          // Deterministic pseudo-pattern from the value so it looks QR-ish & stable.
          const on = value ? (value.charCodeAt(i % value.length) + i) % 3 !== 0 : i % 2 === 0;
          return <View key={i} style={[styles.cell, { backgroundColor: on ? color : 'transparent' }]} />;
        })}
      </View>
      <Text style={styles.code} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius.xl2,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '16.66%', height: '16.66%' },
  code: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});
