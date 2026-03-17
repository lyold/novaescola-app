# NovaEscola App — React Native Migration Guide

> Guia completo para o Claude Code implementar o app mobile do CodeUP (student-facing) em React Native com Expo.

## Visão Geral do Projeto

**Objetivo**: Migrar as 13 telas do aluno do app web `quest-forge-kids` para React Native, mantendo o mesmo backend Supabase.

**Stack**:
- **Framework**: Expo SDK 52+ (managed workflow)
- **Linguagem**: TypeScript strict
- **Navegação**: React Navigation v7 (@react-navigation/native + stack + bottom-tabs)
- **Estilo**: NativeWind v4 (Tailwind CSS para React Native)
- **UI Base**: Componentes custom com NativeWind (sem biblioteca UI externa)
- **Estado servidor**: TanStack React Query v5
- **Backend**: Supabase JS v2 (mesmo banco e RPCs do projeto web)
- **Auth storage**: @react-native-async-storage/async-storage
- **Animações**: react-native-reanimated v3 + moti
- **Monitoramento**: @sentry/react-native
- **Câmera/QR**: expo-camera + expo-barcode-scanner
- **Mídia**: expo-image-picker, expo-av
- **Notificações**: expo-notifications
- **Ícones**: lucide-react-native
- **Formulários**: react-hook-form + zod
- **SVG**: react-native-svg
- **Toast**: react-native-toast-message

## Arquitetura do Projeto Web de Referência

O código-fonte web está em `c:\CodeUP\quest-forge-kids`. Consulte-o como referência para:
- Lógica de negócio, queries Supabase, RPCs
- Schemas de validação (`src/lib/validations.ts`)
- Tipos e interfaces
- Fluxos de dados e dependências entre telas

**IMPORTANTE**: NÃO copie JSX/CSS do projeto web. Apenas reutilize lógica de negócio, queries, tipos e validações.

## Estrutura de Diretórios

```
novaescola-app/
├── app.json
├── App.tsx                         # Entry point com providers
├── babel.config.js
├── tailwind.config.ts              # NativeWind config (cores do tema)
├── tsconfig.json
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx       # Auth guard: AuthStack vs AppStack
│   │   ├── AuthStack.tsx           # Login, Signup
│   │   ├── AppTabs.tsx             # Bottom tabs: Dashboard, Turmas, Amigos, Perfil
│   │   ├── JornadaStack.tsx        # Jornada > Fases > Tarefa
│   │   └── TurmaStack.tsx          # Turma > Módulo > Aula > Chat
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignupScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx # Unificado kids/teens (param: tipoApp)
│   │   ├── jornada/
│   │   │   └── JornadaDetailsScreen.tsx
│   │   ├── turma/
│   │   │   ├── TurmaDetailsScreen.tsx
│   │   │   ├── ModuloDetailsScreen.tsx
│   │   │   └── TurmaChatScreen.tsx
│   │   ├── social/
│   │   │   ├── FriendsScreen.tsx
│   │   │   └── FriendsRankingScreen.tsx
│   │   ├── scanner/
│   │   │   └── QRScannerScreen.tsx
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   ├── components/
│   │   ├── ui/                     # Componentes base (Button, Card, Input, etc.)
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Tabs.tsx
│   │   ├── game/                   # Componentes de gamificação
│   │   │   ├── CoinDisplay.tsx
│   │   │   ├── CoinCelebration.tsx
│   │   │   ├── AnimatedStatCard.tsx
│   │   │   ├── AnimatedJourneyCard.tsx
│   │   │   ├── GameMapNodes.tsx    # Nós/fases do mapa SVG
│   │   │   └── GameMapPaths.tsx    # Caminhos SVG conectando fases
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── EmojiPicker.tsx
│   │   ├── task/
│   │   │   ├── TaskValidationModal.tsx
│   │   │   ├── PhotoCapture.tsx
│   │   │   ├── QuizModal.tsx
│   │   │   └── UnlockCelebration.tsx
│   │   └── shared/
│   │       ├── NotificationBell.tsx
│   │       ├── LoadingScreen.tsx
│   │       └── EmptyState.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useNotifications.ts
│   │   ├── useGameSounds.ts
│   │   └── useCoinSound.ts
│   ├── lib/
│   │   ├── supabase.ts            # Cliente Supabase com AsyncStorage
│   │   ├── sentry.ts              # Sentry init + logger
│   │   ├── validations.ts         # Schemas zod (copiar do web)
│   │   └── notifyFriends.ts       # Lógica de notificação (copiar do web)
│   ├── types/
│   │   └── index.ts               # Tipos compartilhados
│   └── utils/
│       └── format.ts              # Formatação de datas, números
```

