import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  Star,
  ChevronRight,
  X,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TaskValidationModal, Tarefa } from '@/components/task/TaskValidationModal';
import { CoinCelebration } from '@/components/game/CoinCelebration';

interface Aula {
  id: string;
  nome_aula: string;
  descricao_aula: string | null;
  video_url: string | null;
  ordem: number;
  id_modulo: string;
}

interface AulaProgresso {
  aula_id: string;
  concluida: boolean;
}

interface TarefaAluno {
  id_tarefa: string;
  data_conclusao: string | null;
  status: string | null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}?rel=0`;
  }
  return null;
}

export function ModuloDetailsScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { moduloId, turmaId } = route.params as { moduloId: string; turmaId: string };

  const [selectedAula, setSelectedAula] = useState<Aula | null>(null);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [completingAula, setCompletingAula] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<number | null>(null);

  const queryKey = ['modulo-details', moduloId, user?.id];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user || !moduloId) return null;

      const { data: moduloData } = await supabase
        .from('codeapp_formacao_modulo' as any)
        .select('id, nome_modulo, nome_aplicativo, ordem, id_formacao')
        .eq('id', moduloId)
        .maybeSingle();

      if (!moduloData) return null;

      const { data: aulasData } = await supabase
        .from('codeapp_formacao_aula' as any)
        .select('id, nome_aula, descricao_aula, video_url, ordem, id_modulo')
        .eq('id_modulo', moduloId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      const aulas: Aula[] = (aulasData as Aula[]) || [];
      const aulaIds = aulas.map((a) => a.id);

      let progresso: AulaProgresso[] = [];
      let tarefas: Tarefa[] = [];
      let tarefasAluno: TarefaAluno[] = [];

      if (aulaIds.length > 0) {
        const [{ data: progressoData }, { data: tarefasData }] = await Promise.all([
          (supabase as any).from('codeapp_formacao_aula_progresso').select('aula_id, concluida').eq('user_id', user.id).in('aula_id', aulaIds),
          (supabase as any).from('codeapp_formacao_aula_tarefa').select('id, nome_tarefa, pontuacao_tarefa, id_aula, descricao_tarefa, video_explicativo_url, tipo_validacao, codigo_validacao_tarefa, webhook_validacao, id_quiz').in('id_aula', aulaIds),
        ]);

        progresso = (progressoData as AulaProgresso[]) || [];
        tarefas = (tarefasData as Tarefa[]) || [];

        const tarefaIds = tarefas.map((t) => t.id);
        if (tarefaIds.length > 0) {
          const { data: taAluno } = await (supabase as any)
            .from('codeapp_formacao_aula_tarefa_aluno')
            .select('id_tarefa, data_conclusao, status')
            .eq('user_id', user.id)
            .in('id_tarefa', tarefaIds);
          tarefasAluno = (taAluno as TarefaAluno[]) || [];
        }
      }

      return { modulo: moduloData as any, aulas, progresso, tarefas, tarefasAluno };
    },
    enabled: !!user && !!moduloId,
    staleTime: 5 * 60 * 1000,
  });

  const isAulaCompleted = useCallback((aulaId: string) => {
    return (data?.progresso || []).some((p) => p.aula_id === aulaId && p.concluida);
  }, [data?.progresso]);

  const isAulaLocked = useCallback((aula: Aula) => {
    if (aula.ordem === 1) return false;
    const prev = (data?.aulas || []).find((a) => a.ordem === aula.ordem - 1);
    if (!prev) return false;
    return !isAulaCompleted(prev.id);
  }, [data?.aulas, isAulaCompleted]);

  const getTarefasForAula = useCallback((aulaId: string) => {
    return (data?.tarefas || []).filter((t) => (t as any).id_aula === aulaId);
  }, [data?.tarefas]);

  const isTarefaApproved = useCallback((tarefaId: string) => {
    return (data?.tarefasAluno || []).some((ta) => ta.id_tarefa === tarefaId && ta.status === 'aprovado' && ta.data_conclusao);
  }, [data?.tarefasAluno]);

  const isTarefaPending = useCallback((tarefaId: string) => {
    return (data?.tarefasAluno || []).some((ta) => ta.id_tarefa === tarefaId && ta.status === 'pendente');
  }, [data?.tarefasAluno]);

  const areAllTarefasCompleted = useCallback((aulaId: string) => {
    const aulaTarefas = getTarefasForAula(aulaId);
    if (aulaTarefas.length === 0) return true;
    return aulaTarefas.every((t) => isTarefaApproved(t.id));
  }, [getTarefasForAula, isTarefaApproved]);

  const getAulaTaskProgress = useCallback((aulaId: string) => {
    const aulaTarefas = getTarefasForAula(aulaId);
    if (aulaTarefas.length === 0) return 100;
    const done = aulaTarefas.filter((t) => isTarefaApproved(t.id)).length;
    return Math.round((done / aulaTarefas.length) * 100);
  }, [getTarefasForAula, isTarefaApproved]);

  const handleCompleteTask = useCallback(async (tarefa: Tarefa, imageUri?: string, linkProjeto?: string) => {
    if (!user || completingTask) return;
    setCompletingTask(tarefa.id);

    try {
      let fotoUrl: string | null = null;

      if (imageUri) {
        const ext = imageUri.split('.').pop() || 'jpg';
        const fileName = `${user.id}/aula-tarefas/${tarefa.id}_${Date.now()}.${ext}`;
        const resp = await fetch(imageUri);
        const blob = await resp.blob();
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, blob, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
          fotoUrl = urlData.publicUrl;
        }
      }

      const isProfessor = tarefa.tipo_validacao === 4;
      const { error } = await (supabase as any)
        .from('codeapp_formacao_aula_tarefa_aluno')
        .upsert({
          user_id: user.id,
          id_tarefa: tarefa.id,
          foto_url: fotoUrl,
          link_projeto: linkProjeto || null,
          status: isProfessor ? 'pendente' : 'aprovado',
          data_conclusao: isProfessor ? null : new Date().toISOString(),
        }, { onConflict: 'user_id,id_tarefa' });

      if (error) {
        Alert.alert('Erro', 'Não foi possível completar a tarefa.');
        return;
      }

      if (isProfessor) {
        Alert.alert('Projeto enviado! ⏳', 'Aguarde a aprovação do professor para receber as moedas.');
        refetch();
        setSelectedTarefa(null);
        return;
      }

      const pontos = tarefa.pontuacao_tarefa || 0;
      if (pontos > 0) {
        const newCoins = (profile?.moedas || 0) + pontos;
        await (supabase as any).from('profiles_codeapp').update({ moedas: newCoins }).eq('user_id', user.id);
        await refreshProfile();
        setCelebration(pontos);
      }

      refetch();
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      setSelectedTarefa(null);
    } finally {
      setCompletingTask(null);
    }
  }, [user, completingTask, profile, refreshProfile, refetch, queryClient]);

  const handleCompleteAula = useCallback(async (aula: Aula) => {
    if (!user || completingAula) return;

    if (!areAllTarefasCompleted(aula.id)) {
      Alert.alert('Tarefas pendentes', 'Complete todas as tarefas antes de concluir a aula.');
      return;
    }

    setCompletingAula(aula.id);
    try {
      await (supabase as any)
        .from('codeapp_formacao_aula_progresso')
        .upsert({ user_id: user.id, aula_id: aula.id, concluida: true, data_conclusao: new Date().toISOString() }, { onConflict: 'user_id,aula_id' });

      refetch();
      queryClient.invalidateQueries({ queryKey: ['turma-details'] });
      setSelectedAula(null);
    } finally {
      setCompletingAula(null);
    }
  }, [user, completingAula, areAllTarefasCompleted, refetch, queryClient]);

  const totalProgress = useCallback(() => {
    const aulas = data?.aulas || [];
    if (aulas.length === 0) return 0;
    const done = (data?.progresso || []).filter((p) => p.concluida).length;
    return Math.round((done / aulas.length) * 100);
  }, [data]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#ffc105" />
        <Text className="text-muted-foreground">Carregando módulo...</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center gap-4 px-6">
        <BookOpen size={48} color="#b3b3b3" />
        <Text className="text-foreground font-semibold">Módulo não encontrado</Text>
        <Pressable onPress={() => navigation.goBack()}><Text className="text-primary font-semibold">Voltar</Text></Pressable>
      </SafeAreaView>
    );
  }

  const { modulo, aulas } = data;
  const progress = totalProgress();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} className="px-4 pt-3 pb-4 bg-card border-b border-muted">
        <View className="flex-row items-center gap-3 mb-3">
          <Pressable onPress={() => navigation.goBack()} className="p-1">
            <ArrowLeft size={22} color="#b3b3b3" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-foreground font-bold text-lg" numberOfLines={1}>
              {modulo.nome_aplicativo || modulo.nome_modulo}
            </Text>
            <Text className="text-muted-foreground text-xs">{aulas.length} aulas</Text>
          </View>
        </View>
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-xs">Progresso</Text>
            <Text className="text-primary text-xs font-bold">{progress}%</Text>
          </View>
          <View className="h-2 bg-muted rounded-full overflow-hidden">
            <View className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </View>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }}>
        {aulas.map((aula, index) => {
          const locked = isAulaLocked(aula);
          const completed = isAulaCompleted(aula.id);
          const taskProgress = getAulaTaskProgress(aula.id);
          const tarefas = getTarefasForAula(aula.id);

          return (
            <Animated.View key={aula.id} entering={FadeInDown.delay(index * 70).springify()}>
              <Pressable
                onPress={() => {
                  if (locked) {
                    const prev = aulas.find((a) => a.ordem === aula.ordem - 1);
                    Alert.alert('Aula bloqueada', `Complete "${prev?.nome_aula || 'a aula anterior'}" primeiro.`);
                    return;
                  }
                  setSelectedAula(aula);
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View
                  className={`rounded-xl p-4 border ${
                    locked
                      ? 'bg-muted/10 border-muted/30'
                      : completed
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-card border-muted'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${locked ? 'bg-muted/20' : completed ? 'bg-green-500/20' : 'bg-primary/20'}`}>
                      {locked ? (
                        <Lock size={18} color="#6b7280" />
                      ) : completed ? (
                        <CheckCircle2 size={20} color="#22c55e" />
                      ) : (
                        <Text className="text-primary font-bold text-sm">{aula.ordem}</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={`font-semibold text-sm ${locked ? 'text-muted-foreground' : 'text-foreground'}`} numberOfLines={1}>
                        {aula.nome_aula}
                      </Text>
                      {tarefas.length > 0 && (
                        <Text className={`text-xs ${locked ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                          {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} · {taskProgress}%
                        </Text>
                      )}
                    </View>
                    {!locked && <ChevronRight size={16} color={completed ? '#22c55e' : '#b3b3b3'} />}
                  </View>

                  {!locked && tarefas.length > 0 && (
                    <View className="h-1 bg-muted rounded-full overflow-hidden mt-3">
                      <View className="h-full rounded-full" style={{ width: `${taskProgress}%`, backgroundColor: completed ? '#22c55e' : '#ffc105' }} />
                    </View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Aula detail modal */}
      {selectedAula && (
        <Modal transparent animationType="slide" onRequestClose={() => setSelectedAula(null)}>
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-card rounded-t-3xl overflow-hidden" style={{ maxHeight: '85%' }}>
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-muted">
                <View className="flex-1 mr-3">
                  <Text className="text-foreground font-bold text-base" numberOfLines={2}>{selectedAula.nome_aula}</Text>
                </View>
                <Pressable onPress={() => setSelectedAula(null)} className="p-2">
                  <X size={20} color="#b3b3b3" />
                </Pressable>
              </View>

              <ScrollView className="px-5 py-4" contentContainerStyle={{ gap: 16 }}>
                {selectedAula.descricao_aula && (
                  <View className="bg-muted/30 rounded-xl p-4">
                    <Text className="text-muted-foreground text-sm leading-5">{selectedAula.descricao_aula}</Text>
                  </View>
                )}

                {selectedAula.video_url && (() => {
                  const embedUrl = getYouTubeEmbedUrl(selectedAula.video_url);
                  return embedUrl ? (
                    <View className="rounded-xl overflow-hidden" style={{ height: 200 }}>
                      <WebView
                        source={{ uri: embedUrl }}
                        style={{ flex: 1 }}
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        javaScriptEnabled
                      />
                    </View>
                  ) : null;
                })()}

                {/* Tarefas */}
                {getTarefasForAula(selectedAula.id).length > 0 && (
                  <View className="gap-2">
                    <Text className="text-foreground font-bold text-sm">Tarefas:</Text>
                    {getTarefasForAula(selectedAula.id).map((tarefa) => {
                      const done = isTarefaApproved(tarefa.id);
                      const pending = isTarefaPending(tarefa.id);
                      return (
                        <Pressable
                          key={tarefa.id}
                          onPress={() => {
                            if (!done && !pending) {
                              setSelectedAula(null);
                              setSelectedTarefa(tarefa);
                            }
                          }}
                          className={`flex-row items-center gap-3 rounded-xl p-3 border ${
                            done ? 'bg-green-500/10 border-green-500/30' :
                            pending ? 'bg-amber-500/10 border-amber-500/30' :
                            'bg-muted/20 border-muted'
                          }`}
                        >
                          <View className={`w-8 h-8 rounded-full items-center justify-center ${done ? 'bg-green-500/20' : pending ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
                            {done ? <CheckCircle2 size={16} color="#22c55e" /> : <Star size={16} color={pending ? '#f59e0b' : '#ffc105'} />}
                          </View>
                          <View className="flex-1">
                            <Text className={`text-sm font-semibold ${done ? 'text-green-400' : pending ? 'text-amber-400' : 'text-foreground'}`} numberOfLines={1}>
                              {tarefa.nome_tarefa}
                            </Text>
                            <Text className="text-muted-foreground text-xs">
                              {done ? 'Concluída ✓' : pending ? 'Aguardando aprovação' : `+${tarefa.pontuacao_tarefa} moedas`}
                            </Text>
                          </View>
                          {!done && !pending && <ChevronRight size={14} color="#b3b3b3" />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Concluir aula */}
                {!isAulaCompleted(selectedAula.id) && (
                  <Button
                    onPress={() => handleCompleteAula(selectedAula)}
                    loading={completingAula === selectedAula.id}
                    className="mb-4"
                  >
                    Concluir Aula
                  </Button>
                )}

                {isAulaCompleted(selectedAula.id) && (
                  <View className="flex-row items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                    <CheckCircle2 size={20} color="#22c55e" />
                    <Text className="text-green-400 font-semibold">Aula concluída!</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Task Validation Modal */}
      {selectedTarefa && (
        <TaskValidationModal
          tarefa={selectedTarefa}
          onClose={() => setSelectedTarefa(null)}
          onComplete={handleCompleteTask}
        />
      )}

      {/* Coin Celebration */}
      {celebration !== null && (
        <CoinCelebration coins={celebration} onDone={() => setCelebration(null)} />
      )}
    </SafeAreaView>
  );
}
