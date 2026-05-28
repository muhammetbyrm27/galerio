import { Platform } from 'react-native';


export const buildNavigatorScreenOptions = (insets) => {
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);
  const tabBarHeight = 56 + bottomPad;

  return {
    headerStyle: { backgroundColor: '#0f172a' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700', fontSize: 17 },
    headerShadowVisible: false,
    headerStatusBarHeight: insets.top,
    contentStyle: { backgroundColor: '#0f172a' },
    tabBarStyle: {
      backgroundColor: '#1e293b',
      borderTopColor: 'rgba(255,255,255,0.08)',
      height: tabBarHeight,
      paddingBottom: bottomPad,
      paddingTop: 8,
    },
    tabBarActiveTintColor: '#00f2fe',
    tabBarInactiveTintColor: '#94a3b8',
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    drawerStyle: { backgroundColor: '#1e293b', width: 280 },
    drawerActiveTintColor: '#00f2fe',
    drawerInactiveTintColor: '#cbd5e1',
    drawerLabelStyle: { fontWeight: '600' },
  };
};
