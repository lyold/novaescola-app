import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { cn } from '@/lib/utils';

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

export function Button({
  onPress,
  disabled,
  loading,
  variant = 'default',
  size = 'md',
  className,
  textClassName,
  children,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseClasses = 'flex-row items-center justify-center rounded-xl';

  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const variantClasses = {
    default: 'bg-primary',
    outline: 'border border-primary bg-transparent',
    ghost: 'bg-transparent',
    destructive: 'bg-destructive',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const textVariantClasses = {
    default: 'text-primary-foreground font-semibold',
    outline: 'text-primary font-semibold',
    ghost: 'text-foreground font-medium',
    destructive: 'text-white font-semibold',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        isDisabled && 'opacity-50',
        className
      )}
    >
      {loading && (
        <View className="mr-2">
          <ActivityIndicator
            size="small"
            color={variant === 'default' ? '#17191f' : '#ffc105'}
          />
        </View>
      )}
      <Text
        className={cn(
          textSizeClasses[size],
          textVariantClasses[variant],
          textClassName
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}
