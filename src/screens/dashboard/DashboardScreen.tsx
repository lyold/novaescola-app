import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { Book, Trophy, Star, Coins, QrCode, Rocket, Sparkles } from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getTipoApp } from '@/types';
import { AnimatedStatCard } from '@/components/game/AnimatedStatCard';
import { AnimatedJourneyCard } from '@/components/game/AnimatedJourneyCard';
import { CoinDisplay } from '@/components/game/CoinDisplay';
import { SuasTurmasSection } from '@/components/shared/SuasTurmasSection';
import { NotificationBell } from '@/components/shared/NotificationBell';

interface RpcJornada {
  id: string;
  id_jornada: string;
  nome_jornada: string;
  descricao: string | null;
  pre_definido: boolean;
  ordenacao: number;
  total_tarefas: number;
  tarefas_concluidas: number;
}

interface PreDefinedJornada {
  id: string;
  nome_jornada: string;
  descricao: string | null;
  pre_definido: boolean;
  tipo_app: string | null;
  ordenacao: number;
  total_tarefas: number;
  tarefas_concluidas: number;
}

interface RpcDashboardData {
  stats: {
    total_jornadas: number;
    total_tarefas_concluidas: number;
    total_fases_concluidas: number;
  };
  pre_defined_jornadas: PreDefinedJornada[];
  jornadas: RpcJornada[];
}

export function DashboardScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<any>();
  const tipoApp = getTipoApp(profile?.idade ?? null);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard', user?.id, tipoApp],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_student_dashboard', {
        p_user_id: user!.id,
        p_tipo_app: tipoApp,
      });
      if (error) throw error;
      return data as RpcDashboardData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const stats = {
    totalJornadas: dashboardData?.stats.total_jornadas ?? 0,
    totalTarefas: dashboardData?.stats.total_tarefas_concluidas ?? 0,
    totalFases: dashboardData?.stats.total_fases_concluidas ?? 0,
  };

  const preDefinedJornadas = dashboardData?.pre_defined_jornadas ?? [];
  const jornadas = dashboardData?.jornadas ?? [];

  // Jornadas regulares que não são pré-definidas
  const regularJornadas = jornadas.filter(
    (j) => !preDefinedJornadas.some((p) => p.id === j.id_jornada)
  );

  const greeting = tipoApp === 'kids'
    ? `Olá, ${profile?.nome || 'Aventureiro'}! 👋`
    : `E aí, ${profile?.nome || 'Estudante'}! ⚡`;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          className="px-4 pt-4 pb-3 bg-card border-b border-muted flex-row items-center justify-between"
        >
          <View>
            <Text className="text-foreground text-xl font-bold">{greeting}</Text>
            <Text className="text-muted-foreground text-xs mt-0.5">
              {tipoApp === 'kids' ? '⭐ CodeUP Kids' : '🚀 CodeUP Teens'}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <CoinDisplay amount={profile?.moedas ?? 0} size="md" />
            <NotificationBell />
          </View>
        </Animated.View>

        <View className="px-4 pt-5 gap-5">
          {/* Banner de boas-vindas */}
          <Animated.View
            className="bg-card rounded-2xl p-5 overflow-hidden"
            style={{ shadowColor: '#ffc105', shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 }}
          >
            <View className="absolute right-4 top-4 opacity-30">
              <Rocket size={72} color="#ffc105" />
            </View>
            <Text className="text-foreground text-xl font-bold">
              {tipoApp === 'kids' ? 'Bem-vindo à sua aventura! 🚀' : 'Bora evoluir! 🚀'}
            </Text>
            <Text className="text-muted-foreground text-sm mt-1 max-w-xs">
              {tipoApp === 'kids'
                ? 'Complete tarefas, ganhe moedinhas e desbloqueie conquistas!'
                : 'Complete tarefas, acumule moedas e suba de nível na sua jornada!'}
            </Text>
          </Animated.View>

          {/* Stats */}
          <View className="flex-row gap-3">
            <AnimatedStatCard icon={<Trophy size={24} color="#ffc105" />} value={stats.totalJornadas} label="Jornadas" delay={0} />
            <AnimatedStatCard icon={<Star size={24} color="#ffc105" />} value={stats.totalTarefas} label="Tarefas" delay={100} />
            <AnimatedStatCard icon={<Book size={24} color="#ffc105" />} value={stats.totalFases} label="Fases" delay={200} />
            <AnimatedStatCard icon={<Coins size={24} color="#ffc105" />} value="" label="Moedas" delay={300}>
              <CoinDisplay amount={profile?.moedas ?? 0} size="sm" />
            </AnimatedStatCard>
          </View>

          {/* Jornadas */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Book size={20} color="#ffc105" />
                <Text className="text-foreground text-base font-bold">Suas Jornadas</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('Scanner' as never)}
                className="flex-row items-center gap-1.5 border border-primary/40 px-3 py-1.5 rounded-lg"
              >
                <QrCode size={14} color="#ffc105" />
                <Text className="text-primary text-xs font-medium">Adicionar</Text>
              </Pressable>
            </View>

            {isLoading ? (
              <View className="bg-card rounded-2xl p-6 items-center">
                <Text className="text-muted-foreground">Carregando jornadas...</Text>
              </View>
            ) : (
              <>
                {/* Pré-definidas */}
                {preDefinedJornadas.map((j, i) => {
                  const progress = j.total_tarefas > 0
                    ? Math.round((j.tarefas_concluidas / j.total_tarefas) * 100)
                    : 0;
                  return (
                    <AnimatedJourneyCard
                      key={`pre-${j.id}`}
                      title={j.nome_jornada}
                      subtitle={`${j.tarefas_concluidas}/${j.total_tarefas} tarefas`}
                      progress={progress}
                      index={i}
                      isComplete={progress === 100}
                      onClick={() => navigation.navigate('JornadaDetails' as never, { jornadaId: j.id } as never)}
                    />
                  );
                })}

                {/* Regulares */}
                {regularJornadas.map((j, i) => {
                  const progress = j.total_tarefas > 0
                    ? Math.round((j.tarefas_concluidas / j.total_tarefas) * 100)
                    : 0;
                  return (
                    <AnimatedJourneyCard
                      key={j.id}
                      title={j.nome_jornada}
                      subtitle={`${j.tarefas_concluidas}/${j.total_tarefas} tarefas`}
                      progress={progress}
                      index={preDefinedJornadas.length + i}
                      isComplete={progress === 100}
                      onClick={() => navigation.navigate('JornadaDetails' as never, { jornadaId: j.id_jornada } as never)}
                    />
                  );
                })}

                {/* Empty state */}
                {preDefinedJornadas.length === 0 && regularJornadas.length === 0 && (
                  <Animated.View
                  >
                    <Pressable
                      onPress={() => navigation.navigate('Scanner' as never)}
                      className="bg-card rounded-2xl p-8 items-center border-2 border-dashed border-primary/30 gap-3"
                    >
                      <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
                        <QrCode size={32} color="#ffc105" />
                      </View>
                      <Text className="text-foreground font-bold text-center">
                        Comece sua primeira jornada!
                      </Text>
                      <Text className="text-muted-foreground text-sm text-center">
                        Escaneie o QR Code do seu livro para ativar sua primeira jornada.
                      </Text>
                      <View className="bg-primary px-5 py-2.5 rounded-xl flex-row items-center gap-2 mt-1">
                        <Sparkles size={16} color="#17191f" />
                        <Text className="text-primary-foreground font-semibold text-sm">
                          Escanear QR Code
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                )}
              </>
            )}
          </View>

          {/* Suas Turmas */}
          <SuasTurmasSection />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
