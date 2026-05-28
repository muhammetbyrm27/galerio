import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardDismissBar } from './KeyboardDismissView';


const ScreenLayout = ({ children, style, keyboardAware = false }) => {
  const insets = useSafeAreaInsets();

  const shell = (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!keyboardAware) return shell;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {shell}
      <KeyboardDismissBar />
    </KeyboardAvoidingView>
  );
};

export default ScreenLayout;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
