import React, { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { formatUnits } from "../constants/planner";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, Member, TaskTemplate, getTaskById } from "../utils/planner";

export function FairnessScreen({
  assignments,
  tasks,
  members,
  darkMode,
  canManagePlan,
  selectedWeek,
  updateAssignmentMember,
}: {
  assignments: Assignment[];
  tasks: TaskTemplate[];
  members: Member[];
  darkMode: boolean;
  canManagePlan: boolean;
  selectedWeek: number;
  updateAssignmentMember: (assignmentId: string, memberId: string) => void;
}) {
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const fairness = useMemo(() => {
    const plannedUnitsByMember = new Map(members.map((member) => [member.id, 0]));
    const actualUnitsByMember = new Map(members.map((member) => [member.id, 0]));
    let totalUnits = 0;

    assignments.forEach((assignment) => {
      const task = taskById.get(assignment.taskId);
      if (!task) return;

      totalUnits += task.effortUnits;
      plannedUnitsByMember.set(assignment.memberId, (plannedUnitsByMember.get(assignment.memberId) ?? 0) + task.effortUnits);

      const actualMemberId = assignment.completedByMemberId || assignment.memberId;
      actualUnitsByMember.set(actualMemberId, (actualUnitsByMember.get(actualMemberId) ?? 0) + task.effortUnits);
    });

    return {
      targetUnits: members.length ? totalUnits / members.length : 0,
      plannedUnitsByMember,
      actualUnitsByMember,
    };
  }, [assignments, members, taskById]);
  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((first, second) => {
        if (first.dayIndex !== second.dayIndex) return first.dayIndex - second.dayIndex;
        const firstTask = taskById.get(first.taskId)?.title ?? "";
        const secondTask = taskById.get(second.taskId)?.title ?? "";
        return firstTask.localeCompare(secondTask, "de");
      }),
    [assignments, taskById],
  );
  const themed = useThemeStyles(darkMode);

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Fairness</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>KW {selectedWeek}: Soll / Plan / Ist</Text>
      <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
        Diese Ansicht zeigt nur die ausgewaehlte Woche. Plan zeigt die Zuordnung. Ist zaehlt offene Aufgaben bei der zugeordneten Person und erledigte Aufgaben bei der Person, die sie abgehakt hat.
      </Text>
      {members.map((member) => {
        const plannedUnits = fairness.plannedUnitsByMember.get(member.id) ?? 0;
        const actualUnits = fairness.actualUnitsByMember.get(member.id) ?? 0;
        const delta = actualUnits - fairness.targetUnits;
        return (
          <View key={member.id} style={[styles.scoreCard, darkMode && styles.rowDark, themed.card]}>
            <View style={styles.scoreHeader}>
              <View style={[styles.dot, { backgroundColor: member.color }]} />
              <Text style={[styles.scoreName, themed.text, darkMode && styles.textDark]}>{member.name}</Text>
              <Text style={[styles.scoreDelta, delta > 0.25 ? styles.scoreHigh : delta < -0.25 ? styles.scoreLow : styles.scoreEven]}>
                {delta > 0 ? "+" : ""}
                {formatUnits(delta)}
              </Text>
            </View>
            <View style={styles.scoreDetailGrid}>
              <Text style={[styles.scoreDetail, themed.muted, darkMode && styles.mutedDark]}>Soll {formatUnits(fairness.targetUnits)}</Text>
              <Text style={[styles.scoreDetail, themed.muted, darkMode && styles.mutedDark]}>Plan {formatUnits(plannedUnits)}</Text>
              <Text style={[styles.scoreDetailStrong, themed.text, darkMode && styles.textDark]}>Ist {formatUnits(actualUnits)}</Text>
            </View>
          </View>
        );
      })}
      <Text style={[styles.sectionTitle, styles.spacedTitle, themed.text, darkMode && styles.textDark]}>Aufgaben verteilen</Text>
      {!canManagePlan && <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>Nur Gruender und Verwalter koennen Aufgaben neu zuordnen.</Text>}
      {sortedAssignments.map((assignment) => {
        const task = taskById.get(assignment.taskId);
        if (!task) return null;
        const completedBy = members.find((member) => member.id === assignment.completedByMemberId);
        return (
          <View key={assignment.id} style={[styles.assignmentEditor, darkMode && styles.rowDark, themed.card]}>
            <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{task.title}</Text>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              {assignment.day} · {formatUnits(task.effortUnits)} Punkte
              {completedBy ? ` · erledigt von ${completedBy.name}` : ""}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.smallMemberButton,
                    themed.buttonSurface,
                    assignment.memberId === member.id && themed.active,
                    !canManagePlan && styles.disabledButton,
                  ]}
                  disabled={!canManagePlan}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title} ${member.name} zuordnen`}
                  accessibilityState={{ selected: assignment.memberId === member.id, disabled: !canManagePlan }}
                  onPress={() => updateAssignmentMember(assignment.id, member.id)}
                >
                  <Text style={[styles.smallMemberButtonText, themed.muted, assignment.memberId === member.id && styles.smallMemberButtonTextActive]}>
                    {member.shortCode}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}
