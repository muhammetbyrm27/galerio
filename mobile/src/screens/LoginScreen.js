import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axiosConfig';
import useAuthStore from '../store/useAuthStore';
import { KeyboardDismissBar } from '../components/KeyboardDismissView';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation();
  const [mode, setMode] = useState('login'); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !password) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/login', { email: email.trim().toLowerCase(), password });
      const token = data.token;
      const decoded = jwtDecode(token);
      await login(
        {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        },
        token
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Giriş başarısız. Bu bilgisayardaki veritabanında bu hesap yok olabilir — Kayıt Ol deneyin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Ad, e-posta zorunlu; şifre en az 6 karakter olmalı.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setSuccess('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
      setMode('login');
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => (mode === 'login' ? handleLogin() : handleRegister());
  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Ionicons name="car-sport" size={80} color="#fff" />
            <Text style={styles.title}>GALERİO</Text>
            <Text style={styles.subtitle}>Premium Araç Yönetim Sistemi</Text>
          </View>

          <View style={styles.glassCard}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => { setMode('login'); setError(''); setSuccess(''); }}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Giriş</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => { setMode('register'); setError(''); setSuccess(''); }}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {mode === 'register' ? (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#ccc" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ad Soyad"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#ccc" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#ccc" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre (min. 6 karakter)"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => {
                  dismissKeyboard();
                  onSubmit();
                }}
              />
            </View>

            {mode === 'login' ? (
              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={loading}
              >
                <Text style={styles.forgotLinkText}>Şifremi unuttum</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={onSubmit}
              activeOpacity={0.8}
              disabled={loading}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
        <KeyboardDismissBar />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingBottom: 100 },
  headerContainer: { alignItems: 'center', marginBottom: 24 },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#00f2fe',
    letterSpacing: 1,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  glassCard: {
    width: width * 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabRow: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tabActive: { backgroundColor: 'rgba(0, 242, 254, 0.2)', borderWidth: 1, borderColor: '#00f2fe' },
  tabText: { color: '#94a3b8', fontWeight: '600' },
  tabTextActive: { color: '#00f2fe' },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: { color: '#86efac', fontSize: 13, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#fff' },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 8, marginTop: 4 },
  forgotLinkText: { color: '#00f2fe', fontSize: 13, fontWeight: '600' },
  primaryButton: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  disabled: { opacity: 0.7 },
  gradientButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  hint: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});

export default LoginScreen;
