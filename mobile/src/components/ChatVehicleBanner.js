import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../config';
import { formatVehicleTitle, formatVehicleSubtitle } from '../utils/formatVehicle';

const ChatVehicleBanner = ({ vehicle, onPress }) => {
  if (!vehicle) return null;

  const photoUrl =
    vehicle.photos?.[0]?.photo_url || vehicle.photo_url
      ? getImageUrl(vehicle.photos?.[0]?.photo_url || vehicle.photo_url)
      : null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="car-outline" size={28} color="#64748b" />
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {formatVehicleTitle(vehicle)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {formatVehicleSubtitle(vehicle)}
        </Text>
        {onPress ? (
          <Text style={styles.hint}>İlan detayı için dokunun</Text>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={22} color="#00f2fe" /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,242,254,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  thumb: {
    width: 72,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: { flex: 1 },
  title: { color: '#fff', fontWeight: '800', fontSize: 15 },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  hint: { color: '#00f2fe', fontSize: 11, marginTop: 4, fontWeight: '600' },
});

export default ChatVehicleBanner;
