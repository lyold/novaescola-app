import React from 'react';
import { View, Text, Image } from 'react-native';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  borderColor?: string;
}

export function Avatar({ src, name, size = 40, className, borderColor }: AvatarProps) {
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <View
      className={cn('rounded-full bg-primary/20 items-center justify-center overflow-hidden', className)}
      style={{
        width: size,
        height: size,
        borderWidth: borderColor ? 2 : 0,
        borderColor: borderColor ?? undefined,
      }}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text
          className="font-bold text-primary"
          style={{ fontSize: size * 0.4 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
