import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../lib/theme';

/**
 * Activity-style progress ring.
 *
 * Uses `react-native-svg` when installed (crisp arc, exact %). Falls back to a
 * clean thick track ring + centered value when svg isn't available, so the UI is
 * always correct. Install real rings with:
 *   npx expo install react-native-svg
 */
let Svg: any = null;
let Circle: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lib = require('react-native-svg');
  Svg = lib.default || lib.Svg;
  Circle = lib.Circle;
} catch {
  Svg = null;
}

export default function ProgressRing({
  size = 140,
  strokeWidth = 14,
  progress = 0,
  color,
  trackColor = '#EAECEF',
  children,
  label,
  value,
}: {
  size?: number;
  strokeWidth?: number;
  progress?: number; // 0..1
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  label?: string;
  value?: string;
}) {
  const p = Math.max(0, Math.min(1, progress || 0));
  const ring = color || Colors.primary;

  const Center = () =>
    children ? (
      <>{children}</>
    ) : (
      <View style={{ alignItems: 'center' }}>
        {value != null && <Text style={[styles.value, { fontSize: size * 0.24 }]}>{value}</Text>}
        {label != null && <Text style={styles.label}>{label}</Text>}
      </View>
    );

  if (Svg && Circle) {
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ring}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
          />
        </Svg>
        <Center />
      </View>
    );
  }

  // Fallback: track ring + a colored top cap indicating progress.
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: trackColor,
        borderTopColor: p > 0.05 ? ring : trackColor,
        borderRightColor: p > 0.3 ? ring : trackColor,
        borderBottomColor: p > 0.6 ? ring : trackColor,
        borderLeftColor: p > 0.85 ? ring : trackColor,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '45deg' }],
      }}
    >
      <View style={{ transform: [{ rotate: '-45deg' }] }}>
        <Center />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
});
