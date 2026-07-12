import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { categoryLabels, formatUnits, reminderLabel, type ViewId } from "../constants/planner";
import { seedData } from "../data/seedData";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, MealPlanEntry, Member, TaskTemplate, getRuleByTaskId, getTaskById, ruleLabel } from "../utils/planner";
import { EmptyState } from "../components/StateMessage";

type TodayGroupId = "now" | "later" | "done";

type TodayGroup = {
  id: TodayGroupId;
  title: string;
  detail: string;
  assignments: Assignment[];
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReminderTime(value?: string) {
  const time = typeof value === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value) ? value : "18:00";
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function reminderDueAt(assignment: Assignment, task?: TaskTemplate) {
  if (!task?.reminderEnabled || !assignment.date) return null;
  const { hours, minutes } = parseReminderTime(task.reminderTime);
  const due = new Date(`${assignment.date}T00:00:00`);
  due.setDate(due.getDate() - Math.max(task.reminderLeadDays ?? 0, 0));
  due.setHours(hours, minutes, 0, 0);
  return due;
}

function sortAssignmentsForToday(assignments: Assignment[], tasks: TaskTemplate[]) {
  return [...assignments].sort((left, right) => {
    const leftTask = getTaskById(tasks, left.taskId);
    const rightTask = getTaskById(tasks, right.taskId);
    const leftDue = reminderDueAt(left, leftTask)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDue = reminderDueAt(right, rightTask)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) return leftDue - rightDue;
    return (leftTask?.title ?? "").localeCompare(rightTask?.title ?? "");
  });
}

function groupTodayAssignments(assignments: Assignment[], tasks: TaskTemplate[], now = new Date()): TodayGroup[] {
  const todayKey = localDateKey(now);
  const nowImportant: Assignment[] = [];
  const laterToday: Assignment[] = [];
  const done: Assignment[] = [];

  assignments.forEach((assignment) => {
    if (assignment.status === "done") {
      done.push(assignment);
      return;
    }

    const task = getTaskById(tasks, assignment.taskId);
    const dueAt = reminderDueAt(assignment, task);
    const isFutureDate = assignment.date > todayKey;
    const isLaterReminder = dueAt ? dueAt.getTime() > now.getTime() : false;

    if (isFutureDate || isLaterReminder) {
      laterToday.push(assignment);
      return;
    }

    nowImportant.push(assignment);
  });

  const groups: TodayGroup[] = [
    {
      id: "now",
      title: "Jetzt wichtig",
      detail: `${nowImportant.length} dran`,
      assignments: sortAssignmentsForToday(nowImportant, tasks),
    },
    {
      id: "later",
      title: "Spaeter heute",
      detail: `${laterToday.length} geplant`,
      assignments: sortAssignmentsForToday(laterToday, tasks),
    },
    {
      id: "done",
      title: "Erledigt",
      detail: `${done.length} abgehakt`,
      assignments: sortAssignmentsForToday(done, tasks),
    },
  ];

  return groups.filter((group) => group.assignments.length > 0);
}

