import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, User, AtSign, Calendar } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/contexts/AuthContext';
import { onboardingSchema, type OnboardingFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const AGE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 6);

export function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingApelido, setIsCheckingApelido] = useState(false);

  const { control, handleSubmit, formState: { errors }, watch, setValue, setError } =
    useForm<OnboardingFormData>({
      resolver: zodResolver(onboardingSchema),
      defaultValues: { nome: '', apelido: '', idade: 10 },
    });

  const selectedAge = watch('idade');

  const checkApelidoExists = async (apelido: string): Promise<boolean> => {
    const { data, error } = await (supabase as any)
      .from('profiles_codeapp')
      .select('apelido')
      .eq('apelido', apelido)
      .maybeSingle();

    return !!data && !error;
  };

  const handleSubmitForm = async (data: OnboardingFormData) => {
    if (!user) return;

    setIsSubmitting(true);

    setIsCheckingApelido(true);
    const apelidoExists = await checkApelidoExists(data.apelido);
    setIsCheckingApelido(false);

    if (apelidoExists) {
      setError('apelido', { message: 'Este apelido já está em uso. Escolha outro.' });
      setIsSubmitting(false);
      return;
    }

    const { error } = await (supabase as any)
      .from('profiles_codeapp')
      .upsert(
        {
          user_id: user.id,
          nome: data.nome,
          apelido: data.apelido,
          idade: data.idade,
          onboarding_completo: true,
        },
        { onConflict: 'user_id' }
      );

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        setError('apelido', { message: 'Este apelido já está em uso. Escolha outro.' });
        return;
      }
      Toast.show({
        type: 'error',
        text1: 'Erro ao salvar',
        text2: 'Não foi possível salvar seus dados. Tente novamente.',
      });
      return;
    }

    await refreshProfile();

    Toast.show({
      type: 'success',
      text1: `Bem-vindo, ${data.nome}!`,
      text2: 'Sua jornada começa agora.',
    });
    // RootNavigator redireciona para AppTabs após refreshProfile
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6 py-8">
          <Card className="w-full max-w-sm">
            {/* Header */}
            <View className="items-center mb-6 gap-3">
              <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center">
                <Sparkles size={40} color="#ffc105" />
              </View>
              <Text className="text-foreground text-2xl font-bold text-center">
                Vamos começar!
              </Text>
              <Text className="text-muted-foreground text-sm text-center">
                Conte-nos um pouco sobre você para personalizar sua experiência
              </Text>
            </View>

            {/* Form */}
            <View className="gap-5">
              {/* Nome */}
              <View className="gap-1.5">
                <View className="flex-row items-center gap-2">
                  <User size={16} color="#ffc105" />
                  <Text className="text-foreground text-sm font-medium">
                    Qual é o seu nome?
                  </Text>
                </View>
                <Controller
                  control={control}
                  name="nome"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      placeholder="Seu nome completo"
                      autoCapitalize="words"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.nome?.message}
                    />
                  )}
                />
              </View>

              {/* Apelido */}
              <View className="gap-1.5">
                <View className="flex-row items-center gap-2">
                  <AtSign size={16} color="#ffc105" />
                  <Text className="text-foreground text-sm font-medium">
                    Escolha um apelido único
                  </Text>
                </View>
                <Controller
                  control={control}
                  name="apelido"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <Input
                      placeholder="Ex: joao_gamer, maria2015"
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.apelido?.message}
                    />
                  )}
                />
                <Text className="text-muted-foreground text-xs">
                  Só letras, números e _ (sem espaços)
                </Text>
              </View>

              {/* Idade */}
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Calendar size={16} color="#ffc105" />
                  <Text className="text-foreground text-sm font-medium">
                    Quantos anos você tem?
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {AGE_OPTIONS.map((age) => (
                    <Pressable
                      key={age}
                      onPress={() => setValue('idade', age)}
                      className={cn(
                        'w-14 h-12 rounded-xl items-center justify-center',
                        selectedAge === age
                          ? 'bg-primary'
                          : 'bg-secondary'
                      )}
                    >
                      <Text
                        className={cn(
                          'font-bold text-base',
                          selectedAge === age
                            ? 'text-primary-foreground'
                            : 'text-foreground'
                        )}
                      >
                        {age}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {errors.idade && (
                  <Text className="text-destructive text-xs">
                    {errors.idade.message}
                  </Text>
                )}
              </View>

              <Button
                onPress={handleSubmit(handleSubmitForm)}
                loading={isSubmitting || isCheckingApelido}
                disabled={isSubmitting || isCheckingApelido}
                size="lg"
                className="mt-2"
              >
                {isSubmitting ? 'Salvando...' : 'Começar minha jornada!'}
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
