import React, { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { memberColors, roleLabel, roleOptions } from "../constants/planner";
import {
  defaultTaskPackageIds,
  getTaskPackageSelectionStats,
  getTaskPackageStats,
  taskPackages,
  type TaskPackageId,
} from "../data/taskPackages";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";

export type OnboardingMemberInput = {
  name: string;
  role: string;
};

const manageableRoles = roleOptions.filter((role) => role.id !== "owner");
const householdProfiles: Array<{
  id: string;
  title: string;
  detail: string;
  packageIds: TaskPackageId[];
}> = [
  {
    id: "family",
    title: "Familie",
    detail: "Kinder, Erwachsene und wiederkehrender Alltag.",
    packageIds: ["basis", "family", "meal_week"],
  },
  {
    id: "shared_home",
    title: "WG",
    detail: "Gemeinsame Flaechen, klare Dienste, wenig Diskussion.",
    packageIds: ["basis", "shared_home"],
  },
  {
    id: "couple",
    title: "Paar",
    detail: "Schlanker Plan fuer zwei Personen.",
    packageIds: ["basis", "meal_week"],
  },
  {
    id: "house",
    title: "Haus",
    detail: "Mehr Flaeche, Garten oder saisonale Extras.",
    packageIds: ["basis", "cleaning", "seasonal"],
  },
];

export function OnboardingScreen({
  householdName,
  darkMode,
  completeOnboarding,
  openSettingsAfterOnboarding,
}: {
  householdName: string;
  darkMode: boolean;
  completeOnboarding: (name: string, members: OnboardingMemberInput[], taskPackageIds: TaskPackageId[]) => void;
  openSettingsAfterOnboarding: () => void;
}) {
  const [setupMode, setSetupMode] = useState<"create" | "join">("create");
  const [draftName, setDraftName] = useState(householdName);
  const [founderName, setFounderName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("child");
  const [members, setMembers] = useState<OnboardingMemberInput[]>([]);
  const [householdProfileId, setHouseholdProfileId] = useState("family");
  const [selectedTaskPackageIds, setSelectedTaskPackageIds] = useState<TaskPackageId[]>(defaultTaskPackageIds);
  const themed = useThemeStyles(darkMode);
  const selectedTaskStats = getTaskPackageSelectionStats(selectedTaskPackageIds);
  const selectedPackageTitles = taskPackages
    .filter((taskPackage) => selectedTaskPackageIds.includes(taskPackage.id))
    .map((taskPackage) => taskPackage.shortTitle)
    .join(", ");

  function addHouseholdMember() {
    if (!memberName.trim()) return;
    setMembers((items) => [...items, { name: memberName.trim(), role: memberRole }]);
    setMemberName("");
    setMemberRole("child");
  }

  function removeHouseholdMember(index: number) {
    setMembers((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function toggleTaskPackage(packageId: TaskPackageId) {
    setSelectedTaskPackageIds((items) => (items.includes(packageId) ? items.filter((item) => item !== packageId) : [...items, packageId]));
  }

  function selectHouseholdProfile(profileId: string, packageIds: TaskPackageId[]) {
    setHouseholdProfileId(profileId);
    setSelectedTaskPackageIds(packageIds);
  }

  function finish() {
    if (!founderName.trim()) {
      Alert.alert("Dein Name fehlt", "Bitte gib zuerst deinen eigenen Vornamen ein. Du wirst als Gruender angelegt.");
      return;
    }
    if (setupMode === "create" && selectedTaskPackageIds.length === 0) {
      Alert.alert("Aufgabenpaket fehlt", "Bitte waehle mindestens ein Musteraufgabenpaket. Du kannst spaeter Aufgaben entfernen oder ergaenzen.");
      return;
    }

    const onboardingMembers = setupMode === "join" ? [{ name: founderName.trim(), role: "owner" }] : [{ name: founderName.trim(), role: "owner" }, ...members];
    completeOnboarding(draftName.trim() || "Mein Haushalt", onboardingMembers, setupMode === "create" ? selectedTaskPackageIds : defaultTaskPackageIds);
    if (setupMode === "join") {
      openSettingsAfterOnboarding();
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.onboardingContent}>
      <View style={[styles.onboardingPanel, darkMode && styles.panelDark, themed.section]}>
        <Text style={[styles.eyebrow, themed.muted]}>Einrichtung</Text>
        <Text style={[styles.onboardingTitle, themed.text, darkMode && styles.textDark]}>Haushalt einrichten</Text>
        <Text style={[styles.heroText, themed.muted, darkMode && styles.mutedDark]}>
          Homely funktioniert fuer Familien, Wohngemeinschaften und andere Haushalte. Du bist zuerst der Gruender und kannst weitere Personen
          hinzufuegen.
        </Text>
        <View style={styles.onboardingProgressRow}>
          {[
            { title: "1", detail: "Haushalt" },
            { title: "2", detail: "Personen" },
            { title: "3", detail: "Startplan" },
          ].map((step) => (
            <View key={step.title} style={[styles.onboardingStepPill, themed.soft]}>
              <Text style={[styles.readinessBadge, themed.muted]}>{step.title}</Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{step.detail}</Text>
            </View>
          ))}
        </View>
        <View style={styles.setupChoiceRow}>
          {[
            { id: "create", title: "Neu starten", text: "Haushalt lokal anlegen und spaeter optional synchronisieren." },
            { id: "join", title: "Einladung", text: "Erst dich selbst anlegen, danach unter Konto per Code beitreten." },
          ].map((item) => {
            const active = setupMode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.setupChoiceCard, themed.card, active && themed.active]}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityState={{ selected: active }}
                onPress={() => setSetupMode(item.id as "create" | "join")}
              >
                <Text style={[styles.taskTitle, themed.text, active && styles.segmentButtonTextActive]}>{item.title}</Text>
                <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{item.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {setupMode === "create" && (
          <>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Was passt am besten?</Text>
            <View style={styles.profileGrid}>
              {householdProfiles.map((profile) => {
                const active = householdProfileId === profile.id;
                return (
                  <TouchableOpacity
                    key={profile.id}
                    style={[styles.profileCard, themed.card, active && themed.active]}
                    accessibilityRole="button"
                    accessibilityLabel={`Startprofil ${profile.title}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => selectHouseholdProfile(profile.id, profile.packageIds)}
                  >
                    <Text style={[styles.taskTitle, themed.text, active && styles.segmentButtonTextActive]}>{profile.title}</Text>
                    <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{profile.detail}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={draftName}
          onChangeText={setDraftName}
          accessibilityLabel="Name des Haushalts"
          placeholder="z. B. Familie Sonnental oder WG Kueche"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={founderName}
          onChangeText={setFounderName}
          accessibilityLabel="Dein Vorname"
          placeholder="Dein Vorname"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        {setupMode === "create" ? (
          <>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Weitere Haushaltsmitglieder</Text>
            <TextInput
              style={[styles.input, themed.input, darkMode && styles.inputDark]}
              value={memberName}
              onChangeText={setMemberName}
              accessibilityLabel="Name eines weiteren Haushaltsmitglieds"
              placeholder="Vorname oder Anzeigename"
              placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
            />
            <View style={styles.segmented}>
              {manageableRoles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.segmentButton, themed.buttonSurface, memberRole === role.id && themed.active]}
                  accessibilityRole="button"
                  accessibilityLabel={`Rolle ${role.label}`}
                  accessibilityState={{ selected: memberRole === role.id }}
                  onPress={() => setMemberRole(role.id)}
                >
                  <Text style={[styles.segmentButtonText, themed.muted, memberRole === role.id && styles.segmentButtonTextActive]}>{role.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.secondaryActionFull, themed.soft]} accessibilityRole="button" accessibilityLabel="Person hinzufuegen" onPress={addHouseholdMember}>
              <Text style={[styles.secondaryActionText, themed.muted]}>Person hinzufuegen</Text>
            </TouchableOpacity>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Musteraufgabenpakete</Text>
            <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
              Starte mit passenden Vorlagen. Homely aktiviert nur die ausgewaehlten Aufgaben; alles laesst sich spaeter bearbeiten.
            </Text>
            <View style={[styles.startPlanPreview, themed.soft]}>
              <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>Startplan-Vorschau</Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                {selectedTaskStats.taskCount} Aufgaben - {selectedTaskStats.totalUnits} Punkte pro Woche als erste Maske
              </Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                Aktiv: {selectedPackageTitles || "noch nichts ausgewaehlt"}
              </Text>
            </View>
            <View style={styles.packageGrid}>
              {taskPackages.map((taskPackage) => {
                const active = selectedTaskPackageIds.includes(taskPackage.id);
                const stats = getTaskPackageStats(taskPackage);
                return (
                  <TouchableOpacity
                    key={taskPackage.id}
                    style={[styles.packageCard, themed.card, active && themed.active]}
                    accessibilityRole="button"
                    accessibilityLabel={`Aufgabenpaket ${taskPackage.title}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => toggleTaskPackage(taskPackage.id)}
                  >
                    <View style={styles.packageTitleRow}>
                      <Text style={[styles.taskTitle, themed.text, active && styles.segmentButtonTextActive]}>{taskPackage.shortTitle}</Text>
                      <Text style={[styles.readinessBadge, themed.muted, active && styles.segmentButtonTextActive]}>{stats.taskCount} Aufgaben</Text>
                    </View>
                    <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{taskPackage.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <View style={[styles.compactInfoBox, themed.soft]}>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              Nach dem Start oeffnet Homely den Kontobereich. Dort meldest du dich an und nimmst die Einladung mit dem Code an.
            </Text>
          </View>
        )}
        <View style={styles.onboardingList}>
          {[{ name: founderName || "Du", role: "owner" }, ...(setupMode === "create" ? members : [])].map((member, index) => (
            <View key={`${member.name}-${index}`} style={[styles.onboardingMember, darkMode && styles.rowDark, themed.card]}>
              <View style={[styles.dot, { backgroundColor: memberColors[index % memberColors.length] }]} />
              <Text style={[styles.scoreName, themed.text, darkMode && styles.textDark]}>{member.name}</Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{roleLabel(member.role)}</Text>
              {index > 0 && (
                <TouchableOpacity style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`${member.name} entfernen`} onPress={() => removeHouseholdMember(index - 1)}>
                  <Text style={styles.deleteButtonText}>Entfernen</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.primaryAction, themed.primary]} accessibilityRole="button" accessibilityLabel="Haushalt starten" onPress={finish}>
          <Text style={styles.primaryActionText}>{setupMode === "join" ? "Zum Konto weiter" : "Haushalt starten"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
