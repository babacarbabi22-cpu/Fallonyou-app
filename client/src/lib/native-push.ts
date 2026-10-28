import { Capacitor } from "@capacitor/core";
import { PushNotifications, type PushNotificationsPlugin } from "@capacitor/push-notifications";
import { nativePushDeviceInput, notificationPath } from "@shared/native-push";
import { apiRequest } from "./queryClient";

type Snapshot = { isSubscribed: boolean; isBusy: boolean; permission: NotificationPermission; error: string };
type Environment = {
  platform: "ios" | "android";
  request: (method: string, path: string, body?: unknown) => Promise<any>;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
};
const storageKey = "fallonyou.native-push-device";
export function createNativePushController(plugin: PushNotificationsPlugin, env: Environment) {
  let snapshot: Snapshot = { isSubscribed: false, isBusy: false, permission: "default", error: "" };
  let userId: string | null = null, intent = false, generation = 0;
  let initialized: Promise<void> | undefined;
  let waiter: { epoch: number; resolve: (ok: boolean) => void } | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  const finishRegistration = (ok: boolean, epoch: number) => {
    if (waiter?.epoch === epoch) waiter.resolve(ok);
  };
  let navigate: (path: string) => void = () => {};
  let pendingPath: string | null = null;
  const listeners = new Set<() => void>();
  const update = (value: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...value };
    listeners.forEach(listener => listener());
  };
  const stored = () => {
    const raw = env.storage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw);
    const device = nativePushDeviceInput.parse({ platform: value.platform, token: value.token });
    if (typeof value.userId !== "string") throw new Error("Unreadable device consent");
    return { ...device, userId: value.userId as string };
  };
  const initialize = () => initialized ??= (async () => {
    await plugin.addListener("registration", ({ value }) => {
      const owner = userId, epoch = generation;
      if (!owner || !intent) return;
      // Serialize device writes: an old account's delayed response must not
      // overwrite a newer account's explicit registration of the same token.
      writes = writes.catch(() => {}).then(async () => {
      try {
        if (userId !== owner || generation !== epoch || !intent) return;
        const device = nativePushDeviceInput.parse({ platform: env.platform, token: value });
        const previous = stored();
        await env.request("POST", "/api/push/native/register", device);
        if (userId !== owner || generation !== epoch || !intent) {
          if (userId === owner) await env.request("POST", "/api/push/native/unregister", device);
          finishRegistration(false, epoch); return;
        }
        if (previous?.userId === owner && previous.token !== device.token) {
          await env.request("POST", "/api/push/native/unregister", { platform: previous.platform, token: previous.token });
        }
        try { env.storage.setItem(storageKey, JSON.stringify({ ...device, userId: owner })); }
        catch {
          await env.request("POST", "/api/push/native/unregister", device);
          throw new Error("Cannot retain device consent");
        }
        update({ isSubscribed: true, error: "" });
        finishRegistration(true, epoch);
      } catch {
        if (userId === owner && generation === epoch) update({ error: "failed" });
        finishRegistration(false, epoch);
      }
      });
      return writes;
    });
    await plugin.addListener("registrationError", () => {
      update({ error: "failed" });
      waiter?.resolve(false);
    });
    await plugin.addListener("pushNotificationActionPerformed", action => {
      const path = notificationPath(action.notification.data?.url);
      if (userId) navigate(path); else pendingPath = path;
    });
  })();

  async function register(prompt: boolean) {
    if (!userId || snapshot.isBusy) return false;
    const owner = userId, epoch = generation;
    const current = () => userId === owner && generation === epoch;
    update({ isBusy: true, error: "" });
    try {
      await initialize();
      const config = await env.request("GET", "/api/push/native/config");
      if (!current()) return false;
      if (config[env.platform] !== true) { update({ error: "setup" }); return false; }
      let permissions = await plugin.checkPermissions();
      if (!current()) return false;
      if (prompt && ["prompt", "prompt-with-rationale"].includes(permissions.receive)) {
        permissions = await plugin.requestPermissions();
      }
      if (!current()) return false;
      const permission = permissions.receive === "granted" ? "granted" :
        permissions.receive === "denied" ? "denied" : "default";
      update({ permission });
      if (permission !== "granted") { update({ isSubscribed: false, error: permission === "denied" ? "permission" : "" }); return false; }
      if (env.platform === "android") await plugin.createChannel({
        id: "fallonyou_updates", name: "FallOnYou", importance: 4, visibility: 0,
      });
      if (!current()) return false;
      intent = true;
      let timer: ReturnType<typeof setTimeout>;
      const registered = new Promise<boolean>(resolve => {
        waiter = { epoch, resolve };
        timer = setTimeout(() => resolve(false), 15_000);
      });
      try {
        await plugin.register();
        const confirmed = await registered;
        if (!confirmed && current()) { generation++; intent = false; update({ error: "failed" }); }
        return confirmed;
      }
      finally {
        clearTimeout(timer!);
        finishRegistration(false, epoch);
        if (waiter?.epoch === epoch) waiter = undefined;
      }
    } catch {
      if (current()) {
        generation++; intent = false;
        update({ error: "failed" });
      }
      return false;
    } finally { update({ isBusy: false }); }
  }
  const controller = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setNavigate: (callback: (path: string) => void) => { navigate = callback; },
    async setUser(id: string | null) {
      await initialize();
      if (userId === id) return;
      const previousOwner = userId;
      userId = id; generation++; intent = false; waiter?.resolve(false);
      update({ isSubscribed: false, error: "", permission: "default" });
      if (id && pendingPath) { const path = pendingPath; pendingPath = null; navigate(path); }
      try {
        const previous = stored();
        if ((previousOwner && previousOwner !== id) || (previous && previous.userId !== id)) {
          await plugin.unregister();
          await plugin.removeAllDeliveredNotifications();
          if (previous && previous.userId !== id) env.storage.removeItem(storageKey);
        }
        // Renew only this account's prior consent. Never request permission on mount.
        if (id && stored()?.userId === id) {
          update({ isSubscribed: true });
          await register(false);
        }
      } catch { update({ error: "failed" }); }
    },
    activate: () => register(true),
    async deactivate() {
      if (snapshot.isBusy) return false;
      update({ isBusy: true, error: "" });
      try {
        generation++; intent = false; waiter?.resolve(false);
        await writes;
        const device = stored();
        if (device?.userId === userId) await env.request("POST", "/api/push/native/unregister", { platform: device.platform, token: device.token });
        env.storage.removeItem(storageKey);
        update({ isSubscribed: false });
        // Server removal is authoritative; clear old OS notifications too.
        await plugin.removeAllDeliveredNotifications().catch(() => {});
        await plugin.unregister();
        return true;
      } catch {
        update({ error: "failed" });
        return false;
      } finally { update({ isBusy: false }); }
    },
  };
  return controller;
}

export const isNativeApp = Capacitor.isNativePlatform();
// Only iPhone is enabled for this release; Android setup is deferred.
export const nativePushEnabled = isNativeApp && Capacitor.getPlatform() === "ios";
export const nativePushAvailable = nativePushEnabled && Capacitor.isPluginAvailable("PushNotifications");
export const nativePushController = nativePushAvailable ? createNativePushController(PushNotifications, {
  platform: Capacitor.getPlatform() === "ios" ? "ios" : "android",
  request: (method, path, body) => apiRequest(method, path, body).then(response => response.json()),
  storage: {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: key => window.localStorage.removeItem(key),
  },
}) : null;

export async function detachNativePushBeforeLogout() {
  if (nativePushController && !await nativePushController.deactivate()) {
    throw new Error("Could not detach device notifications. Retry sign-out.");
  }
}
