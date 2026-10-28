import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { isNativeApp, nativePushEnabled, nativePushAvailable, nativePushController } from "@/lib/native-push";

const emptyNativeState = { isSubscribed: false, isBusy: false, permission: "default" as NotificationPermission, error: "" };
const noSubscribe = () => () => {};
const getEmptyNativeState = () => emptyNativeState;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const nativeState = useSyncExternalStore(nativePushController?.subscribe ?? noSubscribe,
    nativePushController?.getSnapshot ?? getEmptyNativeState);
  const [isBusy, setIsBusy] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isNativeApp) return;
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch {
      // ignore
    }
  };

  const subscribe = useCallback(async () => {
    if (isNativeApp) return nativePushController?.activate() ?? false;
    if (!isSupported) return false;

    setIsBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const res = await fetch('/api/push/vapid-key');
      const { publicKey } = await res.json();
      if (!publicKey) return false;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await apiRequest('POST', '/api/push/subscribe', {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    } finally { setIsBusy(false); }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (isNativeApp) return nativePushController?.deactivate() ?? false;
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await apiRequest('POST', '/api/push/unsubscribe', {
            endpoint: sub.endpoint,
          });
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      return false;
    } finally { setIsBusy(false); }
  }, []);

  return {
    isSupported: isNativeApp ? nativePushAvailable : isSupported,
    isSubscribed: isNativeApp ? nativeState.isSubscribed : isSubscribed,
    permission: isNativeApp ? nativeState.permission : permission,
    isBusy: isNativeApp ? nativeState.isBusy : isBusy,
    isNative: nativePushEnabled,
    nativeError: nativePushEnabled ? (nativePushAvailable ? nativeState.error : "update") : "",
    subscribe,
    unsubscribe,
  };
}
