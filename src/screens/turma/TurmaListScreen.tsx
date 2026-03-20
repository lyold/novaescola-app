import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { GraduationCap, ChevronRight, MessageCircle, UsersRound, Play } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';

interface TurmaAluno {
  id: string;
  id_turma: string;
  turma: {
    id: string;
    nome_turma: string;
    nome_fantasia: string | null;
    formacao: { id: string; nome_formacao: string; nome_aplicativo: string | null; sigla: string | null } | null;
  } | null;
}

export function TurmaListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const { data: turmas, isLoading } = useQuery({
    queryKey: ['turmas-aluno-list', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: turmaAlunosData } = await supabase
        .from('codeapp_turma_alunos' as any)
        .select('id, id_turma')
        .eq('user_id', user.id)
        .eq('ativo', true);

      if (!turmaAlunosData || (turmaAlunosData as any[]).length === 0) return [];

      const turmaIds = (turmaAlunosData as any[]).map((ta) => ta.id_turma);
      const { data: turmasData } = await supabase
        .from('codeapp_turma' as any)
        .select('id, nome_turma, nome_fantasia, id_formacao')
        .in('id', turmaIds);

      const formacaoIds = ((turmasData as any[]) || []).map((t) => t.id_formacao).filter(Boolean);
      const { data: formacoesData } = formacaoIds.length > 0
        ? await supabase.from('codeapp_formacao' as any).select('id, nome_formacao, nome_aplicativo, sigla').in('id', formacaoIds)
        : { data: [] };

      return (turmaAlunosData as any[]).map((ta) => {
        const turma = ((turmasData as any[]) || []).find((t) => t.id === ta.id_turma);
        const formacao = ((formacoesData as any[]) || []).find((f) => f.id === turma?.id_formacao);
        return {
          id: ta.id,
          id_turma: ta.id_turma,
          turma: turma ? {
            id: turma.id,
            nome_turma: turma.nome_turma,
            nome_fantasia: turma.nome_fantasia || null,
            formacao: formacao ? { id: formacao.id, nome_formacao: formacao.nome_formacao, nome_aplicativo: formacao.nome_aplicativo, sigla: formacao.sigla } : null,
          } : null,
        } as TurmaAluno;
      });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Animated.View entering={FadeInUp.springify()} className="px-4 pt-4 pb-3 border-b border-muted">
        <View className="flex-row items-center gap-2">
          <UsersRound size={24} color="#ffc105" />
          <Text className="text-foreground text-xl font-bold">Minhas Turmas</Text>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
        {isLoading ? (
          <View className="py-20 items-center gap-3">
            <ActivityIndicator size="large" color="#ffc105" />
            <Text className="text-muted-foreground">Carregando turmas...</Text>
          </View>
        ) : !turmas || turmas.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} className="py-12 items-center gap-4 mx-2">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
              <GraduationCap size={36} color="#ffc105" />
            </View>
            <Text className="text-foreground font-bold text-lg text-center">Nenhuma turma ainda</Text>
            <Text className="text-muted-foreground text-sm text-center px-4">
              Você ainda não está matriculado em nenhuma turma. Entre em contato com a Codemind para fazer parte!
            </Text>
          </Animated.View>
        ) : (
          turmas.map((ta, index) => (
            <Animated.View key={ta.id} entering={FadeInDown.delay(index * 80).springify()}>
              <Card className="p-0 overflow-hidden">
                <Pressable
                  onPress={() => navigation.navigate('TurmaDetails', { turmaId: ta.id_turma })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  className="flex-row items-center gap-3 p-4"
                >
                  <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center flex-shrink-0">
                    <GraduationCap size={24} color="#ffc105" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-bold text-base" numberOfLines={1}>
                      {ta.turma?.nome_fantasia || ta.turma?.nome_turma || 'Turma'}
                    </Text>
                    <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                      {ta.turma?.formacao?.nome_aplicativo || ta.turma?.formacao?.nome_formacao || ta.turma?.nome_turma || ''}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#b3b3b3" />
                </Pressable>

                <View className="flex-row border-t border-muted">
                  <Pressable
                    onPress={() => navigation.navigate('TurmaDetails', { turmaId: ta.id_turma })}
                    className="flex-1 flex-row items-center justify-center gap-2 py-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <Play size={14} color="#ffc105" />
                    <Text className="text-primary text-sm font-semibold">Ver módulos</Text>
                  </Pressable>

                  <View className="w-px bg-muted" />

                  <Pressable
                    onPress={() => navigation.navigate('TurmaChat', { turmaId: ta.id_turma })}
                    className="flex-1 flex-row items-center justify-center gap-2 py-3"
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <MessageCircle size={14} color="#b3b3b3" />
                    <Text className="text-muted-foreground text-sm font-semibold">Chat</Text>
                  </Pressable>
                </View>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
