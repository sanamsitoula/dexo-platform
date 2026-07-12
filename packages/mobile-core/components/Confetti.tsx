import { useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import { Colors } from '../lib/theme';

/** Lightweight celebratory confetti using only Animated (no native deps). */
export default function Confetti({ count = 22, colors }: { count?: number; colors?: string[] }) {
  const W = Dimensions.get('window').width;
  const palette = colors || [Colors.primary, Colors.move, Colors.streak, Colors.success, Colors.stand];
  const pieces = useRef(
    Array.from({ length: count }).map((_, i) => ({
      x: (i / count) * W,
      delay: (i % 8) * 70,
      color: palette[i % palette.length],
      anim: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    pieces.forEach((p) => {
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 1600,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: 8,
            height: 14,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 640] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 340}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
