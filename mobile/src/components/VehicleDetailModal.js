import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../config';
import { FullScreenImageGallery } from './FullScreenImageModal';

const { width } = Dimensions.get('window');
const GALLERY_HEIGHT = 380;

const formatPrice = (value) =>
  parseFloat(value || 0).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const VehicleDetailModal = ({ vehicle, visible, onClose, onStartChat }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const galleryRef = useRef(null);

  const openFullScreen = (index) => {
    setFullScreenIndex(index);
    setFullScreenOpen(true);
  };

  const resetOnClose = useCallback(() => {
    setImageIndex(0);
    setFullScreenOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setImageIndex(0);
      setFullScreenOpen(false);
    }
  }, [visible, vehicle?.id]);

  if (!vehicle) return null;

  const photos = vehicle.photos?.length
    ? vehicle.photos
    : vehicle.photo_url
      ? [{ photo_url: vehicle.photo_url }]
      : [];

  const photoUris = photos.map((p) => getImageUrl(p.photo_url)).filter(Boolean);
  const title = `${vehicle.brand} ${vehicle.model}`;

  const scrollToIndex = (index) => {
    if (index < 0 || index >= photoUris.length) return;
    setImageIndex(index);
    galleryRef.current?.scrollToIndex({ index, animated: true });
  };

  const onGalleryScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx >= 0 && idx < photoUris.length && idx !== imageIndex) {
      setImageIndex(idx);
    }
  };

  const handleModalBack = () => {
    if (fullScreenOpen) {
      setFullScreenOpen(false);
    } else {
      resetOnClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType={fullScreenOpen ? 'fade' : 'slide'}
      transparent={!fullScreenOpen}
      presentationStyle={fullScreenOpen ? 'fullScreen' : 'overFullScreen'}
      statusBarTranslucent={fullScreenOpen}
      onRequestClose={handleModalBack}
    >
      {fullScreenOpen ? (
        <FullScreenImageGallery
          images={photoUris}
          initialIndex={fullScreenIndex}
          title={title}
          onClose={() => setFullScreenOpen(false)}
        />
      ) : (
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={resetOnClose} />
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.closeBtn} onPress={resetOnClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <View style={styles.gallery}>
                {photoUris.length > 0 ? (
                  <>
                    <FlatList
                      ref={galleryRef}
                      data={photoUris}
                      horizontal
                      pagingEnabled
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={(_, i) => String(i)}
                      onMomentumScrollEnd={onGalleryScroll}
                      getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                      })}
                      renderItem={({ item, index: photoIdx }) => (
                        <TouchableOpacity
                          activeOpacity={0.92}
                          onPress={() => openFullScreen(photoIdx)}
                          style={styles.slide}
                        >
                          <Image source={{ uri: item }} style={styles.mainImage} resizeMode="cover" />
                          <View style={styles.expandHint}>
                            <Ionicons name="expand-outline" size={20} color="#fff" />
                            <Text style={styles.expandHintText}>Tam ekran için dokun</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                    {photoUris.length > 1 ? (
                      <>
                        <View style={styles.counter}>
                          <Text style={styles.counterText}>
                            {imageIndex + 1} / {photoUris.length}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.navBtn, styles.navPrev]}
                          onPress={() => scrollToIndex(imageIndex === 0 ? photoUris.length - 1 : imageIndex - 1)}
                        >
                          <Ionicons name="chevron-back" size={28} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.navBtn, styles.navNext]}
                          onPress={() => scrollToIndex((imageIndex + 1) % photoUris.length)}
                        >
                          <Ionicons name="chevron-forward" size={28} color="#fff" />
                        </TouchableOpacity>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.thumbRow}
                          contentContainerStyle={styles.thumbRowContent}
                        >
                          {photoUris.map((uri, idx) => (
                            <TouchableOpacity
                              key={`thumb-${idx}`}
                              onPress={() => scrollToIndex(idx)}
                              style={[styles.thumb, idx === imageIndex && styles.thumbActive]}
                            >
                              <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    ) : null}
                  </>
                ) : (
                  <View style={[styles.mainImage, styles.noImage]}>
                    <Ionicons name="image-outline" size={48} color="#64748b" />
                    <Text style={styles.noImageText}>Fotoğraf yok</Text>
                  </View>
                )}
              </View>

              <View style={styles.body}>
                <Text style={styles.title}>{title}</Text>

                <View style={styles.grid}>
                  <DetailRow label="Yıl" value={vehicle.year} />
                  <DetailRow
                    label="Kilometre"
                    value={`${Number(vehicle.mileage || 0).toLocaleString('tr-TR')} km`}
                  />
                  <DetailRow label="Yakıt" value={vehicle.fuel} />
                  <DetailRow label="Vites" value={vehicle.gear} />
                  {vehicle.color ? <DetailRow label="Renk" value={vehicle.color} /> : null}
                </View>

                <Text style={styles.priceLabel}>Satış Fiyatı</Text>
                <Text style={styles.price}>{formatPrice(vehicle.sale_price)}</Text>

                {vehicle.description ? (
                  <View style={styles.descBox}>
                    <Text style={styles.descTitle}>Açıklama</Text>
                    <Text style={styles.descText}>{vehicle.description}</Text>
                  </View>
                ) : null}

                {onStartChat ? (
                  <TouchableOpacity style={styles.chatBtn} onPress={() => onStartChat(vehicle)}>
                    <Ionicons name="chatbubbles" size={22} color="#0f172a" />
                    <Text style={styles.chatBtnText}>Satıcı ile Mesajlaş</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  gallery: { position: 'relative' },
  slide: { width, height: GALLERY_HEIGHT },
  mainImage: { width, height: GALLERY_HEIGHT, backgroundColor: '#0f172a' },
  noImage: { justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#64748b', marginTop: 8 },
  expandHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  expandHintText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  counter: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  navBtn: {
    position: 'absolute',
    top: GALLERY_HEIGHT / 2 - 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 6,
  },
  navPrev: { left: 8 },
  navNext: { right: 8 },
  thumbRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  thumbRowContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  thumbActive: { borderColor: '#00f2fe' },
  thumbImage: { width: '100%', height: '100%' },
  body: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 16 },
  grid: { gap: 10, marginBottom: 20 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 10,
  },
  detailLabel: { color: '#94a3b8', fontSize: 14 },
  detailValue: { color: '#fff', fontWeight: '600', fontSize: 14 },
  priceLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  price: { color: '#00f2fe', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  descBox: { marginTop: 8 },
  descTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  descText: { color: '#cbd5e1', lineHeight: 22 },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  chatBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
});

export default VehicleDetailModal;
