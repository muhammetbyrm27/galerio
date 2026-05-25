import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/axiosConfig';
import { getImageUrl } from '../config';
import VehicleFormModal from '../components/VehicleFormModal';
import ScreenLayout from '../components/ScreenLayout';
import { buildVehicleFormData, buildPhotosOnlyFormData } from '../utils/vehiclePhotos';

const MAX_PHOTOS = 10;

const INITIAL_FORM = {
  brand: '',
  model: '',
  year: '',
  color: '',
  gear: '',
  fuel: '',
  mileage: '',
  purchase_price: '',
  sale_price: '',
  description: '',
};

const formatPrice = (v) =>
  Number(v || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

const AdminVehiclesScreen = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  const resetPhotos = () => {
    setNewPhotos([]);
    setExistingPhotos([]);
  };

  const remainingSlots = () =>
    Math.max(0, MAX_PHOTOS - existingPhotos.length - newPhotos.length);

  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await api.get('/vehicles');
      setVehicles(data);
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || 'Araçlar yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const openAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData(INITIAL_FORM);
    setFormError('');
    resetPhotos();
    setFormVisible(true);
  };

  const openEdit = async (vehicle) => {
    try {
      const { data } = await api.get(`/vehicles/${vehicle.id}`);
      setIsEditing(true);
      setEditId(vehicle.id);
      setFormData({
        brand: String(data.brand || ''),
        model: String(data.model || ''),
        year: String(data.year || ''),
        color: String(data.color || ''),
        gear: String(data.gear || ''),
        fuel: String(data.fuel || ''),
        mileage: String(data.mileage || ''),
        purchase_price: String(data.purchase_price || ''),
        sale_price: String(data.sale_price || ''),
        description: String(data.description || ''),
      });
      setExistingPhotos(data.photos || []);
      setNewPhotos([]);
      setFormError('');
      setFormVisible(true);
    } catch {
      Alert.alert('Hata', 'Araç detayı alınamadı.');
    }
  };

  const addAssets = (assets) => {
    const slots = remainingSlots();
    if (slots <= 0) {
      Alert.alert('Limit', `En fazla ${MAX_PHOTOS} fotoğraf eklenebilir.`);
      return;
    }
    setNewPhotos((prev) => [...prev, ...assets].slice(0, prev.length + slots));
  };

  const pickFromGallery = async () => {
    const slots = remainingSlots();
    if (slots <= 0) {
      Alert.alert('Limit', `En fazla ${MAX_PHOTOS} fotoğraf eklenebilir.`);
      return;
    }

    setPhotoBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Galeri izni gerekli',
          'Araç fotoğrafı eklemek için galeri erişimine izin verin.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ayarları Aç', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: slots > 1,
        quality: 0.85,
        selectionLimit: slots,
        ...(Platform.OS === 'android' ? { legacy: true } : {}),
      });

      if (!result.canceled && result.assets?.length) {
        addAssets(result.assets);
      }
    } catch (err) {
      Alert.alert('Galeri açılamadı', err?.message || 'Tekrar deneyin.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const takePhoto = async () => {
    if (remainingSlots() <= 0) {
      Alert.alert('Limit', `En fazla ${MAX_PHOTOS} fotoğraf eklenebilir.`);
      return;
    }
    setPhotoBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Kamera izni gerekli',
          'Fotoğraf çekmek için kamera erişimine izin verin.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ayarları Aç', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) {
        addAssets([result.assets[0]]);
      }
    } catch (err) {
      Alert.alert('Kamera açılamadı', err?.message || 'Tekrar deneyin.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removeNewPhoto = (index) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteExistingPhoto = (photoId) => {
    Alert.alert('Fotoğrafı sil', 'Bu fotoğraf kalıcı olarak silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/photos/${photoId}`);
            setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
          } catch (err) {
            Alert.alert('Hata', err.response?.data?.message || 'Fotoğraf silinemedi.');
          }
        },
      },
    ]);
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => ({
    brand: formData.brand.trim(),
    model: formData.model.trim(),
    year: parseInt(formData.year, 10),
    color: formData.color.trim(),
    gear: formData.gear.trim(),
    fuel: formData.fuel.trim(),
    mileage: parseInt(String(formData.mileage).replace(/\D/g, ''), 10) || 0,
    purchase_price: parseFloat(String(formData.purchase_price).replace(',', '.')) || 0,
    sale_price: parseFloat(String(formData.sale_price).replace(',', '.')) || 0,
    description: formData.description.trim(),
  });

  const handleSave = async () => {
    if (!formData.brand.trim() || !formData.model.trim() || !formData.year.trim()) {
      setFormError('Marka, model ve yıl zorunludur.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = buildPayload();
      if (isEditing && editId) {
        await api.put(`/vehicles/${editId}`, payload);
        if (newPhotos.length > 0) {
          const photoBody = buildPhotosOnlyFormData(newPhotos);
          await api.post(`/vehicles/${editId}/add-photos`, photoBody, {
            timeout: 60000,
          });
        }
        Alert.alert('Başarılı', 'Araç güncellendi.');
      } else {
        const body = buildVehicleFormData(payload, newPhotos);
        await api.post('/vehicles', body, {
          timeout: 60000,
        });
        Alert.alert('Başarılı', 'Yeni araç eklendi.');
      }
      setFormVisible(false);
      resetPhotos();
      fetchVehicles();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (vehicle) => {
    Alert.alert(
      'Aracı Sil',
      `${vehicle.brand} ${vehicle.model} silinsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/vehicles/${vehicle.id}`);
              fetchVehicles();
            } catch (err) {
              Alert.alert('Hata', err.response?.data?.message || 'Silinemedi.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const imageUri =
      getImageUrl(item.photo_url) ||
      'https://via.placeholder.com/80x60/1e293b/64748b?text=?';

    return (
      <View style={styles.card}>
        <Image source={{ uri: imageUri }} style={styles.thumb} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>
            {item.brand} {item.model}
          </Text>
          <Text style={styles.cardSub}>
            {item.year} · {formatPrice(item.sale_price)}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={22} color="#00f2fe" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={22} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00f2fe" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Araç Yönetimi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#0f172a" />
          <Text style={styles.addBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchVehicles();
            }}
            tintColor="#00f2fe"
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>Henüz araç yok. Yeni ekleyin.</Text>}
      />

      <VehicleFormModal
        visible={formVisible}
        isEditing={isEditing}
        formData={formData}
        onChange={handleChange}
        onClose={() => {
          setFormVisible(false);
          resetPhotos();
        }}
        onSave={handleSave}
        saving={saving}
        error={formError}
        newPhotos={newPhotos}
        existingPhotos={existingPhotos}
        onPickFromGallery={pickFromGallery}
        onTakePhoto={takePhoto}
        onRemoveNewPhoto={removeNewPhoto}
        onDeleteExistingPhoto={deleteExistingPhoto}
        photoBusy={photoBusy}
      />
    </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#0f172a', fontWeight: '800' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  thumb: { width: 72, height: 54, borderRadius: 8, backgroundColor: '#0f172a' },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardSub: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default AdminVehiclesScreen;
