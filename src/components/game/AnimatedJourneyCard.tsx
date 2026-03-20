import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Sparkles, Trophy, Star } from 'lucide-react-native';
import { Progress } from '@/components/ui/Progress';

interface AnimatedJourneyCardProps {
  title: string;
  subtitle: string;
  progress: number;
  index: number;
  onClick: () => void;
  isComplete?: boolean;
}

export function AnimatedJourneyCard({ title, subtitle, progress, index, onClick, isComplete = false }: AnimatedJourneyCardProps) {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      fillWidth.value = withTiming(Math.min(progress, 100), { duration: 800 });
    }, index * 100 + 300);
    return () => clearTimeout(timer);
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%` as any,
  }));

  return (
    <Animated.View entering={FadeInLeft.delay(index * 100).springify().damping(15).stiffness(150)}>
      <Pressable onPress={onClick} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
        <View className="bg-card rounded-2xl overflow-hidden" style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 }}>
          {/* Progress background fill */}
          <Animated.View
            style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,193,5,0.12)' }, fillStyle]}
          />
          <View className="p-4 flex-row items-center gap-3">
            <Sparkles size={20} color="#ffc105" />
            <View className="flex-1">
              <Text className="font-bold text-foreground text-sm" numberOfLines={1}>{title}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
              <View className="mt-2"><Progress value={progress} height={5} /></View>
            </View>
            <View className="items-end gap-1">
              <Text className="text-sm font-semibold text-primary">{progress}%</Text>
              {isComplete ? <Trophy size={20} color="#22c55e" /> : <Star size={20} color="#ffc105" />}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
