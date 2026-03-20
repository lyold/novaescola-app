import React, { useEffect } from 'react';
import { View, Text, Modal } from 'react-native';
import Animated, { FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Coins } from 'lucide-react-native';

interface CoinCelebrationProps {
  coins: number;
  onDone: () => void;
}

export function CoinCelebration({ coins, onDone }: CoinCelebrationProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(withTiming(10, { duration: 300 }), withTiming(-10, { duration: 300 }), withTiming(0, { duration: 300 })),
      -1, false
    );
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const coinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Modal transparent animationType="fade" visible>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: 16 }}>
          {/* Floating coin particles */}
          {Array.from({ length: 6 }, (_, i) => (
            <Animated.Text
              key={i}
              entering={FadeIn.delay(i * 80)}
              style={{ position: 'absolute', fontSize: 22, top: 50 + (i % 3) * -40, left: (i % 4) * 28 - 42 }}
            >
              🪙
            </Animated.Text>
          ))}

          <Animated.View style={[coinStyle, { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', elevation: 12 }]}>
            <Coins size={40} color="#78350f" />
          </Animated.View>

          <Animated.View entering={ZoomIn.delay(300).springify()} style={{ alignItems: 'center', gap: 4, backgroundColor: '#1c1f2a', borderRadius: 20, paddingHorizontal: 32, paddingVertical: 16, elevation: 8 }}>
            <Text style={{ color: '#b3b3b3', fontSize: 13 }}>Você ganhou</Text>
            <Text style={{ color: '#ffc105', fontSize: 40, fontWeight: '900' }}>+{coins}</Text>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>moedas! 🎉</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
