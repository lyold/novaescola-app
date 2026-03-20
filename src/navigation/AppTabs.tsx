import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, BookOpen, Users, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTabsParamList } from '@/types';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { TurmaListScreen } from '@/screens/turma/TurmaListScreen';
import { FriendsScreen } from '@/screens/social/FriendsScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const TAB_HEIGHT = 56;
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1c1f2a',
          borderTopColor: '#282d3d',
          borderTopWidth: 1,
          paddingBottom: bottomPad,
          paddingTop: 6,
          height: TAB_HEIGHT + bottomPad,
        },
        tabBarActiveTintColor: '#ffc105',
        tabBarInactiveTintColor: '#b3b3b3',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Turmas"
        component={TurmaListScreen}
        options={{
          tabBarLabel: 'Turmas',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Amigos"
        component={FriendsScreen}
        options={{
          tabBarLabel: 'Amigos',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
