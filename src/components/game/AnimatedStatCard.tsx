import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';

interface AnimatedStatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  delay?: number;
  color?: string;
  children?: React.ReactNode;
}

export function AnimatedStatCard({ icon, value, label, delay = 0, color = '#ffc105', children }: AnimatedStatCardProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(withTiming(-6, { duration: 1200 }), withTiming(0, { duration: 1200 })),
      -1,
      false
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ flex: 1 }}>
      <Card className="items-center py-4 px-2 gap-2">
        <Animated.View style={iconStyle}>{icon}</Animated.View>
        {children ?? <Text className="text-foreground font-black text-xl" style={{ color }}>{value}</Text>}
        <Text className="text-muted-foreground text-xs text-center">{label}</Text>
      </Card>
    </Animated.View>
  );
}
