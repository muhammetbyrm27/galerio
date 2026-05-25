import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { getImageUrl } from '../config';
import useAuthStore from '../store/useAuthStore';
import VehicleDetailModal from '../components/VehicleDetailModal';

const formatPrice = (value) =>
  parseFloat(value || 0).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const HomeScreen = () => {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const isUser = user?.role === 'user';
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/vehicles');
      setVehicles(data);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.message === 'Network Error'
          ? 'Sunucuya bağlanılamadı. .env içindeki IP adresini kontrol edin.'
          : 'Araçlar yüklenemedi.');
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const openDetails = async (vehicleId) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const { data } = await api.get(`/vehicles/${vehicleId}`);
      setSelectedVehicle(data);
    } catch {
      setDetailVisible(false);
      setError('Araç detayı yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailVisible(false);
    setSelectedVehicle(null);
  };

  const startChatFromVehicle = (vehicle) => {
    closeDetails();
    navigation.navigate('Messages', { vehicle });
  };

  const renderItem = ({ item }) => {
    const imageUri =
      getImageUrl(item.photo_url) ||
      'https://via.placeholder.com/400x300/1e293b/64748b?text=Resim+Yok';

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => openDetails(item.id)}>
        <Image source={{ uri: imageUri }} style={styles.cardImage} />
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{formatPrice(item.sale_price)}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.brandModel}>
            {item.brand} {item.model}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={14} color="#888" />
              <Text style={styles.badgeText}>{item.year}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="speedometer-outline" size={14} color="#888" />
              <Text style={styles.badgeText}>
                {Number(item.mileage || 0).toLocaleString('tr-TR')} km
              </Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="water-outline" size={14} color="#888" />
              <Text style={styles.badgeText}>{item.fuel}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00f2fe" />
        <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Premium Araçlar</Text>
          {user?.name ? <Text style={styles.welcome}>Merhaba, {user.name}</Text> : null}
        </View>
        <View style={styles.headerActions}>
          {isUser ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Market')}
              style={styles.headerIconBtn}
            >
              <Ionicons name="stats-chart-outline" size={22} color="#00f2fe" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onRefresh} style={styles.headerIconBtn}>
            <Ionicons name="refresh-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={20} color="#f87171" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f2fe" />
        }
        ListEmptyComponent={
          !error ? (
            <Text style={styles.emptyText}>Henüz ilan bulunmuyor.</Text>
          ) : null
        }
      />

      <VehicleDetailModal
        vehicle={selectedVehicle}
        visible={detailVisible}
        onClose={closeDetails}
        onStartChat={isUser ? startChatFromVehicle : undefined}
      />
      {detailLoading && detailVisible && !selectedVehicle ? (
        <View style={styles.detailLoader}>
          <ActivityIndicator color="#00f2fe" size="large" />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  welcome: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { padding: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { color: '#fca5a5', flex: 1, fontSize: 13 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    marginBottom: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardImage: { width: '100%', height: 300 },
  priceTag: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceText: { color: '#00f2fe', fontWeight: 'bold', fontSize: 16 },
  cardBody: { padding: 20 },
  brandModel: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 15 },
  badgeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: { color: '#cbd5e1', marginLeft: 6, fontSize: 13, fontWeight: '500' },
  detailLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
