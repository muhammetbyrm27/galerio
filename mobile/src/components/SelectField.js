import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SelectField = ({ label, value, options, onSelect, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);
  const display = value || placeholder;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {display}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, value === item.value && styles.optionActive]}
                onPress={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, value === item.value && styles.optionTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { color: '#fff', flex: 1, fontSize: 15 },
  placeholder: { color: '#64748b' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '55%',
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  optionActive: { backgroundColor: 'rgba(0,242,254,0.12)' },
  optionText: { color: '#cbd5e1', fontSize: 16 },
  optionTextActive: { color: '#00f2fe', fontWeight: '700' },
});

export default SelectField;
