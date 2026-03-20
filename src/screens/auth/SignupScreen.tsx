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
import { signupSchema, type SignupFormData } from '@/lib/validations';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { RootStackParamList } from '@/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

function getAuthErrorMessage(message: string): string {
  if (message.includes('User already registered')) {
    return 'Este email já está cadastrado.';
  }
  if (message.includes('Invalid email')) {
    return 'Email inválido.';
  }
  return message;
}

export function SignupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleSignup = async (data: SignupFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password);
    setIsSubmitting(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao criar conta',
        text2: getAuthErrorMessage(error.message),
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Conta criada!',
      text2: 'Verifique seu email para confirmar o cadastro.',
    });
    // RootNavigator redireciona para Onboarding após sessão criada
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
                Crie sua conta
              </Text>
              <Text className="text-muted-foreground text-sm text-center">
                Comece sua aventura educacional hoje
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
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Confirmar Senha"
                    placeholder="••••••••"
                    secureTextEntry
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                  />
                )}
              />

              <Button
                onPress={handleSubmit(handleSignup)}
                loading={isSubmitting}
                disabled={isSubmitting}
                size="lg"
                className="mt-2"
              >
                {isSubmitting ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </View>

            {/* Link para Login */}
            <View className="mt-6 items-center">
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text className="text-muted-foreground text-sm">
                  Já tem conta?{' '}
                  <Text className="text-primary font-semibold">Faça login</Text>
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
