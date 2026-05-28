import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
  TouchableWithoutFeedback,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
} from 'react-native';

export const FORM_SCROLL_PROPS = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'on-drag',
  showsVerticalScrollIndicator: false,
  nestedScrollEnabled: true,
};


export function KeyboardDismissBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.bar}
      onPress={Keyboard.dismiss}
      activeOpacity={0.85}
    >
      <Text style={styles.barText}>Klavyeyi Kapat</Text>
      <Text style={styles.barIcon}>▼</Text>
    </TouchableOpacity>
  );
}

export function FormKeyboardScrollView({ style, contentContainerStyle, children, ...rest }) {
  const scrollRef = useRef(null);

  return (
    <ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      {...FORM_SCROLL_PROPS}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}


export function getFieldKeyboardProps(index, total, { multiline = false, onDone } = {}) {
  if (multiline) {
    return {
      returnKeyType: 'default',
      blurOnSubmit: true,
      onSubmitEditing: () => {
        Keyboard.dismiss();
        onDone?.();
      },
    };
  }
  const isLast = index === total - 1;
  return {
    returnKeyType: isLast ? 'done' : 'next',
    blurOnSubmit: isLast,
    onSubmitEditing: isLast
      ? () => {
          Keyboard.dismiss();
          onDone?.();
        }
      : undefined,
  };
}


export function ModalFormShell({ visible, onClose, children, sheetStyle }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
      >
        <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss} />
        <View style={[styles.modalSheet, sheetStyle]}>{children}</View>
        <KeyboardDismissBar />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function DismissKeyboardView({ children, style }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.flex, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,242,254,0.3)',
    paddingVertical: 10,
    zIndex: 5,
  },
  barText: { color: '#00f2fe', fontWeight: '700', fontSize: 15 },
  barIcon: { color: '#00f2fe', fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    maxHeight: '92%',
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default DismissKeyboardView;
