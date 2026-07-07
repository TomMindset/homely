import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { categoryLabels, formatUnits, reminderLabel } from "../constants/planner";
import { seedData } from "../data/seedData";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, MealPlanEntry, Member, TaskTemplate, getRuleByTaskId, getTaskById, ruleLabel } from "../utils/planner";

export function TodayScreen({
  assignments,
  meal,
  tasks,
  members,
  darkMode,
  activeMemberId,
  toggleAssignment,
}: {
  assignments: Assignment[];
  meal?: MealPlanEntry;
  tasks: TaskTemplate[];
  members: Member[];
  darkMode: boolean;
  activeMemberId: string;
  toggleAssignment: (id: string, completedByMemberId?: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [mode, setMode] = useState<"mine" | "all">("mine");
  const activeMember = members.find((member) => member.id === activeMemberId);
  const ownAssignments = assignments.filter(
    (assignment) => assignment.memberId === activeMemberId || assignment.completedByMemberId === activeMemberId,
  );
  const displayedAssignments = mode === "mine" ? ownAssignments : assignments;

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Heute</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>
        {mode === "mine" ? activeMember?.name || "Meine" : "Alle"} Aufgaben
      </Text>
      <View style={styles.segmented}>
        {[
          { id: "mine", label: "Meine" },
          { id: "all", label: "Alle" },
        ].map((item) => {
          const active = mode === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentButton, themed.buttonSurface, active && themed.active]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} Aufgaben anzeigen`}
              accessibilityState={{ selected: active }}
              onPress={() => setMode(item.id as "mine" | "all")}
            >
              <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!displayedAssignments.length && (
        <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
          Fuer diese Auswahl sind heute keine Aufgaben geplant.
        </Text>
      )}
      {displayedAssignments.map((assignment) => (
        <TaskRow
          key={assignment.id}
          assignment={assignment}
          task={getTaskById(tasks, assignment.taskId)}
          member={members.find((item) => item.id === assignment.memberId)}
          completedByMember={members.find((item) => item.id === assignment.completedByMemberId)}
          darkMode={darkMode}
          activeMemberId={activeMemberId}
          toggleAssignment={toggleAssignment}
        />
      ))}
      <View style={[styles.mealBox, darkMode && styles.mealBoxDark, themed.soft]}>
        <Text style={[styles.eyebrow, themed.muted]}>Essen</Text>
        <Text style={[styles.mealTitle, themed.text, darkMode && styles.textDark]}>{meal?.title || "Noch kein Essen geplant"}</Text>
      </View>
    </View>
  );
}

function TaskRow({
  assignment,
  task,
  member,
  completedByMember,
  darkMode,
  activeMemberId,
  toggleAssignment,
}: {
  assignment: Assignment;
  task?: TaskTemplate;
  member?: Member;
  completedByMember?: Member;
  darkMode: boolean;
  activeMemberId: string;
  toggleAssignment: (id: string, completedByMemberId?: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  if (!task || !member) return null;
  const rule = getRuleByTaskId(seedData.scheduleRules, task.id);
  const scheduleText = task.recurrenceLabel || ruleLabel(rule);
  const reminderText = task.reminderEnabled ? ` · ${reminderLabel(task)}` : "";
  const completionText =
    assignment.status === "done" && completedByMember && completedByMember.id !== member.id ? ` · erledigt von ${completedByMember.name}` : "";
  return (
    <TouchableOpacity
      style={[styles.taskRow, darkMode && styles.rowDark, themed.card, assignment.status === "done" && styles.taskRowDone, assignment.status === "done" && themed.soft]}
      accessibilityRole="checkbox"
      accessibilityLabel={`${task.title}, ${member.name}, ${formatUnits(task.effortUnits)} Punkte`}
      accessibilityHint="Tippen, um die Aufgabe als erledigt oder offen zu markieren"
      accessibilityState={{ checked: assignment.status === "done" }}
      onPress={() => toggleAssignment(assignment.id, activeMemberId)}
    >
      <View style={[styles.checkBox, { borderColor: themed.theme.primary }]}>
        <Text style={[styles.checkText, { color: themed.theme.primary }]}>{assignment.status === "done" ? "✓" : ""}</Text>
      </View>
      <View style={styles.taskTextBox}>
        <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{task.title}</Text>
        <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
          {member.name} · {categoryLabels[task.category] || "Aufgabe"} · {scheduleText}
          {reminderText}
          {completionText}
        </Text>
      </View>
      <Text style={[styles.unit, themed.soft, themed.text]}>{formatUnits(task.effortUnits)}</Text>
    </TouchableOpacity>
  );
}
