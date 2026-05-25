import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FIELDS = [
  { key: 'ad', label: 'Ad *', placeholder: 'Ad' },
  { key: 'soyad', label: 'Soyad *', placeholder: 'Soyad' },
  { key: 'tc_kimlik', label: 'TC Kimlik *', placeholder: '11 haneli', keyboard: 'numeric', maxLength: 11 },
  { key: 'telefon', label: 'Telefon *', placeholder: '05xx xxx xx xx', keyboard: 'phone-pad' },
  { key: 'pozisyon', label: 'Pozisyon', placeholder: 'Satış danışmanı' },
  { key: 'maas', label: 'Maaş (₺)', placeholder: '25000', keyboard: 'numeric' },
  { key: 'dogum_tarihi', label: 'Doğum tarihi', placeholder: 'YYYY-MM-DD' },
  { key: 'ise_baslama_tarihi', label: 'İşe başlama *', placeholder: 'YYYY-MM-DD' },
  { key: 'adres', label: 'Adres', placeholder: 'Adres...', multiline: true },
];

const PersonnelFormModal = ({
  visible,
  isEditing,
  formData,
  onChange,
  onClose,
  onSave,
  saving,
  error,
}) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditing ? 'Personeli Düzenle' : 'Yeni Personel'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {FIELDS.map((field) => (
            <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={[styles.input, field.multiline && styles.inputMulti]}
                value={String(formData[field.key] ?? '')}
                onChangeText={(v) => onChange(field.key, v)}
                placeholder={field.placeholder}
                placeholderTextColor="#64748b"
                keyboardType={field.keyboard || 'default'}
                maxLength={field.maxLength}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 3 : 1}
              />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.saveText}>{isEditing ? 'Güncelle' : 'Kaydet'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

export default PersonnelFormModal;

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
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
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: '#00f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
});
