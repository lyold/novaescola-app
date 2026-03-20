import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  dados: Record<string, any>;
  lida: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await (supabase as any)
      .from('codeapp_notificacoes')
      .select('id, user_id, tipo, titulo, mensagem, dados, lida, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      setIsLoading(false);
      return;
    }

    const typed = (data || []) as Notification[];
    setNotifications(typed);
    setUnreadCount(typed.filter((n) => !n.lida).length);
    setIsLoading(false);
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;
    await (supabase as any)
      .from('codeapp_notificacoes')
      .update({ lida: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, lida: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    await (supabase as any)
      .from('codeapp_notificacoes')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    setUnreadCount(0);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id, fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'codeapp_notificacoes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
