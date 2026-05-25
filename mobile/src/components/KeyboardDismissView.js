import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';

/**
 * Klavye açıkken altta "Kapat" çubuğu + dışarı dokununca klavyeyi indirir.
 */
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
});

export default DismissKeyboardView;
