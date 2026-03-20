import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { ArrowLeft, QrCode, CheckCircle2, XCircle, RefreshCw, Camera } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

type ScanState = 'scanning' | 'processing' | 'success' | 'error' | 'no-permission';

export function QRScannerScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>(
    permission?.granted ? 'scanning' : 'scanning'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const isProcessingRef = useRef(false);

  const handleScannedCode = useCallback(async (code: string) => {
    if (!user || isProcessingRef.current || !code.trim()) return;
    isProcessingRef.current = true;
    setScanState('processing');

    try {
      const { data: livro } = await (supabase as any)
        .from('codeapp_livro')
        .select('id, nome_livro')
        .eq('qr_code', code.trim())
        .maybeSingle();

      if (!livro) {
        setErrorMessage('Jornada não identificada! Verifique o seu livro e tente novamente.');
        setScanState('error');
        return;
      }

      const { data: jornada } = await (supabase as any)
        .from('codeapp_jornada')
        .select('id, nome_jornada')
        .eq('id_livro', livro.id)
        .maybeSingle();

      if (!jornada) {
        setErrorMessage('Nenhuma jornada associada a este livro.');
        setScanState('error');
        return;
      }

      const { data: existing } = await supabase
        .from('aluno_jornadas' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('id_jornada', jornada.id)
        .maybeSingle();

      if (existing) {
        setErrorMessage('Você já possui esta jornada ativada! Escaneie outro QR Code para adicionar uma nova.');
        setScanState('error');
        return;
      }

      const { error: insertError } = await supabase
        .from('aluno_jornadas' as any)
        .insert({ user_id: user.id, id_jornada: jornada.id, fase_atual: 1, ativa: true });

      if (insertError) {
        setErrorMessage('Não foi possível ativar a jornada. Tente novamente.');
        setScanState('error');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      setSuccessMessage(`Jornada "${jornada.nome_jornada}" ativada com sucesso! 🎉`);
      setScanState('success');

      setTimeout(() => navigation.goBack(), 2000);
    } finally {
      isProcessingRef.current = false;
    }
  }, [user, navigation, queryClient]);

  const resetScanner = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    isProcessingRef.current = false;
    setScanState('scanning');
  };

  if (permission === null) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#ffc105" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <View className="w-20 h-20 rounded-full bg-muted items-center justify-center">
            <Camera size={36} color="#b3b3b3" />
          </View>
          <Text className="text-foreground font-bold text-lg text-center">Acesso à câmera necessário</Text>
          <Text className="text-muted-foreground text-sm text-center">
            Precisamos da câmera para escanear o QR Code do seu livro.
          </Text>
          <Button onPress={requestPermission} className="mt-2">Permitir câmera</Button>
          <Pressable onPress={() => navigation.goBack()} className="py-2">
            <Text className="text-muted-foreground text-sm">Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-muted">
        <Pressable onPress={() => navigation.goBack()} className="p-1">
          <ArrowLeft size={22} color="#b3b3b3" />
        </Pressable>
        <Text className="text-foreground text-lg font-bold">Escanear QR Code</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Camera / State View */}
        <View className="mx-4 mt-6 rounded-2xl overflow-hidden" style={{ aspectRatio: 1 }}>
          {scanState === 'scanning' ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => handleScannedCode(data)}
            >
              {/* Viewfinder overlay */}
              <View className="flex-1 items-center justify-center">
                <View
                  style={{
                    width: 200,
                    height: 200,
                    borderWidth: 3,
                    borderColor: '#ffc105',
                    borderRadius: 16,
                    backgroundColor: 'transparent',
                  }}
                />
              </View>
            </CameraView>
          ) : scanState === 'processing' ? (
            <Animated.View
              entering={FadeIn}
              className="flex-1 bg-muted/20 items-center justify-center gap-4"
            >
              <ActivityIndicator size="large" color="#ffc105" />
              <Text className="text-foreground font-semibold">QR Code detectado!</Text>
              <Text className="text-muted-foreground text-sm">Ativando sua jornada...</Text>
            </Animated.View>
          ) : scanState === 'success' ? (
            <Animated.View
              entering={ZoomIn.springify()}
              className="flex-1 bg-green-500/10 items-center justify-center gap-4 px-6"
            >
              <View className="w-20 h-20 rounded-full bg-green-500/20 items-center justify-center">
                <CheckCircle2 size={40} color="#22c55e" />
              </View>
              <Text className="text-green-400 font-bold text-lg text-center">Jornada ativada!</Text>
              <Text className="text-foreground text-sm text-center">{successMessage}</Text>
            </Animated.View>
          ) : (
            <Animated.View
              entering={ZoomIn.springify()}
              className="flex-1 bg-destructive/10 items-center justify-center gap-4 px-6"
            >
              <View className="w-20 h-20 rounded-full bg-destructive/20 items-center justify-center">
                <XCircle size={40} color="#ef4444" />
              </View>
              <Text className="text-foreground font-bold text-lg text-center">Ops!</Text>
              <Text className="text-muted-foreground text-sm text-center">{errorMessage}</Text>
              <Pressable
                onPress={resetScanner}
                className="flex-row items-center gap-2 bg-card border border-muted rounded-xl px-4 py-2 mt-2"
              >
                <RefreshCw size={16} color="#b3b3b3" />
                <Text className="text-foreground text-sm font-semibold">Tentar novamente</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

        <Text className="text-muted-foreground text-sm text-center mt-4 px-6">
          Posicione o QR Code do seu livro dentro da área de escaneamento
        </Text>

        {/* Manual code input */}
        <View className="mx-4 mt-6 bg-muted/20 rounded-xl p-4 gap-3">
          <View className="flex-row items-center gap-2">
            <QrCode size={14} color="#b3b3b3" />
            <Text className="text-muted-foreground text-xs">Ou insira o código manualmente:</Text>
          </View>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-muted rounded-xl px-3 py-2 text-foreground bg-card text-sm"
              placeholder="Código do QR..."
              placeholderTextColor="#b3b3b3"
              value={manualCode}
              onChangeText={setManualCode}
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={() => handleScannedCode(manualCode)}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => handleScannedCode(manualCode)}
              className="bg-primary rounded-xl px-4 items-center justify-center"
            >
              <QrCode size={18} color="#17191f" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
