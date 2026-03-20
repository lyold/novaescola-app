# NovaEscola App — Visão Geral do Projeto

> App mobile do CodeUP voltado para alunos (kids e teens), migrado do web `quest-forge-kids` para React Native com Expo SDK 54.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Expo (managed workflow) | ~54.0.0 |
| Linguagem | TypeScript strict | ~5.9.2 |
| Runtime | React Native + Hermes | 0.81.5 |
| Navegação | React Navigation | v7 |
| Estilo | NativeWind (Tailwind CSS for RN) | v4 |
| Estado servidor | TanStack React Query | v5 |
| Backend | Supabase JS v2 | ^2.49.4 |
| Auth storage | AsyncStorage | 2.2.0 |
| Animações | react-native-reanimated | v4.1.1 |
| Monitoramento | @sentry/react-native | ~7.2.0 |
| QR Scanner | expo-camera v17 | ~17.0.10 |
| Mídia | expo-image-picker | ~17.0.10 |
| Notificações | expo-notifications | ~0.32.16 |
| Ícones | lucide-react-native | ^0.475.0 |
| Formulários | react-hook-form + zod | v7 + v3 |
| SVG | react-native-svg | 15.12.1 |
| WebView | react-native-webview | ^13.16.1 |
| Toast | react-native-toast-message | ^2.2.1 |
| Gradientes | expo-linear-gradient | ~15.0.8 |

---

## Arquitetura de Navegação

```
RootNavigator
├── AuthStack (não autenticado)
│   ├── LoginScreen
│   ├── SignupScreen
│   └── OnboardingScreen
└── AppTabs (autenticado) — bottom tabs
    ├── Dashboard tab → DashboardScreen
    ├── Turmas tab → TurmaListScreen
    │   └── Stack: TurmaDetails → ModuloDetails
    │               TurmaChat
    ├── Amigos tab → FriendsScreen
    │   └── Stack: FriendsRanking
    └── Perfil tab → ProfileScreen
        └── Stack: Scanner (QR)
              JornadaDetails
```

---

## Estrutura de Diretórios

```
novaescola-app/
├── App.tsx                   # Entry point: providers, Sentry, push notifications
├── app.json                  # Config Expo + variáveis de ambiente (Supabase, Sentry)
├── babel.config.js           # IMPORTANTE: usa react-native-worklets/plugin (não reanimated)
├── tailwind.config.ts        # Tema de cores dark (background #17191f, primary #ffc105)
├── global.css                # Import base do NativeWind
├── index.js                  # Registra o app
└── src/
    ├── navigation/
    │   ├── RootNavigator.tsx  # Guard de autenticação
    │   ├── AuthStack.tsx
    │   ├── OnboardingStack.tsx
    │   ├── AppTabs.tsx        # Bottom tabs com safe area insets
    │   └── AppStack.tsx       # Stack dentro das tabs
    ├── screens/
    │   ├── auth/              # Login, Signup, Onboarding
    │   ├── dashboard/         # DashboardScreen (kids + teens unificado)
    │   ├── jornada/           # JornadaDetailsScreen (game map SVG)
    │   ├── turma/             # TurmaList, TurmaDetails, ModuloDetails, TurmaChat
    │   ├── social/            # FriendsScreen, FriendsRankingScreen
    │   ├── scanner/           # QRScannerScreen
    │   └── profile/           # ProfileScreen
    ├── components/
    │   ├── ui/                # Button, Card, Input, Avatar, Badge, Progress
    │   ├── game/              # CoinDisplay, CoinCelebration, AnimatedStatCard, AnimatedJourneyCard
    │   ├── task/              # TaskValidationModal, QuizModal
    │   └── shared/            # NotificationBell, LoadingScreen, SuasTurmasSection
    ├── contexts/
    │   └── AuthContext.tsx    # useAuth: user, profile, signIn, signUp, signOut, refreshProfile
    ├── hooks/
    │   ├── useNotifications.ts     # Notificações in-app (Supabase Realtime)
    │   └── usePushNotifications.ts # Push tokens (expo-notifications, desativado no Expo Go)
    ├── lib/
    │   ├── supabase.ts        # Cliente Supabase com AsyncStorage
    │   ├── sentry.ts          # Init + interceptor fetch
    │   └── validations.ts     # Schemas zod
    └── types/
        └── index.ts           # Tipos compartilhados (Profile, getTipoApp, etc.)
```

---

## Backend (Supabase)

**Projeto**: `stszoijrhrblcdqnrqxj.supabase.co`

### Tabelas principais utilizadas

