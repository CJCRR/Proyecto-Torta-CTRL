import React from 'react';
import { Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import CakesScreen from './src/screens/CakesScreen';
import AddCakeScreen from './src/screens/AddCakeScreen';
import IngredientsScreen from './src/screens/IngredientsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AppStateProvider } from './src/store/AppState';
import type { AddCakeDraft } from './src/types';

export type RootTabParamList = {
  Tortas: undefined;
  Agregar:
  | {
    duplicateCake?: AddCakeDraft;
    duplicateSourceId?: string;
  }
  | undefined;
  Ingredientes: undefined;
  Ajustes: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  return (
    <AppStateProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route, navigation }) => ({
            headerShown: true,
            tabBarActiveTintColor: '#e91e63',
            tabBarInactiveTintColor: '#666',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor: '#f0d7eb',
            },
            headerStyle: {
              backgroundColor: '#faf5ff',
              borderBottomColor: '#f0d7eb',
              borderBottomWidth: 1,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTitleAlign: 'left',
            headerRight: route.name === 'Ajustes'
              ? undefined
              : () => (
                <Pressable
                  onPress={() => navigation.navigate('Ajustes')}
                  style={{ marginRight: 12 }}
                >
                  <Ionicons name="settings-outline" size={22} color="#333" />
                </Pressable>
              ),
            tabBarIcon: ({ color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'calendar';

              if (route.name === 'Tortas') {
                iconName = 'calendar-outline';
              } else if (route.name === 'Agregar') {
                iconName = 'add-circle-outline';
              } else if (route.name === 'Ingredientes') {
                iconName = 'list-circle-outline';
              } else if (route.name === 'Ajustes') {
                iconName = 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Tortas" component={CakesScreen} />
          <Tab.Screen name="Agregar" component={AddCakeScreen} />
          <Tab.Screen name="Ingredientes" component={IngredientsScreen} />
          <Tab.Screen
            name="Ajustes"
            component={SettingsScreen}
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: { display: 'none' },
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </AppStateProvider>
  );
}