## Mapeamento de Dependências Web → RN

| Web | React Native | Notas |
|-----|-------------|-------|
| react-router-dom | @react-navigation/native | Params via route.params, não URL |
| framer-motion | react-native-reanimated + moti | moti tem API similar ao framer-motion |
| tailwindcss (PostCSS) | nativewind v4 | className em componentes RN |
| shadcn/ui (Radix) | Componentes custom NativeWind | Criar Button, Card, Input, etc. |
| lucide-react | lucide-react-native | Mesma API |
| html5-qrcode | expo-camera | API totalmente diferente |
| sonner (toast) | react-native-toast-message | API diferente |
| Web Audio API | expo-av | Pré-gravar sons como .mp3 |
| localStorage | AsyncStorage | Para auth Supabase |
| window.open(url) | Linking.openURL(url) | expo-linking |
| `<input type="file">` | expo-image-picker | Retorna URI diretamente |
| FileReader | Não necessário | RN dá URI direto |
| CSS backdrop-blur | expo-blur (BlurView) | Componente wrapper |
| CSS sticky | Animated header ou SafeAreaView | Custom scroll handling |
| SVG inline | react-native-svg | Componentes Svg, Path, Circle, etc. |
| iframe (YouTube) | react-native-youtube-iframe | Ou WebView |
| useNavigate() | navigation.navigate() | Via useNavigation() hook |
| useParams() | route.params | Via useRoute() hook |
| useSearchParams() | route.params | Params de navegação |

## Telas — Especificação Detalhada

### Fase 1: Fundação

#### 1.1 Supabase Client (`src/lib/supabase.ts`)
```typescript
// Referência: quest-forge-kids/src/integrations/supabase/client.ts
// Mudanças: AsyncStorage como storage, env vars via expo-constants
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Desabilitar no RN
  },
});
```

#### 1.2 AuthContext (`src/contexts/AuthContext.tsx`)
- **Copiar lógica de**: `quest-forge-kids/src/contexts/AuthContext.tsx`
- **Mudanças**:
  - Remover `window.location.origin` → usar deep link scheme (`codeup://`)
  - Storage já é AsyncStorage via config do client
  - Manter: `fetchProfileAndUpdateAccess`, `fetchProfile`, `checkAdminRole`, `refreshProfile`
  - Manter: filtro de `TOKEN_REFRESHED` e `INITIAL_SESSION` no `onAuthStateChange`

#### 1.3 Sentry (`src/lib/sentry.ts`)
- **Copiar lógica de**: `quest-forge-kids/src/lib/sentrySupabaseLogger.ts`
- **Mudanças**:
  - `import * as Sentry from '@sentry/react-native'` (ao invés de `@sentry/react`)
  - DSN do projeto NovaEscola: `https://900dbf3def9080685b117543af39637f@o4511054742880256.ingest.us.sentry.io/4511061864808448`
  - SERVICE_NAME: `novaescola`
  - O fetch interceptor funciona igual no RN

#### 1.4 Componentes UI Base
Criar componentes NativeWind mínimos reutilizáveis:

**Button**: Pressable + Text, variantes: default, outline, ghost, destructive. Suporte a loading state.
**Card**: View com sombra e borda arredondada.
**Input**: TextInput estilizado com label e mensagem de erro.
**Avatar**: Image com fallback para iniciais.
**Badge**: View + Text com variantes de cor.
**Progress**: View com barra interna animada (Reanimated).
**Modal**: RN Modal ou @gorhom/bottom-sheet.
**Tabs**: Pressable row com indicador animado.

### Fase 2: Auth Flow

#### 2.1 LoginScreen
- **Referência web**: `quest-forge-kids/src/pages/Auth.tsx` (aba login)
- **Dados**: `useAuth().signIn(email, password)`
- **Form**: react-hook-form + Controller + zod loginSchema
- **UI**: Logo CodeUP, Input email, Input senha (com toggle visibilidade), Button "Entrar", link "Criar conta"
- **Navegação**: sucesso → RootNavigator redireciona para DashboardScreen

#### 2.2 SignupScreen
- **Referência web**: `quest-forge-kids/src/pages/Auth.tsx` (aba cadastro)
- **Dados**: `useAuth().signUp(email, password)`
- **Form**: react-hook-form + Controller + zod signupSchema
- **Navegação**: sucesso → OnboardingScreen

#### 2.3 OnboardingScreen
- **Referência web**: `quest-forge-kids/src/pages/Onboarding.tsx`
- **Dados**:
  - `supabase.from('profiles_codeapp').select('apelido').eq('apelido', value)` — check unicidade
  - `supabase.from('profiles_codeapp').upsert({...})` — salvar perfil
  - `refreshProfile()` do AuthContext
