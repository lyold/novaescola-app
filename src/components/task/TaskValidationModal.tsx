import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';

import { X, Camera, CheckCircle2, Link2, Star, FileText } from 'lucide-react-native';

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : null;
}

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

export interface Tarefa {
  id: string;
  nome_tarefa: string;
  pontuacao_tarefa: number;
  descricao_tarefa?: string | null;
  video_explicativo_url?: string | null;
  tipo_validacao?: number | null;
  codigo_validacao_tarefa?: string | null;
  webhook_validacao?: string | null;
  id_quiz?: string | null;
}

interface Props {
  tarefa: Tarefa;
  onClose: () => void;
  onComplete: (tarefa: Tarefa, imageUri?: string, linkProjeto?: string) => Promise<void>;
  onStartQuiz?: (tarefa: Tarefa) => void;
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function TaskValidationModal({ tarefa, onClose, onComplete, onStartQuiz }: Props) {
  const { user } = useAuth();
  const tipoValidacao = tarefa.tipo_validacao || 1;

  const [isValidating, setIsValidating] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [linkProjeto, setLinkProjeto] = useState('');
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [isCheckingQuiz, setIsCheckingQuiz] = useState(false);

  useEffect(() => {
    const checkQuiz = async () => {
      if (tipoValidacao !== 3 || !tarefa.id_quiz || !user) return;
      setIsCheckingQuiz(true);
      const { data } = await (supabase as any)
        .from('codeapp_quiz_conclusao')
        .select('foi_finalizado')
        .eq('user_id', user.id)
        .eq('id_quiz', tarefa.id_quiz)
        .maybeSingle();
      setIsQuizCompleted(data?.foi_finalizado === true);
      setIsCheckingQuiz(false);
    };
    checkQuiz();
  }, [tarefa.id_quiz, user, tipoValidacao]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
      if (!result.canceled) setImageUri(result.assets[0].uri);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      if (tipoValidacao === 1) {
        // Code validation
        const expected = normalizeText(tarefa.codigo_validacao_tarefa || '');
        const given = normalizeText(codigoInput);
        if (expected && given !== expected) {
          alert('Código incorreto. Tente novamente!');
          setIsValidating(false);
          return;
        }
        await onComplete(tarefa);
      } else if (tipoValidacao === 2) {
        // Photo capture
        if (!imageUri) {
          alert('Capture uma foto para validar a tarefa.');
          setIsValidating(false);
          return;
        }
        await onComplete(tarefa, imageUri);
      } else if (tipoValidacao === 3) {
        // Quiz
        if (!isQuizCompleted) {
          onStartQuiz?.(tarefa);
          setIsValidating(false);
          return;
        }
        await onComplete(tarefa);
      } else if (tipoValidacao === 4) {
        // Professor validation: link + optional photo
        if (!linkProjeto.trim()) {
          alert('Insira o link do projeto para validar.');
          setIsValidating(false);
          return;
        }
        await onComplete(tarefa, imageUri ?? undefined, linkProjeto.trim());
      } else {
        await onComplete(tarefa);
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <Animated.View
          className="bg-card rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '90%' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-muted">
            <View className="flex-1 mr-3">
              <Text className="text-foreground font-bold text-base" numberOfLines={2}>{tarefa.nome_tarefa}</Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Star size={12} color="#ffc105" fill="#ffc105" />
                <Text className="text-primary text-xs font-semibold">{tarefa.pontuacao_tarefa} moedas</Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="p-2">
              <X size={20} color="#b3b3b3" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4" contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            {/* Descrição */}
            {tarefa.descricao_tarefa && (
              <View className="bg-muted/30 rounded-xl p-4">
                <Text className="text-muted-foreground text-sm leading-5">{tarefa.descricao_tarefa}</Text>
              </View>
            )}

            {/* Vídeo explicativo */}
            {tarefa.video_explicativo_url && getYouTubeEmbedUrl(tarefa.video_explicativo_url) && (
              <View style={{ height: 210, borderRadius: 12, overflow: 'hidden' }}>
                <WebView
                  source={{ uri: getYouTubeEmbedUrl(tarefa.video_explicativo_url)! }}
                  style={{ flex: 1 }}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                />
              </View>
            )}

            {/* Tipo 1: Código */}
            {tipoValidacao === 1 && tarefa.codigo_validacao_tarefa && (
              <View className="gap-2">
                <Text className="text-foreground font-semibold text-sm">Digite o código de validação:</Text>
                <TextInput
                  className="border border-muted rounded-xl px-4 py-3 text-foreground bg-muted/20 text-base"
                  placeholder="Código da tarefa..."
                  placeholderTextColor="#b3b3b3"
                  value={codigoInput}
                  onChangeText={setCodigoInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Tipo 2: Foto */}
            {tipoValidacao === 2 && (
              <View className="gap-3">
                <Text className="text-foreground font-semibold text-sm">Capture uma foto como evidência:</Text>
                {imageUri ? (
                  <View className="gap-2">
                    <Image source={{ uri: imageUri }} className="w-full h-48 rounded-xl" resizeMode="cover" />
                    <Pressable onPress={() => setImageUri(null)} className="items-center py-2">
                      <Text className="text-destructive text-sm">Remover foto</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={takePhoto}
                      className="flex-1 bg-primary/10 border border-primary/30 rounded-xl py-4 items-center gap-2"
                    >
                      <Camera size={24} color="#ffc105" />
                      <Text className="text-primary text-xs font-semibold">Câmera</Text>
                    </Pressable>
                    <Pressable
                      onPress={pickImage}
                      className="flex-1 bg-muted/30 border border-muted rounded-xl py-4 items-center gap-2"
                    >
                      <FileText size={24} color="#b3b3b3" />
                      <Text className="text-muted-foreground text-xs font-semibold">Galeria</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Tipo 3: Quiz */}
            {tipoValidacao === 3 && (
              <View className="gap-3">
                {isCheckingQuiz ? (
                  <ActivityIndicator color="#ffc105" />
                ) : isQuizCompleted ? (
                  <View className="flex-row items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <CheckCircle2 size={24} color="#22c55e" />
                    <Text className="text-green-400 font-semibold">Quiz concluído! Pronto para validar.</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => onStartQuiz?.(tarefa)}
                    className="flex-row items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4"
                  >
                    <Star size={24} color="#a855f7" />
                    <View>
                      <Text className="text-foreground font-semibold">Fazer o Quiz</Text>
                      <Text className="text-muted-foreground text-xs">Complete o quiz para validar a tarefa</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}

            {/* Tipo 4: Link + Foto (Professor valida) */}
            {tipoValidacao === 4 && (
              <View className="gap-3">
                <View className="flex-row items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2">
                  <Link2 size={16} color="#6366f1" />
                  <Text className="text-indigo-400 text-xs">O professor irá validar seu projeto</Text>
                </View>

                <View className="gap-2">
                  <Text className="text-foreground font-semibold text-sm">Link do projeto:</Text>
                  <TextInput
                    className="border border-muted rounded-xl px-4 py-3 text-foreground bg-muted/20"
                    placeholder="https://..."
                    placeholderTextColor="#b3b3b3"
                    value={linkProjeto}
                    onChangeText={setLinkProjeto}
                    autoCorrect={false}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-foreground text-sm">Foto do projeto (opcional):</Text>
                  {imageUri ? (
                    <View className="gap-2">
                      <Image source={{ uri: imageUri }} className="w-full h-36 rounded-xl" resizeMode="cover" />
                      <Pressable onPress={() => setImageUri(null)} className="items-center py-1">
                        <Text className="text-destructive text-sm">Remover foto</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={takePhoto}
                      className="bg-muted/30 border border-muted border-dashed rounded-xl py-4 items-center gap-2"
                    >
                      <Camera size={20} color="#b3b3b3" />
                      <Text className="text-muted-foreground text-xs">Adicionar foto</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Botão validar */}
            {(tipoValidacao !== 3 || isQuizCompleted) && (
              <Button
                onPress={handleValidate}
                loading={isValidating}
                className="mb-4"
              >
                {tipoValidacao === 4 ? 'Enviar para professor' : 'Validar Tarefa'}
              </Button>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
