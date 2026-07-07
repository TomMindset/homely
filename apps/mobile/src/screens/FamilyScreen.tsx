import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { memberColors, roleLabel, roleOptions } from "../constants/planner";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Member } from "../utils/planner";

export function FamilyScreen({
  familyName,
  members,
  darkMode,
  canManagePlan,
  updateFamilyName,
  addMember,
  updateMember,
  deleteMember,
  resetLocalData,
}: {
  familyName: string;
  members: Member[];
  darkMode: boolean;
  canManagePlan: boolean;
  updateFamilyName: (name: string) => void;
  addMember: (name: string, shortCode: string, role: string, color: string) => void;
  updateMember: (memberId: string, patch: Partial<Member>) => void;
  deleteMember: (memberId: string) => void;
  resetLocalData: () => void;
}) {
  const [familyNameDraft, setFamilyNameDraft] = useState(familyName);
  const [newName, setNewName] = useState("");
  const [newShortCode, setNewShortCode] = useState("");
  const [newRole, setNewRole] = useState("child");
  const [newColor, setNewColor] = useState(memberColors[0]);
  const themed = useThemeStyles(darkMode);

  function submitMember() {
    addMember(newName, newShortCode, newRole, newColor);
    setNewName("");
    setNewShortCode("");
    setNewRole("child");
    setNewColor(memberColors[0]);
  }

  function confirmResetLocalData() {
    Alert.alert("Lokale Daten loeschen?", "Homely setzt Haushaltsname, Personen, Aufgaben, Essensplan, Erledigungen und Einstellungen zurueck.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Loeschen", style: "destructive", onPress: resetLocalData },
    ]);
  }

  useEffect(() => {
    setFamilyNameDraft(familyName);
  }, [familyName]);

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Haushalt</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>Haushaltsbereich</Text>
      {!canManagePlan && <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>Nur Gruender und Verwalter koennen den Haushaltsbereich verwalten.</Text>}
      <TextInput
        style={[styles.input, themed.input, darkMode && styles.inputDark]}
        value={familyNameDraft}
        onChangeText={setFamilyNameDraft}
        editable={canManagePlan}
        accessibilityLabel="Haushaltsname"
        placeholder="Haushaltsname"
        placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
      />
      <TouchableOpacity
        style={[styles.primaryAction, themed.primary, !canManagePlan && styles.disabledButton]}
        disabled={!canManagePlan}
        accessibilityRole="button"
        accessibilityLabel="Haushaltsname speichern"
        accessibilityState={{ disabled: !canManagePlan }}
        onPress={() => updateFamilyName(familyNameDraft.trim() || familyName)}
      >
        <Text style={[styles.primaryActionText, !canManagePlan && styles.disabledText]}>Haushaltsname speichern</Text>
      </TouchableOpacity>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>Personen verwalten</Text>
      {canManagePlan && (
        <>
          <TextInput
            style={[styles.input, themed.input, darkMode && styles.inputDark]}
            value={newName}
            onChangeText={setNewName}
            accessibilityLabel="Name der neuen Person"
            placeholder="Name"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
          <TextInput
            style={[styles.input, themed.input, darkMode && styles.inputDark]}
            value={newShortCode}
            onChangeText={setNewShortCode}
            accessibilityLabel="Kuerzel der neuen Person"
            placeholder="Kuerzel"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
          <View style={styles.segmented}>
            {roleOptions.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[styles.segmentButton, themed.buttonSurface, newRole === role.id && themed.active]}
                accessibilityRole="button"
                accessibilityLabel={`Rolle ${role.label} fuer neue Person`}
                accessibilityState={{ selected: newRole === role.id }}
                onPress={() => setNewRole(role.id)}
              >
                <Text style={[styles.segmentButtonText, themed.muted, newRole === role.id && styles.segmentButtonTextActive]}>{role.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.swatches}>
            {memberColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.swatch, { backgroundColor: color }, newColor === color && styles.swatchActive]}
                accessibilityRole="button"
                accessibilityLabel={`Farbe ${color} fuer neue Person`}
                accessibilityState={{ selected: newColor === color }}
                onPress={() => setNewColor(color)}
              />
            ))}
          </View>
          <TouchableOpacity style={[styles.primaryAction, themed.primary]} accessibilityRole="button" accessibilityLabel="Person hinzufuegen" onPress={submitMember}>
            <Text style={styles.primaryActionText}>Person hinzufuegen</Text>
          </TouchableOpacity>
        </>
      )}
      {members.map((member) => (
        <MemberEditor
          key={member.id}
          member={member}
          darkMode={darkMode}
          canDelete={members.length > 1}
          canManagePlan={canManagePlan}
          updateMember={updateMember}
          deleteMember={deleteMember}
        />
      ))}
      <View style={[styles.privacyBox, darkMode && styles.rowDark, themed.card]}>
        <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Datenschutz</Text>
        <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
          Homely speichert Haushaltsname, Personen, Aufgaben, Essensplan, Erledigungen und Erinnerungen lokal auf diesem Geraet. Wenn du
          Supabase-Sync aktivierst, werden diese Daten zusaetzlich in deinem Homely-Cloud-Haushalt gespeichert.
        </Text>
        <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
          Es sind keine Werbung, kein Tracking, keine Analytics und keine In-App-Kaeufe fuer Version 1 vorgesehen.
        </Text>
        {canManagePlan && (
          <TouchableOpacity style={styles.deleteButtonWide} accessibilityRole="button" accessibilityLabel="Lokale Homely-Daten loeschen" onPress={confirmResetLocalData}>
            <Text style={styles.deleteButtonText}>Lokale Daten loeschen</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MemberEditor({
  member,
  darkMode,
  canDelete,
  canManagePlan,
  updateMember,
  deleteMember,
}: {
  member: Member;
  darkMode: boolean;
  canDelete: boolean;
  canManagePlan: boolean;
  updateMember: (memberId: string, patch: Partial<Member>) => void;
  deleteMember: (memberId: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [shortCode, setShortCode] = useState(member.shortCode);
  const [role, setRole] = useState(member.role);
  const [color, setColor] = useState(member.color);

  useEffect(() => {
    if (!editing) {
      setName(member.name);
      setShortCode(member.shortCode);
      setRole(member.role);
      setColor(member.color);
    }
  }, [editing, member.color, member.name, member.role, member.shortCode]);

  function save() {
    updateMember(member.id, {
      name: name.trim() || member.name,
      shortCode: (shortCode.trim() || member.shortCode).slice(0, 2).toUpperCase(),
      role,
      color,
    });
    setEditing(false);
  }

  function confirmDelete() {
    Alert.alert("Person loeschen?", `"${member.name}" wird entfernt. Bestehende Aufgaben werden einer anderen Person zugeordnet.`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Loeschen", style: "destructive", onPress: () => deleteMember(member.id) },
    ]);
  }

  if (!editing) {
    return (
      <View style={[styles.memberEditorRow, darkMode && styles.rowDark, themed.card]}>
        <View style={styles.memberSummary}>
          <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
            <Text style={styles.memberAvatarText}>{member.shortCode}</Text>
          </View>
          <View style={styles.taskTextBox}>
            <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{member.name}</Text>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{roleLabel(member.role)}</Text>
          </View>
        </View>
        {canManagePlan && (
          <View style={styles.memberActions}>
            <TouchableOpacity style={[styles.editButton, { borderColor: themed.theme.primary }]} accessibilityRole="button" accessibilityLabel={`${member.name} bearbeiten`} onPress={() => setEditing(true)}>
              <Text style={[styles.editButtonText, { color: themed.theme.primary }]}>Bearbeiten</Text>
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`${member.name} loeschen`} onPress={confirmDelete}>
                <Text style={styles.deleteButtonText}>Loeschen</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.memberEditorRow, styles.editorRow, darkMode && styles.rowDark, themed.card]}>
      <TextInput
        style={[styles.input, themed.input, darkMode && styles.inputDark]}
        value={name}
        onChangeText={setName}
        accessibilityLabel="Name der Person"
        placeholder="Name"
        placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
      />
      <TextInput
        style={[styles.input, themed.input, darkMode && styles.inputDark]}
        value={shortCode}
        onChangeText={setShortCode}
        accessibilityLabel="Kuerzel der Person"
        placeholder="Kuerzel"
        placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
      />
      <View style={styles.segmented}>
        {roleOptions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.segmentButton, themed.buttonSurface, role === item.id && themed.active]}
            accessibilityRole="button"
            accessibilityLabel={`Rolle ${item.label}`}
            accessibilityState={{ selected: role === item.id }}
            onPress={() => setRole(item.id)}
          >
            <Text style={[styles.segmentButtonText, themed.muted, role === item.id && styles.segmentButtonTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.swatches}>
        {memberColors.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.swatch, { backgroundColor: item }, color === item && styles.swatchActive]}
            accessibilityRole="button"
            accessibilityLabel={`Farbe ${item}`}
            accessibilityState={{ selected: color === item }}
            onPress={() => setColor(item)}
          />
        ))}
      </View>
      <View style={styles.editorActions}>
        <TouchableOpacity style={[styles.secondaryAction, themed.soft]} accessibilityRole="button" accessibilityLabel="Bearbeitung abbrechen" onPress={() => setEditing(false)}>
          <Text style={[styles.secondaryActionText, themed.muted]}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryActionInline, themed.primary]} accessibilityRole="button" accessibilityLabel="Person speichern" onPress={save}>
          <Text style={styles.primaryActionText}>Speichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