| Tabela | Uso |
|--------|-----|
| `profiles_codeapp` | Perfil do aluno (nome, apelido, moedas, foto_url, push_token) |
| `codeapp_jornada` | Jornadas de aprendizado |
| `aluno_jornadas` | Jornadas ativadas por aluno |
| `codeapp_fases` | Fases dentro de uma jornada |
| `codeapp_tarefas` | Tarefas de cada fase |
| `codeapp_tarefas_concluidas` | Conclusões de tarefas por aluno |
| `codeapp_fases_desbloqueadas` | Controle de desbloqueio de fases |
| `codeapp_turma` | Turmas |
| `codeapp_turma_alunos` | Matrícula de alunos em turmas |
| `codeapp_formacao` | Formações (currículo) |
| `codeapp_formacao_modulo` | Módulos de uma formação |
| `codeapp_formacao_aula` | Aulas de um módulo |
| `codeapp_formacao_aula_tarefa` | Tarefas de uma aula |
| `codeapp_formacao_aula_progresso` | Progresso por aula/aluno |
| `codeapp_turma_aulas` | Aulas publicadas por turma |
| `codeapp_chat_mensagens` | Mensagens do chat da turma |
| `codeapp_chat_reacoes` | Reações às mensagens |
| `codeapp_notificacoes` | Notificações in-app |
| `codeapp_amigos` | Relacionamentos de amizade |
| `codeapp_livro` | Livros com QR code |

### RPCs utilizadas

- `get_student_dashboard(p_user_id, p_tipo_app)` — retorna estatísticas + jornadas do aluno

---

## Fluxos Principais

### Autenticação
1. `LoginScreen` chama `supabase.auth.signInWithPassword`
2. `AuthContext` reage ao `onAuthStateChange` e busca perfil em `profiles_codeapp`
3. Se perfil incompleto (sem nome/apelido) → redireciona para `OnboardingScreen`
4. `RootNavigator` guarda automaticamente: autenticado → `AppTabs`, sem auth → `AuthStack`

### Jornada de Aprendizado
1. Aluno escaneia QR code do livro → `QRScannerScreen` ativa jornada em `aluno_jornadas`
2. `DashboardScreen` lista jornadas via RPC `get_student_dashboard`
3. `JornadaDetailsScreen` renderiza game map SVG com fases/nós conectados por caminho
4. Conclusão de tarefa: `TaskValidationModal` (foto/código/link) ou `QuizModal` (questões)
5. Moedas creditadas em `profiles_codeapp.moedas`

### Turmas
1. `TurmaListScreen` lista turmas do aluno via `codeapp_turma_alunos`
2. `TurmaDetailsScreen` renderiza mapa visual de módulos (estilo ilha — céu azul)
3. `ModuloDetailsScreen` lista aulas com progresso e tarefas
4. `TurmaChatScreen` usa Supabase Realtime (postgres_changes) para mensagens em tempo real

---

## Decisões Técnicas Importantes

### babel.config.js — `react-native-worklets/plugin`

O `react-native-reanimated@4.1.1` usa internamente o `react-native-worklets`. Usar `react-native-reanimated/plugin` no babel causa falha no Metro worker. Usar diretamente `react-native-worklets/plugin`.

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
```

### Push Notifications

- Funcionam apenas em **development build** (não Expo Go)
- O hook `usePushNotifications` detecta Expo Go via `Constants.appOwnership === 'expo'` e pula todo o setup
- Tokens são salvos em `profiles_codeapp.push_token`

### Tipo de App (kids/teens)

Determinado pela idade do perfil:
- `idade <= 12` → `'kids'` (CodeUP Kids)
- `idade > 12` → `'teens'` (CodeUP Teens)

Afeta saudações, textos motivacionais e conteúdo exibido no Dashboard.

### NativeWind v4 + React 19

`lucide-react-native@0.475.0` declara peer dependency `react@^18`, conflitando com React 19. Sempre instalar pacotes com `--legacy-peer-deps`.

---

## Bugs Conhecidos (em aberto)

1. **Vídeo das tarefas em JornadaDetails** — `video_explicativo_url` ainda pode redirecionar para YouTube em alguns contextos. Corrigido no `TaskValidationModal` mas pode haver outros pontos.
2. **Push notifications no Expo Go** — Limitação do SDK 53+. Requer development build para funcionar. Usar `npx expo run:android` ou EAS Build.

---

## Variáveis de Ambiente

Configuradas diretamente no `app.json` em `expo.extra`:

```json
{
  "supabaseUrl": "https://stszoijrhrblcdqnrqxj.supabase.co",
  "supabaseKey": "eyJhbGci...",
  "sentryDsn": "https://900dbf3d...@sentry.io/...",
  "serviceName": "novaescola"
}
```

Em produção, migrar para `app.config.ts` lendo de `process.env`.

---

## Próximos Passos Sugeridos

- [ ] Corrigir embed de vídeo YouTube nos demais pontos do app
- [ ] Adicionar coluna `push_token` na tabela `profiles_codeapp` no Supabase
- [ ] Criar development build com EAS para testar push notifications
- [ ] Adicionar ícone e splash screen aos `assets/`
- [ ] Configurar EAS Build para CI/CD (build automatizado)
- [ ] Migrar `supabaseKey` do `app.json` para variável de ambiente segura via EAS Secrets
