# Guia de Setup — NovaEscola App

Guia completo para rodar o projeto localmente em um novo ambiente.

---

## Pré-requisitos

### 1. Node.js

Versão recomendada: **22.x LTS** (mínimo: 18.x)

- Download: https://nodejs.org/
- Verificar: `node -v`

### 2. Git

- Download: https://git-scm.com/
- Verificar: `git --version`

### 3. Expo CLI

Instalar globalmente:

```bash
npm install -g expo-cli
```

Verificar: `expo --version`

### 4. EAS CLI (opcional, para builds de produção)

```bash
npm install -g eas-cli
eas login
```

### 5. Emulador Android ou dispositivo físico

**Opção A — Android Studio (emulador)**
1. Baixar Android Studio: https://developer.android.com/studio
2. Criar um AVD (Android Virtual Device) com API 31+
3. Iniciar o emulador antes de rodar o projeto

**Opção B — Dispositivo físico**
1. Habilitar "Opções do desenvolvedor" no Android
2. Habilitar "Depuração USB"
3. Conectar via USB ou usar Expo Go (limitações de push notifications)

**Opção C — Expo Go (mais rápido para desenvolvimento)**
1. Instalar Expo Go na Play Store
2. Escanear o QR code gerado pelo `expo start`
- Limitação: Push notifications não funcionam no Expo Go (SDK 53+)

---

## Instalação

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd novaescola-app
git checkout develop
```

### 2. Instalar dependências

```bash
npm install --legacy-peer-deps
```

> O flag `--legacy-peer-deps` é necessário por conflito de peer deps entre `lucide-react-native` e React 19.

### 3. Verificar configuração do Expo

O arquivo `app.json` já contém as variáveis de ambiente configuradas:
- `supabaseUrl` e `supabaseKey` — backend Supabase
- `sentryDsn` — monitoramento de erros
- `serviceName` — identificador para logs

Não é necessário criar arquivo `.env` — tudo está em `app.json > expo.extra`.

---

## Rodando o Projeto

### Modo Expo Go (desenvolvimento rápido)

```bash
npm start
# ou
npx expo start
```

Escaneie o QR code com o app **Expo Go** no celular (Android ou iOS).

### Modo Android (emulador ou USB)

```bash
npm run android
# ou
npx expo start --android
```

Pressione `a` no terminal para abrir no emulador Android conectado.

### Modo iOS (apenas macOS com Xcode)

```bash
npm run ios
# ou
npx expo start --ios
```

### Limpar cache (quando houver problemas)

```bash
npx expo start --clear
```

---

## Development Build (recomendado para features nativas)

Para testar push notifications e outras APIs nativas que não funcionam no Expo Go:

### Pré-requisito: EAS CLI configurado

```bash
npm install -g eas-cli
eas login
```

### Build local Android

```bash
npx expo run:android
```

Isso instala o app nativamente no emulador/dispositivo com todas as features habilitadas.

### Build via EAS (nuvem)

```bash
eas build --platform android --profile development
```

---

## Estrutura de Branches

| Branch | Propósito |
|--------|-----------|
| `main` | Código inicial / referência |
| `primeiro-commit` | Snapshot da implementação completa v1 |
| `develop` | Branch de desenvolvimento ativo |

### Fluxo de trabalho

```bash
# Trabalhar sempre a partir de develop
git checkout develop
git pull origin develop

# Criar feature branch
git checkout -b feature/minha-feature

# Após terminar, merge para develop
git checkout develop
git merge feature/minha-feature
```

---

## Dependências Principais e suas Funções

| Pacote | Função |
|--------|--------|
| `expo` | Framework principal + tooling |
| `expo-camera` | Scanner de QR code |
| `expo-image-picker` | Selecionar/capturar fotos de tarefas |
| `expo-notifications` | Push notifications (dev build only) |
| `expo-linear-gradient` | Gradientes visuais nos game maps |
| `react-native-webview` | Embed de vídeos YouTube nas tarefas |
| `react-native-svg` | Mapas de jornada/módulo em SVG |
| `react-native-reanimated` | Animações de UI (cards, celebrações) |
| `react-native-worklets` | Worklets para reanimated v4 |
| `nativewind` | Classes Tailwind no React Native |
| `@supabase/supabase-js` | Queries, auth, realtime, storage |
| `@tanstack/react-query` | Cache e gerenciamento de estado servidor |
| `react-hook-form` + `zod` | Formulários com validação |
| `@sentry/react-native` | Monitoramento de erros em produção |

---

## Problemas Comuns

### Metro bundler trava na inicialização

```bash
npx expo start --clear
```

### Erro: `Cannot find module 'react-native-worklets/plugin'`

Certifique-se de que o `babel.config.js` usa `react-native-worklets/plugin`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
```

### Erro de peer deps no `npm install`

Sempre usar:
```bash
npm install --legacy-peer-deps
```

### Push notifications não funcionam

Esperado no Expo Go. Use `npx expo run:android` para development build.

### Tela branca / app não carrega

1. Verifique conexão com internet (Supabase precisa estar acessível)
2. Verifique o `app.json` — `supabaseUrl` e `supabaseKey` devem estar corretos
3. Limpe o cache: `npx expo start --clear`

### NativeWind classes não aplicam estilo

1. Verifique se `global.css` está importado em `App.tsx`
2. Verifique se `babel.config.js` tem `jsxImportSource: 'nativewind'`
3. Reinicie o Metro com `--clear`

---

## Verificação Rápida de Ambiente

Execute este checklist antes de iniciar:

```bash
node -v          # >= 18.x
npm -v           # >= 9.x
expo --version   # qualquer versão
git --version    # qualquer versão
```

Depois de clonar e instalar:

```bash
npx tsc --noEmit   # deve retornar sem erros
npx expo start     # deve iniciar o Metro bundler
```

---

## Contato e Recursos

- **Expo Docs**: https://docs.expo.dev/
- **React Navigation Docs**: https://reactnavigation.org/
- **NativeWind Docs**: https://www.nativewind.dev/
- **Supabase Docs**: https://supabase.com/docs
- **Projeto backend (web)**: `c:\CodeUP\quest-forge-kids` (referência)
