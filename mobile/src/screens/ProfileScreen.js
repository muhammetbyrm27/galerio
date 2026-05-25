import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/useAuthStore';
import API_URL from '../config';

const ProfileScreen = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => logout();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={40} color="#00f2fe" />
      </View>
      <Text style={styles.name}>{user?.name || 'Kullanıcı'}</Text>
      {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
      <Text style={styles.role}>{user?.role === 'admin' ? 'Yönetici' : 'Üye'}</Text>
      <View style={styles.apiBox}>
        <Text style={styles.apiLabel}>Bağlı sunucu (yerel)</Text>
        <Text style={styles.apiUrl} selectable>
          {API_URL}
        </Text>
        <Text style={styles.apiHint}>
          Canlı web (Vercel) Render API kullanır; mobil bu adrese bağlanır.
        </Text>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00f2fe',
  },
  name: { fontSize: 22, fontWeight: '700', color: '#fff' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  role: { fontSize: 14, color: '#94a3b8', marginTop: 4, marginBottom: 16 },
  apiBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.2)',
  },
  apiLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  apiUrl: { color: '#00f2fe', fontSize: 12, fontWeight: '600' },
  apiHint: { color: '#64748b', fontSize: 11, marginTop: 8, lineHeight: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default ProfileScreen;
