import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { RootStackParamList } from '@/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

function getAuthErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email ou senha incorretos.';
  }
  if (message.includes('User already registered')) {
    return 'Este email já está cadastrado.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Por favor, confirme seu email antes de fazer login.';
  }
  return message;
}

export function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    setIsSubmitting(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao entrar',
        text2: getAuthErrorMessage(error.message),
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Bem-vindo de volta!',
      text2: 'Login realizado com sucesso.',
    });
    // Navegação acontece automaticamente via RootNavigator
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center px-6 py-8">
          <Card className="w-full max-w-sm">
            {/* Header */}
            <View className="items-center mb-6 gap-3">
              <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
                <Sparkles size={32} color="#ffc105" />
              </View>
              <Text className="text-foreground text-2xl font-bold text-center">
                Bem-vindo de volta!
              </Text>
              <Text className="text-muted-foreground text-sm text-center">
                Entre para continuar sua jornada de aprendizado
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Email"
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Senha"
                    placeholder="••••••••"
                    secureTextEntry
                    autoComplete="password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                )}
              />

              <Button
                onPress={handleSubmit(handleLogin)}
                loading={isSubmitting}
                disabled={isSubmitting}
                size="lg"
                className="mt-2"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </View>

            {/* Link para Cadastro */}
            <View className="mt-6 items-center">
              <Pressable onPress={() => navigation.navigate('Signup')}>
                <Text className="text-muted-foreground text-sm">
                  Não tem conta?{' '}
                  <Text className="text-primary font-semibold">Cadastre-se</Text>
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
