import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    secondary: 'bg-secondary',
  };

  const textVariantClasses = {
    default: 'text-primary-foreground',
    success: 'text-success-foreground',
    warning: 'text-warning-foreground',
    destructive: 'text-destructive-foreground',
    secondary: 'text-secondary-foreground',
  };

  return (
    <View className={cn('px-2.5 py-1 rounded-full', variantClasses[variant], className)}>
      <Text className={cn('text-xs font-semibold', textVariantClasses[variant])}>
        {children}
      </Text>
    </View>
  );
}