- **Form**: Nome, apelido (com validação async), idade (grid de botões 6-17)
- **UI**: Steps/wizard com 3 etapas. ScrollView para scroll suave.

### Fase 3: Dashboard

#### 3.1 DashboardScreen (unifica Kids + Teens)
- **Referência web**: `quest-forge-kids/src/pages/KidsDashboard.tsx` e `TeensDashboard.tsx`
- **Dados**: `supabase.rpc('get_student_dashboard', { p_user_id, p_tipo_app })` via useQuery, staleTime: 5min
- **Parâmetro**: `tipoApp: 'kids' | 'teens'` (determinar pela idade do perfil: <= 12 = kids)
- **Componentes**:
  - Header: Saudação + Avatar + NotificationBell
  - Stats: 4 AnimatedStatCards (XP, moedas, fases, tarefas)
  - Jornadas: Lista de AnimatedJourneyCards com barra de progresso
  - SuasTurmasSection: Cards de turma com formação
- **Animações Reanimated**: Fade in das stats, spring nos cards, scale on press nos journey cards
- **Navegação**: Card jornada → JornadaDetailsScreen, Card turma → TurmaDetailsScreen

### Fase 4: Social

#### 4.1 FriendsScreen
- **Referência web**: `quest-forge-kids/src/pages/FriendsPage.tsx`
- **Dados**:
  - 3 queries `codeapp_amigos` em paralelo (aceitos, recebidos, enviados)
  - `profiles_codeapp` para busca de amigos (autocomplete)
  - Mutations: insert/update/delete em `codeapp_amigos`
- **UI**: 3 tabs (Amigos, Recebidos, Enviados), barra de busca, lista de cards
- **Navegação**: Botão ranking → FriendsRankingScreen

#### 4.2 FriendsRankingScreen
- **Referência web**: `quest-forge-kids/src/pages/FriendsRanking.tsx`
- **Dados**: `codeapp_amigos` + `profiles_codeapp` (join client-side, sort por moedas)
- **UI**: Pódio top 3 com Avatar grande, lista restante com posição

### Fase 5: Core Learning

#### 5.1 QRScannerScreen
- **Referência web**: `quest-forge-kids/src/pages/QRScanner.tsx`
- **Dados** (sequencial):
  1. `codeapp_livro.select(*).eq('qr_code', code)`
  2. `codeapp_jornada.select(*).eq('id_livro', livro.id)`
  3. `aluno_jornadas.select(*).eq('jornada_id', ...).eq('user_id', ...)`
  4. `aluno_jornadas.insert({...})` se não existir
- **Câmera**: `expo-camera` com `onBarcodeScanned`
- **UI**: Viewfinder com overlay, input manual como fallback, feedback de sucesso/erro

#### 5.2 JornadaDetailsScreen — Tela mais complexa em lógica
- **Referência web**: `quest-forge-kids/src/pages/JornadaDetails.tsx` (~600 linhas)
- **Dados**:
  - Queries em cascata (3 rounds): jornada+fases → tarefas → aluno_tarefas+tarefas_alunos+fases_desbloqueadas
  - Mutations: `codeapp_tarefas_concluidas.insert`, `profiles_codeapp.update(moedas)`, storage upload
  - `queryClient.invalidateQueries(['student-dashboard'])` após conclusão
- **Game Map**: Mapa vertical com nós (fases) conectados por caminhos SVG
  - Usar `react-native-svg` para Path e Circle
  - Nós: círculos com ícone, cor por status (bloqueada/ativa/completa)
  - Caminhos: linhas curvas entre nós
- **Modais**:
  - TaskValidationModal: link do projeto + captura de foto
  - QuizModal: perguntas com alternativas
  - CoinCelebration: animação de moedas (Reanimated + partículas)
  - UnlockCelebration: nova fase desbloqueada
- **PhotoCapture**: `expo-image-picker` → upload via `supabase.storage.from('images').upload()`

#### 5.3 TurmaDetailsScreen — Tela mais complexa visualmente
- **Referência web**: `quest-forge-kids/src/pages/TurmaDetails.tsx` (~767 linhas)
- **Dados**: `codeapp_turma`, `codeapp_formacao`, `codeapp_formacao_modulo`, `codeapp_turma_aulas`, `codeapp_formacao_aula`, `codeapp_formacao_aula_progresso`
- **UI**: Layout de "ilhas/mundos" com casas, árvores, conexões
  - **DECISÃO v1**: Simplificar visual. Usar cards estilizados por mundo ao invés de recriar ilustrações CSS em SVG. Considerar usar imagens/Lottie no futuro.
  - Manter o conceito de mundos conectados, mas com cards ao invés de casas
