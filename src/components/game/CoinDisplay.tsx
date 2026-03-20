import React from 'react';
import { View, Text } from 'react-native';
import { Coins } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface CoinDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CoinDisplay({ amount, size = 'md', className }: CoinDisplayProps) {
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 24;
  const textClass = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl';

  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      <Coins size={iconSize} color="#ffc105" />
      <Text className={cn('font-bold text-coin', textClass)}>
        {amount.toLocaleString('pt-BR')}
      </Text>
    </View>
  );
}
