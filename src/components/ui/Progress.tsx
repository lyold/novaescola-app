import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  height?: number;
}

export function Progress({ value, height = 6 }: ProgressProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(Math.max(value, 0), 100), { duration: 600 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={{ height, borderRadius: height / 2, overflow: 'hidden' }}
      className="bg-muted w-full"
    >
      <Animated.View
        style={[{ height, borderRadius: height / 2 }, animatedStyle]}
        className="bg-primary"
      />
    </View>
  );
}
