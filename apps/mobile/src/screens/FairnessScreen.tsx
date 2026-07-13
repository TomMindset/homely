import React, { useMemo } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View, type DimensionValue } from "react-native";
import { formatUnits } from "../constants/planner";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, Member, TaskPreference, TaskTemplate, getTaskById } from "../utils/planner";

type MemberFairnessSummary = {
  member: Member;
  plannedUnits: number;
  actualUnits: number;
  delta: number;
  statusLabel: string;
  statusCopy: string;
};

type GlobalFairSuggestion = {
  assignmentId: string;
  taskTitle: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  day: string;
  units: number;
  preferenceLabel: string;
};

function percentWidth(value: number): DimensionValue {
  return `${Math.max(5, Math.min(100, value))}%` as DimensionValue;
}

function getTaskPreference(taskPreferences: TaskPreference[], taskId: string, memberId: string) {
  return taskPreferences.find((item) => item.taskId === taskId && item.memberId === memberId)?.value ?? "neutral";
}

function taskPreferenceWeight(value: string) {
  if (value === "preferred") return -2;
  if (value === "capable") return -1;
  if (value === "avoid") return 4;
  return 0;
}

function taskPreferenceLabel(value: string) {
  if (value === "preferred") return "mag diese Aufgabe";
  if (value === "capable") return "kann diese Aufgabe";
  if (value === "avoid") return "lieber nicht";
  return "neutral";
}

function buildGlobalFairPlan(
  assignments: Assignment[],
  tasks: TaskTemplate[],
  members: Member[],
  taskPreferences: TaskPreference[],
): GlobalFairSuggestion[] {
  if (members.length < 2) return [];

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const openAssignments = assignments.filter((assignment) => assignment.status !== "done" && taskById.has(assignment.taskId));
  if (!openAssignments.length) return [];

  const workload = new Map(members.map((member) => [member.id, 0]));
  openAssignments.forEach((assignment) => {
    const task = taskById.get(assignment.taskId);
    if (!task || !workload.has(assignment.memberId)) return;
    workload.set(assignment.memberId, (workload.get(assignment.memberId) ?? 0) + task.effortUnits);
  });

  const totalUnits = [...workload.values()].reduce((sum, value) => sum + value, 0);
  const targetUnits = totalUnits / members.length;
  const tolerance = Math.max(1, targetUnits * 0.18);
  const suggestions: GlobalFairSuggestion[] = [];
  const usedAssignmentIds = new Set<string>();

  for (let index = 0; index < 5; index += 1) {
    const sortedByLoad = [...members].sort((first, second) => (workload.get(first.id) ?? 0) - (workload.get(second.id) ?? 0));
    const leastLoaded = sortedByLoad[0];
    const mostLoaded = sortedByLoad[sortedByLoad.length - 1];
    const spread = (workload.get(mostLoaded.id) ?? 0) - (workload.get(leastLoaded.id) ?? 0);
    if (spread <= tolerance) break;

    const candidates = openAssignments
      .filter((assignment) => assignment.memberId === mostLoaded.id && !usedAssignmentIds.has(assignment.id))
      .map((assignment) => {
        const task = taskById.get(assignment.taskId);
        if (!task) return null;
        const targetMember = [...members]
          .filter((member) => member.id !== assignment.memberId)
          .sort((first, second) => {
            const firstPreference = getTaskPreference(taskPreferences, task.id, first.id);
            const secondPreference = getTaskPreference(taskPreferences, task.id, second.id);
            const firstScore = (workload.get(first.id) ?? 0) + taskPreferenceWeight(firstPreference) * Math.max(1, task.effortUnits);
            const secondScore = (workload.get(second.id) ?? 0) + taskPreferenceWeight(secondPreference) * Math.max(1, task.effortUnits);
            if (firstScore !== secondScore) return firstScore - secondScore;
            return first.name.localeCompare(second.name, "de");
          })[0];
        if (!targetMember) return null;
        return {
          assignment,
          task,
          targetMember,
          preference: getTaskPreference(taskPreferences, task.id, targetMember.id),
        };
      })
      .filter((item): item is { assignment: Assignment; task: TaskTemplate; targetMember: Member; preference: string } => !!item)
      .sort((first, second) => {
        const preferenceDelta = taskPreferenceWeight(first.preference) - taskPreferenceWeight(second.preference);
        if (preferenceDelta !== 0) return preferenceDelta;
        return second.task.effortUnits - first.task.effortUnits;
      });

    const next = candidates[0];
    if (!next) break;

    usedAssignmentIds.add(next.assignment.id);
    workload.set(mostLoaded.id, (workload.get(mostLoaded.id) ?? 0) - next.task.effortUnits);
    workload.set(next.targetMember.id, (workload.get(next.targetMember.id) ?? 0) + next.task.effortUnits);
    suggestions.push({
      assignmentId: next.assignment.id,
      taskTitle: next.task.title,
      fromMemberName: mostLoaded.name,
      toMemberId: next.targetMember.id,
      toMemberName: next.targetMember.name,
      day: next.assignment.day,
      units: next.task.effortUnits,
      preferenceLabel: taskPreferenceLabel(next.preference),
    });
  }

  return suggestions;
}

