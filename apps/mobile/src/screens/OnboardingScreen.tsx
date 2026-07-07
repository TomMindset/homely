import React, { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { memberColors, roleLabel, roleOptions } from "../constants/planner";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";

export type OnboardingMemberInput = {
  name: string;
  role: string;
};

const manageableRoles = roleOptions.filter((role) => role.id !== "owner");

export function OnboardingScreen({
  householdName,
  darkMode,
  completeOnboarding,
  openSettingsAfterOnboarding,
}: {
  householdName: string;
  darkMode: boolean;
  completeOnboarding: (name: string, members: OnboardingMemberInput[]) => void;
  openSettingsAfterOnboarding: () => void;
}) {
  const [setupMode, setSetupMode] = useState<"create" | "join">("create");
  const [draftName, setDraftName] = useState(householdName);
  const [founderName, setFounderName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("child");
  const [members, setMembers] = useState<OnboardingMemberInput[]>([]);
  const themed = useThemeStyles(darkMode);

  function addHouseholdMember() {
    if (!memberName.trim()) return;
    setMembers((items) => [...items, { name: memberName.trim(), role: memberRole }]);
    setMemberName("");
    setMemberRole("child");
  }

  function removeHouseholdMember(index: number) {
    setMembers((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function finish() {
    if (!founderName.trim()) {
      Alert.alert("Dein Name fehlt", "Bitte gib zuerst deinen eigenen Vornamen ein. Du wirst als Gruender angelegt.");
      return;
    }

    const onboardingMembers = setupMode === "join" ? [{ name: founderName.trim(), role: "owner" }] : [{ name: founderName.trim(), role: "owner" }, ...members];
    completeOnboarding(draftName.trim() || "Mein Haushalt", onboardingMembers);
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
