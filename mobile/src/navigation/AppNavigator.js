import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildNavigatorScreenOptions } from './safeAreaConfig';
import useAuthStore from '../store/useAuthStore';
import { handleMessagesTabDoublePress } from '../store/useMessagesNavStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useUserUnreadMessages } from '../hooks/useUserUnreadMessages';
import { useMessageSocket } from '../hooks/useMessageSocket';

// User Screens
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import CreditScreen from '../screens/CreditScreen';
import MarketValueScreen from '../screens/MarketValueScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminVehiclesScreen from '../screens/AdminVehiclesScreen';
import AdminPersonnelScreen from '../screens/AdminPersonnelScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const galerioTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00f2fe',
    background: '#0f172a',
    card: '#1e293b',
    text: '#fff',
    border: 'rgba(255,255,255,0.1)',
  },
};

const tabIcon = (name, focused) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={24} color={focused ? '#00f2fe' : '#94a3b8'} />
);

const drawerIcon = (name, focused) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={22} color={focused ? '#00f2fe' : '#94a3b8'} />
);

// Alt Menü (Normal Kullanıcılar için)
const UserTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const navOpts = buildNavigatorScreenOptions(insets);
  const unreadMessages = useUserUnreadMessages();
  const messagesTabBadge =
    unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined;

  return (
    <Tab.Navigator
      screenOptions={{
        ...navOpts,
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Araçlar', tabBarIcon: ({ focused }) => tabIcon('car-sport', focused) }}
      />
      <Tab.Screen
        name="Credit"
        component={CreditScreen}
        options={{ title: 'Kredi', tabBarIcon: ({ focused }) => tabIcon('calculator', focused) }}
      />
      <Tab.Screen
        name="Market"
        component={MarketValueScreen}
        options={{
          title: 'Piyasa',
          headerShown: false,
          tabBarIcon: ({ focused }) => tabIcon('stats-chart', focused),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Mesajlar',
          headerShown: false,
          tabBarIcon: ({ focused }) => tabIcon('chatbubbles', focused),
          tabBarBadge: messagesTabBadge,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
            minWidth: 18,
            lineHeight: 16,
          },
        }}
        listeners={{
          tabPress: (e) => handleMessagesTabDoublePress('Messages', e),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: ({ focused }) => tabIcon('person', focused) }}
      />
    </Tab.Navigator>
  );
};

// Yandan Açılır Menü (Yöneticiler için)
const AdminDrawerNavigator = () => {
  const insets = useSafeAreaInsets();
  const navOpts = buildNavigatorScreenOptions(insets);

  return (
    <Drawer.Navigator
      screenOptions={{
        ...navOpts,
        headerShown: true,
        drawerActiveBackgroundColor: 'rgba(0, 242, 254, 0.12)',
        drawerItemStyle: { borderRadius: 10, marginHorizontal: 6 },
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ focused }) => drawerIcon('grid', focused),
        }}
      />
      <Drawer.Screen
        name="AdminVehicles"
        component={AdminVehiclesScreen}
        options={{
          title: 'Araç Yönetimi',
          headerShown: false,
          drawerIcon: ({ focused }) => drawerIcon('car-sport', focused),
        }}
      />
      <Drawer.Screen
        name="AdminPersonnel"
        component={AdminPersonnelScreen}
        options={{
          title: 'Personel',
          headerShown: false,
          drawerIcon: ({ focused }) => drawerIcon('people', focused),
        }}
      />
      <Drawer.Screen
        name="AdminCredit"
        component={CreditScreen}
        options={{
          title: 'Kredi',
          headerShown: true,
          drawerIcon: ({ focused }) => drawerIcon('calculator', focused),
        }}
      />
      <Drawer.Screen
        name="AdminMarket"
        component={MarketValueScreen}
        options={{
          title: 'Piyasa Değeri',
          headerShown: false,
          drawerIcon: ({ focused }) => drawerIcon('stats-chart', focused),
        }}
      />
      <Drawer.Screen
        name="AdminMessages"
        component={MessagesScreen}
        options={{
          title: 'Mesajlar',
          headerShown: false,
          drawerIcon: ({ focused }) => drawerIcon('chatbubbles', focused),
        }}
        listeners={{
          drawerItemPress: (e) => handleMessagesTabDoublePress('AdminMessages', e),
        }}
      />
    </Drawer.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, user } = useAuthStore();
  useMessageSocket();
  usePushNotifications();

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={galerioTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : user?.role === 'admin' ? (
            <Stack.Screen name="AdminDrawer" component={AdminDrawerNavigator} />
          ) : (
            <Stack.Screen name="UserTabs" component={UserTabNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default AppNavigator;
