import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';
import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { UsersRound, GraduationCap, ChevronRight, Play } from 'lucide-react-native';

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
    formacao: { id: string; nome_formacao: string; sigla: string | null } | null;
  } | null;
}


export function SuasTurmasSection() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { data: turmasAluno, isLoading } = useQuery({
    queryKey: ['turmas-aluno', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: turmaAlunosData, error } = await supabase
        .from('codeapp_turma_alunos' as any)
        .select('id, id_turma')
        .eq('user_id', user.id)
        .eq('ativo', true);

      if (error) throw error;
      if (!turmaAlunosData || turmaAlunosData.length === 0) return [];

      const turmaIds = turmaAlunosData.map((ta: any) => ta.id_turma);
      const { data: turmasData, error: turmasError } = await supabase
        .from('codeapp_turma' as any)
        .select('id, nome_turma, nome_fantasia, id_formacao')
        .in('id', turmaIds);

      if (turmasError) throw turmasError;

      const formacaoIds = (turmasData as any[])?.map((t: any) => t.id_formacao).filter(Boolean) || [];
      const { data: formacoesData } = await supabase
        .from('codeapp_formacao' as any)
        .select('id, nome_formacao, sigla')
        .in('id', formacaoIds);

      return turmaAlunosData.map((ta: any) => {
        const turma = (turmasData as any[])?.find((t: any) => t.id === ta.id_turma);
        const formacao = (formacoesData as any[])?.find((f: any) => f.id === turma?.id_formacao);
        return {
          id: ta.id,
          id_turma: ta.id_turma,
          turma: turma ? {
            id: turma.id,
            nome_turma: turma.nome_turma,
            nome_fantasia: turma.nome_fantasia || null,
            formacao: formacao ? { id: formacao.id, nome_formacao: formacao.nome_formacao, sigla: formacao.sigla } : null,
          } : null,
        } as TurmaAluno;
      });
    },
    enabled: !!user,
  });

  const { data: ctaConfig } = useQuery({
    queryKey: ['config-cta-codemind'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('codeapp_configuracoes' as any)
        .select('valor')
        .eq('chave', 'CTA_FAZER_PARTE_CODEMIND')
        .maybeSingle();
      if (error) return null;
      return (data as any)?.valor || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasTurmas = turmasAluno && turmasAluno.length > 0;

  return (
    <View className="gap-3">
      {/* Header */}
      <View className="flex-row items-center gap-2">
        <UsersRound size={22} color="#ffc105" />
        <Text className="text-foreground text-lg font-bold">Suas Turmas</Text>
      </View>

      {isLoading ? (
        <Card className="items-center py-6">
          <Text className="text-muted-foreground">Carregando...</Text>
        </Card>
      ) : hasTurmas ? (
        turmasAluno.map((ta, index) => (
          <Animated.View
            key={ta.id}
          >
            <Pressable
              onPress={() => navigation.navigate('TurmaDetails', { turmaId: ta.id_turma })}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Card className="flex-row items-center gap-3 p-3">
                <View className="w-11 h-11 rounded-full bg-primary/20 items-center justify-center">
                  <GraduationCap size={22} color="#ffc105" />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground font-semibold text-sm" numberOfLines={1}>
                    {ta.turma?.nome_fantasia || ta.turma?.nome_turma || 'Turma'}
                  </Text>
                  <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                    {ta.turma?.formacao?.nome_formacao || ta.turma?.nome_turma || ''}
                  </Text>
                </View>
                <ChevronRight size={18} color="#b3b3b3" />
              </Card>
            </Pressable>
          </Animated.View>
        ))
      ) : (
        // CTA sem turmas
        <Card className="items-center py-6 gap-3 border border-dashed border-primary/30">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
            <GraduationCap size={32} color="#ffc105" />
          </View>
          <Text className="text-foreground font-bold text-center">Faça parte da Codemind!</Text>
          <Text className="text-muted-foreground text-sm text-center px-4">
            Participe das nossas turmas e aprenda programação de forma divertida!
          </Text>
          <Pressable
            onPress={() => ctaConfig ? Linking.openURL(ctaConfig) : Linking.openURL('https://wa.me/5524992268107')}
            className="bg-primary px-5 py-2.5 rounded-xl flex-row items-center gap-2 mt-1"
          >
            <Play size={16} color="#17191f" />
            <Text className="text-primary-foreground font-semibold text-sm">
              Quero fazer parte
            </Text>
          </Pressable>
        </Card>
      )}

    </View>
  );
}
