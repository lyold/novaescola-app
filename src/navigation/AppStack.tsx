import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppTabs } from './AppTabs';
import { FriendsRankingScreen } from '@/screens/social/FriendsRankingScreen';
import { JornadaDetailsScreen } from '@/screens/jornada/JornadaDetailsScreen';
import { QRScannerScreen } from '@/screens/scanner/QRScannerScreen';
import { TurmaDetailsScreen } from '@/screens/turma/TurmaDetailsScreen';
import { TurmaChatScreen } from '@/screens/turma/TurmaChatScreen';
import { ModuloDetailsScreen } from '@/screens/turma/ModuloDetailsScreen';

export type AppStackParamList = {
  Tabs: undefined;
  FriendsRanking: undefined;
  JornadaDetails: { jornadaId: string };
  Scanner: undefined;
  TurmaDetails: { turmaId: string };
  TurmaChat: { turmaId: string };
  ModuloDetails: { moduloId: string; turmaId: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
      <Stack.Screen name="FriendsRanking" component={FriendsRankingScreen} />
      <Stack.Screen name="JornadaDetails" component={JornadaDetailsScreen} />
      <Stack.Screen name="Scanner" component={QRScannerScreen} />
      <Stack.Screen name="TurmaDetails" component={TurmaDetailsScreen} />
      <Stack.Screen name="TurmaChat" component={TurmaChatScreen} />
      <Stack.Screen name="ModuloDetails" component={ModuloDetailsScreen} />
    </Stack.Navigator>
  );
}
