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
import api from '../api/axiosConfig';
import { KeyboardDismissBar } from '../components/KeyboardDismissView';

const { width } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    setError('');
    setMessage('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('E-posta adresi zorunludur.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/request-password-reset', { email: trimmed });
      setMessage(data.message || 'Kod gönderildi.');
      setEmail(trimmed);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Kod gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!code.trim() || newPassword.length < 6) {
      setError('6 haneli kod ve en az 6 karakterlik yeni şifre girin.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/verify-and-reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      setMessage(data.message || 'Şifreniz güncellendi.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (icon, placeholder, value, onChangeText, options = {}) => (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color="#ccc" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        editable={!loading}
        {...options}
      />
    </View>
  );

  return (
    <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={styles.container}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={styles.inner}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#00f2fe" />
            <Text style={styles.backLinkText}>Girişe dön</Text>
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <Ionicons name="key-outline" size={56} color="#00f2fe" />
            <Text style={styles.title}>Şifremi Unuttum</Text>
          </View>

          <View style={styles.glassCard}>
            {step === 1 ? (
              <>
                <Text style={styles.subtitle}>
                  Kayıtlı e-posta adresinize 6 haneli sıfırlama kodu gönderilir (10 dk geçerli).
                </Text>
                {renderInput('mail-outline', 'E-posta', email, setEmail, {
                  autoCapitalize: 'none',
                  keyboardType: 'email-address',
                  returnKeyType: 'done',
                  onSubmitEditing: () => {
                    Keyboard.dismiss();
                    handleRequestCode();
                  },
                })}
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabled]}
                  onPress={handleRequestCode}
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
                      <Text style={styles.buttonText}>KOD GÖNDER</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.subtitle}>
                  {email} adresine gelen kodu ve yeni şifrenizi girin.
                </Text>
                {renderInput('shield-checkmark-outline', '6 haneli kod', code, setCode, {
                  keyboardType: 'number-pad',
                  maxLength: 6,
                  returnKeyType: 'next',
                })}
                {renderInput(
                  'lock-closed-outline',
                  'Yeni şifre (min. 6)',
                  newPassword,
                  setNewPassword,
                  {
                    secureTextEntry: true,
                    returnKeyType: 'done',
                    onSubmitEditing: () => {
                      Keyboard.dismiss();
                      handleResetPassword();
                    },
                  }
                )}
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabled]}
                  onPress={handleResetPassword}
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
                      <Text style={styles.buttonText}>ŞİFREYİ GÜNCELLE</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setStep(1);
                    setCode('');
                    setNewPassword('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  <Text style={styles.secondaryBtnText}>Yeni kod iste</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={48} color="#86efac" />
                  <Text style={styles.successText}>{message}</Text>
                </View>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>GİRİŞ YAP</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {message && step === 1 ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{message}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.footerHint}>
            Yerel sunucuda e-posta yoksa kod sunucu konsolunda görünür.
          </Text>
        </ScrollView>
        <KeyboardDismissBar />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 6,
  },
  backLinkText: { color: '#00f2fe', fontWeight: '600', fontSize: 15 },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
  },
  glassCard: {
    width: width * 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
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
  primaryButton: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  disabled: { opacity: 0.7 },
  gradientButton: { paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  secondaryBtn: { marginTop: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#00f2fe', fontWeight: '600' },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  infoBox: {
    backgroundColor: 'rgba(0,242,254,0.12)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  successBox: { alignItems: 'center', marginBottom: 20, gap: 12 },
  successText: { color: '#86efac', fontSize: 15, textAlign: 'center' },
  footerHint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
});

export default ForgotPasswordScreen;
