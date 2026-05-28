import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axiosConfig';
import { KeyboardDismissBar } from '../components/KeyboardDismissView';

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseDecimal = (value) => {
  const cleaned = String(value).trim().replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned);
};

/** Binlik ayraçlı tutar: 500.000 veya 500000 → 500000 */
const parseAmount = (value) => {
  const cleaned = String(value).trim().replace(/\s/g, '').replace(/[.,]/g, '');
  return parseInt(cleaned, 10);
};

const CreditScreen = () => {
  const [krediTutari, setKrediTutari] = useState('');
  const [vade, setVade] = useState('');
  const [aylikFaizOrani, setAylikFaizOrani] = useState('');
  const [sonuc, setSonuc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleHesapla = async () => {
    setError('');
    setSonuc(null);

    if (!krediTutari || !vade || !aylikFaizOrani) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    const tutar = parseAmount(krediTutari);
    const ay = parseAmount(vade);
    const faiz = parseDecimal(aylikFaizOrani);

    if (!tutar || tutar <= 0 || !ay || ay <= 0 || Number.isNaN(faiz) || faiz <= 0) {
      setError('Geçerli sayılar girin. Faiz için 2,5 veya 2.5 kullanabilirsiniz.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/kredi/hesapla', {
        krediTutari: tutar,
        vade: ay,
        aylikFaizOrani: faiz,
      });
      setSonuc(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Hesaplama başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const openBankLink = (url) => {
    if (url) Linking.openURL(url);
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.pageTitle}>Araç Kredisi Hesaplama</Text>
        <Text style={styles.hint}>* Tüm alanlar zorunludur</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Kredi Tutarı (TL)</Text>
          <TextInput
            style={styles.input}
            value={krediTutari}
            onChangeText={setKrediTutari}
            keyboardType="numeric"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={dismissKeyboard}
            placeholder="örn. 500000 veya 500.000"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Vade (Ay)</Text>
          <TextInput
            style={styles.input}
            value={vade}
            onChangeText={setVade}
            keyboardType="numeric"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={dismissKeyboard}
            placeholder="örn. 36"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Aylık Faiz Oranı (%)</Text>
          <TextInput
            style={styles.input}
            value={aylikFaizOrani}
            onChangeText={setAylikFaizOrani}
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={dismissKeyboard}
            placeholder="örn. 2,5 veya 2.5"
            placeholderTextColor="#64748b"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleHesapla}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <>
                <Ionicons name="calculator" size={20} color="#0f172a" />
                <Text style={styles.btnText}>Hesapla</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {sonuc ? (
          <View style={styles.results}>
            <Text style={styles.sectionTitle}>Özet</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="Kredi türü" value={sonuc.krediTuru} />
              <SummaryRow label="Kredi tutarı" value={`${formatMoney(sonuc.krediTutari)} TL`} />
              <SummaryRow
                label="Toplam geri ödeme"
                value={`${formatMoney(sonuc.toplamGeriOdeme)} TL`}
              />
              <SummaryRow
                label="Aylık taksit"
                value={`${formatMoney(sonuc.aylikTaksit)} TL`}
                highlight
              />
            </View>

            <Text style={styles.sectionTitle}>Ödeme planı</Text>
            {sonuc.odemePlani?.map((taksit) => (
              <View key={taksit.taksitNo} style={styles.taksitCard}>
                <View style={styles.taksitHeader}>
                  <Text style={styles.taksitNo}>Taksit {taksit.taksitNo}</Text>
                  <Text style={styles.taksitDate}>{taksit.tarih}</Text>
                </View>
                <Text style={styles.taksitAmount}>{formatMoney(taksit.taksitTutari)} TL</Text>
                <Text style={styles.taksitDetail}>
                  Anapara: {formatMoney(taksit.anapara)} · Faiz: {formatMoney(taksit.faiz)}
                </Text>
                <Text style={styles.taksitDetail}>
                  KKDF: {formatMoney(taksit.kkdf)} · BSMV: {formatMoney(taksit.bsmv)}
                </Text>
                <Text style={styles.taksitKalan}>
                  Kalan: {formatMoney(taksit.kalanAnapara)} TL
                </Text>
              </View>
            ))}

            {sonuc.alternatifTeklifler?.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Banka teklifleri</Text>
                {sonuc.alternatifTeklifler.map((teklif, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.bankCard}
                    onPress={() => openBankLink(teklif.yonlendirmeUrl)}
                  >
                    <Text style={styles.bankName}>{teklif.bankaAdi}</Text>
                    <View style={styles.bankAction}>
                      <Text style={styles.bankLink}>İncele</Text>
                      <Ionicons name="open-outline" size={18} color="#00f2fe" />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <KeyboardDismissBar />
    </KeyboardAvoidingView>
  );
};

const SummaryRow = ({ label, value, highlight }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, highlight && styles.summaryHighlight]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  results: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 8 },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  summaryLabel: { color: '#94a3b8', fontSize: 14 },
  summaryValue: { color: '#fff', fontWeight: '600', fontSize: 14 },
  summaryHighlight: { color: '#00f2fe', fontSize: 16 },
  taksitCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  taksitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  taksitNo: { color: '#00f2fe', fontWeight: '700' },
  taksitDate: { color: '#94a3b8', fontSize: 12 },
  taksitAmount: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  taksitDetail: { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  taksitKalan: { color: '#64748b', fontSize: 12, marginTop: 4 },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.2)',
  },
  bankName: { color: '#fff', fontWeight: '600', fontSize: 16 },
  bankAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bankLink: { color: '#00f2fe', fontWeight: '600' },
});

export default CreditScreen;
