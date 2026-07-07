import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { days, formatUnits } from "../constants/planner";
import { seedData } from "../data/seedData";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, Member, TaskTemplate, getTaskById, getWeekAssignments } from "../utils/planner";

type WeekSummary = {
  total: number;
  done: number;
  open: number;
  units: number;
  recurring: number;
};

type WeekPreview = WeekSummary & {
  week: number;
};

export function WeekScreen({
  assignments,
  tasks,
  members,
  darkMode,
  selectedWeek,
  activeMemberId,
}: {
  assignments: Assignment[];
  tasks: TaskTemplate[];
  members: Member[];
  darkMode: boolean;
  selectedWeek: number;
  activeMemberId: string;
}) {
  const [mode, setMode] = useState<"mine" | "all" | "days">("mine");
  const activeMember = members.find((member) => member.id === activeMemberId);
  const validAssignments = assignments
    .filter((assignment) => members.some((member) => member.id === assignment.memberId))
    .filter((assignment) => getTaskById(tasks, assignment.taskId));
  const weekAssignments = getWeekAssignments(validAssignments, seedData.family.year, selectedWeek);
  const ownWeekAssignments = weekAssignments.filter(
    (assignment) => assignment.memberId === activeMemberId || assignment.completedByMemberId === activeMemberId,
  );
  const listedAssignments = mode === "mine" ? ownWeekAssignments : weekAssignments;
  const upcomingWeeks = seedData.family.availableWeeks
    .filter((week) => week >= selectedWeek)
    .slice(0, 8)
    .map((week) => {
      const weekItems = getWeekAssignments(validAssignments, seedData.family.year, week);
      const visibleWeekItems =
        mode === "mine"
          ? weekItems.filter((assignment) => assignment.memberId === activeMemberId || assignment.completedByMemberId === activeMemberId)
          : weekItems;
      return { week, ...summarizeAssignments(visibleWeekItems, tasks) };
    });
  const modeSummary = summarizeAssignments(listedAssignments, tasks);
  const themed = useThemeStyles(darkMode);

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Wochenplan</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>KW {selectedWeek} im Blick</Text>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{modeSummary.total}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Aufgaben</Text>
        </View>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{modeSummary.open}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Offen</Text>
        </View>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{formatUnits(modeSummary.units)}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Punkte</Text>
        </View>
      </View>

      <Text style={[styles.dayHeading, styles.spacedTitle, themed.text, darkMode && styles.textDark]}>
        {mode === "mine" ? "Meine kommenden Wochen" : "Kommende Wochen"}
      </Text>
      {upcomingWeeks.map((item) => (
        <View
          key={item.week}
          style={[styles.weekPreviewRow, darkMode && styles.rowDark, themed.card, item.week === selectedWeek && themed.borderActive]}
        >
          <View style={styles.weekPreviewMeta}>
            <Text style={[styles.weekPreviewTitle, darkMode && styles.textDark]}>KW {item.week}</Text>
            <Text style={[styles.taskMeta, darkMode && styles.mutedDark]}>
              {item.recurring} wiederkehrend · {item.done} erledigt
            </Text>
          </View>
          <View style={styles.weekPreviewStats}>
            <Text style={[styles.scoreUnits, darkMode && styles.textDark]}>{item.open} offen</Text>
          <Text style={[styles.taskMeta, darkMode && styles.mutedDark]}>{formatUnits(item.units)} Punkte</Text>
          </View>
        </View>
      ))}

      <View style={[styles.segmented, styles.spacedTitle]}>
        {[
          { id: "mine", label: "Meine" },
          { id: "all", label: "Alle" },
          { id: "days", label: "Tage" },
        ].map((item) => {
          const active = mode === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentButton, themed.buttonSurface, active && themed.active]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} Wochenansicht anzeigen`}
              accessibilityState={{ selected: active }}
              onPress={() => setMode(item.id as "mine" | "all" | "days")}
            >
              <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode !== "days" && (
        <View>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>
            {mode === "mine" ? `${activeMember?.name ?? "Meine"} Aufgaben` : "Alle Aufgaben"}
          </Text>
          {!listedAssignments.length && (
            <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>Fuer diese Auswahl sind keine Aufgaben geplant.</Text>
          )}
          {listedAssignments.map((assignment) => (
            <WeekAssignmentLine key={assignment.id} assignment={assignment} tasks={tasks} members={members} darkMode={darkMode} />
          ))}
        </View>
      )}

      {mode === "days" &&
        days.map((day) => (
          <View key={day} style={styles.daySection}>
            <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>{day}</Text>
            {weekAssignments
              .filter((assignment) => assignment.day === day)
              .map((assignment) => (
                <WeekAssignmentLine key={assignment.id} assignment={assignment} tasks={tasks} members={members} darkMode={darkMode} />
              ))}
          </View>
        ))}
    </View>
  );
}

function summarizeAssignments(items: Assignment[], tasks: TaskTemplate[]) {
  return items.reduce<WeekSummary>(
    (summary, assignment) => {
      const task = getTaskById(tasks, assignment.taskId);
      if (!task) return summary;
      return {
        total: summary.total + 1,
        done: summary.done + (assignment.status === "done" ? 1 : 0),
        open: summary.open + (assignment.status === "done" ? 0 : 1),
        units: summary.units + task.effortUnits,
        recurring: summary.recurring + (task.recurrenceType && task.recurrenceType !== "once" ? 1 : 0),
      };
    },
    { total: 0, done: 0, open: 0, units: 0, recurring: 0 },
  );
}

function WeekAssignmentLine({
  assignment,
  tasks,
  members,
  darkMode,
}: {
  assignment: Assignment;
  tasks: TaskTemplate[];
  members: Member[];
  darkMode: boolean;
}) {
  const task = getTaskById(tasks, assignment.taskId);
  const member = members.find((item) => item.id === assignment.memberId);
  const completedBy = members.find((item) => item.id === assignment.completedByMemberId);
  const themed = useThemeStyles(darkMode);

  return (
    <View style={[styles.weekTaskRow, darkMode && styles.rowDark, themed.card]}>
      <View style={styles.weekPreviewMeta}>
        <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{task?.title ?? "Aufgabe"}</Text>
        <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
          {assignment.day} · {member?.name ?? "Nicht zugeordnet"}
          {completedBy && completedBy.id !== member?.id ? ` · erledigt von ${completedBy.name}` : ""}
        </Text>
      </View>
      <Text style={[styles.scoreUnits, themed.text, darkMode && styles.textDark]}>{formatUnits(task?.effortUnits || 0)}</Text>
    </View>
  );
}