- **Navegação**: Card módulo → ModuloDetailsScreen

#### 5.4 ModuloDetailsScreen
- **Referência web**: `quest-forge-kids/src/pages/ModuloDetails.tsx`
- **Dados**: Similar a JornadaDetails (queries cascata + mutations de conclusão)
- **UI**: Game map com nós de aulas, similar ao JornadaDetails
- **Modais**: TaskValidation, Quiz, PhotoCapture, CoinCelebration

### Fase 6: Turma Chat

#### 6.1 TurmaChatScreen
- **Referência web**: `quest-forge-kids/src/pages/TurmaChat.tsx` (~647 linhas)
- **Dados**:
  - Queries: `codeapp_turma`, `codeapp_turma_alunos`, `profiles_codeapp`, `codeapp_chat_mensagens`, `codeapp_chat_silenciados`, `codeapp_chat_reacoes`
  - **Realtime**: `supabase.channel('chat-turma-{id}').on('postgres_changes', ...)` para INSERT + UPDATE
  - Upload: `supabase.storage.from('images').upload()`
- **UI**:
  - FlatList invertida (mensagens recentes em baixo)
  - MessageBubble: texto, imagem, timestamp, avatar
  - ChatInput: TextInput + botão enviar + botão imagem
  - Lista de membros (bottom sheet)
  - Reações (emoji no long press)
- **Mídia**: `expo-image-picker` para selecionar/capturar foto

### Fase 7: Profile + Notificações

#### 7.1 ProfileScreen
- **Referência web**: `quest-forge-kids/src/components/ProfileModal.tsx`
- **Dados**: `profiles_codeapp.update({ foto_url, materias_favoritas })`, storage upload
- **UI**: Tela completa (não modal). Avatar editável, nome, apelido, matérias favoritas (chips), botão logout.

#### 7.2 Push Notifications
- **Hook base**: Copiar lógica de `quest-forge-kids/src/hooks/useNotifications.ts`
- **Adicionar**: `expo-notifications` para push nativo
- **Setup**:
  1. `registerForPushNotificationsAsync()` → obter expo push token
  2. Salvar token em `profiles_codeapp.push_token` (adicionar coluna)
  3. Edge Function no Supabase para enviar push via Expo Push API quando há nova notificação

## Regras de Implementação

### Código
- TypeScript strict em todo o projeto
- Componentes funcionais com hooks
- Nenhum `any` — tipar tudo explicitamente
- Usar `useQuery` para TODAS as consultas ao Supabase (nunca useEffect + fetch manual)
- `staleTime: 5 * 60 * 1000` como padrão global no QueryClient
- Todas as queries Supabase devem usar `select` explícito (nunca `select('*')`)

### Estilo
- NativeWind (className) para todo estilo
- Tema de cores idêntico ao web (copiar de tailwind.config.ts)
- SafeAreaView em todas as telas
- Fontes: Inter (corpo), Fredoka (títulos/gamificação)
- Suportar dark mode via `useColorScheme()`

### Navegação
- Deep linking configurado para `codeup://` scheme
- Telas de auth: stack sem header
- App principal: bottom tabs (Dashboard, Turmas, Amigos, Perfil)
- Dentro de cada tab: stack navigator para drill-down

### Performance
- FlatList para todas as listas longas (nunca ScrollView + map)
- Imagens com cache: usar `expo-image` (mais performático que Image)
- Memo em componentes de lista (renderItem)
- React Query para cache e deduplicação

### Segurança
- Nunca armazenar tokens em texto plano — usar `expo-secure-store` para dados sensíveis
- Validar inputs com zod antes de enviar ao Supabase
- Manter RLS ativo no Supabase (já está)

## Variáveis de Ambiente

No `app.json` (ou `app.config.ts`):
```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://stszoijrhrblcdqnrqxj.supabase.co",
      "supabaseKey": "eyJhbGciOiJI...",
      "sentryDsn": "https://900dbf3def9080685b117543af39637f@o4511054742880256.ingest.us.sentry.io/4511061864808448",
      "serviceName": "novaescola"
    }
  }
}
```

## Ordem de Implementação (Prioridade)

1. **Setup Expo + NativeWind + Supabase client + Auth** → validar que login funciona
2. **DashboardScreen** → validar que RPC retorna dados e renderiza
3. **JornadaDetailsScreen** → validar game map + conclusão de tarefa
4. **QRScannerScreen** → validar câmera
5. **TurmaChatScreen** → validar Realtime
6. **Demais telas** → FriendsScreen, FriendsRanking, TurmaDetails, ModuloDetails, Profile
7. **Push notifications + polish** → expo-notifications, splash screen, ícone
