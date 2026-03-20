import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInUp, ZoomIn, SlideInDown } from 'react-native-reanimated';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Trophy, Crown, Medal, Star } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { CoinDisplay } from '@/components/game/CoinDisplay';
import { Card } from '@/components/ui/Card';

interface FriendProfile {
  user_id: string;
  nome: string | null;
  apelido: string | null;
  moedas: number;
  foto_url: string | null;
}

interface RankedFriend {
  user_id: string;
  profile: FriendProfile;
  rank: number;
  isCurrentUser: boolean;
}

function PodiumAvatar({ friend, size }: { friend: RankedFriend; size: number }) {
  const borderColor = friend.isCurrentUser
    ? '#ffc105'
    : friend.rank === 1 ? '#eab308'
    : friend.rank === 2 ? '#9ca3af'
    : '#d97706';

  return (
    <Avatar
      src={friend.profile.foto_url}
      name={friend.profile.nome}
      size={size}
      borderColor={borderColor}
    />
  );
}

export function FriendsRankingScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [ranked, setRanked] = useState<RankedFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRanking = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const cols = 'user_id, nome, apelido, moedas, foto_url';
      const [{ data: myFriends }, { data: me }] = await Promise.all([
        (supabase as any).from('codeapp_amigos').select('amigo_user_id').eq('user_id', user.id).eq('status', 'aceito').limit(200),
        (supabase as any).from('profiles_codeapp').select(cols).eq('user_id', user.id).single(),
      ]);

      const friendIds = (myFriends || []).map((r: any) => r.amigo_user_id);
      let participants: RankedFriend[] = [];

      if (me) participants.push({ user_id: user.id, profile: me, rank: 0, isCurrentUser: true });

      if (friendIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('profiles_codeapp')
          .select(cols)
          .in('user_id', friendIds)
          .limit(200);
        (profiles || []).forEach((p: FriendProfile) => {
          participants.push({ user_id: p.user_id, profile: p, rank: 0, isCurrentUser: false });
        });
      }

      const sorted = participants
        .sort((a, b) => (b.profile?.moedas || 0) - (a.profile?.moedas || 0))
        .slice(0, 10)
        .map((f, i) => ({ ...f, rank: i + 1 }));

      setRanked(sorted);
    } catch (err) {
      console.error('fetchRanking error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchRanking();
  }, [user, fetchRanking]);

  const podiumHeights = [80, 60, 48]; // 1st, 2nd, 3rd

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <Animated.View
        className="px-4 pt-4 pb-3 bg-card border-b border-muted flex-row items-center gap-3"
      >
        <Animated.View
        >
          <Trophy size={26} color="#ffc105" />
        </Animated.View>
        <View>
          <Text className="text-foreground text-xl font-bold">Ranking dos Amigos</Text>
          <Text className="text-muted-foreground text-xs">Top 10 campeões</Text>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View className="flex-1 py-20 items-center gap-3">
            <ActivityIndicator size="large" color="#ffc105" />
            <Text className="text-muted-foreground">Carregando ranking...</Text>
          </View>
        ) : ranked.length === 0 ? (
          <View className="py-16 items-center gap-3 px-6">
            <Trophy size={56} color="#b3b3b3" />
            <Text className="text-foreground font-semibold text-center">Nenhum amigo no ranking ainda</Text>
            <Text className="text-muted-foreground text-sm text-center">Adicione amigos para ver quem tem mais moedas!</Text>
          </View>
        ) : (
          <View className="px-4 pt-6 gap-6">
            {/* Podium – top 3 */}
            {ranked.length >= 3 && (
              <Animated.View
                className="flex-row items-end justify-center gap-4"
              >
                {/* 2nd */}
                <View className="items-center gap-1">
                  <PodiumAvatar friend={ranked[1]} size={64} />
                  <Medal size={20} color="#9ca3af" />
                  <Text className="text-foreground font-semibold text-xs" numberOfLines={1}>
                    {ranked[1].profile.nome?.split(' ')[0] || '?'}
                  </Text>
                  <CoinDisplay amount={ranked[1].profile.moedas || 0} size="sm" />
                  <View
                    className="w-20 rounded-t-lg items-center justify-center"
                    style={{ height: podiumHeights[1], backgroundColor: 'rgba(156,163,175,0.2)' }}
                  >
                    <Text className="text-2xl font-bold text-gray-400">2º</Text>
                  </View>
                </View>

                {/* 1st */}
                <View className="items-center gap-1">
                  <Animated.View
                  >
                    <PodiumAvatar friend={ranked[0]} size={80} />
                  </Animated.View>
                  <Animated.View
                  >
                    <Crown size={28} color="#eab308" />
                  </Animated.View>
                  <Text className="text-foreground font-bold text-xs" numberOfLines={1}>
                    {ranked[0].profile.nome?.split(' ')[0] || '?'}
                  </Text>
                  <CoinDisplay amount={ranked[0].profile.moedas || 0} size="sm" />
                  <View
                    className="w-24 rounded-t-lg items-center justify-center"
                    style={{ height: podiumHeights[0], backgroundColor: 'rgba(234,179,8,0.2)' }}
                  >
                    <Text className="text-3xl font-bold text-yellow-500">1º</Text>
                  </View>
                </View>

                {/* 3rd */}
                <View className="items-center gap-1">
                  <PodiumAvatar friend={ranked[2]} size={56} />
                  <Medal size={18} color="#d97706" />
                  <Text className="text-foreground font-semibold text-xs" numberOfLines={1}>
                    {ranked[2].profile.nome?.split(' ')[0] || '?'}
                  </Text>
                  <CoinDisplay amount={ranked[2].profile.moedas || 0} size="sm" />
                  <View
                    className="w-16 rounded-t-lg items-center justify-center"
                    style={{ height: podiumHeights[2], backgroundColor: 'rgba(217,119,6,0.2)' }}
                  >
                    <Text className="text-xl font-bold text-amber-600">3º</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Full list */}
            <Card className="gap-0 overflow-hidden p-0">
              <View className="flex-row items-center gap-2 px-4 py-3 border-b border-muted">
                <Star size={16} color="#ffc105" />
                <Text className="text-foreground font-bold">Classificação Geral</Text>
              </View>

              {ranked.map((f, i) => {
                const isFirst = f.rank === 1;
                const isSecond = f.rank === 2;
                const isThird = f.rank === 3;

                const rowBg = f.isCurrentUser
                  ? 'bg-primary/10'
                  : isFirst ? 'bg-yellow-500/10'
                  : isSecond ? 'bg-gray-400/10'
                  : isThird ? 'bg-amber-600/10'
                  : '';

                return (
                  <Animated.View
                    key={f.user_id}
                    className={`flex-row items-center gap-3 px-4 py-3 border-b border-muted/50 ${rowBg}`}
                  >
                    <View className="w-8 items-center">
                      {isFirst ? <Crown size={22} color="#eab308" /> :
                       isSecond ? <Medal size={20} color="#9ca3af" /> :
                       isThird ? <Medal size={18} color="#d97706" /> :
                       <Text className="text-muted-foreground font-bold text-base">{f.rank}º</Text>}
                    </View>
                    <Avatar src={f.profile.foto_url} name={f.profile.nome} size={44} borderColor={f.isCurrentUser ? '#ffc105' : '#ffc10540'} />
                    <View className="flex-1">
                      <Text className={`font-semibold text-sm ${f.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                        {f.profile.nome || 'Sem nome'}{f.isCurrentUser ? ' (você)' : ''}
                      </Text>
                      <Text className="text-muted-foreground text-xs">@{f.profile.apelido || 'sem-apelido'}</Text>
                    </View>
                    <CoinDisplay amount={f.profile.moedas || 0} size="sm" />
                  </Animated.View>
                );
              })}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
