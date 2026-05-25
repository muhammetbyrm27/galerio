import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import carData from '../data/arabaVerisi';
import SelectField from '../components/SelectField';
import { buildSahibindenUrl } from '../utils/marketValueUrls';
import { KeyboardDismissBar } from '../components/KeyboardDismissView';
import ScreenLayout from '../components/ScreenLayout';

const GEAR_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'manuel', label: 'Manuel' },
  { value: 'otomatik', label: 'Otomatik' },
  { value: 'yari-otomatik', label: 'Yarı Otomatik' },
];

const FUEL_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'benzin', label: 'Benzin' },
  { value: 'dizel', label: 'Dizel' },
  { value: 'hibrit', label: 'Hibrit' },
  { value: 'elektrik', label: 'Elektrik' },
  { value: 'lpg', label: 'Benzin & LPG' },
];

const MarketValueScreen = () => {
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    customBrand: '',
    customModel: '',
    yearMin: '',
    yearMax: '',
    kmMin: '',
    kmMax: '',
    gear: '',
    fuel: '',
  });

  const carBrands = useMemo(() => Object.keys(carData).sort(), []);

  const brandOptions = useMemo(
    () => [
      { value: '', label: 'Marka seçiniz' },
      ...carBrands.map((b) => ({ value: b, label: b })),
      { value: 'Other', label: 'Diğer...' },
    ],
    [carBrands]
  );

  const modelOptions = useMemo(() => {
    if (!filters.brand || filters.brand === 'Other') {
      return [{ value: '', label: 'Önce marka seçin' }];
    }
    return [
      { value: '', label: 'Model seçiniz' },
      ...(carData[filters.brand] || []).map((m) => ({ value: m, label: m })),
      { value: 'Other', label: 'Diğer...' },
    ];
  }, [filters.brand]);

  const setField = (name, value) => {
    if (name === 'brand') {
      setFilters((prev) => ({
        ...prev,
        brand: value,
        model: '',
        customBrand: value === 'Other' ? prev.customBrand : '',
        customModel: '',
      }));
    } else if (name === 'model') {
      setFilters((prev) => ({
        ...prev,
        model: value,
        customModel: value === 'Other' ? prev.customModel : '',
      }));
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  const getFinalBrand = () => (filters.brand === 'Other' ? filters.customBrand.trim() : filters.brand);
  const getFinalModel = () => (filters.model === 'Other' ? filters.customModel.trim() : filters.model);

  const onSahibinden = async () => {
    if (!getFinalBrand()) {
      Alert.alert('Uyarı', 'Lütfen en az marka seçin veya girin.');
      return;
    }
    const url = buildSahibindenUrl(filters, getFinalBrand, getFinalModel);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
    else Alert.alert('Hata', 'Link açılamadı.');
  };

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Piyasa Değeri</Text>
        <Text style={styles.subtitle}>
          Filtreleri doldurup Sahibinden.com üzerinde benzer ilanları görün.
        </Text>

        <View style={styles.card}>
          <SelectField
            label="Marka"
            value={filters.brand}
            options={brandOptions}
            onSelect={(v) => setField('brand', v)}
            placeholder="Marka seçiniz"
          />

          {filters.brand === 'Other' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Marka (manuel)</Text>
              <TextInput
                style={styles.input}
                value={filters.customBrand}
                onChangeText={(v) => setField('customBrand', v)}
                placeholder="Markayı yazın"
                placeholderTextColor="#64748b"
              />
            </View>
          ) : null}

          <SelectField
            label="Model"
            value={filters.model}
            options={modelOptions}
            onSelect={(v) => setField('model', v)}
            placeholder="Model seçiniz"
            disabled={!filters.brand}
          />

          {filters.model === 'Other' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Model (manuel)</Text>
              <TextInput
                style={styles.input}
                value={filters.customModel}
                onChangeText={(v) => setField('customModel', v)}
                placeholder="Modeli yazın"
                placeholderTextColor="#64748b"
              />
            </View>
          ) : null}

          <SelectField
            label="Vites"
            value={filters.gear}
            options={GEAR_OPTIONS}
            onSelect={(v) => setField('gear', v)}
            placeholder="Tümü"
          />

          <SelectField
            label="Yakıt"
            value={filters.fuel}
            options={FUEL_OPTIONS}
            onSelect={(v) => setField('fuel', v)}
            placeholder="Tümü"
          />

          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Yıl (min)</Text>
              <TextInput
                style={styles.input}
                value={filters.yearMin}
                onChangeText={(v) => setField('yearMin', v)}
                keyboardType="numeric"
                placeholder="2015"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Yıl (max)</Text>
              <TextInput
                style={styles.input}
                value={filters.yearMax}
                onChangeText={(v) => setField('yearMax', v)}
                keyboardType="numeric"
                placeholder="2024"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>KM (min)</Text>
              <TextInput
                style={styles.input}
                value={filters.kmMin}
                onChangeText={(v) => setField('kmMin', v)}
                keyboardType="numeric"
                placeholder="50000"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>KM (max)</Text>
              <TextInput
                style={styles.input}
                value={filters.kmMax}
                onChangeText={(v) => setField('kmMax', v)}
                keyboardType="numeric"
                placeholder="150000"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.btn, styles.btnSahibinden]} onPress={onSahibinden}>
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.btnTextLight}>Sahibinden.com&apos;da Ara</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
        <KeyboardDismissBar />
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  field: { marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  btnSahibinden: { backgroundColor: '#f59e0b' },
  btnTextLight: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default MarketValueScreen;
