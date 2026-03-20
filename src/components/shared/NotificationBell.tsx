import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { Bell, CheckCheck, Users, Trophy, Star, BookOpen, QrCode, X } from 'lucide-react-native';

import { useNotifications, Notification } from '@/hooks/useNotifications';

function getIcon(tipo: string) {
  switch (tipo) {
    case 'friend_request':
    case 'friend_accepted':
      return <Users size={16} color="#60a5fa" />;
    case 'task_completed':
      return <Star size={16} color="#ffc105" />;
    case 'phase_completed':
      return <Trophy size={16} color="#22c55e" />;
    case 'journey_completed':
      return <BookOpen size={16} color="#a855f7" />;
    case 'book_scanned':
      return <QrCode size={16} color="#22d3ee" />;
    default:
      return <Bell size={16} color="#b3b3b3" />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function NotificationItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      className={`flex-row gap-3 items-start px-4 py-3 border-b border-muted/50 ${!item.lida ? 'bg-primary/5' : ''}`}
    >
      <View className="w-8 h-8 rounded-full bg-muted/50 items-center justify-center mt-0.5 flex-shrink-0">
        {getIcon(item.tipo)}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className={`text-sm font-semibold flex-1 ${!item.lida ? 'text-foreground' : 'text-muted-foreground'}`} numberOfLines={1}>
            {item.titulo}
          </Text>
          {!item.lida && <View className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
        </View>
        <Text className="text-muted-foreground text-xs leading-4 mt-0.5" numberOfLines={2}>{item.mensagem}</Text>
        <Text className="text-muted-foreground text-xs mt-1">{timeAgo(item.created_at)}</Text>
      </View>
    </Pressable>
  );
}

export function NotificationBell() {
  const navigation = useNavigation<any>();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleItemPress = (n: Notification) => {
    if (!n.lida) markAsRead(n.id);
    setIsOpen(false);
    if (n.tipo === 'friend_request' || n.tipo === 'friend_accepted') {
      navigation.navigate('Amigos');
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="w-10 h-10 items-center justify-center relative"
      >
        <Bell size={22} color="#b3b3b3" />
        {unreadCount > 0 && (
          <Animated.View
            entering={ZoomIn.springify()}
            className="absolute top-1 right-1 bg-destructive rounded-full min-w-[16px] h-4 items-center justify-center px-1"
          >
            <Text className="text-white text-xs font-bold" style={{ fontSize: 9 }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </Pressable>

      <Modal
        transparent
        animationType="fade"
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable className="flex-1" onPress={() => setIsOpen(false)}>
          <View className="flex-1 bg-black/40">
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="absolute right-4 bg-card rounded-2xl overflow-hidden shadow-xl"
              style={{ top: 60, width: 320, maxHeight: 480 }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-muted">
                <Text className="text-foreground font-bold">Notificações</Text>
                <View className="flex-row items-center gap-2">
                  {unreadCount > 0 && (
                    <Pressable onPress={markAllAsRead} className="p-1">
                      <CheckCheck size={18} color="#ffc105" />
                    </Pressable>
                  )}
                  <Pressable onPress={() => setIsOpen(false)} className="p-1">
                    <X size={18} color="#b3b3b3" />
                  </Pressable>
                </View>
              </View>

              {isLoading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator color="#ffc105" />
                </View>
              ) : notifications.length === 0 ? (
                <View className="py-10 items-center gap-2">
                  <Bell size={32} color="#b3b3b3" />
                  <Text className="text-muted-foreground text-sm">Nenhuma notificação</Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <NotificationItem item={item} onPress={() => handleItemPress(item)} />
                  )}
                  style={{ maxHeight: 400 }}
                />
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
