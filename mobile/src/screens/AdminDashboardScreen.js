import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/axiosConfig';
import useAuthStore from '../store/useAuthStore';
import ScreenLayout from '../components/ScreenLayout';
import { connectSocket, getSocket } from '../api/socket';

const MENU_ITEMS = [
  { route: 'AdminVehicles', label: 'Araç Yönetimi', icon: 'car-sport', color: '#00f2fe' },
  { route: 'AdminPersonnel', label: 'Personel Yönetimi', icon: 'people', color: '#a78bfa' },
  { route: 'AdminCredit', label: 'Kredi Hesaplama', icon: 'calculator', color: '#f59e0b' },
  { route: 'AdminMarket', label: 'Piyasa Değeri', icon: 'stats-chart', color: '#34d399' },
  { route: 'AdminMessages', label: 'Müşteri Mesajları', icon: 'chatbubbles', color: '#38bdf8', badgeKey: 'messages' },
];

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [vehiclesRes, notifRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/notifications/unread-count'),
      ]);
      setVehicleCount(vehiclesRes.data?.length || 0);
      setUnreadCount(notifRes.data?.unreadCount || 0);
    } catch {
      setVehicleCount(0);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    if (token) {
      connectSocket(token);
    }
    const socket = getSocket();
    const refresh = () => loadStats();
    socket.on('admin_refresh_conversations', refresh);
    socket.on('admin_new_unread_message', refresh);
    const unsubscribe = navigation.addListener('focus', loadStats);
    return () => {
      socket.off('admin_refresh_conversations', refresh);
      socket.off('admin_new_unread_message', refresh);
      unsubscribe();
    };
  }, [loadStats, navigation, user?.id, token]);

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Yönetici Paneli</Text>
        {user?.name ? (
          <Text style={styles.subtitle}>Hoş geldin, {user.name}</Text>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#00f2fe" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statMini}>
              <Ionicons name="car-sport" size={22} color="#00f2fe" />
              <Text style={styles.statMiniValue}>{vehicleCount}</Text>
              <Text style={styles.statMiniLabel}>Araç</Text>
            </View>
            <View style={styles.statMini}>
              <Ionicons name="mail-unread" size={22} color="#38bdf8" />
              <Text style={styles.statMiniValue}>{unreadCount}</Text>
              <Text style={styles.statMiniLabel}>Okunmamış</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Menü</Text>
        {MENU_ITEMS.map((item) => {
          const badge =
            item.badgeKey === 'messages' && unreadCount > 0 ? unreadCount : null;
          return (
            <TouchableOpacity
              key={item.route}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.85}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {badge != null ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statMini: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statMiniValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 8 },
  statMiniLabel: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default AdminDashboardScreen;
