import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  BackHandler,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import ZoomableImage from './ZoomableImage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('screen');


export function FullScreenImageGallery({ images = [], initialIndex = 0, title, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [pagerScrollEnabled, setPagerScrollEnabled] = useState(true);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const uris = Array.isArray(images) ? images.filter(Boolean) : [];

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const safeIndex = Math.min(Math.max(0, initialIndex), Math.max(0, uris.length - 1));
    setIndex(safeIndex);
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [initialIndex, uris.length]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setHidden(true, 'fade');
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => {
      sub.remove();
      if (Platform.OS === 'android') {
        StatusBar.setHidden(false, 'fade');
      }
    };
  }, [handleClose]);

  const scrollTo = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= uris.length) return;
    setPagerScrollEnabled(true);
    setIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const onScrollEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx >= 0 && idx < uris.length) {
      setIndex(idx);
      setPagerScrollEnabled(true);
    }
  };

  if (uris.length === 0) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      {Platform.OS === 'ios' ? <StatusBar hidden /> : null}

      <FlatList
        ref={listRef}
        style={styles.list}
        data={uris}
        horizontal
        pagingEnabled
        scrollEnabled={pagerScrollEnabled}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        initialScrollIndex={Math.min(initialIndex, uris.length - 1)}
        getItemLayout={(_, i) => ({
          length: SCREEN_W,
          offset: SCREEN_W * i,
          index: i,
        })}
        onMomentumScrollEnd={onScrollEnd}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }, 80);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <ZoomableImage
              uri={item}
              width={SCREEN_W}
              height={SCREEN_H}
              onZoomActiveChange={(active) => setPagerScrollEnabled(!active)}
            />
          </View>
        )}
      />

      <View style={[styles.overlayTop, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable style={styles.backBtn} onPress={handleClose}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
          <Text style={styles.backText}>Geri</Text>
        </Pressable>
        <View style={styles.overlayTitleWrap}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {uris.length > 1 ? (
            <Text style={styles.counter}>
              {index + 1} / {uris.length}
            </Text>
          ) : null}
        </View>
      </View>

      {uris.length > 1 ? (
        <>
          <TouchableOpacity
            style={[styles.navBtn, styles.navPrev]}
            onPress={() => scrollTo(index === 0 ? uris.length - 1 : index - 1)}
          >
            <Ionicons name="chevron-back" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, styles.navNext]}
            onPress={() => scrollTo((index + 1) % uris.length)}
          >
            <Ionicons name="chevron-forward" size={36} color="#fff" />
          </TouchableOpacity>
        </>
      ) : null}

      <Text style={[styles.zoomHint, { bottom: insets.bottom + 16 }]}>
        İki parmakla yakınlaştır · çift dokunuş · kaydır
      </Text>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#000',
  },
  list: {
    ...StyleSheet.absoluteFillObject,
  },
  slide: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  zoomHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backText: { color: '#00f2fe', fontSize: 17, fontWeight: '700' },
  overlayTitleWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  counter: { color: '#cbd5e1', fontSize: 13, marginTop: 2, fontWeight: '600' },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 30,
    padding: 10,
  },
  navPrev: { left: 10 },
  navNext: { right: 10 },
});

export default FullScreenImageGallery;
