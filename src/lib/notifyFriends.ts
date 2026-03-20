import { supabase } from '@/lib/supabase';

export const createNotification = async (
  userId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  dados: Record<string, any> = {}
) => {
  const { error } = await (supabase as any)
    .from('codeapp_notificacoes')
    .insert({ user_id: userId, tipo, titulo, mensagem, dados });
  if (error) console.error('Error creating notification:', error);
  return !error;
};

interface NotifyFriendsParams {
  userId: string;
  userName: string;
  tipo: 'task_completed' | 'phase_completed' | 'journey_completed' | 'book_scanned';
  titulo: string;
  mensagem: string;
  dados?: Record<string, any>;
}

export const notifyFriends = async ({
  userId, userName, tipo, titulo, mensagem, dados = {},
}: NotifyFriendsParams) => {
  try {
    const [{ data: addedMe }, { data: iAdded }] = await Promise.all([
      (supabase as any).from('codeapp_amigos').select('user_id').eq('amigo_user_id', userId).eq('status', 'aceito'),
      (supabase as any).from('codeapp_amigos').select('amigo_user_id').eq('user_id', userId).eq('status', 'aceito'),
    ]);

    const friendIds = new Set<string>();
    addedMe?.forEach((f: { user_id: string }) => friendIds.add(f.user_id));
    iAdded?.forEach((f: { amigo_user_id: string }) => friendIds.add(f.amigo_user_id));

    if (friendIds.size === 0) return;

    const payload = Array.from(friendIds).map((id) => ({
      user_id: id,
      tipo,
      titulo,
      mensagem,
      dados: { ...dados, amigo_nome: userName, amigo_id: userId },
    }));

    const { error } = await (supabase as any).from('codeapp_notificacoes').insert(payload);
    if (error) console.error('Error notifying friends:', error);
  } catch (err) {
    console.error('notifyFriends error:', err);
  }
};
