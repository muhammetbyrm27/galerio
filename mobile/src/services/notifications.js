import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Expo Go remote push desteklemez; modül yüklenmez, konsol uyarısı çıkmaz. */
export const isNotificationsSupported = Constants.appOwnership !== 'expo';

let notificationsModule = null;
let handlerConfigured = false;

async function getNotifications() {
  if (!isNotificationsSupported) return null;
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
  }
  if (!handlerConfigured && notificationsModule) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }
  return notificationsModule;
}

export async function initNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mesajlar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00f2fe',
    });
  }
}

export async function requestNotificationPermissions() {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function showMessageNotification({ title, body, data = {} }) {
  if (!isNotificationsSupported) return;

  const Notifications = await getNotifications();
  if (!Notifications) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Galerio',
      body: body || 'Yeni mesaj',
      data,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'messages' } : {}),
    },
    trigger: null,
  });
}
