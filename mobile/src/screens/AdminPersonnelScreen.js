import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axiosConfig';
import ScreenLayout from '../components/ScreenLayout';
import PersonnelFormModal from '../components/PersonnelFormModal';

const INITIAL_FORM = {
  ad: '',
  soyad: '',
  tc_kimlik: '',
  telefon: '',
  dogum_tarihi: '',
  adres: '',
  pozisyon: '',
  maas: '',
  ise_baslama_tarihi: '',
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const formatDateDisplay = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('tr-TR');
  } catch {
    return '—';
  }
};

const formatMoney = (v) => {
  if (v == null || v === '') return '—';
  return Number(v).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const AdminPersonnelScreen = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchList = useCallback(async () => {
    try {
      const { data } = await api.get('/personnel');
      setList(data);
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.message || 'Personel listesi alınamadı.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      Object.values(p).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [list, search]);

  const openAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData(INITIAL_FORM);
    setFormError('');
    setFormVisible(true);
  };

  const openEdit = (person) => {
    setIsEditing(true);
    setEditId(person.id);
    setFormData({
      ad: String(person.ad || ''),
      soyad: String(person.soyad || ''),
      tc_kimlik: String(person.tc_kimlik || ''),
      telefon: String(person.telefon || ''),
      dogum_tarihi: formatDateForInput(person.dogum_tarihi),
      adres: String(person.adres || ''),
      pozisyon: String(person.pozisyon || ''),
      maas: person.maas != null ? String(person.maas) : '',
      ise_baslama_tarihi: formatDateForInput(person.ise_baslama_tarihi),
    });
    setFormError('');
    setFormVisible(true);
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (
      !formData.ad.trim() ||
      !formData.soyad.trim() ||
      !formData.tc_kimlik.trim() ||
      !formData.telefon.trim() ||
      !formData.ise_baslama_tarihi.trim()
    ) {
      setFormError('Ad, soyad, TC, telefon ve işe başlama tarihi zorunludur.');
      return;
    }

    setSaving(true);
    setFormError('');
    const payload = {
      ad: formData.ad.trim(),
      soyad: formData.soyad.trim(),
      tc_kimlik: formData.tc_kimlik.trim(),
      telefon: formData.telefon.trim(),
      dogum_tarihi: formData.dogum_tarihi.trim() || null,
      adres: formData.adres.trim(),
      pozisyon: formData.pozisyon.trim(),
      maas: formData.maas ? parseFloat(String(formData.maas).replace(',', '.')) : null,
      ise_baslama_tarihi: formData.ise_baslama_tarihi.trim(),
    };

    try {
      if (isEditing && editId) {
        await api.put(`/personnel/${editId}`, payload);
        Alert.alert('Başarılı', 'Personel güncellendi.');
      } else {
        await api.post('/personnel', payload);
        Alert.alert('Başarılı', 'Personel eklendi.');
      }
      setFormVisible(false);
      fetchList();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (person) => {
    Alert.alert(
      'Personeli Sil',
      `${person.ad} ${person.soyad} silinsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/personnel/${person.id}`);
              fetchList();
            } catch (err) {
              Alert.alert('Hata', err.response?.data?.message || 'Silinemedi.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <Text style={styles.name}>
          {item.ad} {item.soyad}
        </Text>
        <Text style={styles.meta}>{item.pozisyon || 'Pozisyon belirtilmemiş'}</Text>
        <Text style={styles.meta}>
          {item.telefon} · {formatMoney(item.maas)}
        </Text>
        <Text style={styles.metaSmall}>
          İşe başlama: {formatDateDisplay(item.ise_baslama_tarihi)}
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

  if (loading) {
    return (
      <ScreenLayout keyboardAware>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00f2fe" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout keyboardAware>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>Personel</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#0f172a" />
            <Text style={styles.addBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Personel ara..."
          placeholderTextColor="#64748b"
          returnKeyType="search"
          blurOnSubmit
          onSubmitEditing={Keyboard.dismiss}
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchList();
              }}
              tintColor="#00f2fe"
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? 'Arama sonucu yok.' : 'Henüz personel yok.'}
            </Text>
          }
        />

        <PersonnelFormModal
          visible={formVisible}
          isEditing={isEditing}
          formData={formData}
          onChange={handleChange}
          onClose={() => setFormVisible(false)}
          onSave={handleSave}
          saving={saving}
          error={formError}
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
  search: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardBody: { flex: 1 },
  name: { color: '#fff', fontWeight: '700', fontSize: 16 },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  metaSmall: { color: '#64748b', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default AdminPersonnelScreen;