export function FairnessScreen({
  assignments,
  allAssignments,
  tasks,
  taskPreferences,
  members,
  darkMode,
  canManagePlan,
  selectedWeek,
  updateAssignmentMember,
}: {
  assignments: Assignment[];
  allAssignments: Assignment[];
  tasks: TaskTemplate[];
  taskPreferences: TaskPreference[];
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
  const globalFairPlan = useMemo(
    () => buildGlobalFairPlan(assignments, tasks, members, taskPreferences),
    [assignments, members, taskPreferences, tasks],
  );
  function confirmApplyGlobalFairPlan() {
    if (!globalFairPlan.length) return;
    Alert.alert(
      "Plan fairer machen?",
      `Homely passt ${globalFairPlan.length} offene Zuordnung(en) in KW ${selectedWeek} an. Die Vorschlaege beachten vorhandene Vorlieben, koennen aber danach weiter geaendert werden.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Anwenden",
          onPress: () => globalFairPlan.forEach((suggestion) => updateAssignmentMember(suggestion.assignmentId, suggestion.toMemberId)),
        },
      ],
    );
  }
  const weeklyTrend = useMemo(() => {
    const startWeek = selectedWeek - 3;
    const memberIds = new Set(members.map((member) => member.id));
    const weeks = [...new Set(allAssignments.map((assignment) => assignment.week))]
      .filter((week) => week >= startWeek && week <= selectedWeek)
      .sort((first, second) => first - second);

    return weeks.map((week) => {
      const weekItems = allAssignments.filter((assignment) => assignment.week === week);
      const actualUnitsByMember = new Map(members.map((member) => [member.id, 0]));
      let totalUnits = 0;

      weekItems.forEach((assignment) => {
        const task = taskById.get(assignment.taskId);
        if (!task) return;
        const rawActualMemberId = assignment.status === "done" ? assignment.completedByMemberId || assignment.memberId : assignment.memberId;
        const actualMemberId = memberIds.has(rawActualMemberId) ? rawActualMemberId : assignment.memberId;
        if (!memberIds.has(actualMemberId)) return;
        totalUnits += task.effortUnits;
        actualUnitsByMember.set(actualMemberId, (actualUnitsByMember.get(actualMemberId) ?? 0) + task.effortUnits);
      });

      const memberUnits = [...actualUnitsByMember.values()];
      const spreadUnits = memberUnits.length ? Math.max(...memberUnits) - Math.min(...memberUnits) : 0;
      const targetUnits = members.length ? totalUnits / members.length : 0;
      return {
        week,
        totalUnits,
        spreadUnits,
        balanced: spreadUnits <= Math.max(1, targetUnits * 0.2),
      };
    });
  }, [allAssignments, members, selectedWeek, taskById]);
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
      <GlobalFairPlanCard
        suggestions={globalFairPlan}
        canManagePlan={canManagePlan}
        darkMode={darkMode}
        onApply={confirmApplyGlobalFairPlan}
      />
      {fairness.summaries.map((summary) => {
        const { member, plannedUnits, actualUnits, delta } = summary;
        const barMaxUnits = Math.max(fairness.targetUnits, plannedUnits, actualUnits, 1);
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
            <View style={styles.fairnessBarGroup}>
              <FairnessMetricBar label="Soll" value={fairness.targetUnits} maxValue={barMaxUnits} color="#94a3b8" darkMode={darkMode} />
              <FairnessMetricBar label="Plan" value={plannedUnits} maxValue={barMaxUnits} color="#2563eb" darkMode={darkMode} />
              <FairnessMetricBar label="Ist" value={actualUnits} maxValue={barMaxUnits} color={member.color} darkMode={darkMode} />
            </View>
          </View>
        );
      })}
      {!!weeklyTrend.length && (
        <View style={[styles.fairnessInsightBand, themed.soft]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Wochenverlauf</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            Die Spanne zeigt, wie weit die Ist-Punkte der Mitglieder auseinanderliegen.
          </Text>
          {weeklyTrend.map((item) => (
            <View key={item.week} style={[styles.weekTrendRow, themed.card]}>
              <Text style={[styles.scoreUnits, themed.text, darkMode && styles.textDark]}>KW {item.week}</Text>
              <View style={[styles.weekTrendTrack, themed.soft]}>
                <View
                  style={[
                    styles.weekTrendFill,
                    {
                      width: percentWidth((item.spreadUnits / Math.max(item.totalUnits, 1)) * 100),
                      backgroundColor: item.balanced ? "#256F63" : "#c2410c",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.readinessBadge, themed.muted, darkMode && styles.mutedDark]}>{formatUnits(item.spreadUnits)}</Text>
            </View>
          ))}
        </View>
      )}
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

function FairnessMetricBar({
  label,
  value,
  maxValue,
  color,
  darkMode,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  darkMode: boolean;
}) {
  const themed = useThemeStyles(darkMode);
  const width = percentWidth((value / Math.max(maxValue, 1)) * 100);
  return (
    <View style={styles.fairnessBarRow}>
      <Text style={[styles.fairnessBarLabel, themed.muted, darkMode && styles.mutedDark]}>{label}</Text>
      <View style={[styles.fairnessBarTrack, themed.soft]}>
        <View style={[styles.fairnessBarFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={[styles.fairnessBarValue, themed.text, darkMode && styles.textDark]}>{formatUnits(value)}</Text>
    </View>
  );
}

function GlobalFairPlanCard({
  suggestions,
  canManagePlan,
  darkMode,
  onApply,
}: {
  suggestions: GlobalFairSuggestion[];
  canManagePlan: boolean;
  darkMode: boolean;
  onApply: () => void;
}) {
  const themed = useThemeStyles(darkMode);
  return (
    <View style={[styles.fairnessInsightBand, themed.soft]}>
      <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Plan fairer machen</Text>
      <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
        {suggestions.length
          ? "Homely findet mehrere vorsichtige Umverteilungen fuer offene Aufgaben. Vorlieben und aktuelle Last fliessen ein."
          : "Der Plan ist fuer diese Woche bereits nah an der Balance oder es fehlen offene Aufgaben fuer eine Umverteilung."}
      </Text>
      {!!suggestions.length && (
        <View style={styles.fairAssignPreview}>
          {suggestions.slice(0, 4).map((suggestion) => (
            <View key={suggestion.assignmentId} style={[styles.fairAssignChip, themed.card, darkMode && styles.rowDark]}>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{suggestion.day}</Text>
              <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]} numberOfLines={2}>
                {suggestion.taskTitle}
              </Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                {suggestion.fromMemberName} zu {suggestion.toMemberName}
              </Text>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                {formatUnits(suggestion.units)} Punkte · {suggestion.preferenceLabel}
              </Text>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={[styles.primaryActionInline, themed.primary, (!canManagePlan || !suggestions.length) && styles.disabledButton]}
        disabled={!canManagePlan || !suggestions.length}
        accessibilityRole="button"
        accessibilityLabel="Plan fairer machen"
        accessibilityState={{ disabled: !canManagePlan || !suggestions.length }}
        onPress={onApply}
      >
        <Text style={styles.primaryActionText}>
          {!canManagePlan ? "Nur Verwalter" : suggestions.length ? `${suggestions.length} Vorschlaege anwenden` : "Keine Aenderung noetig"}
        </Text>
      </TouchableOpacity>
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
