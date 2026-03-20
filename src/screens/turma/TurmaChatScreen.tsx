import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ArrowLeft, Send, ImageIcon, Users, X, Loader2 } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';

interface ChatMessage {
  id: string;
  id_turma: string;
  user_id: string;
  destinatario_user_id: string | null;
  mensagem: string | null;
  imagem_url: string | null;
  tipo: string;
  created_at: string;
  deleted_at: string | null;
  profile?: {
    apelido: string | null;
    nome: string | null;
    foto_url: string | null;
  };
}

interface TurmaMember {
  user_id: string;
  apelido: string | null;
  nome: string | null;
  foto_url: string | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function MessageBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const name = msg.profile?.apelido || msg.profile?.nome || '?';

  return (
    <View className={`flex-row gap-2 px-4 py-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <Avatar src={msg.profile?.foto_url} name={msg.profile?.nome} size={32} />
      )}
      <View style={{ maxWidth: '75%' }}>
        {!isMe && (
          <Text className="text-muted-foreground text-xs mb-1 ml-1">{name}</Text>
        )}
        <View className={`rounded-2xl px-3 py-2 ${isMe ? 'bg-primary rounded-tr-sm' : 'bg-card border border-muted rounded-tl-sm'}`}>
          {msg.imagem_url ? (
            <Image source={{ uri: msg.imagem_url }} style={{ width: 200, height: 150, borderRadius: 10 }} resizeMode="cover" />
          ) : (
            <Text className={`text-sm leading-5 ${isMe ? 'text-primary-foreground' : 'text-foreground'}`}>
              {msg.mensagem}
            </Text>
          )}
        </View>
        <Text className={`text-xs text-muted-foreground mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
          {formatTime(msg.created_at)}
        </Text>
      </View>
    </View>
  );
}

export function TurmaChatScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { turmaId } = route.params as { turmaId: string };

  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<TurmaMember[]>([]);
  const [turmaName, setTurmaName] = useState('Chat da Turma');
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSilenced, setIsSilenced] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const enrichMessage = useCallback(async (msg: any): Promise<ChatMessage> => {
    const cached = members.find((m) => m.user_id === msg.user_id);
    if (cached) {
      return { ...msg, profile: { apelido: cached.apelido, nome: cached.nome, foto_url: cached.foto_url } };
    }
    const { data } = await (supabase as any)
      .from('profiles_codeapp')
      .select('apelido, nome, foto_url')
      .eq('user_id', msg.user_id)
      .maybeSingle();
    return { ...msg, profile: data || null };
  }, [members]);

  const fetchData = useCallback(async () => {
    if (!turmaId || !user) return;
    setIsLoading(true);

    const [turmaRes, membersRes, silencedRes] = await Promise.all([
      (supabase as any).from('codeapp_turma').select('nome_turma, nome_fantasia').eq('id', turmaId).maybeSingle(),
      (supabase as any).from('codeapp_turma_alunos').select('user_id').eq('id_turma', turmaId).eq('ativo', true),
      (supabase as any).from('codeapp_chat_silenciados').select('silenciado_ate').eq('id_turma', turmaId).eq('user_id', user.id),
    ]);

    setTurmaName(turmaRes.data?.nome_fantasia || turmaRes.data?.nome_turma || 'Chat da Turma');

    const activeSilence = (silencedRes.data || []).find(
      (s: any) => !s.silenciado_ate || new Date(s.silenciado_ate) > new Date()
    );
    setIsSilenced(!!activeSilence);

    if (membersRes.data) {
      const userIds = membersRes.data.map((m: any) => m.user_id);
      const { data: profiles } = await (supabase as any)
        .from('profiles_codeapp')
        .select('user_id, apelido, nome, foto_url')
        .in('user_id', userIds);
      setMembers((profiles || []) as TurmaMember[]);
    }

    // Fetch messages
    const { data: msgs } = await (supabase as any)
      .from('codeapp_chat_mensagens')
      .select('id, id_turma, user_id, destinatario_user_id, mensagem, imagem_url, tipo, created_at, deleted_at')
      .eq('id_turma', turmaId)
      .is('deleted_at', null)
      .is('destinatario_user_id', null)
      .order('created_at', { ascending: true })
      .limit(100);

    const membersForEnrich = (membersRes.data
      ? await (async () => {
          const userIds = membersRes.data.map((m: any) => m.user_id);
          const { data: p } = await (supabase as any).from('profiles_codeapp').select('user_id, apelido, nome, foto_url').in('user_id', userIds);
          return (p || []) as TurmaMember[];
        })()
      : []) as TurmaMember[];

    const enriched = await Promise.all(
      (msgs || []).map(async (msg: any) => {
        const cached = membersForEnrich.find((m) => m.user_id === msg.user_id);
        if (cached) return { ...msg, profile: { apelido: cached.apelido, nome: cached.nome, foto_url: cached.foto_url } };
        const { data } = await (supabase as any).from('profiles_codeapp').select('apelido, nome, foto_url').eq('user_id', msg.user_id).maybeSingle();
        return { ...msg, profile: data || null };
      })
    );

    setMessages(enriched as ChatMessage[]);
    setIsLoading(false);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }, [turmaId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!turmaId || !user) return;

    const channel = supabase
      .channel(`chat-turma-${turmaId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'codeapp_chat_mensagens', filter: `id_turma=eq.${turmaId}` },
        async (payload: any) => {
          const newMsg = payload.new;
          if (newMsg.destinatario_user_id !== null) return; // Only group messages
          const cached = members.find((m) => m.user_id === newMsg.user_id);
          let enriched: ChatMessage;
          if (cached) {
            enriched = { ...newMsg, profile: { apelido: cached.apelido, nome: cached.nome, foto_url: cached.foto_url } };
          } else {
            const { data: p } = await (supabase as any).from('profiles_codeapp').select('apelido, nome, foto_url').eq('user_id', newMsg.user_id).maybeSingle();
            enriched = { ...newMsg, profile: p || null };
          }
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'codeapp_chat_mensagens', filter: `id_turma=eq.${turmaId}` },
        (payload: any) => {
          const updated = payload.new;
          if (updated.deleted_at) {
            setMessages((prev) => prev.filter((m) => m.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [turmaId, user, members]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !turmaId || !user || isSending || isSilenced) return;

    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    const { error } = await (supabase as any).from('codeapp_chat_mensagens').insert({
      id_turma: turmaId,
      user_id: user.id,
      destinatario_user_id: null,
      mensagem: text,
      tipo: 'texto',
    });

    if (error) {
      setNewMessage(text);
      if (error.message?.includes('row-level security') || error.code === '42501') {
        setIsSilenced(true);
        Alert.alert('Você foi silenciado', 'Não é possível enviar mensagens no momento.');
      }
    }
    setIsSending(false);
  }, [newMessage, turmaId, user, isSending, isSilenced]);

  const sendImage = useCallback(async () => {
    if (!turmaId || !user || uploadingImage) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para enviar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
    if (result.canceled) return;

    setUploadingImage(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() || 'jpg';
      const fileName = `chat/${turmaId}/${user.id}/${Date.now()}.${ext}`;
      const resp = await fetch(uri);
      const blob = await resp.blob();

      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, blob, { upsert: false });
      if (uploadError) {
        Alert.alert('Erro', 'Não foi possível enviar a imagem.');
        return;
      }

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      await (supabase as any).from('codeapp_chat_mensagens').insert({
        id_turma: turmaId,
        user_id: user.id,
        destinatario_user_id: null,
        imagem_url: urlData.publicUrl,
        tipo: 'imagem',
      });
    } finally {
      setUploadingImage(false);
    }
  }, [turmaId, user, uploadingImage]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble msg={item} isMe={item.user_id === user?.id} />
  ), [user?.id]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center gap-3">
        <ActivityIndicator size="large" color="#ffc105" />
        <Text className="text-muted-foreground">Carregando chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <Animated.View
        entering={FadeInUp.springify()}
        className="flex-row items-center gap-3 px-4 py-3 bg-card border-b border-muted"
      >
        <Pressable onPress={() => navigation.goBack()} className="p-1">
          <ArrowLeft size={22} color="#b3b3b3" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-foreground font-bold" numberOfLines={1}>{turmaName}</Text>
          <Text className="text-muted-foreground text-xs">{members.length} membros</Text>
        </View>
        <Pressable onPress={() => setShowMembers(true)} className="p-2">
          <Users size={20} color="#b3b3b3" />
        </Pressable>
      </Animated.View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 gap-3">
              <Text className="text-muted-foreground text-center">Nenhuma mensagem ainda.</Text>
              <Text className="text-muted-foreground text-sm text-center">Seja o primeiro a enviar!</Text>
            </View>
          }
        />

        {/* Input */}
        <View className="flex-row items-end gap-2 px-4 py-3 bg-card border-t border-muted">
          <Pressable onPress={sendImage} className="p-2 mb-1" disabled={uploadingImage}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#ffc105" />
            ) : (
              <ImageIcon size={22} color="#b3b3b3" />
            )}
          </Pressable>

          <TextInput
            className="flex-1 border border-muted rounded-2xl px-4 py-2.5 text-foreground bg-muted/20 text-sm"
            placeholder={isSilenced ? 'Você foi silenciado...' : 'Mensagem...'}
            placeholderTextColor="#b3b3b3"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            style={{ maxHeight: 100 }}
            editable={!isSilenced}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />

          <Pressable
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending || isSilenced}
            className={`w-10 h-10 rounded-full items-center justify-center mb-0.5 ${newMessage.trim() && !isSilenced ? 'bg-primary' : 'bg-muted'}`}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#17191f" />
            ) : (
              <Send size={18} color={newMessage.trim() && !isSilenced ? '#17191f' : '#6b7280'} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Members panel */}
      {showMembers && (
        <View className="absolute inset-0 bg-black/60" style={{ zIndex: 50 }}>
          <Pressable className="flex-1" onPress={() => setShowMembers(false)} />
          <View className="bg-card rounded-t-3xl px-5 pt-5 pb-8" style={{ maxHeight: '60%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-foreground font-bold text-lg">Membros ({members.length})</Text>
              <Pressable onPress={() => setShowMembers(false)} className="p-1">
                <X size={20} color="#b3b3b3" />
              </Pressable>
            </View>
            <FlatList
              data={members}
              keyExtractor={(item) => item.user_id}
              renderItem={({ item }) => (
                <View className="flex-row items-center gap-3 py-3 border-b border-muted/50">
                  <Avatar src={item.foto_url} name={item.nome} size={40} borderColor={item.user_id === user?.id ? '#ffc105' : '#ffc10540'} />
                  <View>
                    <Text className={`text-sm font-semibold ${item.user_id === user?.id ? 'text-primary' : 'text-foreground'}`}>
                      {item.nome || 'Sem nome'}{item.user_id === user?.id ? ' (você)' : ''}
                    </Text>
                    <Text className="text-muted-foreground text-xs">@{item.apelido || 'sem-apelido'}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
