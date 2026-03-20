import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LoadingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator size="large" color="#ffc105" />
        <Text className="text-muted-foreground text-base">Carregando...</Text>
      </View>
    </SafeAreaView>
  );
}
