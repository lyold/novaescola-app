import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { X, ChevronLeft, ChevronRight, CheckCircle2, HelpCircle } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

interface Tarefa {
  id: string;
  nome_tarefa: string;
  pontuacao_tarefa: number;
  id_quiz?: string | null;
}

interface QuizPergunta {
  id: string;
  descricao_pergunta: string;
  tipo_pergunta: number; // 1=única, 2=múltipla, 3=texto
  ordem_pergunta: number;
  sub_perguntas?: string[] | null;
  resposta_certa?: string | null;
  validar_pergunta?: boolean | null;
  obrigatorio?: boolean | null;
}

interface QuizModalProps {
  quizId: string;
  tarefa: Tarefa;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function QuizModal({ quizId, tarefa, onClose, onComplete }: QuizModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [perguntas, setPerguntas] = useState<QuizPergunta[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('codeapp_quiz_perguntas')
        .select('id, descricao_pergunta, tipo_pergunta, ordem_pergunta, sub_perguntas, resposta_certa, validar_pergunta, obrigatorio')
        .eq('id_quiz', quizId)
        .order('ordem_pergunta', { ascending: true });

      if (error) {
        Alert.alert('Erro', 'Não foi possível carregar as perguntas do quiz.');
        onClose();
        return;
      }
      setPerguntas(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [quizId]);

  const currentPergunta = perguntas[currentIndex];
  const isLast = currentIndex === perguntas.length - 1;
  const isFirst = currentIndex === 0;
  const progress = perguntas.length > 0 ? ((currentIndex + 1) / perguntas.length) * 100 : 0;

  const canProceed = () => {
    if (!currentPergunta?.obrigatorio) return true;
    const r = respostas[currentPergunta.id];
    if (!r) return false;
    if (Array.isArray(r) && r.length === 0) return false;
    if (typeof r === 'string' && r.trim() === '') return false;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      Alert.alert('Obrigatório', 'Responda esta pergunta antes de continuar.');
      return;
    }
    if (isLast) handleSubmit();
    else setCurrentIndex((i) => i + 1);
  };

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    // Validate answers
    for (const p of perguntas) {
      if (p.validar_pergunta && p.resposta_certa) {
        const correct = normalizeText(p.resposta_certa);
        const given = respostas[p.id];
        const givenNorm = Array.isArray(given)
          ? given.map(normalizeText)
          : normalizeText((given as string) || '');

        const isCorrect = Array.isArray(givenNorm)
          ? givenNorm.includes(correct)
          : givenNorm === correct;

        if (!isCorrect) {
          Alert.alert('Resposta incorreta', 'Revise suas respostas e tente novamente.');
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      // Save responses
      for (const p of perguntas) {
        const r = respostas[p.id];
        const isMultiple = Array.isArray(r);
        await (supabase as any)
          .from('codeapp_quiz_respostas')
          .upsert({
            user_id: user.id,
            id_quiz: quizId,
            id_pergunta: p.id,
            resposta: isMultiple ? null : ((r as string) || null),
            respostas_multiplas: isMultiple ? r : null,
          }, { onConflict: 'user_id,id_pergunta' });
      }

      // Mark as completed
      await (supabase as any)
        .from('codeapp_quiz_conclusao')
        .upsert({
          user_id: user.id,
          id_quiz: quizId,
          foi_finalizado: true,
          data_conclusao: new Date().toISOString(),
        }, { onConflict: 'user_id,id_quiz' });

      await onComplete();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar suas respostas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-card rounded-t-3xl overflow-hidden" style={{ maxHeight: '92%' }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-muted">
            <View className="flex-1 mr-3">
              <Text className="text-foreground font-bold text-base" numberOfLines={1}>{tarefa.nome_tarefa}</Text>
              {perguntas.length > 0 && (
                <Text className="text-muted-foreground text-xs">
                  Pergunta {currentIndex + 1} de {perguntas.length}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} className="p-2">
              <X size={20} color="#b3b3b3" />
            </Pressable>
          </View>

          {/* Progress bar */}
          {perguntas.length > 0 && (
            <View className="h-1 bg-muted">
              <View className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </View>
          )}

          {isLoading ? (
            <View className="py-16 items-center gap-3">
              <ActivityIndicator size="large" color="#ffc105" />
              <Text className="text-muted-foreground">Carregando quiz...</Text>
            </View>
          ) : perguntas.length === 0 ? (
            <View className="py-16 items-center gap-3 px-6">
              <HelpCircle size={48} color="#b3b3b3" />
              <Text className="text-foreground font-semibold">Quiz sem perguntas</Text>
              <Button onPress={onClose}>Fechar</Button>
            </View>
          ) : (
            <>
              <ScrollView className="px-5 py-4" contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
                {currentPergunta && (
                  <View className="gap-4">
                    {/* Question */}
                    <View className="flex-row gap-3 items-start">
                      <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center flex-shrink-0">
                        <Text className="text-primary font-bold text-sm">{currentIndex + 1}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-medium text-base leading-6">
                          {currentPergunta.descricao_pergunta}
                        </Text>
                        {currentPergunta.obrigatorio && (
                          <Text className="text-destructive text-xs mt-0.5">* Obrigatório</Text>
                        )}
                      </View>
                    </View>

                    {/* Tipo 1: Escolha única */}
                    {currentPergunta.tipo_pergunta === 1 && (currentPergunta.sub_perguntas || []).map((opt, idx) => {
                      const selected = respostas[currentPergunta.id] === opt;
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => setRespostas((p) => ({ ...p, [currentPergunta.id]: opt }))}
                          className={`flex-row items-center gap-3 rounded-xl p-4 border ${
                            selected ? 'bg-primary/15 border-primary' : 'bg-muted/20 border-muted'
                          }`}
                        >
                          <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                            {selected && <View className="w-2 h-2 rounded-full bg-primary-foreground" />}
                          </View>
                          <Text className={`flex-1 text-sm ${selected ? 'text-primary font-semibold' : 'text-foreground'}`}>{opt}</Text>
                        </Pressable>
                      );
                    })}

                    {/* Tipo 2: Múltipla escolha */}
                    {currentPergunta.tipo_pergunta === 2 && (currentPergunta.sub_perguntas || []).map((opt, idx) => {
                      const current = (respostas[currentPergunta.id] as string[]) || [];
                      const checked = current.includes(opt);
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            const next = checked ? current.filter((o) => o !== opt) : [...current, opt];
                            setRespostas((p) => ({ ...p, [currentPergunta.id]: next }));
                          }}
                          className={`flex-row items-center gap-3 rounded-xl p-4 border ${
                            checked ? 'bg-primary/15 border-primary' : 'bg-muted/20 border-muted'
                          }`}
                        >
                          <View className={`w-5 h-5 rounded border-2 items-center justify-center ${checked ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                            {checked && <CheckCircle2 size={12} color="#17191f" />}
                          </View>
                          <Text className={`flex-1 text-sm ${checked ? 'text-primary font-semibold' : 'text-foreground'}`}>{opt}</Text>
                        </Pressable>
                      );
                    })}

                    {/* Tipo 3: Texto livre */}
                    {currentPergunta.tipo_pergunta === 3 && (
                      <TextInput
                        className="border border-muted rounded-xl px-4 py-3 text-foreground bg-muted/20 text-base"
                        placeholder="Digite sua resposta..."
                        placeholderTextColor="#b3b3b3"
                        value={(respostas[currentPergunta.id] as string) || ''}
                        onChangeText={(v) => setRespostas((p) => ({ ...p, [currentPergunta.id]: v }))}
                        multiline
                        autoCapitalize="sentences"
                      />
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Footer navigation */}
              <View className="flex-row items-center justify-between px-5 py-4 border-t border-muted gap-3">
                <Pressable
                  onPress={() => !isFirst && setCurrentIndex((i) => i - 1)}
                  disabled={isFirst || isSubmitting}
                  className={`flex-row items-center gap-1 px-4 py-2.5 rounded-xl border ${isFirst ? 'border-muted/30 opacity-40' : 'border-muted bg-muted/20'}`}
                >
                  <ChevronLeft size={16} color="#b3b3b3" />
                  <Text className="text-muted-foreground text-sm font-semibold">Anterior</Text>
                </Pressable>

                <Text className="text-muted-foreground text-xs">{currentIndex + 1} / {perguntas.length}</Text>

                <Pressable
                  onPress={handleNext}
                  disabled={isSubmitting}
                  className="flex-row items-center gap-1 px-4 py-2.5 rounded-xl bg-primary"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#17191f" />
                  ) : isLast ? (
                    <>
                      <CheckCircle2 size={16} color="#17191f" />
                      <Text className="text-primary-foreground text-sm font-bold">Concluir</Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-primary-foreground text-sm font-bold">Próxima</Text>
                      <ChevronRight size={16} color="#17191f" />
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
