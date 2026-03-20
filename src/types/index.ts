// Perfil do aluno no Supabase
export interface Profile {
  id: string;
  user_id: string;
  nome: string | null;
  apelido: string | null;
  idade: number | null;
  onboarding_completo: boolean | null;
  moedas: number | null;
  primeiro_acesso: string | null;
  ultimo_acesso: string | null;
  created_at: string | null;
  updated_at: string | null;
  foto_url: string | null;
  materias_favoritas: string[] | null;
  push_token: string | null;
}

// Tipo de app determinado pela idade
export type TipoApp = 'kids' | 'teens';

export function getTipoApp(idade: number | null): TipoApp {
  if (!idade) return 'kids';
  return idade <= 12 ? 'kids' : 'teens';
}

// Jornada (livro/trilha de aprendizado)
export interface Jornada {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  xp_total: number;
  moedas_total: number;
}

// Turma
export interface Turma {
  id: string;
  nome: string;
  descricao: string | null;
  codigo: string | null;
  professor_id: string;
}

// Parâmetros de navegação
export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
};

export type AppTabsParamList = {
  Dashboard: undefined;
  Turmas: undefined;
  Amigos: undefined;
  Perfil: undefined;
};

export type JornadaStackParamList = {
  JornadaDetails: { jornadaId: string };
};

export type TurmaStackParamList = {
  TurmaDetails: { turmaId: string };
  ModuloDetails: { moduloId: string; turmaId: string };
  TurmaChat: { turmaId: string };
};
