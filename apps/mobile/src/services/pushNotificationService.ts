import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { requireSupabase } from "./supabaseClient";

export type PushNotificationStatus = {
  activeDeviceCount: number;
  permissionStatus: string;
  taskRemindersEnabled: boolean;
  assignmentUpdatesEnabled: boolean;
};

export type ServiceResult<T = undefined> = {
  ok: boolean;
  message: string;
  data?: T;
};

let notificationHandlerConfigured = false;

export function configureNotificationHandler() {
  if (notificationHandlerConfigured) return;
  notificationHandlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function notificationError(message?: string) {
  if (!message) return "Benachrichtigungen konnten nicht aktualisiert werden.";
  if (message.includes("Could not find the table") || message.includes("schema cache")) {
    return "Push-Datenbank noch nicht bereit: Bitte Migration 0009_push_notifications.sql in Supabase ausfuehren.";
  }
  if (message.includes("permission")) return "Benachrichtigungen sind auf diesem Geraet nicht erlaubt.";
  return message;
}

function getProjectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? "";
}

async function getCurrentUserId() {
  const { client, error } = requireSupabase();
  if (!client) return { client: null, userId: "", error };

  const { data, error: userError } = await client.auth.getUser();
  if (userError || !data.user) {
    return { client, userId: "", error: "Bitte zuerst mit deinem Homely-Konto einloggen." };
  }

  return { client, userId: data.user.id, error: "" };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("task-reminders", {
    name: "Aufgabenerinnerungen",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#256F63",
  });
}

export async function getPushNotificationStatus(): Promise<ServiceResult<PushNotificationStatus>> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    const { client, userId, error } = await getCurrentUserId();
    if (!client) {
      return {
        ok: false,
        message: error,
        data: {
          activeDeviceCount: 0,
          permissionStatus: permissions.status,
          taskRemindersEnabled: false,
          assignmentUpdatesEnabled: false,
        },
      };
    }
    if (!userId) return { ok: false, message: error };

    const { count, error: tokenError } = await client
      .from("push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("disabled_at", null);
    if (tokenError) return { ok: false, message: notificationError(tokenError.message) };

    const { data: preferences, error: preferenceError } = await client
      .from("notification_preferences")
      .select("task_reminders_enabled,assignment_updates_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (preferenceError) return { ok: false, message: notificationError(preferenceError.message) };

    return {
      ok: true,
      message: `${count ?? 0} Geraet(e) fuer Push registriert.`,
      data: {
        activeDeviceCount: count ?? 0,
        permissionStatus: permissions.status,
        taskRemindersEnabled: preferences?.task_reminders_enabled ?? false,
        assignmentUpdatesEnabled: preferences?.assignment_updates_enabled ?? false,
      },
    };
  } catch (error) {
    return { ok: false, message: notificationError(error instanceof Error ? error.message : undefined) };
  }
}

export async function registerForPushNotifications(): Promise<ServiceResult<PushNotificationStatus>> {
  configureNotificationHandler();

  if (!Device.isDevice) {
    return { ok: false, message: "Push-Benachrichtigungen funktionieren nur auf einem echten Geraet." };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { ok: false, message: "Push nicht bereit: Expo Project ID fehlt in app.json." };
  }

  const { client, userId, error } = await getCurrentUserId();
  if (!client || !userId) return { ok: false, message: error };

  try {
    await ensureAndroidChannel();
    const existingPermissions = await Notifications.getPermissionsAsync();
    const finalPermissions =
      existingPermissions.status === "granted" ? existingPermissions : await Notifications.requestPermissionsAsync();

    if (finalPermissions.status !== "granted") {
      return { ok: false, message: "Benachrichtigungen wurden nicht erlaubt." };
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const now = new Date().toISOString();
    const { error: tokenError } = await client.from("push_tokens").upsert(
      {
        user_id: userId,
        expo_push_token: token.data,
        platform: Platform.OS,
        device_name: Device.deviceName ?? Constants.deviceName ?? null,
        app_version: Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null,
        disabled_at: null,
        last_seen_at: now,
      },
      { onConflict: "user_id,expo_push_token" },
    );
    if (tokenError) return { ok: false, message: notificationError(tokenError.message) };

    const { error: preferenceError } = await client.from("notification_preferences").upsert(
      {
        user_id: userId,
        task_reminders_enabled: true,
        assignment_updates_enabled: true,
      },
      { onConflict: "user_id" },
    );
    if (preferenceError) return { ok: false, message: notificationError(preferenceError.message) };

    const status = await getPushNotificationStatus();
    return {
      ok: status.ok,
      message: status.ok ? "Push-Benachrichtigungen sind fuer dieses Geraet aktiviert." : status.message,
      data: status.data,
    };
  } catch (error) {
    return { ok: false, message: notificationError(error instanceof Error ? error.message : undefined) };
  }
}

export async function disablePushNotifications(): Promise<ServiceResult<PushNotificationStatus>> {
  const { client, userId, error } = await getCurrentUserId();
  if (!client || !userId) return { ok: false, message: error };

  try {
    const now = new Date().toISOString();
    const { error: tokenError } = await client.from("push_tokens").update({ disabled_at: now }).eq("user_id", userId);
    if (tokenError) return { ok: false, message: notificationError(tokenError.message) };

    const { error: preferenceError } = await client.from("notification_preferences").upsert(
      {
        user_id: userId,
        task_reminders_enabled: false,
        assignment_updates_enabled: false,
      },
      { onConflict: "user_id" },
    );
    if (preferenceError) return { ok: false, message: notificationError(preferenceError.message) };

    const status = await getPushNotificationStatus();
    return {
      ok: status.ok,
      message: status.ok ? "Push-Benachrichtigungen sind fuer dein Konto deaktiviert." : status.message,
      data: status.data,
    };
  } catch (error) {
    return { ok: false, message: notificationError(error instanceof Error ? error.message : undefined) };
  }
}
