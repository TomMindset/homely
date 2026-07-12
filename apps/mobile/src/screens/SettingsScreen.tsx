import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { designSets, memberColors, roleOptions, type DesignSetId, type ViewId } from "../constants/planner";
import { checkDatabaseHealth } from "../services/databaseHealthService";
import {
  acceptRemoteInvitation,
  createRemoteHousehold,
  createRemoteInvitation,
  deleteRemoteHousehold,
  listRemoteHouseholds,
  listRemoteMemberships,
  mapRemoteMembershipToMember,
  type RemoteHousehold,
  type RemoteMembership,
} from "../services/householdService";
import {
  getCurrentAuthEmail,
  requestPasswordReset,
  requestAccountDeletion,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePassword,
} from "../services/authService";
import { downloadPlannerSnapshot, uploadPlannerSnapshot, type PlannerSnapshot } from "../services/plannerSyncService";
import {
  disablePushNotifications,
  getPushNotificationStatus,
  registerForPushNotifications,
  sendTestPushNotification,
  updatePushPreferences,
  type PushPreferencePatch,
  type PushNotificationStatus,
} from "../services/pushNotificationService";
import { getSupabaseStatusLabel } from "../services/supabaseConfig";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, MealPlanEntry, Member, TaskTemplate } from "../utils/planner";
import { StateMessage } from "../components/StateMessage";
import { FamilyScreen } from "./FamilyScreen";

type SettingsTab = "account" | "household" | "appearance" | "readiness";
type AccountArea = "identity" | "households" | "sync" | "invites" | "notifications" | "danger";
type SyncStatus = {
  state: "local" | "syncing" | "synced" | "error";
  message: string;
};

function getMessageTone(message: string): "success" | "warning" | "error" {
  const lower = message.toLowerCase();
  if (lower.includes("konnte nicht") || lower.includes("fehler") || lower.includes("blockiert") || lower.includes("fehl")) return "error";
  if (lower.includes("bitte") || lower.includes("noch") || lower.includes("lokal")) return "warning";
  return "success";
}

const readinessItems = [
  { title: "Kernnutzen", status: "v1 bereit", detail: "Aufgaben, Essen und Fairness sind als taeglicher Kernfluss vorhanden." },
  { title: "Onboarding", status: "v1 bereit", detail: "Neutraler Haushalt fuer Familie, WG oder andere Haushalte mit eigenen Personen." },
  { title: "Konto & Sicherheit", status: "Testphase", detail: "E-Mail-Login, Passwortfluss, Deep Link und Kontoloeschung laufen ueber Supabase." },
  { title: "Datenmodell", status: "v1 bereit", detail: "Haushalt, Mitglieder, Rollen, Aufgaben, Punkte, Zuordnungen und Essen sind modelliert." },
  { title: "Synchronisation", status: "Testphase", detail: "Supabase-Sync ist eingebunden; Mehrkonto- und Rollentests bleiben Pflicht vor Store." },
  { title: "UX-Qualitaet", status: "Testphase", detail: "Android-Abstaende, Untermenues, leere Zustaende und Darkmode muessen auf Geraeten geprueft werden." },
  { title: "Alltagstauglichkeit", status: "v1 bereit", detail: "Wiederholungen, Vertretung, Punkte und Erinnerungsfelder sind vorbereitet." },
  { title: "Fairness & Motivation", status: "v1 bereit", detail: "Soll, Plan und Ist werden pro Person sichtbar verglichen." },
  { title: "Store-Reife", status: "offen", detail: "Screenshots, Feature-Grafik, Altersfreigabe und Play-Console-Angaben muessen finalisiert werden." },
  { title: "Betrieb", status: "offen", detail: "Support-Mail, GitHub-Pages-Domain, Backups und Release-Prozess werden vor Produktion geschlossen." },
];

type TestStatus = "open" | "ok" | "issue";

const syncTestItems = [
  { id: "database", title: "Datenbank pruefen", detail: "Tabellen, Grants, RLS und RPCs sind erreichbar." },
  { id: "household", title: "Haushalt laden", detail: "Aktiver Supabase-Haushalt bleibt nach Neustart gesetzt." },
  { id: "upload", title: "Plan hochladen", detail: "Mitglieder, Aufgaben, Zuordnungen und Essen werden uebertragen." },
  { id: "download", title: "Plan laden", detail: "Supabase-Stand ersetzt lokale Ansicht korrekt." },
  { id: "assignment-status", title: "Aufgabe abhaken", detail: "Status und erledigt-von werden remote sichtbar." },
  { id: "assignment-member", title: "Aufgabe zuordnen", detail: "Fairness-Zuordnung schreibt remote." },
  { id: "tasks", title: "Aufgaben verwalten", detail: "Neu, bearbeiten, Punkte, Wiederholung und loeschen schreiben remote." },
  { id: "meals", title: "Essensplan", detail: "Gericht, Koch-Person und Tausch werden remote gespiegelt." },
  { id: "members", title: "Mitglieder verwalten", detail: "Anlegen, bearbeiten, Rollen und loeschen schreiben remote." },
  { id: "invitation", title: "Einladung", detail: "Zweiter Account kann per Code beitreten." },
  { id: "multi-household", title: "Haushaltswechsel", detail: "Accounts mit mehreren Haushalten sehen den Wechselbereich und laden den richtigen Plan." },
  { id: "permissions", title: "Rollenrechte", detail: "Mitglieder duerfen erledigen, Verwalter duerfen planen." },
  { id: "restart", title: "Neustart", detail: "Nach Expo/App-Neustart bleibt der Sync-Stand konsistent." },
];

