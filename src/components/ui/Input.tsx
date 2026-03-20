import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  className,
  containerClassName,
  secureTextEntry,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text className="text-foreground text-sm font-medium">{label}</Text>
      )}
      <View className="relative">
        <TextInput
          className={cn(
            'bg-input text-foreground rounded-xl px-4 py-3 text-base border border-transparent',
            error && 'border-destructive',
            isPassword && 'pr-12',
            className
          )}
          placeholderTextColor="#b3b3b3"
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-0 bottom-0 justify-center"
          >
            {showPassword ? (
              <EyeOff size={18} color="#b3b3b3" />
            ) : (
              <Eye size={18} color="#b3b3b3" />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-destructive text-xs">{error}</Text>
      )}
    </View>
  );
}