export function TodayScreen({
  assignments,
  meal,
  tasks,
  members,
  darkMode,
  activeMemberId,
  completionPraise,
  canManagePlan,
  setView,
  toggleAssignment,
}: {
  assignments: Assignment[];
  meal?: MealPlanEntry;
  tasks: TaskTemplate[];
  members: Member[];
  darkMode: boolean;
  activeMemberId: string;
  completionPraise?: string;
  canManagePlan: boolean;
  setView: (view: ViewId) => void;
  toggleAssignment: (id: string, completedByMemberId?: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [mode, setMode] = useState<"mine" | "all">("mine");
  const activeMember = members.find((member) => member.id === activeMemberId);
  const ownAssignments = assignments.filter(
    (assignment) => assignment.memberId === activeMemberId || assignment.completedByMemberId === activeMemberId,
  );
  const displayedAssignments = mode === "mine" ? ownAssignments : assignments;
  const displayedOpenAssignments = displayedAssignments.filter((assignment) => assignment.status !== "done");
  const displayedDoneAssignments = displayedAssignments.filter((assignment) => assignment.status === "done");
  const todayGroups = groupTodayAssignments(displayedAssignments, tasks);
  const ownOpenAssignments = ownAssignments.filter((assignment) => assignment.status !== "done");
  const householdOpenAssignments = assignments.filter((assignment) => assignment.status !== "done");
  const otherOpenCount = householdOpenAssignments.filter((assignment) => assignment.memberId !== activeMemberId).length;
  const openUnits = displayedOpenAssignments.reduce((sum, assignment) => sum + (getTaskById(tasks, assignment.taskId)?.effortUnits || 0), 0);

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Heute</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>
        {mode === "mine" ? "Dein Tag" : "Haushalt heute"}
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
      <TodayFocus
        mode={mode}
        activeMemberName={activeMember?.name}
        openCount={displayedOpenAssignments.length}
        doneCount={displayedDoneAssignments.length}
        ownOpenCount={ownOpenAssignments.length}
        householdOpenCount={householdOpenAssignments.length}
        otherOpenCount={otherOpenCount}
        openUnits={openUnits}
        darkMode={darkMode}
        canManagePlan={canManagePlan}
        setMode={setMode}
        setView={setView}
      />
      {!!completionPraise && (
        <View style={[styles.thanksMoment, themed.soft]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Danke-Moment</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>{completionPraise}</Text>
        </View>
      )}
      {!displayedAssignments.length && (
        <EmptyState
          darkMode={darkMode}
          title={mode === "mine" ? "Heute ist fuer dich nichts offen." : "Heute ist nichts geplant."}
          message={
            mode === "mine" && assignments.length
              ? "Im Haushalt gibt es noch Aufgaben fuer andere Personen."
              : "Homely bleibt ruhig, wenn der Tag frei ist. Plane neue Aufgaben oder pruefe die Woche."
          }
        >
          <View style={styles.editorActions}>
            {mode === "mine" && assignments.length > 0 && (
              <TouchableOpacity style={[styles.secondaryAction, themed.buttonSurface]} accessibilityRole="button" onPress={() => setMode("all")}>
                <Text style={[styles.secondaryActionText, themed.muted]}>Alle anzeigen</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.secondaryAction, themed.buttonSurface]} accessibilityRole="button" onPress={() => setView("week")}>
              <Text style={[styles.secondaryActionText, themed.muted]}>Woche pruefen</Text>
            </TouchableOpacity>
            {canManagePlan && (
              <TouchableOpacity style={[styles.primaryActionInline, themed.primary]} accessibilityRole="button" onPress={() => setView("tasks")}>
                <Text style={styles.primaryActionText}>Aufgaben planen</Text>
              </TouchableOpacity>
            )}
          </View>
        </EmptyState>
      )}
      {todayGroups.map((group) => (
        <View key={group.id} style={styles.todayGroup}>
          <View style={styles.todayListHeader}>
            <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>{group.title}</Text>
            <Text style={[styles.readinessBadge, themed.muted, darkMode && styles.mutedDark]}>{group.detail}</Text>
          </View>
          {group.assignments.map((assignment) => (
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
        </View>
      ))}
      <View style={[styles.mealBox, darkMode && styles.mealBoxDark, themed.soft]}>
        <View style={styles.mealHeaderRow}>
          <View style={styles.taskTextBox}>
            <Text style={[styles.eyebrow, themed.muted]}>Essen</Text>
            <Text style={[styles.mealTitle, themed.text, darkMode && styles.textDark]}>{meal?.title || "Noch kein Essen geplant"}</Text>
          </View>
          <TouchableOpacity style={[styles.editButton, { borderColor: themed.theme.primary }]} accessibilityRole="button" onPress={() => setView("meals")}>
            <Text style={[styles.editButtonText, { color: themed.theme.primary }]}>Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TodayFocus({
  mode,
  activeMemberName,
  openCount,
  doneCount,
  ownOpenCount,
  householdOpenCount,
  otherOpenCount,
  openUnits,
  darkMode,
  canManagePlan,
  setMode,
  setView,
}: {
  mode: "mine" | "all";
  activeMemberName?: string;
  openCount: number;
  doneCount: number;
  ownOpenCount: number;
  householdOpenCount: number;
  otherOpenCount: number;
  openUnits: number;
  darkMode: boolean;
  canManagePlan: boolean;
  setMode: (mode: "mine" | "all") => void;
  setView: (view: ViewId) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const title =
    mode === "mine"
      ? ownOpenCount > 0
        ? `${activeMemberName ?? "Du"}: ${ownOpenCount} offen`
        : otherOpenCount > 0
          ? "Dein Part ist frei"
          : "Heute sieht gut aus"
      : householdOpenCount > 0
        ? `${householdOpenCount} im Haushalt offen`
        : "Haushalt ist erledigt";
  const copy =
    mode === "mine"
      ? ownOpenCount > 0
        ? "Erledige zuerst deine offenen Aufgaben. Wenn du eine andere Aufgabe uebernimmst, zaehlt sie fuer dich als erledigt."
        : otherOpenCount > 0
          ? "Fuer dich ist nichts offen. Du kannst trotzdem im Haushalt helfen."
          : "Keine offenen Aufgaben fuer heute. Homely bleibt ruhig, wenn alles erledigt ist."
      : householdOpenCount > 0
        ? "Alle offenen Aufgaben des Tages auf einen Blick. Tippen markiert die Aufgabe als von dir erledigt."
        : "Alle sichtbaren Aufgaben fuer heute sind abgehakt.";

  return (
    <View style={[styles.todayFocusBand, themed.soft]}>
      <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>{title}</Text>
      <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>{copy}</Text>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{openCount}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Offen</Text>
        </View>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{doneCount}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Erledigt</Text>
        </View>
        <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{formatUnits(openUnits)}</Text>
          <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Punkte offen</Text>
        </View>
      </View>
      <View style={styles.todayActionRow}>
        {mode === "mine" && otherOpenCount > 0 && (
          <TouchableOpacity style={[styles.primaryActionInline, themed.primary]} accessibilityRole="button" onPress={() => setMode("all")}>
            <Text style={styles.primaryActionText}>Haushalt helfen</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.secondaryAction, themed.buttonSurface]} accessibilityRole="button" onPress={() => setView("week")}>
          <Text style={[styles.secondaryActionText, themed.muted]}>Woche</Text>
        </TouchableOpacity>
        {canManagePlan && openCount === 0 && (
          <TouchableOpacity style={[styles.secondaryAction, themed.buttonSurface]} accessibilityRole="button" onPress={() => setView("tasks")}>
            <Text style={[styles.secondaryActionText, themed.muted]}>Planen</Text>
          </TouchableOpacity>
        )}
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
