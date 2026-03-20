import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  Users,
  UserPlus,
  Search,
  UserMinus,
  Check,
  X,
  Clock,
  Bell,
  Trophy,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/lib/notifyFriends';
import { Avatar } from '@/components/ui/Avatar';
import { CoinDisplay } from '@/components/game/CoinDisplay';
import { Card } from '@/components/ui/Card';
import Toast from 'react-native-toast-message';

interface FriendProfile {
  user_id: string;
  nome: string | null;
  apelido: string | null;
  moedas: number;
  foto_url: string | null;
  ultimo_acesso: string | null;
}

interface Friend {
  id: string;
  user_id: string;
  amigo_user_id: string;
  created_at: string;
  status: string;
  amigo?: FriendProfile;
}

interface PendingRequest {
  id: string;
  user_id: string;
  amigo_user_id: string;
  created_at: string;
  status: string;
  solicitante?: FriendProfile;
}

type TabKey = 'friends' | 'requests';

function isOnline(ultimoAcesso: string | null): boolean {
  if (!ultimoAcesso) return false;
  const diff = (Date.now() - new Date(ultimoAcesso).getTime()) / 60000;
  return diff < 5;
}

export function FriendsScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [
        { data: myFriends, error: e1 },
        { data: incoming, error: e2 },
        { data: outgoing, error: e3 },
      ] = await Promise.all([
        (supabase as any).from('codeapp_amigos').select('*').eq('user_id', user.id).eq('status', 'aceito'),
        (supabase as any).from('codeapp_amigos').select('*').eq('amigo_user_id', user.id).eq('status', 'pendente'),
        (supabase as any).from('codeapp_amigos').select('*').eq('user_id', user.id).eq('status', 'pendente'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      const friendIds = (myFriends || []).map((r: any) => r.amigo_user_id);
      const requesterIds = (incoming || []).map((r: any) => r.user_id);
      const targetIds = (outgoing || []).map((r: any) => r.amigo_user_id);
      const cols = 'user_id, nome, apelido, moedas, foto_url, ultimo_acesso';

      const [fp, rp, tp] = await Promise.all([
        friendIds.length > 0
          ? (supabase as any).from('profiles_codeapp').select(cols).in('user_id', friendIds).then((r: any) => r.data)
          : Promise.resolve([]),
        requesterIds.length > 0
          ? (supabase as any).from('profiles_codeapp').select(cols).in('user_id', requesterIds).then((r: any) => r.data)
          : Promise.resolve([]),
        targetIds.length > 0
          ? (supabase as any).from('profiles_codeapp').select(cols).in('user_id', targetIds).then((r: any) => r.data)
          : Promise.resolve([]),
      ]);

      const friendsWithProfiles: Friend[] = friendIds.map((fid: string) => {
        const rec = (myFriends || []).find((r: any) => r.amigo_user_id === fid);
        return {
          id: rec?.id || fid,
          user_id: user.id,
          amigo_user_id: fid,
          created_at: rec?.created_at || '',
          status: 'aceito',
          amigo: (fp || []).find((p: FriendProfile) => p.user_id === fid),
        };
      }).sort((a: Friend, b: Friend) => {
        const ao = isOnline(a.amigo?.ultimo_acesso ?? null);
        const bo = isOnline(b.amigo?.ultimo_acesso ?? null);
        if (ao && !bo) return -1;
        if (!ao && bo) return 1;
        return (a.amigo?.nome || '').localeCompare(b.amigo?.nome || '');
      });

      setFriends(friendsWithProfiles);
      setPendingRequests((incoming || []).map((r: any) => ({
        ...r,
        solicitante: (rp || []).find((p: FriendProfile) => p.user_id === r.user_id),
      })));
      setSentRequests((outgoing || []).map((r: any) => ({
        ...r,
        amigo: (tp || []).find((p: FriendProfile) => p.user_id === r.amigo_user_id),
      })));
    } catch (err) {
      console.error('fetchFriends error:', err);
      Toast.show({ type: 'error', text1: 'Erro ao carregar amigos' });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchFriends();
  }, [user, fetchFriends]);

  // Debounced autocomplete search
  useEffect(() => {
    if (searchText.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await (supabase as any)
          .from('profiles_codeapp')
          .select('user_id, nome, apelido, moedas, foto_url, ultimo_acesso')
          .or(`nome.ilike.%${searchText}%,apelido.ilike.%${searchText}%`)
          .neq('user_id', user?.id || '')
          .limit(10);
        const friendIds = friends.map((f) => f.amigo_user_id);
        const sentIds = sentRequests.map((r) => r.amigo_user_id);
        setSuggestions((data || []).filter((s: FriendProfile) =>
          !friendIds.includes(s.user_id) && !sentIds.includes(s.user_id)
        ));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchText, user?.id, friends, sentRequests]);

  const handleSelectSuggestion = async (selectedUser: FriendProfile) => {
    if (!user) return;
    setIsAdding(true);
    setSuggestions([]);

    // If there's an incoming request from this user, accept it
    const existingReceived = pendingRequests.find((r) => r.user_id === selectedUser.user_id);
    if (existingReceived) {
      await handleAcceptRequest(existingReceived);
      setIsAdding(false);
      setSearchText('');
      return;
    }

    try {
      const { error } = await (supabase as any).from('codeapp_amigos').insert({
        user_id: user.id,
        amigo_user_id: selectedUser.user_id,
        status: 'pendente',
      });
      if (error && error.code !== '23505') throw error;

      await createNotification(
        selectedUser.user_id,
        'friend_request',
        'Nova solicitação de amizade! 👋',
        `${profile?.nome || 'Alguém'} quer ser seu amigo!`,
        { amigo_nome: profile?.nome, amigo_id: user.id }
      );

      Toast.show({ type: 'success', text1: 'Solicitação enviada! 📨' });
      setSearchText('');
      fetchFriends();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.code === '23505' ? 'Solicitação já existe' : 'Erro ao enviar solicitação' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAcceptRequest = async (request: PendingRequest) => {
    if (!user) return;
    try {
      await Promise.all([
        (supabase as any).from('codeapp_amigos').update({ status: 'aceito' }).eq('id', request.id),
        (supabase as any).from('codeapp_amigos').insert({ user_id: user.id, amigo_user_id: request.user_id, status: 'aceito' }),
      ]);
      await createNotification(
        request.user_id,
        'friend_accepted',
        'Amizade aceita! 🎉',
        `${profile?.nome || 'Alguém'} aceitou sua solicitação!`,
        { amigo_nome: profile?.nome, amigo_id: user.id }
      );
      Toast.show({ type: 'success', text1: 'Amizade aceita! 🎉' });
      fetchFriends();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Erro ao aceitar solicitação' });
    }
  };

  const handleRejectRequest = async (request: PendingRequest) => {
    try {
      await (supabase as any).from('codeapp_amigos').delete().eq('id', request.id);
      Toast.show({ type: 'info', text1: 'Solicitação recusada' });
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch {
      Toast.show({ type: 'error', text1: 'Erro ao recusar solicitação' });
    }
  };

  const handleCancelRequest = async (request: Friend) => {
    try {
      await (supabase as any).from('codeapp_amigos').delete().eq('id', request.id);
      Toast.show({ type: 'info', text1: 'Solicitação cancelada' });
      setSentRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch {
      Toast.show({ type: 'error', text1: 'Erro ao cancelar solicitação' });
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove || !user) return;
    try {
      await Promise.all([
        (supabase as any).from('codeapp_amigos').delete().eq('user_id', user.id).eq('amigo_user_id', friendToRemove.amigo_user_id),
        (supabase as any).from('codeapp_amigos').delete().eq('user_id', friendToRemove.amigo_user_id).eq('amigo_user_id', user.id),
      ]);
      Toast.show({ type: 'success', text1: 'Amigo removido' });
      setFriendToRemove(null);
      fetchFriends();
    } catch {
      Toast.show({ type: 'error', text1: 'Erro ao remover amigo' });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <Animated.View
        className="px-4 pt-4 pb-3 bg-card border-b border-muted flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <Users size={24} color="#ffc105" />
          <View>
            <Text className="text-foreground text-xl font-bold">Meus Amigos</Text>
            <Text className="text-muted-foreground text-xs">{friends.length} amigo{friends.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate('FriendsRanking' as never)}
          className="flex-row items-center gap-1.5 border border-primary/40 px-3 py-1.5 rounded-lg"
        >
          <Trophy size={14} color="#ffc105" />
          <Text className="text-primary text-xs font-medium">Ranking</Text>
        </Pressable>
      </Animated.View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View className="px-4 pt-4 gap-4">
          {/* Tabs */}
          <View className="flex-row bg-card rounded-xl overflow-hidden border border-muted">
            {(['friends', 'requests'] as TabKey[]).map((tab) => {
              const label = tab === 'friends' ? `Amigos (${friends.length})` : `Solicitações${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`;
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 items-center ${active ? 'bg-primary' : ''}`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {activeTab === 'friends' && (
            <>
              {/* Search bar */}
              <View className="relative">
                <View className="flex-row items-center bg-card border border-muted rounded-xl px-3 gap-2">
                  <Search size={16} color="#b3b3b3" />
                  <TextInput
                    className="flex-1 py-3 text-foreground text-sm"
                    placeholder="Buscar por nome ou apelido..."
                    placeholderTextColor="#b3b3b3"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCorrect={false}
                  />
                  {isAdding && <ActivityIndicator size="small" color="#ffc105" />}
                </View>

                {/* Autocomplete dropdown */}
                {searchText.length >= 2 && (
                  <Animated.View
                    className="absolute top-full left-0 right-0 z-50 bg-card border border-muted rounded-xl mt-1 overflow-hidden"
                    style={{ elevation: 8 }}
                  >
                    {isSearching ? (
                      <View className="p-4 items-center">
                        <ActivityIndicator size="small" color="#ffc105" />
                      </View>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((s) => (
                        <Pressable
                          key={s.user_id}
                          onPress={() => handleSelectSuggestion(s)}
                          className="flex-row items-center gap-3 px-3 py-3 border-b border-muted/50 active:bg-muted/30"
                        >
                          <View className="relative">
                            <Avatar src={s.foto_url} name={s.nome} size={40} borderColor="#ffc10540" />
                            {isOnline(s.ultimo_acesso) && (
                              <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border border-card" />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground font-semibold text-sm">{s.nome || 'Sem nome'}</Text>
                            <Text className="text-muted-foreground text-xs">@{s.apelido || 'sem-apelido'}</Text>
                          </View>
                          <CoinDisplay amount={s.moedas || 0} size="sm" />
                          <View className="ml-2 bg-primary/20 rounded-full p-1">
                            <UserPlus size={14} color="#ffc105" />
                          </View>
                        </Pressable>
                      ))
                    ) : (
                      <View className="p-4 items-center">
                        <Text className="text-muted-foreground text-sm">Nenhum aluno encontrado</Text>
                      </View>
                    )}
                  </Animated.View>
                )}
              </View>

              {/* Sent requests */}
              {sentRequests.length > 0 && (
                <View className="gap-2">
                  <View className="flex-row items-center gap-2">
                    <Clock size={14} color="#b3b3b3" />
                    <Text className="text-muted-foreground text-xs">Solicitações enviadas ({sentRequests.length})</Text>
                  </View>
                  {sentRequests.map((r) => (
                    <Card key={r.id} className="flex-row items-center gap-3 p-3 border border-dashed border-muted-foreground/30">
                      <Avatar src={r.amigo?.foto_url} name={r.amigo?.nome} size={40} />
                      <View className="flex-1">
                        <Text className="text-foreground font-semibold text-sm">{r.amigo?.nome || 'Sem nome'}</Text>
                        <Text className="text-muted-foreground text-xs">Aguardando resposta</Text>
                      </View>
                      <Pressable
                        onPress={() => handleCancelRequest(r)}
                        className="px-2 py-1 rounded-lg bg-destructive/10"
                      >
                        <X size={16} color="#ef4444" />
                      </Pressable>
                    </Card>
                  ))}
                </View>
              )}

              {/* Friends list */}
              {isLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#ffc105" />
                  <Text className="text-muted-foreground mt-3">Carregando amigos...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View className="py-10 items-center gap-3">
                  <Users size={48} color="#b3b3b3" />
                  <Text className="text-foreground font-semibold">Nenhum amigo ainda</Text>
                  <Text className="text-muted-foreground text-sm text-center">Use a busca acima para adicionar amigos!</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {friends.map((f, i) => {
                    const online = isOnline(f.amigo?.ultimo_acesso ?? null);
                    return (
                      <Animated.View
                        key={f.id}
                      >
                        <Card className={`flex-row items-center gap-3 p-3 ${online ? 'border border-green-500/30' : ''}`}>
                          <View className="relative">
                            <Avatar src={f.amigo?.foto_url} name={f.amigo?.nome} size={48} borderColor={online ? '#22c55e' : '#ffc10540'} />
                            <View className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${online ? 'bg-green-500' : 'bg-gray-500'}`} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground font-semibold text-sm">{f.amigo?.nome || 'Sem nome'}</Text>
                            <Text className="text-muted-foreground text-xs">@{f.amigo?.apelido || 'sem-apelido'}</Text>
                            <Text className={`text-xs mt-0.5 ${online ? 'text-green-500' : 'text-muted-foreground'}`}>
                              {online ? '● Online agora' : '○ Offline'}
                            </Text>
                          </View>
                          <View className="items-end gap-2">
                            <CoinDisplay amount={f.amigo?.moedas || 0} size="sm" />
                            <Pressable onPress={() => setFriendToRemove(f)}>
                              <UserMinus size={16} color="#b3b3b3" />
                            </Pressable>
                          </View>
                        </Card>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {activeTab === 'requests' && (
            <>
              {pendingRequests.length === 0 ? (
                <View className="py-10 items-center gap-3">
                  <Bell size={48} color="#b3b3b3" />
                  <Text className="text-foreground font-semibold">Nenhuma solicitação pendente</Text>
                  <Text className="text-muted-foreground text-sm text-center">
                    Quando alguém quiser ser seu amigo, aparecerá aqui!
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  <Text className="text-muted-foreground text-sm">Solicitações recebidas ({pendingRequests.length})</Text>
                  {pendingRequests.map((r, i) => (
                    <Animated.View
                      key={r.id}
                    >
                      <Card className="flex-row items-center gap-3 p-3 border border-primary/20 bg-primary/5">
                        <View className="relative">
                          <Avatar src={r.solicitante?.foto_url} name={r.solicitante?.nome} size={52} borderColor="#ffc10566" />
                          {isOnline(r.solicitante?.ultimo_acesso ?? null) && (
                            <View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-card" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-foreground font-semibold text-sm">{r.solicitante?.nome || 'Sem nome'}</Text>
                          <Text className="text-muted-foreground text-xs">@{r.solicitante?.apelido || 'sem-apelido'}</Text>
                          <CoinDisplay amount={r.solicitante?.moedas || 0} size="sm" className="mt-1" />
                        </View>
                        <View className="gap-2">
                          <Pressable
                            onPress={() => handleAcceptRequest(r)}
                            className="bg-primary rounded-lg px-3 py-1.5 flex-row items-center gap-1"
                          >
                            <Check size={14} color="#17191f" />
                            <Text className="text-primary-foreground text-xs font-semibold">Aceitar</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleRejectRequest(r)}
                            className="border border-destructive/40 rounded-lg px-3 py-1.5 items-center"
                          >
                            <X size={14} color="#ef4444" />
                          </Pressable>
                        </View>
                      </Card>
                    </Animated.View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Remove friend confirmation modal */}
      <Modal
        visible={!!friendToRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setFriendToRemove(null)}
      >
        <View className="flex-1 bg-black/70 justify-center px-6">
          <Animated.View
            className="bg-card rounded-2xl p-6 gap-4"
          >
            <Text className="text-foreground text-lg font-bold">Remover amigo</Text>
            <Text className="text-muted-foreground">
              Tem certeza que deseja remover{' '}
              <Text className="text-foreground font-semibold">{friendToRemove?.amigo?.nome || 'este amigo'}</Text>{' '}
              da sua lista?
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setFriendToRemove(null)}
                className="flex-1 border border-muted py-2.5 rounded-xl items-center"
              >
                <Text className="text-muted-foreground font-medium">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleRemoveFriend}
                className="flex-1 bg-destructive py-2.5 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Remover</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
