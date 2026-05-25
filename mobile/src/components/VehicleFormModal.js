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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../config';

const FIELDS = [
  { key: 'brand', label: 'Marka *', placeholder: 'örn. BMW' },
  { key: 'model', label: 'Model *', placeholder: 'örn. 320i' },
  { key: 'year', label: 'Yıl *', placeholder: '2022', keyboard: 'numeric' },
  { key: 'color', label: 'Renk', placeholder: 'Beyaz' },
  { key: 'gear', label: 'Vites', placeholder: 'Otomatik' },
  { key: 'fuel', label: 'Yakıt', placeholder: 'Benzin' },
  { key: 'mileage', label: 'Kilometre', placeholder: '45000', keyboard: 'numeric' },
  { key: 'purchase_price', label: 'Alış fiyatı', placeholder: '500000', keyboard: 'numeric' },
  { key: 'sale_price', label: 'Satış fiyatı', placeholder: '650000', keyboard: 'numeric' },
  { key: 'description', label: 'Açıklama', placeholder: 'Açıklama...', multiline: true },
];

const VehicleFormModal = ({
  visible,
  isEditing,
  formData,
  onChange,
  onClose,
  onSave,
  saving,
  error,
  newPhotos = [],
  existingPhotos = [],
  onPickFromGallery,
  onTakePhoto,
  onRemoveNewPhoto,
  onDeleteExistingPhoto,
  photoBusy = false,
}) => {
  const totalPhotos = existingPhotos.length + newPhotos.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.photoBlock}>
            <Text style={styles.photoSectionTitle}>Fotoğraflar ({totalPhotos}/10)</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoActionBtn, styles.photoActionPrimary]}
                onPress={onPickFromGallery}
                disabled={photoBusy || totalPhotos >= 10 || !onPickFromGallery}
                activeOpacity={0.7}
              >
                {photoBusy ? (
                  <ActivityIndicator size="small" color="#00f2fe" />
                ) : (
                  <Ionicons name="images" size={22} color="#00f2fe" />
                )}
                <Text style={styles.photoActionText}>Galeriden Seç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={onTakePhoto}
                disabled={photoBusy || totalPhotos >= 10 || !onTakePhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={22} color="#00f2fe" />
                <Text style={styles.photoActionText}>Kamera</Text>
              </TouchableOpacity>
            </View>

            {existingPhotos.length > 0 ? (
              <>
                <Text style={styles.photoSubtitle}>Mevcut fotoğraflar</Text>
                <View style={styles.photoGrid}>
                  {existingPhotos.map((photo) => (
                    <View key={`ex-${photo.id}`} style={styles.photoWrap}>
                      <Image
                        source={{ uri: getImageUrl(photo.photo_url) }}
                        style={styles.photoThumb}
                      />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => onDeleteExistingPhoto(photo.id)}
                      >
                        <Ionicons name="trash" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {newPhotos.length > 0 ? (
              <>
                <Text style={styles.photoSubtitle}>Yeni eklenecek</Text>
                <View style={styles.photoGrid}>
                  {newPhotos.map((asset, index) => (
                    <View key={`new-${asset.uri}-${index}`} style={styles.photoWrap}>
                      <Image source={{ uri: asset.uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => onRemoveNewPhoto(index)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {totalPhotos === 0 ? (
              <Text style={styles.photoHint}>
                Galeriden veya kameradan en fazla 10 fotoğraf ekleyebilirsiniz.
              </Text>
            ) : null}
          </View>

          <ScrollView
            style={styles.fieldsScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 3 : 1}
                />
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveDisabled]}
            onPress={onSave}
            disabled={saving || photoBusy}
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
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
  },
  photoBlock: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.25)',
  },
  fieldsScroll: { maxHeight: 280 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  field: { marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  photoSectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  photoActionPrimary: {
    borderColor: 'rgba(0,242,254,0.6)',
    backgroundColor: 'rgba(0,242,254,0.08)',
  },
  photoSubtitle: { color: '#94a3b8', fontSize: 12, marginBottom: 8, marginTop: 4 },
  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.35)',
  },
  photoActionText: { color: '#00f2fe', fontWeight: '600', fontSize: 14 },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  photoWrap: { position: 'relative' },
  photoThumb: {
    width: 88,
    height: 66,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    padding: 4,
  },
  photoHint: { color: '#64748b', fontSize: 12, marginBottom: 8 },
  saveBtn: {
    backgroundColor: '#00f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
});

export default VehicleFormModal;
