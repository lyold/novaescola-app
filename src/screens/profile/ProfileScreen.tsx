import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Camera, LogOut, Star, Check } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CoinDisplay } from '@/components/game/CoinDisplay';
import { Card } from '@/components/ui/Card';

const MATERIAS = [
  { id: 'matematica', label: 'Matemática', emoji: '📐' },
  { id: 'fisica', label: 'Física', emoji: '⚡' },
  { id: 'quimica', label: 'Química', emoji: '🧪' },
  { id: 'portugues', label: 'Português', emoji: '📝' },
  { id: 'historia', label: 'História', emoji: '📜' },
  { id: 'geografia', label: 'Geografia', emoji: '🌍' },
  { id: 'biologia', label: 'Biologia', emoji: '🧬' },
  { id: 'ingles', label: 'Inglês', emoji: '🇬🇧' },
];

export function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [selectedMaterias, setSelectedMaterias] = useState<string[]>(
    profile?.materias_favoritas || []
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.foto_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para trocar a foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !user) return;

    setIsUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${ext}`;
      const resp = await fetch(uri);
      const blob = await resp.blob();

      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, blob, { upsert: true });
      if (uploadError) {
        Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
        return;
      }

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      await (supabase as any).from('profiles_codeapp').update({ foto_url: publicUrl }).eq('user_id', user.id);
      setPreviewUrl(publicUrl);
      await refreshProfile();
    } finally {
      setIsUploading(false);
    }
  };

  const toggleMateria = (materiaId: string) => {
    setSelectedMaterias((prev) =>
      prev.includes(materiaId) ? prev.filter((m) => m !== materiaId) : [...prev, materiaId]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles_codeapp')
        .update({ materias_favoritas: selectedMaterias })
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
        return;
      }

      await refreshProfile();
      Alert.alert('Salvo!', 'Suas matérias favoritas foram atualizadas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header / Avatar */}
        <Animated.View entering={FadeIn.springify()} className="items-center pt-8 pb-6 gap-3">
          <View className="relative">
            <Avatar
              src={previewUrl}
              name={profile?.nome}
              size={96}
              borderColor="#ffc105"
            />
            <Pressable
              onPress={handlePickPhoto}
              disabled={isUploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-background"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#17191f" />
              ) : (
                <Camera size={14} color="#17191f" />
              )}
            </Pressable>
          </View>

          <View className="items-center gap-1">
            <Text className="text-foreground text-xl font-bold">{profile?.nome || 'Sem nome'}</Text>
            <Text className="text-muted-foreground text-sm">@{profile?.apelido || 'sem-apelido'}</Text>
            {profile?.moedas != null && (
              <CoinDisplay amount={profile.moedas} size="md" />
            )}
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="mx-4 mb-5">
          <Card className="flex-row divide-x divide-muted">
            <View className="flex-1 items-center py-4 gap-1">
              <Text className="text-primary font-bold text-xl">{profile?.moedas ?? 0}</Text>
              <Text className="text-muted-foreground text-xs">Moedas</Text>
            </View>
            <View className="flex-1 items-center py-4 gap-1">
              <Text className="text-foreground font-bold text-xl">{profile?.moedas ?? 0}</Text>
              <Text className="text-muted-foreground text-xs">Total</Text>
            </View>
            <View className="flex-1 items-center py-4 gap-1">
              <Text className="text-foreground font-bold text-xl">{profile?.idade ?? '–'}</Text>
              <Text className="text-muted-foreground text-xs">Idade</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Matérias Favoritas */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="mx-4 gap-3 mb-5">
          <View className="flex-row items-center gap-2">
            <Star size={18} color="#ffc105" fill="#ffc105" />
            <Text className="text-foreground font-bold">Matérias Favoritas</Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {MATERIAS.map((materia) => {
              const selected = selectedMaterias.includes(materia.id);
              return (
                <Pressable
                  key={materia.id}
                  onPress={() => toggleMateria(materia.id)}
                  className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                    selected
                      ? 'bg-primary/20 border-primary'
                      : 'bg-muted/20 border-muted'
                  }`}
                >
                  <Text style={{ fontSize: 14 }}>{materia.emoji}</Text>
                  <Text className={`text-sm font-medium ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {materia.label}
                  </Text>
                  {selected && <Check size={12} color="#ffc105" />}
                </Pressable>
              );
            })}
          </View>

          <Button onPress={handleSave} loading={isSaving}>
            Salvar preferências
          </Button>
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="mx-4">
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-destructive/40 bg-destructive/10"
          >
            <LogOut size={18} color="#ef4444" />
            <Text className="text-destructive font-semibold">Sair da conta</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
