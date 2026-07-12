import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { days, roleLabel } from "../constants/planner";
import { seedData } from "../data/seedData";
import { styles } from "../styles/plannerStyles";
import { useThemeColors } from "../theme/themeContext";
import { DayName, Member, getDateForWeekDay } from "../utils/planner";
import { MemberButton } from "./MemberButton";

export function Hero({
  completion,
  familyName,
  selectedWeek,
  selectedDay,
  setSelectedDay,
  selectedMemberId,
  setSelectedMemberId,
  activeMemberId,
  setActiveMemberId,
  founderMemberId,
  canManagePlan,
  members,
  syncStatus,
  refreshRemoteSnapshot,
  darkMode,
}: {
  completion: number;
  familyName: string;
  selectedWeek: number;
  selectedDay: DayName;
  setSelectedDay: (day: DayName) => void;
  selectedMemberId: string;
  setSelectedMemberId: (memberId: string) => void;
  activeMemberId: string;
  setActiveMemberId: (memberId: string) => void;
  founderMemberId: string;
  canManagePlan: boolean;
  members: Member[];
  syncStatus: { state: "local" | "syncing" | "synced" | "error"; message: string };
  refreshRemoteSnapshot: () => void;
  darkMode: boolean;
}) {
  const activeMemberIsFounder = activeMemberId === founderMemberId;
  const theme = useThemeColors();
  const palette = darkMode ? theme.dark : theme;
  const panelTheme = { backgroundColor: palette.paper, borderColor: palette.border };
  const inactivePillTheme = { backgroundColor: palette.paper, borderColor: palette.border };
  const activePillTheme = { backgroundColor: palette.primary, borderColor: palette.primary };
  const softTheme = { backgroundColor: palette.soft };
  const syncTone =
    syncStatus.state === "error"
      ? { backgroundColor: "#fee2e2", borderColor: "#ef4444", color: "#991b1b" }
      : syncStatus.state === "syncing"
        ? { backgroundColor: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" }
        : syncStatus.state === "synced"
          ? { backgroundColor: palette.soft, borderColor: palette.primary, color: palette.primary }
          : { backgroundColor: palette.paper, borderColor: palette.border, color: palette.muted };
  const syncNotice =
    syncStatus.state === "error"
      ? {
          title: "Cloud-Sync pruefen",
          copy: "Lokale Aenderungen bleiben erhalten. Tippe auf Aktualisieren oder pruefe den Cloud-Bereich unter Mehr.",
        }
      : syncStatus.state === "syncing"
        ? {
            title: "Cloud wird abgeglichen",
            copy: "Homely speichert oder laedt gerade Daten. Du kannst lokal weiterarbeiten.",
          }
        : null;

  return (
    <View style={[styles.panel, darkMode && styles.panelDark, panelTheme]}>
      <Text style={[styles.eyebrow, { color: palette.muted }]}>{familyName}</Text>
      <Text style={[styles.heroTitle, { color: palette.ink }]}>
        KW {selectedWeek}: {selectedDay}
      </Text>
      <Text style={[styles.heroText, { color: palette.muted }]}>Aufgaben, Essen und Fairness fuer deinen Haushalt an einem Ort.</Text>
      <TouchableOpacity
        style={[styles.syncPill, darkMode && styles.rowDark, { backgroundColor: syncTone.backgroundColor, borderColor: syncTone.borderColor }]}
        disabled={syncStatus.state === "syncing"}
        accessibilityRole="button"
        accessibilityLabel={`Sync-Status: ${syncStatus.message}`}
        accessibilityHint="Tippen, um Cloud-Daten zu aktualisieren"
        accessibilityState={{ disabled: syncStatus.state === "syncing" }}
        onPress={refreshRemoteSnapshot}
      >
        <View
          style={[
            styles.syncDot,
            {
              backgroundColor:
                syncStatus.state === "error"
                  ? "#ef4444"
                  : syncStatus.state === "syncing"
                    ? "#f59e0b"
                    : syncStatus.state === "synced"
                      ? palette.primary
                      : palette.muted,
            },
          ]}
        />
        <Text style={[styles.syncText, { color: syncTone.color }]}>{syncStatus.message}</Text>
        {syncStatus.state !== "syncing" && (
          <Text style={[styles.syncText, { color: syncTone.color }]}>Aktualisieren</Text>
        )}
      </TouchableOpacity>
      {syncNotice && (
        <View style={[styles.statusNotice, { backgroundColor: syncTone.backgroundColor, borderColor: syncTone.borderColor }]}>
          <Text style={[styles.taskTitle, { color: syncTone.color }]}>{syncNotice.title}</Text>
          <Text style={[styles.taskMeta, { color: syncTone.color }]}>{syncNotice.copy}</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
        {days.map((day) => {
          const active = selectedDay === day;
          const date = getDateForWeekDay(seedData.family.year, selectedWeek, day);
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayButton, inactivePillTheme, active && activePillTheme]}
              accessibilityRole="button"
              accessibilityLabel={`${day} anzeigen`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayButtonText, { color: palette.muted }, active && styles.dayButtonTextActive]}>{day.slice(0, 2)}</Text>
              <Text style={[styles.dayDate, { color: palette.ink }, active && styles.dayButtonTextActive]}>
                {date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
        <MemberButton active={selectedMemberId === "all"} label="Alle" darkMode={darkMode} onPress={() => setSelectedMemberId("all")} />
        {members.map((member) => (
          <MemberButton
            key={member.id}
            active={selectedMemberId === member.id}
            label={member.name}
            color={member.color}
            darkMode={darkMode}
            onPress={() => setSelectedMemberId(member.id)}
          />
        ))}
      </ScrollView>
      <Text style={[styles.taskMeta, { color: palette.muted }]}>Du bist gerade</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
        {members.map((member) => {
          const switchAllowed = activeMemberIsFounder || member.id === founderMemberId || member.id === activeMemberId;
          return (
            <MemberButton
              key={member.id}
              active={activeMemberId === member.id}
              label={`${member.name} · ${roleLabel(member.role)}`}
              color={member.color}
              darkMode={darkMode}
              disabled={!switchAllowed}
              onPress={() => switchAllowed && setActiveMemberId(member.id)}
            />
          );
        })}
      </ScrollView>
      {!activeMemberIsFounder && (
        <Text style={[styles.taskMeta, { color: palette.muted }]}>
          Mitgliederwechsel ist in dieser lokalen Version nur in der Gruenderansicht offen.
        </Text>
      )}
      <View style={[styles.progressBox, darkMode && styles.progressBoxDark, softTheme]}>
        <Text style={[styles.progressNumber, { color: palette.ink }]}>{completion}%</Text>
        <Text style={[styles.muted, { color: palette.muted }]}>
          {canManagePlan ? "sichtbare Aufgaben erledigt" : "Mitgliedsansicht: Verwaltung gesperrt"}
        </Text>
      </View>
    </View>
  );
}
