import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import {
  ArrowLeft,
  GraduationCap,
  Lock,
  Star,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  BookOpen,
  Flag,
  Sparkles,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';

interface Turma {
  id: string;
  nome_turma: string;
  nome_fantasia: string | null;
  id_formacao: string;
}

interface Formacao {
  id: string;
  nome_formacao: string;
  nome_aplicativo: string | null;
  sigla: string | null;
}

interface Modulo {
  id: string;
  nome_modulo: string;
  nome_aplicativo: string | null;
  ordem: number;
  id_formacao: string;
  ativo: boolean;
}

interface Aula {
  id: string;
  nome_aula: string;
  id_modulo: string;
}

interface AulaProgresso {
  aula_id: string;
  concluida: boolean;
}

const WORLD_COLORS = [
  { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)', text: '#fbbf24' },
  { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.4)', text: '#6366f1' },
  { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#22c55e' },
  { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444' },
  { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', text: '#a855f7' },
  { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.4)', text: '#0ea5e9' },
];

export function TurmaDetailsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { turmaId } = route.params as { turmaId: string };

  const { data, isLoading } = useQuery({
    queryKey: ['turma-details', turmaId, user?.id],
    queryFn: async () => {
      if (!user || !turmaId) return null;

      const [{ data: turmaData }, { data: turmaMember }] = await Promise.all([
        supabase.from('codeapp_turma' as any).select('id, nome_turma, nome_fantasia, id_formacao').eq('id', turmaId).maybeSingle(),
        supabase.from('codeapp_turma_alunos' as any).select('id').eq('id_turma', turmaId).eq('user_id', user.id).maybeSingle(),
      ]);

      if (!turmaData) return null;
      const turma = turmaData as Turma;

      const [{ data: formacaoData }, { data: modulosData }, { data: turmaAulas }] = await Promise.all([
        supabase.from('codeapp_formacao' as any).select('id, nome_formacao, nome_aplicativo, sigla').eq('id', turma.id_formacao).maybeSingle(),
        supabase.from('codeapp_formacao_modulo' as any).select('id, nome_modulo, nome_aplicativo, ordem, id_formacao, ativo').eq('id_formacao', turma.id_formacao).order('ordem', { ascending: true }),
        supabase.from('codeapp_turma_aulas' as any).select('id_aula').eq('id_turma', turmaId).eq('publicado', true),
      ]);

      const modulos: Modulo[] = ((modulosData as Modulo[]) || []).filter((m) => m.ativo !== false);

      const publishedAulaIds = ((turmaAulas as any[]) || []).map((ta) => ta.id_aula);
      let aulas: Aula[] = [];
      let progresso: AulaProgresso[] = [];

      if (publishedAulaIds.length > 0) {
        const { data: aulasData } = await supabase
          .from('codeapp_formacao_aula' as any)
          .select('id, nome_aula, id_modulo')
          .in('id', publishedAulaIds)
          .eq('ativo', true);

        aulas = (aulasData as Aula[]) || [];
        const aulaIds = aulas.map((a) => a.id);

        if (aulaIds.length > 0) {
          const { data: progressoData } = await (supabase as any)
            .from('codeapp_formacao_aula_progresso')
            .select('aula_id, concluida')
            .eq('user_id', user.id)
            .in('aula_id', aulaIds);
          progresso = (progressoData as AulaProgresso[]) || [];
        }
      }

      return { turma, formacao: formacaoData as Formacao | null, modulos, aulas, progresso, isMember: !!turmaMember };
    },
    enabled: !!user && !!turmaId,
    staleTime: 5 * 60 * 1000,
  });

  const getAulasForModulo = useCallback((moduloId: string) => {
    return (data?.aulas || []).filter((a) => a.id_modulo === moduloId);
  }, [data?.aulas]);

  const isAulaCompleted = useCallback((aulaId: string) => {
    return (data?.progresso || []).some((p) => p.aula_id === aulaId && p.concluida);
  }, [data?.progresso]);

  const getModuloProgress = useCallback((moduloId: string) => {
    const moduloAulas = getAulasForModulo(moduloId);
    if (moduloAulas.length === 0) return 0;
    const completed = moduloAulas.filter((a) => isAulaCompleted(a.id)).length;
    return Math.round((completed / moduloAulas.length) * 100);
  }, [getAulasForModulo, isAulaCompleted]);

  const isModuloLocked = useCallback((modulo: Modulo) => {
    if (modulo.ordem === 1) return false;
    const previous = data?.modulos.find((m) => m.ordem === modulo.ordem - 1);
    if (!previous) return false;
    return getModuloProgress(previous.id) < 100;
  }, [data?.modulos, getModuloProgress]);

  const handleModuloPress = useCallback((modulo: Modulo) => {
    if (isModuloLocked(modulo)) {
      const previous = data?.modulos.find((m) => m.ordem === modulo.ordem - 1);
      Alert.alert(
        'Mundo bloqueado',
        `Complete 100% do mundo "${previous?.nome_modulo || 'anterior'}" antes de acessar este.`
      );
      return;
    }
    navigation.navigate('ModuloDetails', { moduloId: modulo.id, turmaId });
  }, [isModuloLocked, data?.modulos, navigation, turmaId]);

  const totalProgress = useCallback(() => {
    const aulas = data?.aulas || [];
    if (aulas.length === 0) return 0;
    const completed = (data?.progresso || []).filter((p) => p.concluida).length;
    return Math.round((completed / aulas.length) * 100);
  }, [data]);

  const renderModuloMap = (modulos: Modulo[]) => {
    const NODE_W = 110;
    const NODE_H = 100;
    const BLOCK_HEIGHT = 220;
    const LEFT_X = 60;
    const RIGHT_X = 230;
    const svgW = 320;
    const totalModulos = modulos.length;
    if (totalModulos === 0) return null;

    const getY = (i: number) => i * BLOCK_HEIGHT + 60;
    const getX = (i: number) => (i % 2 === 0 ? LEFT_X : RIGHT_X);
    const viewBoxH = totalModulos * BLOCK_HEIGHT + 120;

    // Path winds from bottom (start) up to top node
    const startY = viewBoxH - 40;
    let pathD = `M ${svgW / 2} ${startY}`;
    for (let i = totalModulos - 1; i >= 0; i--) {
      const cx = getX(i);
      const cy = getY(i);
      const prevX = i < totalModulos - 1 ? getX(i + 1) : svgW / 2;
      const prevY = i < totalModulos - 1 ? getY(i + 1) : startY;
      pathD += ` C ${prevX} ${prevY - 60} ${cx} ${cy + 60} ${cx} ${cy}`;
    }

    const WORLD_COLORS_MAP = [
      { island: '#f97316', islandDark: '#c2410c', badge: '#fb923c', text: '#fff' },
      { island: '#6366f1', islandDark: '#4338ca', badge: '#818cf8', text: '#fff' },
      { island: '#10b981', islandDark: '#065f46', badge: '#34d399', text: '#fff' },
      { island: '#ec4899', islandDark: '#9d174d', badge: '#f472b6', text: '#fff' },
      { island: '#8b5cf6', islandDark: '#5b21b6', badge: '#a78bfa', text: '#fff' },
      { island: '#0ea5e9', islandDark: '#0369a1', badge: '#38bdf8', text: '#fff' },
    ];

    return (
      <View style={{ width: '100%' }}>
        <LinearGradient
          colors={['#29b6f6', '#4fc3f7', '#81d4fa', '#b3e5fc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width: svgW, alignSelf: 'center', borderRadius: 20, overflow: 'hidden', paddingBottom: 24 }}
        >
          {/* Clouds */}
          {[
            { top: 30, left: 20, w: 70, opacity: 0.7 },
            { top: 80, left: 220, w: 60, opacity: 0.6 },
            { top: 200, left: 10, w: 80, opacity: 0.5 },
            { top: 340, left: 200, w: 65, opacity: 0.65 },
            { top: 500, left: 30, w: 75, opacity: 0.6 },
            { top: 600, left: 210, w: 55, opacity: 0.55 },
          ].map((c, i) => (
            <View key={i} style={{
              position: 'absolute', top: c.top, left: c.left,
              width: c.w, height: 26, borderRadius: 13,
              backgroundColor: `rgba(255,255,255,${c.opacity})`,
            }} />
          ))}

          {/* SVG Road */}
          <Svg width={svgW} height={viewBoxH} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Path d={pathD} stroke="rgba(0,0,0,0.15)" strokeWidth={16} fill="none" strokeLinecap="round" />
            <Path d={pathD} stroke="#d4a96a" strokeWidth={14} fill="none" strokeLinecap="round" />
            <Path d={pathD} stroke="#e8c98a" strokeWidth={10} fill="none" strokeLinecap="round" />
            <Path d={pathD} stroke="rgba(255,255,255,0.5)" strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray="6 8" />
          </Svg>

          {/* Nodes */}
          <View style={{ height: viewBoxH }}>
            {/* Start flag at bottom */}
            <View style={{ position: 'absolute', bottom: 8, left: svgW / 2 - 32, alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#d8b4fe', shadowColor: '#7e22ce', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 6 }}>
                <Sparkles size={24} color="#fff" />
              </View>
              <View style={{ marginTop: 4, backgroundColor: '#7e22ce', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>✨ INÍCIO</Text>
              </View>
            </View>

            {/* Module nodes — ordem=1 at bottom, highest at top */}
            {modulos.map((modulo, idx) => {
              const locked = isModuloLocked(modulo);
              const progress = getModuloProgress(modulo.id);
              const completed = progress === 100;
              const aulaCount = getAulasForModulo(modulo.id).length;
              const colorSet = WORLD_COLORS_MAP[(modulo.ordem - 1) % WORLD_COLORS_MAP.length];

              // ordem=1 → bottom (posIdx = totalModulos-1), highest ordem → top (posIdx=0)
              const posIdx = totalModulos - 1 - idx;
              const cx = getX(posIdx);
              const cy = getY(posIdx);
              const left = cx - NODE_W / 2;
              const top = cy - NODE_H / 2;

              const islandColor = locked ? '#94a3b8' : completed ? '#22c55e' : colorSet.island;
              const islandDark = locked ? '#64748b' : completed ? '#166534' : colorSet.islandDark;

              return (
                <Pressable
                  key={modulo.id}
                  onPress={() => handleModuloPress(modulo)}
                  style={{ position: 'absolute', top, left, width: NODE_W, alignItems: 'center' }}
                >
                  {/* Number badge */}
                  <View style={{ position: 'absolute', top: -10, right: 8, zIndex: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: locked ? '#64748b' : '#f97316', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 }}>
                    {locked ? <Lock size={12} color="#fff" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{modulo.ordem}</Text>}
                  </View>

                  {/* Island shape */}
                  <View style={{ width: NODE_W, height: NODE_H, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {/* Grass island oval */}
                    <View style={{
                      width: NODE_W - 10, height: 44,
                      borderRadius: 22,
                      backgroundColor: islandColor,
                      borderWidth: 2,
                      borderColor: 'rgba(0,0,0,0.1)',
                      shadowColor: islandDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 8,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {/* Shadow under island */}
                      <View style={{ position: 'absolute', bottom: -6, left: 12, right: 12, height: 10, borderRadius: 5, backgroundColor: islandDark, opacity: 0.5 }} />
                    </View>
                    {/* Tree or building */}
                    {!locked && (
                      <View style={{ position: 'absolute', top: 4, alignItems: 'center' }}>
                        {completed ? (
                          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
                            <CheckCircle2 size={22} color="#fff" />
                          </View>
                        ) : (
                          <View style={{ alignItems: 'center' }}>
                            {/* House roof */}
                            <View style={{ width: 0, height: 0, borderLeftWidth: 18, borderRightWidth: 18, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: islandDark }} />
                            {/* House body */}
                            <View style={{ width: 28, height: 22, backgroundColor: '#fff', borderWidth: 1.5, borderColor: islandDark, alignItems: 'center', justifyContent: 'center' }}>
                              <View style={{ width: 8, height: 11, backgroundColor: islandDark, borderRadius: 2 }} />
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Module name */}
                  <Text style={{ marginTop: 6, fontSize: 11, fontWeight: 'bold', color: locked ? '#64748b' : '#1e293b', textAlign: 'center', maxWidth: NODE_W + 20, textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={2}>
                    {modulo.nome_aplicativo || modulo.nome_modulo}
                  </Text>

                  {/* Progress badge */}
                  <View style={{ marginTop: 3, flexDirection: 'row', gap: 4 }}>
                    {aulaCount > 0 && (
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>{aulaCount} aulas</Text>
                      </View>
                    )}
                    {!locked && (
                      <View style={{ backgroundColor: completed ? '#22c55e' : '#f97316', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{progress}%</Text>
                      </View>
                    )}
                    {locked && (
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#e2e8f0', fontWeight: '600' }}>Complete o anterior</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {/* Finish flag at top */}
            <View style={{ position: 'absolute', top: 6, left: svgW / 2 - 32, alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fde68a', shadowColor: '#92400e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 6 }}>
                <Flag size={24} color="#fff" />
              </View>
              <View style={{ marginTop: 4, backgroundColor: '#d97706', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>🏆 FIM</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator size="large" color="#ffc105" />
        <Text className="text-muted-foreground">Carregando turma...</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6 gap-4 bg-background">
        <GraduationCap size={48} color="#b3b3b3" />
        <Text className="text-foreground font-semibold text-center">Turma não encontrada</Text>
        <Pressable onPress={() => navigation.goBack()} className="py-2">
          <Text className="text-primary font-semibold">Voltar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { turma, formacao, modulos } = data;
  const progress = totalProgress();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <Animated.View
        entering={FadeInUp.springify()}
        className="px-4 pt-3 pb-4 bg-card border-b border-muted"
      >
        <View className="flex-row items-center gap-3 mb-3">
          <Pressable onPress={() => navigation.goBack()} className="p-1">
            <ArrowLeft size={22} color="#b3b3b3" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-foreground font-bold text-lg" numberOfLines={1}>
              {turma.nome_fantasia || turma.nome_turma}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {formacao?.nome_aplicativo || formacao?.nome_formacao || 'Formação'}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('TurmaChat', { turmaId })}
            className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center"
          >
            <MessageCircle size={18} color="#ffc105" />
          </Pressable>
        </View>

        {/* Overall progress */}
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-xs">Progresso geral</Text>
            <Text className="text-primary text-xs font-bold">{progress}%</Text>
          </View>
          <View className="h-2 bg-muted rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 8, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {modulos.length === 0 ? (
          <View className="py-16 items-center gap-3">
            <BookOpen size={48} color="#b3b3b3" />
            <Text className="text-foreground font-semibold">Nenhum módulo disponível</Text>
            <Text className="text-muted-foreground text-sm text-center">
              Os módulos desta turma aparecerão aqui quando forem publicados.
            </Text>
          </View>
        ) : renderModuloMap(modulos)}
      </ScrollView>
    </SafeAreaView>
  );
}
