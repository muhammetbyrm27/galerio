import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardDismissBar } from './KeyboardDismissView';

const ChatPanel = ({
  title,
  subtitle,
  messages,
  currentUserId,
  isAdmin = false,
  newMessage,
  onChangeMessage,
  onSend,
  onBack,
  onDeleteMessage,
  loading,
  sendingDisabled,
}) => {
  const listRef = useRef(null);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    if (onBack) onBack();
  }, [onBack]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  const confirmDeleteMessage = (messageId) => {
    if (!onDeleteMessage || String(messageId).startsWith('temp-')) return;
    Alert.alert('Mesajı sil', 'Bu mesaj kalıcı olarak silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => onDeleteMessage(messageId),
      },
    ]);
  };

  const renderMessage = ({ item }) => {
    const isMine = parseInt(item.sender_id, 10) === currentUserId;
    const canDelete =
      onDeleteMessage &&
      !item.pending &&
      !String(item.id).startsWith('temp-') &&
      isMine;
    const isReadByOther = isMine
      ? isAdmin
        ? !!item.is_read_by_user
        : !!item.is_read_by_admin
      : false;

    const BubbleWrapper = canDelete ? Pressable : View;
    const bubbleProps = canDelete
      ? {
          onLongPress: () => confirmDeleteMessage(item.id),
          delayLongPress: 400,
          style: ({ pressed }) => [
            styles.bubble,
            isMine ? styles.bubbleSent : styles.bubbleReceived,
            pressed && styles.bubblePressed,
          ],
        }
      : {
          style: [styles.bubble, isMine ? styles.bubbleSent : styles.bubbleReceived],
        };

    return (
      <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapSent : styles.bubbleWrapReceived]}>
        {!isMine && item.sender_name ? (
          <Text style={styles.senderLabel}>{item.sender_name}</Text>
        ) : null}
        <BubbleWrapper {...bubbleProps}>
          <Text style={[styles.bubbleText, !isMine && styles.bubbleTextReceived]}>{item.message}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.bubbleTime, !isMine && styles.bubbleTimeReceived]}>
              {new Date(item.created_at).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {item.pending ? ' · gönderiliyor' : ''}
            </Text>
            {isMine && !item.pending ? (
              <Text style={[styles.readStatus, isReadByOther && styles.readStatusSeen]}>
                {isReadByOther ? 'Okundu' : 'İletildi'}
              </Text>
            ) : null}
          </View>
        </BubbleWrapper>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Geri, mesaj listesine dön"
          >
            <Ionicons name="arrow-back" size={26} color="#00f2fe" />
            <Text style={styles.backText}>Geri</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.messagesArea}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#00f2fe" size="large" />
              <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              style={styles.messageList}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMessage}
              contentContainerStyle={[
                styles.messageListContent,
                messages.length === 0 && styles.messageListEmpty,
              ]}
              ListEmptyComponent={
                <Text style={styles.empty}>Henüz mesaj yok. Alttaki kutudan yazın.</Text>
              }
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </View>

        <KeyboardDismissBar />

        <SafeAreaView edges={['bottom']} style={styles.messageBoxSafe}>
          <View style={styles.messageBox}>
            <Text style={styles.messageBoxLabel}>Mesaj kutusu</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={onChangeMessage}
                placeholder="Mesajınızı yazın..."
                placeholderTextColor="#64748b"
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={onSend}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  (sendingDisabled || pressed) && styles.sendDisabled,
                ]}
                onPress={onSend}
                disabled={sendingDisabled}
              >
                <Ionicons name="send" size={22} color="#0f172a" />
              </Pressable>
            </View>
            <Text style={styles.messageCount}>
              {messages.length} mesaj
              {messages.filter((m) => parseInt(m.sender_id, 10) === currentUserId).length > 0
                ? ` · ${messages.filter((m) => parseInt(m.sender_id, 10) === currentUserId).length} sizin`
                : ''}
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1e293b',
    zIndex: 10,
    elevation: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,242,254,0.12)',
    marginRight: 10,
  },
  backBtnPressed: { backgroundColor: 'rgba(0,242,254,0.28)' },
  backText: { color: '#00f2fe', fontWeight: '700', fontSize: 16, marginLeft: 4 },
  headerText: { flex: 1 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  messagesArea: { flex: 1, minHeight: 0 },
  messageList: { flex: 1 },
  messageListContent: { padding: 12, paddingBottom: 16 },
  messageListEmpty: { flexGrow: 1, justifyContent: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  empty: { color: '#64748b', textAlign: 'center', paddingHorizontal: 24 },
  bubbleWrap: { marginVertical: 6, maxWidth: '88%' },
  bubbleWrapSent: { alignSelf: 'flex-end' },
  bubbleWrapReceived: { alignSelf: 'flex-start' },
  mineLabel: {
    alignSelf: 'flex-end',
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginRight: 4,
  },
  senderLabel: {
    alignSelf: 'flex-start',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: { borderRadius: 16, padding: 12 },
  bubblePressed: { opacity: 0.75 },
  bubbleSent: { backgroundColor: '#00f2fe' },
  bubbleReceived: { backgroundColor: '#334155' },
  bubbleText: { fontSize: 15, color: '#0f172a', lineHeight: 22 },
  bubbleTextReceived: { color: '#fff' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  bubbleTime: { fontSize: 10, color: 'rgba(0,0,0,0.45)' },
  bubbleTimeReceived: { color: 'rgba(255,255,255,0.5)' },
  readStatus: { fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: '600' },
  readStatusSeen: { color: 'rgba(0,0,0,0.55)' },
  messageBoxSafe: { backgroundColor: '#1e293b' },
  messageBox: {
    borderTopWidth: 2,
    borderTopColor: '#00f2fe',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  messageBoxLabel: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.35)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    minHeight: 48,
    maxHeight: 120,
    fontSize: 16,
  },
  sendBtn: {
    backgroundColor: '#00f2fe',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  messageCount: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ChatPanel;