const releaseGateItems = [
  { title: "Domain & Website", detail: "GitHub Pages mit Datenschutz, Impressum und Kontoloeschung unter aesti.de." },
  { title: "Play Console", detail: "Store-Texte, Kategorie, Zielgruppe, Content Rating, App-Zugriff und Data Safety final eintragen." },
  { title: "Grafiken", detail: "Mindestens fuenf Smartphone-Screenshots und Feature-Grafik 1024x500 aus der aktuellen App erstellen." },
  { title: "Build", detail: "EAS Preview auf Samsung testen, danach Production AAB mit erhoehter Android versionCode bauen." },
  { title: "Interner Test", detail: "Mehrkonto-Test mit Gruender, Verwalter und Mitglied vor Produktionsrollout abschliessen." },
];

function nextTestStatus(status: TestStatus): TestStatus {
  if (status === "open") return "ok";
  if (status === "ok") return "issue";
  return "open";
}

function testStatusLabel(status: TestStatus) {
  if (status === "ok") return "OK";
  if (status === "issue") return "Problem";
  return "Offen";
}

function PushPreferenceToggle({
  title,
  detail,
  value,
  disabled,
  darkMode,
  onPress,
}: {
  title: string;
  detail: string;
  value: boolean;
  disabled: boolean;
  darkMode: boolean;
  onPress: () => void;
}) {
  const themed = useThemeStyles(darkMode);

  return (
    <View style={[styles.preferenceRow, darkMode && styles.rowDark, themed.card]}>
      <View style={styles.preferenceText}>
        <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{title}</Text>
        <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{detail}</Text>
      </View>
      <TouchableOpacity
        style={[styles.toggleButton, value && styles.toggleButtonActive, disabled && styles.disabledButton]}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value, disabled }}
        onPress={onPress}
      >
        <Text style={[styles.toggleButtonText, value && styles.toggleButtonTextActive]}>{value ? "Ein" : "Aus"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SettingsScreen({
  accountEmail,
  activeMemberName,
  familyName,
  members,
  tasks,
  assignments,
  meals,
  activeRemoteHouseholdId,
  syncStatus,
  darkMode,
  designSetId,
  canManagePlan,
  applyRemoteSnapshot,
  setActiveRemoteHouseholdId,
  setView,
  updateAccountEmail,
  toggleDarkMode,
  setDesignSetId,
  updateFamilyName,
  addMember,
  updateMember,
  deleteMember,
  resetLocalData,
}: {
  accountEmail: string;
  activeMemberName: string;
  familyName: string;
  members: Member[];
  tasks: TaskTemplate[];
  assignments: Assignment[];
  meals: MealPlanEntry[];
  activeRemoteHouseholdId: string;
  syncStatus: SyncStatus;
  darkMode: boolean;
  designSetId: DesignSetId;
  canManagePlan: boolean;
  applyRemoteSnapshot: (snapshot: PlannerSnapshot) => void;
  setActiveRemoteHouseholdId: (householdId: string) => void;
  setView: (view: ViewId) => void;
  updateAccountEmail: (email: string) => void;
  toggleDarkMode: () => void;
  setDesignSetId: (id: DesignSetId) => void;
  updateFamilyName: (name: string) => void;
  addMember: (name: string, shortCode: string, role: string, color: string) => void;
  updateMember: (memberId: string, patch: Partial<Member>) => void;
  deleteMember: (memberId: string) => void;
  resetLocalData: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("account");
  const themed = useThemeStyles(darkMode);

  return (
    <View>
      <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
        <Text style={[styles.eyebrow, themed.muted]}>Mehr</Text>
        <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>Einstellungen</Text>
        <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
          Lokale Ansicht: {activeMemberName || "nicht gesetzt"}. Sync: {syncStatus.message}.
        </Text>
        <View style={[styles.syncPill, darkMode && styles.rowDark, themed.soft]}>
          <View
            style={[
              styles.syncDot,
              {
                backgroundColor:
                  syncStatus.state === "synced"
                    ? "#16a34a"
                    : syncStatus.state === "syncing"
                      ? "#ca8a04"
                      : syncStatus.state === "error"
                        ? "#dc2626"
                        : "#64748b",
              },
            ]}
          />
          <Text style={[styles.syncText, themed.muted, darkMode && styles.mutedDark]}>
            {activeRemoteHouseholdId ? "Cloud verbunden" : "Lokal"} · {syncStatus.message}
          </Text>
        </View>
        <View style={styles.segmentedWrap}>
          {[
            { id: "account", label: "Konto" },
            { id: "household", label: "Haushalt" },
            { id: "appearance", label: "Design" },
            { id: "readiness", label: "Check" },
          ].map((item) => {
            const active = tab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.segmentButtonCompact, themed.buttonSurface, active && themed.active]}
                accessibilityRole="button"
                accessibilityLabel={`Einstellung ${item.label} anzeigen`}
                accessibilityState={{ selected: active }}
                onPress={() => setTab(item.id as SettingsTab)}
              >
                <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === "account" && (
        <AccountSettings
          accountEmail={accountEmail}
          activeMemberName={activeMemberName}
          familyName={familyName}
          members={members}
          tasks={tasks}
          assignments={assignments}
          meals={meals}
          activeRemoteHouseholdId={activeRemoteHouseholdId}
          darkMode={darkMode}
          canManagePlan={canManagePlan}
          applyRemoteSnapshot={applyRemoteSnapshot}
          setActiveRemoteHouseholdId={setActiveRemoteHouseholdId}
          setView={setView}
          updateAccountEmail={updateAccountEmail}
        />
      )}

      {tab === "household" && (
        <FamilyScreen
          familyName={familyName}
          members={members}
          darkMode={darkMode}
          canManagePlan={canManagePlan}
          updateFamilyName={updateFamilyName}
          addMember={addMember}
          updateMember={updateMember}
          deleteMember={deleteMember}
          resetLocalData={resetLocalData}
        />
      )}

      {tab === "appearance" && (
        <AppearanceSettings
          darkMode={darkMode}
          designSetId={designSetId}
          toggleDarkMode={toggleDarkMode}
          setDesignSetId={setDesignSetId}
        />
      )}

      {tab === "readiness" && <ReadinessSettings darkMode={darkMode} />}
    </View>
  );
}

function AccountSettings({
  accountEmail,
  activeMemberName,
  familyName,
  members,
  tasks,
  assignments,
  meals,
  activeRemoteHouseholdId,
  darkMode,
  canManagePlan,
  applyRemoteSnapshot,
  setActiveRemoteHouseholdId,
  setView,
  updateAccountEmail,
}: {
  accountEmail: string;
  activeMemberName: string;
  familyName: string;
  members: Member[];
  tasks: TaskTemplate[];
  assignments: Assignment[];
  meals: MealPlanEntry[];
  activeRemoteHouseholdId: string;
  darkMode: boolean;
  canManagePlan: boolean;
  applyRemoteSnapshot: (snapshot: PlannerSnapshot) => void;
  setActiveRemoteHouseholdId: (householdId: string) => void;
  setView: (view: ViewId) => void;
  updateAccountEmail: (email: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [email, setEmail] = useState(accountEmail);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [databaseMessage, setDatabaseMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [remoteHouseholds, setRemoteHouseholds] = useState<RemoteHousehold[]>([]);
  const [remoteMemberships, setRemoteMemberships] = useState<RemoteMembership[]>([]);
  const [accountArea, setAccountArea] = useState<AccountArea>("identity");
  const [pushStatus, setPushStatus] = useState<PushNotificationStatus | null>(null);
  const [pushMessage, setPushMessage] = useState("");
  const [quietStartDraft, setQuietStartDraft] = useState("21:00");
  const [quietEndDraft, setQuietEndDraft] = useState("07:00");
  const [currentAuthEmail, setCurrentAuthEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteShortCode, setInviteShortCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("child");
  const [inviteCode, setInviteCode] = useState("");
  const primaryMember = members.find((member) => member.role === "owner") ?? members[0];
  const isSignedIn = !!currentAuthEmail;
  const displayedEmail = currentAuthEmail || email || accountEmail;

  useEffect(() => {
    setEmail(accountEmail);
  }, [accountEmail]);

  useEffect(() => {
    getCurrentAuthEmail()
      .then((authEmail) => {
        if (authEmail) {
          setCurrentAuthEmail(authEmail);
          setEmail(authEmail);
          updateAccountEmail(authEmail);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!currentAuthEmail) {
      setRemoteHouseholds([]);
      setRemoteMemberships([]);
      return () => {
        mounted = false;
      };
    }

    listRemoteHouseholds()
      .then(async (result) => {
        if (!mounted || !result.ok) return;
        const households = result.data ?? [];
        setRemoteHouseholds(households);
        const storedIsAvailable = households.some((household) => household.id === activeRemoteHouseholdId);
        const nextHouseholdId = storedIsAvailable ? activeRemoteHouseholdId : households[0]?.id || "";
        if (!nextHouseholdId) {
          setRemoteMemberships([]);
          return;
        }
        if (!storedIsAvailable) {
          setActiveRemoteHouseholdId(nextHouseholdId);
        }
        const membershipResult = await listRemoteMemberships(nextHouseholdId);
        if (mounted && membershipResult.ok) {
          setRemoteMemberships(membershipResult.data ?? []);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [currentAuthEmail, activeRemoteHouseholdId]);

  useEffect(() => {
    if (accountArea === "households" && remoteHouseholds.length < 2) {
      setAccountArea("sync");
    }
  }, [accountArea, remoteHouseholds.length]);

  useEffect(() => {
    if (!pushStatus) return;
    setQuietStartDraft(pushStatus.quietHoursStart);
    setQuietEndDraft(pushStatus.quietHoursEnd);
  }, [pushStatus?.quietHoursStart, pushStatus?.quietHoursEnd]);

  async function runAuthAction(action: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true);
    try {
      const result = await action();
      setMessage(result.message);
      if (result.ok && email.trim()) {
        updateAccountEmail(email);
        const authEmail = await getCurrentAuthEmail();
        setCurrentAuthEmail(authEmail);
        if (authEmail) {
          setEmail(authEmail);
          updateAccountEmail(authEmail);
        }
      }
    } catch {
      setMessage("Die Konto-Aktion konnte nicht abgeschlossen werden.");
    } finally {
      setBusy(false);
    }
  }

  async function runSyncAction<T>(action: () => Promise<{ ok: boolean; message: string; data?: T }>, onSuccess?: (data: T | undefined) => void) {
    setBusy(true);
    try {
      const result = await action();
      setMessage(result.message);
      setSyncMessage(result.message);
      if (result.ok) {
        onSuccess?.(result.data);
      }
    } catch {
      setMessage("Die Sync-Aktion konnte nicht abgeschlossen werden.");
      setSyncMessage("Die Sync-Aktion konnte nicht abgeschlossen werden.");
    } finally {
      setBusy(false);
    }
  }

  function loadHouseholds() {
    runSyncAction(listRemoteHouseholds, (items) => {
      const households = items ?? [];
      setRemoteHouseholds(households);
      const nextHouseholdId = activeRemoteHouseholdId || households[0]?.id || "";
      if (nextHouseholdId) {
        setActiveRemoteHouseholdId(nextHouseholdId);
        loadMemberships(nextHouseholdId);
      }
    });
  }

  async function runDatabaseCheck() {
    setBusy(true);
    try {
      const result = await checkDatabaseHealth();
      setDatabaseMessage(result.message);
      setMessage(result.message);
    } catch {
      setDatabaseMessage("Datenbankcheck konnte nicht abgeschlossen werden.");
    } finally {
      setBusy(false);
    }
  }

  function loadMemberships(householdId = activeRemoteHouseholdId) {
    if (!householdId) {
      setMessage("Bitte zuerst einen Supabase-Haushalt waehlen.");
      return;
    }

    runSyncAction(() => listRemoteMemberships(householdId), (items) => setRemoteMemberships(items ?? []));
  }

  function createHousehold() {
    runSyncAction(
      () =>
        createRemoteHousehold({
          name: familyName,
          ownerName: primaryMember?.name || activeMemberName || "Ich",
          ownerShortCode: primaryMember?.shortCode || "IC",
          ownerColor: primaryMember?.color || memberColors[0],
        }),
      (result) => {
        if (!result) return;
        setRemoteHouseholds((items) => [...items.filter((item) => item.id !== result.household.id), result.household]);
        setActiveRemoteHouseholdId(result.household.id);
        setRemoteMemberships([result.membership]);
      },
    );
  }

  function createInvitation() {
    runSyncAction(() =>
      createRemoteInvitation({
        householdId: activeRemoteHouseholdId,
        displayName: inviteName,
        shortCode: inviteShortCode,
        invitedEmail: inviteEmail,
        role: inviteRole,
        color: memberColors[(remoteMemberships.length + 1) % memberColors.length],
      }),
    );
  }

  function acceptInvitation() {
    runSyncAction(() => acceptRemoteInvitation(inviteCode), (membership) => {
      if (membership) {
        setActiveRemoteHouseholdId(membership.household_id);
        setRemoteMemberships((items) => [...items.filter((item) => item.id !== membership.id), membership]);
        loadHouseholds();
      }
    });
  }

  function uploadPlanner() {
    runSyncAction(() =>
      uploadPlannerSnapshot({
        householdId: activeRemoteHouseholdId,
        householdName: familyName,
        members,
        tasks,
        assignments,
        meals,
      }),
    );
  }

  function loadPlanner() {
    runSyncAction(() => downloadPlannerSnapshot(activeRemoteHouseholdId), (snapshot) => {
      if (snapshot) {
        applyRemoteSnapshot(snapshot);
        setView("today");
      }
    });
  }

  async function loadPushStatus() {
    setBusy(true);
    try {
      const result = await getPushNotificationStatus();
      setPushMessage(result.message);
      if (result.data) setPushStatus(result.data);
    } catch {
      setPushMessage("Push-Status konnte nicht geladen werden.");
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    setBusy(true);
    try {
      const result = await registerForPushNotifications();
      setPushMessage(result.message);
      if (result.data) setPushStatus(result.data);
    } catch {
      setPushMessage("Push-Benachrichtigungen konnten nicht aktiviert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const result = await disablePushNotifications();
      setPushMessage(result.message);
      if (result.data) setPushStatus(result.data);
    } catch {
      setPushMessage("Push-Benachrichtigungen konnten nicht deaktiviert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function savePushPreference(patch: PushPreferencePatch) {
    setBusy(true);
    try {
      const result = await updatePushPreferences(patch);
      setPushMessage(result.message);
      if (result.data) setPushStatus(result.data);
    } catch {
      setPushMessage("Push-Einstellungen konnten nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPushTest() {
    setBusy(true);
    try {
      const result = await sendTestPushNotification();
      setPushMessage(result.message);
    } catch {
      setPushMessage("Testbenachrichtigung konnte nicht gesendet werden.");
    } finally {
      setBusy(false);
    }
  }

  function switchHousehold(householdId: string) {
    runSyncAction(() => downloadPlannerSnapshot(householdId), (snapshot) => {
      if (snapshot) {
        setActiveRemoteHouseholdId(householdId);
        loadMemberships(householdId);
        applyRemoteSnapshot(snapshot);
        setView("today");
      }
    });
  }

  function disconnectSync() {
    setActiveRemoteHouseholdId("");
    setRemoteMemberships([]);
    setSyncMessage("Sync getrennt. Lokale Daten bleiben auf diesem Geraet erhalten.");
    setMessage("Sync getrennt. Lokale Daten bleiben auf diesem Geraet erhalten.");
  }

  function confirmDeleteRemoteHousehold() {
    if (!activeRemoteHouseholdId) {
      setMessage("Bitte zuerst einen Supabase-Haushalt waehlen.");
      return;
    }

    Alert.alert(
      "Sync-Haushalt loeschen?",
      "Der aktive Haushalt wird in Supabase inklusive Aufgaben, Zuordnungen, Essen, Einladungen und Mitgliedschaften geloescht. Lokale Daten auf diesem Geraet bleiben erhalten.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Cloud loeschen",
          style: "destructive",
          onPress: () =>
            runSyncAction(() => deleteRemoteHousehold(activeRemoteHouseholdId), () => {
              setRemoteHouseholds((items) => items.filter((item) => item.id !== activeRemoteHouseholdId));
              setRemoteMemberships([]);
              setActiveRemoteHouseholdId("");
            }),
        },
      ],
    );
  }

  function handleSignOut() {
    runAuthAction(async () => {
      const result = await signOut();
      if (result.ok) {
        setCurrentAuthEmail("");
        setActiveRemoteHouseholdId("");
        setRemoteMemberships([]);
      }
      return result;
    });
  }

  function confirmAccountDeletion() {
    Alert.alert(
      "Konto loeschen?",
      "Dein Supabase-Konto und zugehoerige Homely-Cloud-Daten werden geloescht. Lokale Daten auf diesem Geraet bleiben erhalten, bis du sie separat loeschst.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Konto loeschen",
          style: "destructive",
          onPress: () =>
            runAuthAction(async () => {
              const result = await requestAccountDeletion();
              if (result.ok) {
                updateAccountEmail("");
                setCurrentAuthEmail("");
                setEmail("");
                setPassword("");
                setNewPassword("");
                setRemoteHouseholds([]);
                setRemoteMemberships([]);
                setActiveRemoteHouseholdId("");
              }
              return result;
            }),
        },
      ],
    );
  }

  const activeRemoteHousehold = remoteHouseholds.find((household) => household.id === activeRemoteHouseholdId);
  const accountAreaTabs: Array<{ id: AccountArea; label: string }> = [
    { id: "identity", label: "Identitaet" },
    ...(remoteHouseholds.length >= 2 ? [{ id: "households" as AccountArea, label: "Haushalte" }] : []),
    { id: "sync", label: "Cloud" },
    { id: "invites", label: "Einladen" },
    { id: "notifications", label: "Push" },
    { id: "danger", label: "Daten" },
  ];
  const pushControlsDisabled = !isSignedIn || busy || !pushStatus;
  const quietHoursChanged =
    !!pushStatus && (quietStartDraft !== pushStatus.quietHoursStart || quietEndDraft !== pushStatus.quietHoursEnd);

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Konto</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>Konto & Cloud</Text>
      <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
        E-Mail sichert Anmeldung, Passwort-Wiederherstellung und Einladungen. Cloud-Sync bleibt optional.
      </Text>
      <View style={styles.segmentedWrap}>
        {accountAreaTabs.map((item) => {
          const active = accountArea === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentButtonCompact, themed.buttonSurface, active && themed.active]}
              accessibilityRole="button"
              accessibilityLabel={`Kontobereich ${item.label} anzeigen`}
              accessibilityState={{ selected: active }}
              onPress={() => setAccountArea(item.id)}
            >
              <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {accountArea === "identity" && (
        <>
          <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
            <View style={styles.accountStatusRow}>
              <View style={[styles.syncDot, { backgroundColor: isSignedIn ? "#16a34a" : "#64748b" }]} />
              <View style={styles.taskTextBox}>
                <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>{isSignedIn ? "Angemeldet" : "Nicht angemeldet"}</Text>
                <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                  {displayedEmail || "Noch keine E-Mail hinterlegt"}
                </Text>
              </View>
            </View>
          </View>

          {!isSignedIn && (
            <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
              <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Anmelden oder Konto erstellen</Text>
              <TextInput
                style={[styles.input, themed.input, darkMode && styles.inputDark]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="E-Mail-Adresse"
                placeholder="name@example.com"
                placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
              />
              <TextInput
                style={[styles.input, themed.input, darkMode && styles.inputDark]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                accessibilityLabel="Passwort"
                placeholder="Passwort"
                placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
              />
              <View style={styles.editorActions}>
                <TouchableOpacity
                  style={[styles.primaryActionInline, themed.primary, busy && styles.disabledButton]}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Einloggen"
                  accessibilityState={{ disabled: busy }}
                  onPress={() => runAuthAction(() => signInWithEmail(email, password))}
                >
                  <Text style={styles.primaryActionText}>Einloggen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryAction, themed.soft, busy && styles.disabledButton]}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Konto erstellen"
                  accessibilityState={{ disabled: busy }}
                  onPress={() => runAuthAction(() => signUpWithEmail(email, password, activeMemberName))}
                >
                  <Text style={[styles.secondaryActionText, themed.muted]}>Konto erstellen</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.secondaryActionFull, themed.soft, busy && styles.disabledButton]}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="E-Mail lokal merken"
                accessibilityState={{ disabled: busy }}
                onPress={() => updateAccountEmail(email)}
              >
                <Text style={[styles.secondaryActionText, themed.muted]}>Nur lokal merken</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
            <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Passwort & Wiederherstellung</Text>
            <TextInput
              style={[styles.input, themed.input, darkMode && styles.inputDark]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              accessibilityLabel="Neues Passwort"
              placeholder="Neues Passwort"
              placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
            />
            <View style={styles.editorActions}>
              <TouchableOpacity
                style={[styles.secondaryAction, themed.soft, (!isSignedIn || busy) && styles.disabledButton]}
                disabled={!isSignedIn || busy}
                accessibilityRole="button"
                accessibilityLabel="Passwort aendern"
                accessibilityState={{ disabled: !isSignedIn || busy }}
                onPress={() => runAuthAction(() => updatePassword(newPassword))}
              >
                <Text style={[styles.secondaryActionText, themed.muted]}>Passwort aendern</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryAction, themed.soft, busy && styles.disabledButton]}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Passwort neu anfordern"
                accessibilityState={{ disabled: busy }}
                onPress={() => runAuthAction(() => requestPasswordReset(displayedEmail || email))}
              >
                <Text style={[styles.secondaryActionText, themed.muted]}>Neu anfordern</Text>
              </TouchableOpacity>
            </View>
            {isSignedIn && (
              <TouchableOpacity
                style={[styles.deleteButtonWide, busy && styles.disabledButton]}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Abmelden"
                accessibilityState={{ disabled: busy }}
                onPress={handleSignOut}
              >
                <Text style={styles.deleteButtonText}>Abmelden</Text>
              </TouchableOpacity>
            )}
          </View>
          {!!message && (
            <StateMessage darkMode={darkMode} tone={getMessageTone(message)} title="Kontostatus" message={message} />
          )}
        </>
      )}

      {accountArea === "households" && (
        <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Haushalte wechseln</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            Dein Konto ist in {remoteHouseholds.length} Haushalten aktiv. Waehle den Haushalt, mit dem du jetzt arbeiten moechtest.
          </Text>
          {!!activeRemoteHousehold && (
            <View style={[styles.compactInfoBox, darkMode && styles.rowDark, themed.soft]}>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Aktuell geladen</Text>
              <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{activeRemoteHousehold.name}</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.secondaryActionFull, themed.soft, busy && styles.disabledButton]} disabled={busy} onPress={loadHouseholds}>
            <Text style={[styles.secondaryActionText, themed.muted]}>Haushalte aktualisieren</Text>
          </TouchableOpacity>
          {remoteHouseholds.map((household) => {
            const active = activeRemoteHouseholdId === household.id;
            return (
              <View key={household.id} style={[styles.remoteRow, darkMode && styles.rowDark, themed.card, active && themed.borderActive]}>
                <View style={styles.taskTextBox}>
                  <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{household.name}</Text>
                  <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                    {active ? "Aktiver Haushalt" : "Kann geladen und aktiviert werden"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.secondaryAction, themed.soft, (active || busy) && styles.disabledButton]}
                  disabled={active || busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Zu Haushalt ${household.name} wechseln`}
                  accessibilityState={{ disabled: active || busy }}
                  onPress={() => switchHousehold(household.id)}
                >
                  <Text style={[styles.secondaryActionText, themed.muted]}>{active ? "Aktiv" : "Wechseln"}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {!!syncMessage && (
            <StateMessage darkMode={darkMode} tone={getMessageTone(syncMessage)} title="Haushaltswechsel" message={syncMessage} />
          )}
        </View>
      )}

      {accountArea === "invites" && (
        <>
          <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
        <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Einladungen</Text>
        <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
          Erstelle einen Einladungscode fuer eine Person. Die eingeladene Person meldet sich mit eigener E-Mail an und tritt dem Haushalt ueber
          diesen Code bei. SMS bleibt eine spaetere Komfort-Option.
        </Text>
        {!canManagePlan && (
          <Text style={[styles.taskMeta, darkMode && styles.mutedDark]}>Nur Gruender und Verwalter duerfen spaeter Einladungen erstellen.</Text>
        )}
      </View>
        </>
      )}

      {accountArea === "notifications" && (
        <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Push-Benachrichtigungen</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            Aktiviere Push pro Konto und Geraet. Homely erinnert nur nach deiner Zustimmung und respektiert deine Ruhezeiten.
          </Text>
          <View style={[styles.compactInfoBox, darkMode && styles.rowDark, themed.soft]}>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              Berechtigung: {pushStatus?.permissionStatus ?? "unbekannt"}
            </Text>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              Registrierte Geraete: {pushStatus?.activeDeviceCount ?? 0}
            </Text>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              Aufgabenerinnerungen: {pushStatus?.taskRemindersEnabled ? "aktiv" : "aus"}
            </Text>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              Ruhezeit: {pushStatus ? `${pushStatus.quietHoursStart} bis ${pushStatus.quietHoursEnd}` : "noch nicht geladen"}
            </Text>
          </View>
          <View style={styles.editorActions}>
            <TouchableOpacity
              style={[styles.primaryActionInline, themed.primary, (!isSignedIn || busy) && styles.disabledButton]}
              disabled={!isSignedIn || busy}
              accessibilityRole="button"
              accessibilityLabel="Push-Benachrichtigungen aktivieren"
              accessibilityState={{ disabled: !isSignedIn || busy }}
              onPress={enablePush}
            >
              <Text style={styles.primaryActionText}>Aktivieren</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, themed.soft, (!isSignedIn || busy) && styles.disabledButton]}
              disabled={!isSignedIn || busy}
              accessibilityRole="button"
              accessibilityLabel="Push-Status aktualisieren"
              accessibilityState={{ disabled: !isSignedIn || busy }}
              onPress={loadPushStatus}
            >
              <Text style={[styles.secondaryActionText, themed.muted]}>Status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, themed.soft, (!isSignedIn || busy) && styles.disabledButton]}
              disabled={!isSignedIn || busy}
              accessibilityRole="button"
              accessibilityLabel="Testbenachrichtigung senden"
              accessibilityState={{ disabled: !isSignedIn || busy }}
              onPress={sendPushTest}
            >
              <Text style={[styles.secondaryActionText, themed.muted]}>Test senden</Text>
            </TouchableOpacity>
          </View>
          <PushPreferenceToggle
            title="Eigene Aufgaben erinnern"
            detail="Faellige Aufgaben werden nur an die zugeordnete Person gesendet."
            value={!!pushStatus?.taskRemindersEnabled}
            disabled={pushControlsDisabled}
            darkMode={darkMode}
            onPress={() => savePushPreference({ taskRemindersEnabled: !pushStatus?.taskRemindersEnabled })}
          />
          <PushPreferenceToggle
            title="Aenderungen im Haushalt"
            detail="Bereitet Hinweise vor, wenn Zuordnungen oder Planungen dich betreffen."
            value={!!pushStatus?.assignmentUpdatesEnabled}
            disabled={pushControlsDisabled}
            darkMode={darkMode}
            onPress={() => savePushPreference({ assignmentUpdatesEnabled: !pushStatus?.assignmentUpdatesEnabled })}
          />
          <PushPreferenceToggle
            title="Ueberfaellige Aufgaben"
            detail="Laesst spaeter dezente Nachfragen zu, wenn offene Aufgaben liegen bleiben."
            value={!!pushStatus?.overdueRemindersEnabled}
            disabled={pushControlsDisabled}
            darkMode={darkMode}
            onPress={() => savePushPreference({ overdueRemindersEnabled: !pushStatus?.overdueRemindersEnabled })}
          />
          <PushPreferenceToggle
            title="Haushaltsstatus"
            detail="Optional fuer Verwalter: ein kurzer Tagesblick statt vieler Einzelmeldungen."
            value={!!pushStatus?.householdSummaryEnabled}
            disabled={pushControlsDisabled}
            darkMode={darkMode}
            onPress={() => savePushPreference({ householdSummaryEnabled: !pushStatus?.householdSummaryEnabled })}
          />
          <View style={[styles.preferenceRow, darkMode && styles.rowDark, themed.card]}>
            <View style={styles.preferenceText}>
              <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>Ruhezeiten</Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                Erinnerungen in diesem Zeitraum werden auf das Ende der Ruhezeit verschoben.
              </Text>
              <View style={styles.quietTimeRow}>
                <View style={styles.quietTimeField}>
                  <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Von</Text>
                  <TextInput
                    value={quietStartDraft}
                    onChangeText={setQuietStartDraft}
                    placeholder="21:00"
                    placeholderTextColor={darkMode ? "#94a3b8" : "#9a9186"}
                    style={[styles.input, darkMode && styles.inputDark, themed.input]}
                  />
                </View>
                <View style={styles.quietTimeField}>
                  <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Bis</Text>
                  <TextInput
                    value={quietEndDraft}
                    onChangeText={setQuietEndDraft}
                    placeholder="07:00"
                    placeholderTextColor={darkMode ? "#94a3b8" : "#9a9186"}
                    style={[styles.input, darkMode && styles.inputDark, themed.input]}
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                quietHoursChanged && styles.toggleButtonActive,
                (pushControlsDisabled || !quietHoursChanged) && styles.disabledButton,
              ]}
              disabled={pushControlsDisabled || !quietHoursChanged}
              accessibilityRole="button"
              accessibilityLabel="Ruhezeiten speichern"
              accessibilityState={{ disabled: pushControlsDisabled || !quietHoursChanged }}
              onPress={() => savePushPreference({ quietHoursStart: quietStartDraft, quietHoursEnd: quietEndDraft })}
            >
              <Text style={[styles.toggleButtonText, quietHoursChanged && styles.toggleButtonTextActive]}>Speichern</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.deleteButtonWide, (!isSignedIn || busy) && styles.disabledButton]}
            disabled={!isSignedIn || busy}
            accessibilityRole="button"
            accessibilityLabel="Push-Benachrichtigungen deaktivieren"
            accessibilityState={{ disabled: !isSignedIn || busy }}
            onPress={disablePush}
          >
            <Text style={styles.deleteButtonText}>Push deaktivieren</Text>
          </TouchableOpacity>
          {!!pushMessage && (
            <StateMessage darkMode={darkMode} tone={getMessageTone(pushMessage)} title="Push-Status" message={pushMessage} />
          )}
        </View>
      )}

      {accountArea === "sync" && (
        <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
        <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Haushalts-Sync</Text>
        <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
          Lege den aktuellen lokalen Haushalt in Supabase an, lade bestehende Haushalte oder uebertrage lokale Aenderungen in die Homely-Cloud.
        </Text>
        <View style={[styles.compactInfoBox, darkMode && styles.rowDark, themed.soft]}>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
            {getSupabaseStatusLabel()}. Cloud-Aktionen brauchen ein angemeldetes Konto.
          </Text>
          <TouchableOpacity style={[styles.secondaryActionFull, themed.soft, busy && styles.disabledButton]} disabled={busy} onPress={runDatabaseCheck}>
            <Text style={[styles.secondaryActionText, themed.muted]}>Datenbank pruefen</Text>
          </TouchableOpacity>
          {!!databaseMessage && (
            <StateMessage darkMode={darkMode} tone={getMessageTone(databaseMessage)} title="Datenbankstatus" message={databaseMessage} />
          )}
        </View>
        <View style={styles.editorActions}>
          <TouchableOpacity style={[styles.secondaryAction, themed.soft, busy && styles.disabledButton]} disabled={busy} onPress={loadHouseholds}>
            <Text style={[styles.secondaryActionText, themed.muted]}>Haushalte laden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryActionInline, themed.primary, busy && styles.disabledButton]} disabled={busy} onPress={createHousehold}>
            <Text style={styles.primaryActionText}>Sync anlegen</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.editorActions}>
          <TouchableOpacity
            style={[styles.secondaryAction, themed.soft, (!activeRemoteHouseholdId || !canManagePlan || busy) && styles.disabledButton]}
            disabled={!activeRemoteHouseholdId || !canManagePlan || busy}
            onPress={uploadPlanner}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>Plan hochladen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryAction, themed.soft, (!activeRemoteHouseholdId || busy) && styles.disabledButton]}
            disabled={!activeRemoteHouseholdId || busy}
            onPress={loadPlanner}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>Plan laden</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
          Hochladen speichert lokale Mitglieder, Aufgaben, Punkte und Wochenzuordnungen in Supabase. Laden ersetzt die lokale Ansicht durch den
          Supabase-Stand.
        </Text>
        {!!syncMessage && (
          <StateMessage darkMode={darkMode} tone={getMessageTone(syncMessage)} title="Sync-Status" message={syncMessage} />
        )}
        {!!activeRemoteHouseholdId && (
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Aktiver Sync-Haushalt: {activeRemoteHouseholdId}</Text>
        )}
        {remoteHouseholds.map((household) => {
          const active = activeRemoteHouseholdId === household.id;
          return (
            <TouchableOpacity
              key={household.id}
              style={[styles.remoteRow, darkMode && styles.rowDark, themed.card, active && themed.borderActive]}
              onPress={() => {
                setActiveRemoteHouseholdId(household.id);
                loadMemberships(household.id);
              }}
            >
              <View style={styles.taskTextBox}>
                <Text style={[styles.taskTitle, darkMode && styles.textDark]}>{household.name}</Text>
                <Text style={[styles.taskMeta, darkMode && styles.mutedDark]}>{household.id}</Text>
              </View>
              <Text style={[styles.scoreUnits, darkMode && styles.textDark]}>{active ? "Aktiv" : ""}</Text>
            </TouchableOpacity>
          );
        })}
        {!!remoteMemberships.length && (
          <View style={styles.memberPreviewGrid}>
            {remoteMemberships.map((membership) => {
              const member = mapRemoteMembershipToMember(membership);
              return (
                <View key={member.id} style={[styles.memberPreviewChip, darkMode && styles.rowDark]}>
                  <View style={[styles.dot, { backgroundColor: member.color }]} />
                  <Text style={[styles.taskMeta, darkMode && styles.mutedDark]}>{member.name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
      )}

      {accountArea === "danger" && (
        <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
        <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Daten & Loeschung</Text>
        <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
          Sync trennen entfernt nur die Verbindung auf diesem Geraet. Cloud-Haushalt loeschen entfernt den aktiven Supabase-Haushalt serverseitig.
        </Text>
        <View style={styles.editorActions}>
          <TouchableOpacity
            style={[styles.secondaryAction, themed.soft, (!activeRemoteHouseholdId || busy) && styles.disabledButton]}
            disabled={!activeRemoteHouseholdId || busy}
            onPress={disconnectSync}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>Sync trennen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteButtonWide, styles.actionInline, (!activeRemoteHouseholdId || busy) && styles.disabledButton]}
            disabled={!activeRemoteHouseholdId || busy}
            onPress={confirmDeleteRemoteHousehold}
          >
            <Text style={styles.deleteButtonText}>Cloud-Haushalt loeschen</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.deleteButtonWide, busy && styles.disabledButton]} disabled={busy} onPress={confirmAccountDeletion}>
          <Text style={styles.deleteButtonText}>Konto loeschen</Text>
        </TouchableOpacity>
      </View>
      )}

      {accountArea === "invites" && (
        <>
          <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
        <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Einladung erstellen</Text>
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={inviteName}
          onChangeText={setInviteName}
          placeholder="Name der eingeladenen Person"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={inviteShortCode}
          onChangeText={setInviteShortCode}
          placeholder="Kuerzel"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={inviteEmail}
          onChangeText={setInviteEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="E-Mail optional"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        <View style={styles.segmented}>
          {roleOptions.map((role) => {
            const active = inviteRole === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[styles.segmentButton, themed.buttonSurface, active && themed.active]}
                onPress={() => setInviteRole(role.id)}
              >
                <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{role.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.primaryAction, themed.primary, (!canManagePlan || busy) && styles.disabledButton]}
          disabled={!canManagePlan || busy}
          accessibilityRole="button"
          accessibilityLabel="Einladungscode erzeugen"
          accessibilityState={{ disabled: !canManagePlan || busy }}
          onPress={createInvitation}
        >
          <Text style={styles.primaryActionText}>Einladungscode erzeugen</Text>
        </TouchableOpacity>
      </View>

          <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
        <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Einladung annehmen</Text>
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          placeholder="Einladungscode"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        <TouchableOpacity style={[styles.primaryAction, themed.primary, busy && styles.disabledButton]} disabled={busy} onPress={acceptInvitation}>
          <Text style={styles.primaryActionText}>Beitreten</Text>
        </TouchableOpacity>
      </View>
        </>
      )}
    </View>
  );
}

function AppearanceSettings({
  darkMode,
  designSetId,
  toggleDarkMode,
  setDesignSetId,
}: {
  darkMode: boolean;
  designSetId: DesignSetId;
  toggleDarkMode: () => void;
  setDesignSetId: (id: DesignSetId) => void;
}) {
  const themed = useThemeStyles(darkMode);
  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Darstellung</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>Design & Modus</Text>
      <TouchableOpacity
        style={[styles.primaryAction, themed.primary]}
        accessibilityRole="button"
        accessibilityLabel={darkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
        onPress={toggleDarkMode}
      >
        <Text style={styles.primaryActionText}>{darkMode ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}</Text>
      </TouchableOpacity>
      {designSets.map((set) => {
        const active = designSetId === set.id;
        return (
          <TouchableOpacity
            key={set.id}
            style={[styles.designSetRow, darkMode && styles.rowDark, themed.card, active && { borderColor: set.primary, borderWidth: 2 }]}
            accessibilityRole="button"
            accessibilityLabel={`Designset ${set.label}`}
            accessibilityState={{ selected: active }}
            onPress={() => setDesignSetId(set.id)}
          >
            <View style={[styles.designSwatch, { backgroundColor: set.primary }]} />
            <View style={styles.taskTextBox}>
              <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{set.label}</Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{set.description}</Text>
            </View>
            <Text style={[styles.scoreUnits, active && { color: set.primary }, darkMode && styles.textDark]}>{active ? "Aktiv" : ""}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReadinessSettings({ darkMode }: { darkMode: boolean }) {
  const themed = useThemeStyles(darkMode);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
  const okCount = syncTestItems.filter((item) => testStatuses[item.id] === "ok").length;
  const issueCount = syncTestItems.filter((item) => testStatuses[item.id] === "issue").length;

  function toggleTestStatus(id: string) {
    setTestStatuses((items) => ({ ...items, [id]: nextTestStatus(items[id] ?? "open") }));
  }

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>App-Framework</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>Play-Store-Reifecheck</Text>
      {readinessItems.map((item) => (
        <View key={item.title} style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.taskTitle, styles.taskTextBox, themed.text, darkMode && styles.textDark]}>{item.title}</Text>
            <Text style={[styles.readinessBadge, themed.muted, darkMode && styles.textDark]}>{item.status}</Text>
          </View>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{item.detail}</Text>
        </View>
      ))}

      <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
        <View style={styles.scoreHeader}>
          <Text style={[styles.taskTitle, styles.taskTextBox, themed.text, darkMode && styles.textDark]}>Sync-Testlauf</Text>
          <Text style={[styles.readinessBadge, themed.muted, darkMode && styles.textDark]}>
            {okCount}/{syncTestItems.length} OK
          </Text>
        </View>
        <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
          {issueCount ? `${issueCount} Punkt(e) mit Problem` : "Bereit fuer den gemeinsamen Testlauf"}
        </Text>
      </View>

      {syncTestItems.map((item) => {
        const status = testStatuses[item.id] ?? "open";
        const statusStyle =
          status === "ok"
            ? { borderColor: "#16a34a", backgroundColor: darkMode ? "#14532d" : "#dcfce7" }
            : status === "issue"
              ? { borderColor: "#dc2626", backgroundColor: darkMode ? "#7f1d1d" : "#fee2e2" }
              : {};
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.settingsCard, darkMode && styles.rowDark, themed.card, statusStyle]}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}: ${testStatusLabel(status)}`}
            accessibilityHint="Tippen, um den Teststatus zu wechseln"
            onPress={() => toggleTestStatus(item.id)}
          >
            <View style={styles.scoreHeader}>
              <Text style={[styles.taskTitle, styles.taskTextBox, themed.text, darkMode && styles.textDark]}>{item.title}</Text>
              <Text style={[styles.readinessBadge, themed.muted, darkMode && styles.textDark]}>{testStatusLabel(status)}</Text>
            </View>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{item.detail}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.sectionTitle, styles.spacedTitle, themed.text, darkMode && styles.textDark]}>Release-Gates</Text>
      {releaseGateItems.map((item) => (
        <View key={item.title} style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{item.title}</Text>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}
