import React, { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { formatUnits } from "../constants/planner";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, Member, TaskTemplate, getTaskById } from "../utils/planner";

type MemberFairnessSummary = {
  member: Member;
  plannedUnits: number;
  actualUnits: number;
  delta: number;
  statusLabel: string;
  statusCopy: string;
};

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
    let doneCount = 0;

    assignments.forEach((assignment) => {
      const task = taskById.get(assignment.taskId);
      if (!task) return;

      totalUnits += task.effortUnits;
      if (assignment.status === "done") doneCount += 1;
      plannedUnitsByMember.set(assignment.memberId, (plannedUnitsByMember.get(assignment.memberId) ?? 0) + task.effortUnits);

      const actualMemberId = assignment.completedByMemberId || assignment.memberId;
      actualUnitsByMember.set(actualMemberId, (actualUnitsByMember.get(actualMemberId) ?? 0) + task.effortUnits);
    });

    const targetUnits = members.length ? totalUnits / members.length : 0;
    const tolerance = Math.max(1, targetUnits * 0.15);
    const summaries = members.map<MemberFairnessSummary>((member) => {
      const plannedUnits = plannedUnitsByMember.get(member.id) ?? 0;
      const actualUnits = actualUnitsByMember.get(member.id) ?? 0;
      const delta = actualUnits - targetUnits;
      const isEven = Math.abs(delta) <= tolerance;
      const isHigh = delta > tolerance;
      return {
        member,
        plannedUnits,
        actualUnits,
        delta,
        statusLabel: isEven ? "Im Ziel" : isHigh ? "Traegt mehr" : "Hat Luft",
        statusCopy: isEven
          ? "liegt nah am gemeinsamen Soll."
          : isHigh
            ? "traegt gerade mehr als der Durchschnitt."
            : "kann diese Woche eher entlasten.",
      };
    });

    return {
      doneCount,
      openCount: assignments.length - doneCount,
      spreadUnits: summaries.length ? Math.max(...summaries.map((summary) => summary.actualUnits)) - Math.min(...summaries.map((summary) => summary.actualUnits)) : 0,
      targetUnits,
      totalUnits,
      plannedUnitsByMember,
      actualUnitsByMember,
      summaries,
    };
  }, [assignments, members, taskById]);
  const fairnessInsight = useMemo(() => {
    if (!assignments.length || !fairness.summaries.length) {
      return {
        title: "Noch keine Fairness-Daten",
        copy: "Sobald Aufgaben in dieser Woche geplant sind, zeigt Homely hier die Balance.",
        suggestionText: "",
        suggestionAssignmentId: "",
        suggestionMemberId: "",
      };
    }

    const sortedByDelta = [...fairness.summaries].sort((first, second) => first.delta - second.delta);
    const leastLoaded = sortedByDelta[0];
    const mostLoaded = sortedByDelta[sortedByDelta.length - 1];
    const tolerance = Math.max(1, fairness.targetUnits * 0.2);
    const balanced = fairness.spreadUnits <= tolerance;
    const title = balanced ? "Diese Woche ist ausgeglichen" : `${mostLoaded.member.name} traegt gerade mehr`;
    const copy = balanced
      ? "Plan und Ist liegen nah beieinander. Kleine Abweichungen sind im Alltag normal."
      : `${leastLoaded.member.name} hat noch Luft. Eine kleine Umverteilung kann die Woche ruhiger machen.`;
    const suggestionAssignment = assignments
      .filter((assignment) => assignment.status !== "done" && assignment.memberId === mostLoaded.member.id)
      .sort((first, second) => (taskById.get(second.taskId)?.effortUnits ?? 0) - (taskById.get(first.taskId)?.effortUnits ?? 0))[0];
    const suggestionTask = suggestionAssignment ? taskById.get(suggestionAssignment.taskId) : undefined;

    return {
      title,
      copy,
      suggestionText:
        !balanced && suggestionAssignment && suggestionTask
          ? `${suggestionTask.title} (${formatUnits(suggestionTask.effortUnits)} Punkte) von ${mostLoaded.member.name} zu ${leastLoaded.member.name} verschieben.`
          : "",
      suggestionAssignmentId: suggestionAssignment?.id ?? "",
      suggestionMemberId: !balanced ? leastLoaded.member.id : "",
    };
  }, [assignments, fairness.spreadUnits, fairness.summaries, fairness.targetUnits, taskById]);
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
      <FairnessInsight
        title={fairnessInsight.title}
        copy={fairnessInsight.copy}
        totalUnits={fairness.totalUnits}
        openCount={fairness.openCount}
        spreadUnits={fairness.spreadUnits}
        suggestionText={fairnessInsight.suggestionText}
        canManagePlan={canManagePlan}
        darkMode={darkMode}
        onApplySuggestion={() => {
          if (fairnessInsight.suggestionAssignmentId && fairnessInsight.suggestionMemberId) {
            updateAssignmentMember(fairnessInsight.suggestionAssignmentId, fairnessInsight.suggestionMemberId);
          }
        }}
      />
      {fairness.summaries.map((summary) => {
        const { member, plannedUnits, actualUnits, delta } = summary;
        return (
          <View key={member.id} style={[styles.scoreCard, darkMode && styles.rowDark, themed.card]}>
            <View style={styles.scoreHeader}>
              <View style={[styles.dot, { backgroundColor: member.color }]} />
              <Text style={[styles.scoreName, themed.text, darkMode && styles.textDark]}>{member.name}</Text>
              <Text style={[styles.fairnessStatusPill, themed.soft, themed.muted, darkMode && styles.mutedDark]}>{summary.statusLabel}</Text>
              <Text style={[styles.scoreDelta, delta > 0.25 ? styles.scoreHigh : delta < -0.25 ? styles.scoreLow : styles.scoreEven]}>
                {delta > 0 ? "+" : ""}
                {formatUnits(delta)}
              </Text>
            </View>
            <Text style={[styles.scoreAdvice, themed.muted, darkMode && styles.mutedDark]}>{member.name} {summary.statusCopy}</Text>
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

function FairnessInsight({
  title,
  copy,
  totalUnits,
  openCount,
  spreadUnits,
  suggestionText,
  canManagePlan,
  darkMode,
  onApplySuggestion,
}: {
  title: string;
  copy: string;
  totalUnits: number;
  openCount: number;
  spreadUnits: number;
  suggestionText: string;
  canManagePlan: boolean;
  darkMode: boolean;
  onApplySuggestion: () => void;
}) {
  const themed = useThemeStyles(darkMode);
  return (
    <View style={[styles.fairnessInsightBand, themed.soft]}>
      <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>{title}</Text>
      <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>{copy}</Text>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{formatUnits(totalUnits)}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Punkte gesamt</Text>
        </View>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{openCount}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Offen</Text>
        </View>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{formatUnits(spreadUnits)}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Spanne</Text>
        </View>
      </View>
      {!!suggestionText && (
        <View style={[styles.compactInfoBox, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Entlastungsvorschlag</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>{suggestionText}</Text>
          <TouchableOpacity
            style={[styles.primaryActionInline, themed.primary, !canManagePlan && styles.disabledButton]}
            disabled={!canManagePlan}
            accessibilityRole="button"
            accessibilityLabel="Fairness-Vorschlag anwenden"
            accessibilityState={{ disabled: !canManagePlan }}
            onPress={onApplySuggestion}
          >
            <Text style={styles.primaryActionText}>{canManagePlan ? "Vorschlag anwenden" : "Nur Verwalter"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
