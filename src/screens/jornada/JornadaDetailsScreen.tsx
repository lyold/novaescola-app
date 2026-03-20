import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import Svg, { Path, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lock,
  Sparkles,
  Flag,
  Star,
  Coins,
  Camera,
  Link2,
  FileText,
  Video,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { notifyFriends } from '@/lib/notifyFriends';
import { CoinDisplay } from '@/components/game/CoinDisplay';
import { CoinCelebration } from '@/components/game/CoinCelebration';
import { Progress } from '@/components/ui/Progress';
import { TaskValidationModal, Tarefa } from '@/components/task/TaskValidationModal';
import { QuizModal } from '@/components/task/QuizModal';

interface Jornada {
  id: string;
  nome_jornada: string;
  descricao: string | null;
  tipo_app: string | null;
}

interface Fase {
  id: string;
  nome_fase: string;
  ordem_fase: number;
  custo_moedas: number;
}

interface AlunoTarefa {
  id_tarefa: string;
  completada: boolean;
  status?: string;
  feedback_professor?: string | null;
}

const NODE_SIZE = 80;
const BLOCK_HEIGHT = 200;
const LEFT_PCT = 22;
const RIGHT_PCT = 78;
const CENTER_PCT = 50;

export function JornadaDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { jornadaId } = route.params as { jornadaId: string };
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [alunoTarefas, setAlunoTarefas] = useState<AlunoTarefa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [selectedFase, setSelectedFase] = useState<Fase | null>(null);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [unlockedFases, setUnlockedFases] = useState<string[]>([]);
  const [unlockingFase, setUnlockingFase] = useState<string | null>(null);
  const [faseToUnlock, setFaseToUnlock] = useState<Fase | null>(null);
  const [showCoinCelebration, setShowCoinCelebration] = useState<{ coins: number } | null>(null);
  const [quizTarefa, setQuizTarefa] = useState<Tarefa | null>(null);

  const fetchData = useCallback(async () => {
    if (!jornadaId || !user) return;
    setIsLoading(true);

    const [{ data: jornadaData, error: jornadaError }, { data: fasesData }] = await Promise.all([
      (supabase as any).from('codeapp_jornada').select('id, nome_jornada, descricao, tipo_app').eq('id', jornadaId).maybeSingle(),
      (supabase as any).from('codeapp_fases').select('id, nome_fase, ordem_fase, custo_moedas').eq('id_jornada', jornadaId).order('ordem_fase', { ascending: true }),
    ]);

    if (jornadaError || !jornadaData) {
      Toast.show({ type: 'error', text1: 'Jornada não encontrada' });
      navigation.goBack();
      return;
    }

    setJornada(jornadaData);
    setFases(fasesData || []);

    if (fasesData && fasesData.length > 0) {
      const faseIds = fasesData.map((f: Fase) => f.id);
      const { data: tarefasData } = await (supabase as any)
        .from('codeapp_tarefas')
        .select('id, nome_tarefa, pontuacao_tarefa, id_fase, descricao_tarefa, video_explicativo_url, tipo_validacao, codigo_validacao_tarefa, webhook_validacao, id_quiz, ordem_tarefa')
        .in('id_fase', faseIds);

      setTarefas(tarefasData || []);

      if (tarefasData && tarefasData.length > 0) {
        const tarefaIds = tarefasData.map((t: Tarefa) => t.id);
        const [{ data: alunoTarefasData }, { data: tarefasAlunosStatus }, { data: unlockedData }] = await Promise.all([
          supabase.from('aluno_tarefas' as any).select('id_tarefa, completada').eq('user_id', user.id).in('id_tarefa', tarefaIds),
          (supabase as any).from('codeapp_tarefas_alunos').select('id_tarefa, status, feedback_professor').eq('user_id', user.id).in('id_tarefa', tarefaIds),
          (supabase as any).from('codeapp_fases_desbloqueadas').select('id_fase').eq('user_id', user.id).in('id_fase', faseIds),
        ]);

        const merged: AlunoTarefa[] = (alunoTarefasData || []).map((at: any) => {
          const s = (tarefasAlunosStatus || []).find((x: any) => x.id_tarefa === at.id_tarefa);
          return { ...at, status: s?.status || 'aprovado', feedback_professor: s?.feedback_professor || null };
        });

        const existingIds = new Set(merged.map((m) => m.id_tarefa));
        for (const s of (tarefasAlunosStatus || [])) {
          if (!existingIds.has(s.id_tarefa) && (s.status === 'pendente' || s.status === 'rejeitado')) {
            merged.push({ id_tarefa: s.id_tarefa, completada: false, status: s.status, feedback_professor: s.feedback_professor });
          }
        }

        setAlunoTarefas(merged);
        setUnlockedFases((unlockedData || []).map((u: any) => u.id_fase));
      }
    }
    setIsLoading(false);
  }, [jornadaId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getTarefasForFase = (faseId: string) =>
    tarefas.filter((t) => (t as any).id_fase === faseId).sort((a, b) => ((a as any).ordem_tarefa || 1) - ((b as any).ordem_tarefa || 1));

  const isTarefaCompleted = (id: string) => alunoTarefas.some((at) => at.id_tarefa === id && at.completada && at.status === 'aprovado');
  const isTarefaPending = (id: string) => alunoTarefas.some((at) => at.id_tarefa === id && at.status === 'pendente');
  const isTarefaRejected = (id: string) => alunoTarefas.some((at) => at.id_tarefa === id && at.status === 'rejeitado');

  const getFaseProgress = (faseId: string) => {
    const ft = getTarefasForFase(faseId);
    if (ft.length === 0) return 0;
    return Math.round((ft.filter((t) => isTarefaCompleted(t.id)).length / ft.length) * 100);
  };
  const isFaseCompleted = (faseId: string) => getFaseProgress(faseId) === 100;

  const isPreviousFaseDone = (fase: Fase) => {
    if (fase.ordem_fase === 1) return true;
    const prev = fases.find((f) => f.ordem_fase === fase.ordem_fase - 1);
    return prev ? isFaseCompleted(prev.id) : true;
  };

  const isFaseLockedByCost = (fase: Fase) => fase.custo_moedas > 0 && !unlockedFases.includes(fase.id);
  const isFaseBlockedByProgress = (fase: Fase) => !isPreviousFaseDone(fase);
  const isFaseLocked = (fase: Fase) => isFaseBlockedByProgress(fase) || isFaseLockedByCost(fase);

  const getTotalProgress = () => {
    if (tarefas.length === 0) return 0;
    return Math.round((alunoTarefas.filter((at) => at.completada).length / tarefas.length) * 100);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFaseClick = (fase: Fase) => {
    if (isFaseBlockedByProgress(fase)) {
      const prev = fases.find((f) => f.ordem_fase === fase.ordem_fase - 1);
      Toast.show({ type: 'error', text1: 'Fase bloqueada', text2: `Complete "${prev?.nome_fase || 'a anterior'}" primeiro.` });
      return;
    }
    if (isFaseLockedByCost(fase)) { setFaseToUnlock(fase); return; }
    setSelectedFase(fase);
  };

  const handleOpenTarefa = (tarefa: Tarefa, faseTarefas: Tarefa[]) => {
    if (isTarefaCompleted(tarefa.id) || isTarefaPending(tarefa.id) || completingTask) return;
    const idx = faseTarefas.findIndex((t) => t.id === tarefa.id);
    if (idx > 0 && !isTarefaCompleted(faseTarefas[idx - 1].id)) {
      Toast.show({ type: 'error', text1: 'Tarefa bloqueada', text2: `Complete "${faseTarefas[idx - 1].nome_tarefa}" primeiro.` });
      return;
    }
    if (tarefa.tipo_validacao === 2) setSelectedFase(null);
    setSelectedTarefa(tarefa);
  };

  const handleCompleteTask = async (tarefa: Tarefa, imageUri?: string, linkProjeto?: string) => {
    if (!user || completingTask) return;
    setCompletingTask(tarefa.id);

    let fotoUrl: string | null = null;

    if (imageUri) {
      const ext = imageUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/tarefas/${tarefa.id}_${Date.now()}.${ext}`;
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, blob, { upsert: true });
      if (uploadError) {
        Toast.show({ type: 'error', text1: 'Erro no upload da foto' });
        setCompletingTask(null);
        return;
      }
      fotoUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    }

    const isProfValidation = tarefa.tipo_validacao === 4;
    const { error: tarefaError } = await (supabase as any).from('codeapp_tarefas_alunos').upsert({
      user_id: user.id,
      id_tarefa: tarefa.id,
      foto_url: fotoUrl,
      link_projeto: linkProjeto || null,
      status: isProfValidation ? 'pendente' : 'aprovado',
      data_conclusao: isProfValidation ? null : new Date().toISOString(),
    }, { onConflict: 'user_id,id_tarefa' });

    if (tarefaError) {
      Toast.show({ type: 'error', text1: 'Erro ao completar tarefa' });
      setCompletingTask(null);
      return;
    }

    if (isProfValidation) {
      setAlunoTarefas((prev) => [...prev, { id_tarefa: tarefa.id, completada: true, status: 'pendente' }]);
      Toast.show({ type: 'success', text1: 'Projeto enviado! ⏳', text2: 'Aguarde aprovação do professor.' });
      setCompletingTask(null);
      setSelectedTarefa(null);
      return;
    }

    await (supabase as any).from('aluno_tarefas').upsert({
      user_id: user.id, id_tarefa: tarefa.id, completada: true,
      moedas_ganhas: tarefa.pontuacao_tarefa, foto_url: fotoUrl,
    }, { onConflict: 'user_id,id_tarefa' });

    const newCoins = (profile?.moedas || 0) + tarefa.pontuacao_tarefa;
    await (supabase as any).from('profiles_codeapp').update({ moedas: newCoins }).eq('user_id', user.id);

    await refreshProfile();
    queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
    setAlunoTarefas((prev) => [...prev, { id_tarefa: tarefa.id, completada: true, status: 'aprovado' }]);

    if (tarefa.pontuacao_tarefa > 0) setShowCoinCelebration({ coins: tarefa.pontuacao_tarefa });

    notifyFriends({
      userId: user.id,
      userName: profile?.nome || 'Um amigo',
      tipo: 'task_completed',
      titulo: 'Tarefa concluída! ⭐',
      mensagem: `${profile?.nome || 'Um amigo'} completou "${tarefa.nome_tarefa}" e ganhou ${tarefa.pontuacao_tarefa} moedas!`,
      dados: { moedas: tarefa.pontuacao_tarefa, tarefa_nome: tarefa.nome_tarefa },
    });

    setCompletingTask(null);
    setSelectedTarefa(null);
  };

  const handleUnlockFase = async () => {
    if (!user || !faseToUnlock || unlockingFase) return;
    const fase = faseToUnlock;
    const currentCoins = profile?.moedas || 0;

    if (currentCoins < fase.custo_moedas) {
      Toast.show({ type: 'error', text1: 'Moedas insuficientes', text2: `Você precisa de ${fase.custo_moedas} moedas.` });
      return;
    }
    setUnlockingFase(fase.id);
    const { error } = await (supabase as any).from('codeapp_fases_desbloqueadas').insert({ user_id: user.id, id_fase: fase.id, moedas_gastas: fase.custo_moedas });
    if (error) { Toast.show({ type: 'error', text1: 'Erro ao desbloquear fase' }); setUnlockingFase(null); return; }

    await (supabase as any).from('profiles_codeapp').update({ moedas: currentCoins - fase.custo_moedas }).eq('user_id', user.id);
    await refreshProfile();
    setUnlockedFases((prev) => [...prev, fase.id]);
    setFaseToUnlock(null);
    setUnlockingFase(null);
    Toast.show({ type: 'success', text1: `Fase "${fase.nome_fase}" desbloqueada! 🎉` });
  };

  // ── SVG Game Map ──────────────────────────────────────────────────────────────

  const renderGameMap = () => {
    const totalFases = fases.length;
    if (totalFases === 0) return null;
    const viewBoxH = totalFases * BLOCK_HEIGHT + 150;
    const getY = (i: number) => i * BLOCK_HEIGHT + NODE_SIZE / 2 + 10;
    const getX = (i: number) => (i % 2 === 0 ? LEFT_PCT : RIGHT_PCT);
    const startY = totalFases * BLOCK_HEIGHT + 80;

    // Build SVG path (reversed: finish at top, start at bottom)
    let pathD = `M ${CENTER_PCT} ${startY}`;
    const lastIdx = totalFases - 1;
    const lastX = getX(lastIdx);
    const lastY = getY(lastIdx);
    pathD += ` C ${CENTER_PCT} ${startY - 40} ${lastX} ${lastY + 60} ${lastX} ${lastY}`;
    for (let i = lastIdx; i > 0; i--) {
      const cy = getY(i), cx = getX(i);
      const py = getY(i - 1), px = getX(i - 1);
      pathD += ` C ${cx} ${cy - 50} ${px} ${py + 50} ${px} ${py}`;
    }

    const svgW = 320;

    return (
      <View style={{ width: '100%', alignSelf: 'center' }}>
        <LinearGradient
          colors={['#1a0533', '#0f2d52', '#0f3d1f', '#1a2e05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width: svgW, alignSelf: 'center', borderRadius: 20, overflow: 'hidden', paddingBottom: 20 }}
        >
          {/* Decorative stars */}
          {[...Array(12)].map((_, i) => (
            <View key={i} style={{ position: 'absolute', width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)', top: (i * 73 + 20) % (totalFases * BLOCK_HEIGHT + 100), left: (i * 53 + 15) % (svgW - 20) }} />
          ))}

        {/* SVG Road */}
        <Svg
          width={svgW}
          height={viewBoxH}
          viewBox={`0 0 100 ${viewBoxH}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Road layers */}
          <Path d={pathD} stroke="hsl(120, 45%, 25%)" strokeWidth={18} fill="none" strokeLinecap="round" />
          <Path d={pathD} stroke="hsl(30, 50%, 20%)" strokeWidth={15} fill="none" strokeLinecap="round" />
          <Path d={pathD} stroke="hsl(35, 60%, 42%)" strokeWidth={12} fill="none" strokeLinecap="round" />
          <Path d={pathD} stroke="hsl(38, 65%, 52%)" strokeWidth={9} fill="none" strokeLinecap="round" />
          <Path d={pathD} stroke="hsl(45, 90%, 62%)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeDasharray="4 6" />
        </Svg>

        {/* Phase nodes */}
        <View style={{ height: viewBoxH }}>
          {/* Finish node (top) */}
          <Animated.View
            style={{
              position: 'absolute', top: -10,
              left: svgW / 2 - 48, width: 96, alignItems: 'center',
            }}
          >
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#d97706', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fbbf24' }}>
              <Flag size={32} color="#fff" />
            </View>
            <View style={{ marginTop: 4, backgroundColor: '#d97706', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>🏆 CHEGADA</Text>
            </View>
          </Animated.View>

          {/* Phase nodes - fase with ordem_fase=1 at INÍCIO (bottom), highest at CHEGADA (top) */}
          {fases.map((fase, idx) => {
            const originalIdx = totalFases - 1 - idx;
            const xPct = getX(originalIdx);
            const yPos = getY(originalIdx);
            const left = (xPct / 100) * svgW - NODE_SIZE / 2;
            const completed = isFaseCompleted(fase.id);
            const blockedByProgress = isFaseBlockedByProgress(fase);
            const lockedByCost = isFaseLockedByCost(fase);
            const locked = blockedByProgress || lockedByCost;
            const progress = getFaseProgress(fase.id);
            const faseNumber = fase.ordem_fase;
            const isUnlocking = unlockingFase === fase.id;

            const nodeColor = blockedByProgress ? '#6b7280'
              : completed ? '#22c55e'
              : lockedByCost ? '#f59e0b'
              : '#f59e0b';

            const shadowColor = blockedByProgress ? '#374151'
              : completed ? '#166534'
              : '#92400e';

            return (
              <Animated.View
                key={fase.id}
                style={{ position: 'absolute', top: yPos - NODE_SIZE / 2, left }}
              >
                {/* Label */}
                <View style={{ position: 'absolute', top: -32, left: -30, right: -30, alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: 'rgba(15,23,41,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1.5, borderColor: completed ? '#86efac' : locked ? '#4b5563' : '#fcd34d',
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                  }}>
                    {locked && <Lock size={10} color={blockedByProgress ? '#9ca3af' : '#f59e0b'} />}
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: completed ? '#86efac' : locked ? '#9ca3af' : '#fde68a', maxWidth: 120 }} numberOfLines={1}>
                      {fase.nome_fase}
                    </Text>
                  </View>
                </View>

                {/* Circle button */}
                <Pressable
                  onPress={() => handleFaseClick(fase)}
                  disabled={!!isUnlocking}
                  style={{
                    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
                    backgroundColor: nodeColor,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 4,
                    elevation: 6,
                  }}
                >
                  {/* Shine */}
                  <View style={{ position: 'absolute', top: 6, left: 6, right: 6, height: 30, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.35)' }} />
                  {/* Progress ring */}
                  <Svg style={{ position: 'absolute' }} width={NODE_SIZE} height={NODE_SIZE} viewBox="0 0 80 80">
                    <Circle cx={40} cy={40} r={36} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={5} />
                    <Circle
                      cx={40} cy={40} r={36} fill="none"
                      stroke={completed ? '#fff' : 'rgba(255,255,255,0.6)'}
                      strokeWidth={5} strokeLinecap="round"
                      strokeDasharray={`${(progress / 100) * 226} 226`}
                      rotation={-90} origin="40, 40"
                    />
                  </Svg>
                  {isUnlocking ? <ActivityIndicator color="#fff" size="small" /> :
                   locked ? <Lock size={28} color={blockedByProgress ? '#374151' : '#fff'} /> :
                   <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>{faseNumber}</Text>}
                  {completed && (
                    <View style={{ position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fbbf24', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fde68a' }}>
                      <CheckCircle2 size={16} color="#fff" />
                    </View>
                  )}
                </Pressable>

                {/* Indicator */}
                <View style={{ marginTop: 8, alignSelf: 'center', backgroundColor: 'rgba(15,23,41,0.85)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                  {blockedByProgress ? (
                    <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: '600' }}>Complete a anterior</Text>
                  ) : lockedByCost ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Coins size={10} color="#fbbf24" />
                      <Text style={{ fontSize: 9, color: '#fbbf24', fontWeight: '700' }}>{fase.custo_moedas} moedas</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 9, color: '#d1d5db', fontWeight: '600' }}>
                      {getTarefasForFase(fase.id).filter((t) => isTarefaCompleted(t.id)).length}/{getTarefasForFase(fase.id).length} tarefas
                    </Text>
                  )}
                </View>
              </Animated.View>
            );
          })}

          {/* Start node (bottom) */}
          <Animated.View
            style={{ position: 'absolute', bottom: 0, left: svgW / 2 - 40, alignItems: 'center' }}
          >
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#d8b4fe' }}>
              <Sparkles size={28} color="#fff" />
            </View>
            <View style={{ marginTop: 4, backgroundColor: '#a855f7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✨ INÍCIO</Text>
            </View>
          </Animated.View>
        </View>
        </LinearGradient>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: '#0f1729' }}>
        <ActivityIndicator size="large" color="#ffc105" />
        <Text className="text-muted-foreground mt-3">Carregando jornada...</Text>
      </SafeAreaView>
    );
  }

  const faseTarefas = selectedFase ? getTarefasForFase(selectedFase.id) : [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#0f1729' }}>
      {/* Header */}
      <Animated.View
        style={{ backgroundColor: '#0f1729', borderBottomWidth: 2, borderBottomColor: '#ffc10540', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
            <BookOpen size={20} color="#17191f" />
          </View>
          <View className="flex-1">
            <Text className="text-foreground font-bold text-base" numberOfLines={1}>{jornada?.nome_jornada}</Text>
            <Text className="text-muted-foreground text-xs">{fases.length} fases • {tarefas.length} tarefas</Text>
          </View>
        </View>
        <CoinDisplay amount={profile?.moedas || 0} />
      </Animated.View>

      {/* Progress bar */}
      <View style={{ backgroundColor: 'rgba(15,23,41,0.9)', paddingHorizontal: 16, paddingVertical: 12 }}>
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center gap-1.5">
            <Star size={14} color="#ffc105" fill="#ffc105" />
            <Text className="text-foreground text-xs font-bold">Progresso da Jornada</Text>
          </View>
          <Text className="text-primary text-xs font-bold">{getTotalProgress()}%</Text>
        </View>
        <Progress value={getTotalProgress()} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 32, paddingHorizontal: 16, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {jornada?.descricao && (
          <Text className="text-muted-foreground text-sm text-center mb-6">{jornada.descricao}</Text>
        )}
        {fases.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Sparkles size={48} color="#b3b3b3" />
            <Text className="text-foreground font-semibold">Nenhuma fase disponível</Text>
            <Text className="text-muted-foreground text-sm">Esta jornada ainda não possui fases.</Text>
          </View>
        ) : (
          renderGameMap()
        )}
      </ScrollView>

      {/* Modal: Tarefas da Fase */}
      <Modal
        visible={!!selectedFase && !selectedTarefa}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFase(null)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <Animated.View
            className="bg-card rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '80%' }}
          >
            {/* Modal header */}
            <View className="flex-row items-center gap-3 px-5 pt-5 pb-3 border-b border-muted">
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
                <Text className="text-primary-foreground font-black text-sm">{selectedFase ? fases.findIndex((f) => f.id === selectedFase.id) + 1 : ''}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-bold">{selectedFase?.nome_fase}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Progress value={selectedFase ? getFaseProgress(selectedFase.id) : 0} className="flex-1 h-1.5" />
                  <Text className="text-muted-foreground text-xs">{selectedFase ? getFaseProgress(selectedFase.id) : 0}%</Text>
                </View>
              </View>
              <Pressable onPress={() => setSelectedFase(null)} className="p-2">
                <Text className="text-muted-foreground text-xl">✕</Text>
              </Pressable>
            </View>

            <ScrollView className="px-5 py-4" contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {faseTarefas.length === 0 ? (
                <Text className="text-muted-foreground text-center py-6">Nenhuma tarefa nesta fase.</Text>
              ) : faseTarefas.map((tarefa, idx) => {
                const completed = isTarefaCompleted(tarefa.id);
                const pending = isTarefaPending(tarefa.id);
                const rejected = isTarefaRejected(tarefa.id);
                const blockedByPrev = idx > 0 && !isTarefaCompleted(faseTarefas[idx - 1].id);

                const statusColor = completed ? '#22c55e' : pending ? '#f59e0b' : rejected ? '#ef4444' : blockedByPrev ? '#6b7280' : '#ffc105';

                return (
                  <Animated.View
                    key={tarefa.id}
                  >
                    <Pressable
                      onPress={() => handleOpenTarefa(tarefa, faseTarefas)}
                      disabled={completed || pending || blockedByPrev}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 14, borderRadius: 16, borderWidth: 1.5,
                        borderColor: completed ? '#22c55e40' : pending ? '#f59e0b40' : rejected ? '#ef444440' : '#282d3d',
                        backgroundColor: completed ? '#22c55e08' : pending ? '#f59e0b08' : rejected ? '#ef444408' : '#1c1f2a',
                        opacity: blockedByPrev ? 0.5 : 1,
                      }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${statusColor}20`, alignItems: 'center', justifyContent: 'center' }}>
                        {completed ? <CheckCircle2 size={20} color="#22c55e" /> :
                         pending ? <Star size={20} color="#f59e0b" /> :
                         blockedByPrev ? <Lock size={20} color="#6b7280" /> :
                         getValidationIcon(tarefa)}
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-semibold text-sm">{tarefa.nome_tarefa}</Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <Text style={{ color: statusColor, fontSize: 11, fontWeight: '600' }}>
                            {completed ? '✓ Concluída' : pending ? '⏳ Aguardando professor' : rejected ? '✗ Rejeitada' : blockedByPrev ? '🔒 Bloqueada' : `${tarefa.pontuacao_tarefa} moedas`}
                          </Text>
                        </View>
                      </View>
                      {!completed && !pending && !blockedByPrev && (
                        <View style={{ backgroundColor: '#ffc10520', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ color: '#ffc105', fontSize: 11, fontWeight: '700' }}>Iniciar</Text>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal: Confirmar desbloqueio de fase */}
      <Modal visible={!!faseToUnlock} transparent animationType="fade" onRequestClose={() => setFaseToUnlock(null)}>
        <View className="flex-1 bg-black/70 justify-center px-6">
          <Animated.View
            className="bg-card rounded-2xl p-6 gap-4 items-center"
          >
            <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
              <Coins size={32} color="#ffc105" />
            </View>
            <Text className="text-foreground text-lg font-bold text-center">Desbloquear fase?</Text>
            <Text className="text-muted-foreground text-center text-sm">
              <Text className="text-foreground font-semibold">{faseToUnlock?.nome_fase}</Text>
              {' '}custa{' '}
              <Text className="text-primary font-bold">{faseToUnlock?.custo_moedas} moedas</Text>
              {'.'}
              {'\n'}Você tem{' '}
              <Text className="text-primary font-bold">{profile?.moedas || 0} moedas</Text>.
            </Text>
            <View className="flex-row gap-3 w-full">
              <Pressable onPress={() => setFaseToUnlock(null)} className="flex-1 border border-muted py-3 rounded-xl items-center">
                <Text className="text-muted-foreground font-medium">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleUnlockFase}
                disabled={!!unlockingFase}
                className="flex-1 bg-primary py-3 rounded-xl items-center"
              >
                {unlockingFase ? <ActivityIndicator size="small" color="#17191f" /> : <Text className="text-primary-foreground font-bold">Desbloquear</Text>}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Task Validation Modal */}
      {selectedTarefa && (
        <TaskValidationModal
          tarefa={selectedTarefa}
          onClose={() => setSelectedTarefa(null)}
          onComplete={handleCompleteTask}
          onStartQuiz={(tarefa) => {
            setSelectedTarefa(null);
            setSelectedFase(null);
            setQuizTarefa(tarefa);
          }}
        />
      )}

      {/* Quiz Modal */}
      {quizTarefa && quizTarefa.id_quiz && (
        <QuizModal
          quizId={quizTarefa.id_quiz}
          tarefa={quizTarefa}
          onClose={() => setQuizTarefa(null)}
          onComplete={async () => {
            await handleCompleteTask(quizTarefa);
            setQuizTarefa(null);
          }}
        />
      )}

      {/* Coin Celebration */}
      {showCoinCelebration && (
        <CoinCelebration
          coins={showCoinCelebration.coins}
          onDone={() => setShowCoinCelebration(null)}
        />
      )}
    </SafeAreaView>
  );
}

function getValidationIcon(tarefa: Tarefa) {
  if (tarefa.video_explicativo_url) return <Video size={18} color="#3b82f6" />;
  if (tarefa.tipo_validacao === 4) return <Link2 size={18} color="#6366f1" />;
  if (tarefa.tipo_validacao === 3) return <Star size={18} color="#a855f7" />;
  if (tarefa.tipo_validacao === 2) return <Camera size={18} color="#f59e0b" />;
  return <FileText size={18} color="#b3b3b3" />;
}
