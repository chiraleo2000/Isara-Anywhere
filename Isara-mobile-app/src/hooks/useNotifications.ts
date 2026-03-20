import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification: Notifications.Notification) => {
        // Listener kept active to receive foreground notifications
      },
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response: Notifications.NotificationResponse) => {
        // Handle notification tap navigation here
      },
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated]);

  const registerForPush = useCallback(async (): Promise<string | null> => {
    const permissions = await Notifications.getPermissionsAsync();
    let isGranted = permissions.granted;

    if (!isGranted) {
      const result = await Notifications.requestPermissionsAsync();
      isGranted = result.granted;
    }

    if (!isGranted) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  }, []);

  const getBadgeCount = useCallback(async (): Promise<number> => {
    return Notifications.getBadgeCountAsync();
  }, []);

  return { registerForPush, getBadgeCount };
}
