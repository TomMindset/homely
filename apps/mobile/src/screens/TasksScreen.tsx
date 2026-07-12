import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  days,
  formatUnits,
  getReminderOptionId,
  reminderLabel,
  reminderOptions,
  scheduleOptions,
  type NewTaskScheduleType,
  type ReminderOptionId,
} from "../constants/planner";
import { seedData } from "../data/seedData";
import { getTaskPackageStats, taskPackages, type TaskPackageId } from "../data/taskPackages";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";
import { Assignment, DayName, Member, TaskTemplate, getRuleByTaskId, getTaskById, ruleLabel } from "../utils/planner";

type TaskUpdateOptions = {
  recurrenceType?: NewTaskScheduleType;
  scheduledDays?: DayName[];
  recurrenceStartWeek?: number;
  reminderOptionId?: ReminderOptionId;
  reminderTime?: string;
};

type FairAssignmentSuggestion = {
  assignmentId: string;
  memberId: string;
  memberName: string;
  day: DayName;
  beforeUnits: number;
  projectedUnits: number;
};

function buildFairAssignmentPlan(
  taskAssignments: Assignment[],
  weekAssignments: Assignment[],
  tasks: TaskTemplate[],
  members: Member[],
  task: TaskTemplate,
): FairAssignmentSuggestion[] {
  if (!taskAssignments.length || !members.length) return [];

  const taskById = new Map(tasks.map((item) => [item.id, item]));
  const workload = new Map(members.map((member) => [member.id, 0]));
  weekAssignments
    .filter((assignment) => assignment.taskId !== task.id)
    .forEach((assignment) => {
      const assignmentTask = taskById.get(assignment.taskId);
      if (!assignmentTask || !workload.has(assignment.memberId)) return;
      workload.set(assignment.memberId, (workload.get(assignment.memberId) ?? 0) + assignmentTask.effortUnits);
    });

  return [...taskAssignments]
    .sort((first, second) => first.dayIndex - second.dayIndex)
    .map((assignment) => {
      const suggestedMember = [...members].sort((first, second) => {
        const unitDelta = (workload.get(first.id) ?? 0) - (workload.get(second.id) ?? 0);
        if (unitDelta !== 0) return unitDelta;
        return first.name.localeCompare(second.name);
      })[0];
      const beforeUnits = workload.get(suggestedMember.id) ?? 0;
      const projectedUnits = beforeUnits + task.effortUnits;
      workload.set(suggestedMember.id, projectedUnits);
      return {
        assignmentId: assignment.id,
        memberId: suggestedMember.id,
        memberName: suggestedMember.name,
        day: assignment.day,
        beforeUnits,
        projectedUnits,
      };
    });
}

export function TasksScreen({
  tasks,
  darkMode,
  newTitle,
  setNewTitle,
  newUnits,
  setNewUnits,
  newScheduleType,
  setNewScheduleType,
  newTaskDays,
  toggleNewTaskDay,
  newReminderOptionId,
  setNewReminderOptionId,
  newReminderTime,
  setNewReminderTime,
  canManagePlan,
  addTask,
  updateTask,
  deleteTask,
  restoreDefaultTasks,
  activateTaskPackage,
  hiddenDefaultTaskCount,
  lastDeletedTaskTitle,
  undoDeleteTask,
  assignments,
  members,
  selectedWeek,
  updateAssignmentMember,
}: {
  tasks: TaskTemplate[];
  darkMode: boolean;
  newTitle: string;
  setNewTitle: (value: string) => void;
  newUnits: string;
  setNewUnits: (value: string) => void;
  newScheduleType: NewTaskScheduleType;
  setNewScheduleType: (value: NewTaskScheduleType) => void;
  newTaskDays: DayName[];
  toggleNewTaskDay: (day: DayName) => void;
  newReminderOptionId: ReminderOptionId;
  setNewReminderOptionId: (value: ReminderOptionId) => void;
  newReminderTime: string;
  setNewReminderTime: (value: string) => void;
  canManagePlan: boolean;
  addTask: () => void;
  updateTask: (taskId: string, title: string, effortUnits: number, ruleUpdate?: TaskUpdateOptions) => void;
  deleteTask: (taskId: string) => void;
  restoreDefaultTasks: () => void;
  activateTaskPackage: (taskPackageId: TaskPackageId) => void;
  hiddenDefaultTaskCount: number;
  lastDeletedTaskTitle: string;
  undoDeleteTask: () => void;
  assignments: Assignment[];
  members: Member[];
  selectedWeek: number;
  updateAssignmentMember: (assignmentId: string, memberId: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [mode, setMode] = useState<"manage" | "longterm">("manage");
  const selectedWeekAssignments = assignments.filter((assignment) => assignment.year === seedData.family.year && assignment.week === selectedWeek);
  const activeTaskIds = new Set(tasks.map((task) => task.id));

  return (
    <View style={[styles.section, darkMode && styles.sectionDark, themed.section]}>
      <Text style={[styles.eyebrow, themed.muted]}>Aufgaben</Text>
      <Text style={[styles.sectionTitle, themed.text, darkMode && styles.textDark]}>
        {mode === "manage" ? "Verwalten" : "Langzeituebersicht"}
      </Text>
      <View style={styles.segmented}>
        {[
          { id: "manage", label: "Bearbeiten" },
          { id: "longterm", label: "Langfristig" },
        ].map((item) => {
          const active = mode === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentButton, themed.buttonSurface, active && themed.active]}
              accessibilityRole="button"
              accessibilityLabel={`Aufgaben ${item.label} anzeigen`}
              accessibilityState={{ selected: active }}
              onPress={() => setMode(item.id as "manage" | "longterm")}
            >
              <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === "longterm" && (
        <LongtermTasksOverview
          assignments={assignments}
          tasks={tasks}
          members={members}
          selectedWeek={selectedWeek}
          darkMode={darkMode}
        />
      )}

      {mode === "manage" && (
        <>
      <Text style={[styles.eyebrow, themed.muted]}>Neue Aufgabe</Text>
      {!canManagePlan && <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>Nur Gruender und Verwalter koennen Aufgaben verwalten.</Text>}
      {hiddenDefaultTaskCount > 0 && canManagePlan && (
        <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Standard-Aufgaben ausgeblendet</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            {hiddenDefaultTaskCount} Vorlage(n) sind ausgeblendet. Du kannst sie als Startmaske wiederherstellen und danach anpassen.
          </Text>
          <TouchableOpacity
            style={[styles.secondaryActionFull, themed.soft]}
            accessibilityRole="button"
            accessibilityLabel="Standard-Aufgaben wiederherstellen"
            onPress={restoreDefaultTasks}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>Vorlagen wiederherstellen</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!lastDeletedTaskTitle && canManagePlan && (
        <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Aufgabe geloescht</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            {lastDeletedTaskTitle} wurde entfernt. Du kannst die Aufgabe inklusive Zuordnungen direkt wiederherstellen.
          </Text>
          <TouchableOpacity
            style={[styles.secondaryActionFull, themed.soft]}
            accessibilityRole="button"
            accessibilityLabel="Aufgabenloeschung rueckgaengig machen"
            onPress={undoDeleteTask}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>Rueckgaengig</Text>
          </TouchableOpacity>
        </View>
      )}
      {canManagePlan && (
        <View style={styles.packageLibrary}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Musteraufgabenpakete</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            Aktiviere gezielt weitere Vorlagen, wenn dein Haushalt mehr Struktur braucht. Bereits aktive Pakete bleiben unveraendert.
          </Text>
          <View style={styles.packageGrid}>
            {taskPackages.map((taskPackage) => {
              const stats = getTaskPackageStats(taskPackage);
              const missingTaskCount = taskPackage.taskIds.filter((taskId) => !activeTaskIds.has(taskId)).length;
              const active = missingTaskCount === 0;
              return (
                <TouchableOpacity
                  key={taskPackage.id}
                  style={[styles.packageCard, themed.card, active && themed.active, !active && hiddenDefaultTaskCount === 0 && styles.disabledButton]}
                  disabled={active || hiddenDefaultTaskCount === 0}
                  accessibilityRole="button"
                  accessibilityLabel={
                    active
                      ? `Aufgabenpaket ${taskPackage.title} ist aktiv`
                      : `Aufgabenpaket ${taskPackage.title} aktivieren`
                  }
                  accessibilityState={{ selected: active, disabled: active || hiddenDefaultTaskCount === 0 }}
                  onPress={() => activateTaskPackage(taskPackage.id)}
                >
                  <View style={styles.packageTitleRow}>
                    <Text style={[styles.taskTitle, themed.text, active && styles.segmentButtonTextActive]}>{taskPackage.shortTitle}</Text>
                    <Text style={[styles.readinessBadge, themed.muted, active && styles.segmentButtonTextActive]}>
                      {active ? "Aktiv" : `${missingTaskCount}/${stats.taskCount}`}
                    </Text>
                  </View>
                  <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{taskPackage.description}</Text>
                  {!active && hiddenDefaultTaskCount > 0 && (
                    <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                      {missingTaskCount} Vorlage(n) aktivieren
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      <TextInput
        style={[styles.input, themed.input, darkMode && styles.inputDark]}
        value={newTitle}
        onChangeText={setNewTitle}
        editable={canManagePlan}
        accessibilityLabel="Titel der neuen Aufgabe"
        placeholder="z. B. Haustuer fegen"
        placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
      />
      <TextInput
        style={[styles.input, themed.input, darkMode && styles.inputDark]}
        value={newUnits}
        onChangeText={setNewUnits}
        keyboardType="numeric"
        editable={canManagePlan}
        accessibilityLabel="Punkte der neuen Aufgabe"
        placeholder="Einheiten"
        placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
      />
      <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Wiederholung</Text>
      <View style={styles.segmentedWrap}>
        {scheduleOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.segmentButtonCompact, themed.buttonSurface, newScheduleType === option.id && themed.active, !canManagePlan && styles.disabledButton]}
            disabled={!canManagePlan}
            accessibilityRole="button"
            accessibilityLabel={`Wiederholung ${option.label}`}
            accessibilityState={{ selected: newScheduleType === option.id, disabled: !canManagePlan }}
            onPress={() => setNewScheduleType(option.id)}
          >
            <Text style={[styles.segmentButtonText, themed.muted, newScheduleType === option.id && styles.segmentButtonTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {newScheduleType === "weekly_days" && (
        <View style={styles.dayToggleGrid}>
          {days.map((day) => {
            const active = newTaskDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayToggle, themed.buttonSurface, active && themed.active, !canManagePlan && styles.disabledButton]}
                disabled={!canManagePlan}
                accessibilityRole="checkbox"
                accessibilityLabel={`${day} fuer neue Aufgabe planen`}
                accessibilityState={{ checked: active, disabled: !canManagePlan }}
                onPress={() => toggleNewTaskDay(day)}
              >
                <Text style={[styles.dayToggleText, themed.muted, active && styles.dayToggleTextActive]}>{day.slice(0, 2)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {newScheduleType !== "once" && (
        <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
          Wird ab der aktuellen Kalenderwoche bis Jahresende geplant.
        </Text>
      )}
      <ReminderControls
        optionId={newReminderOptionId}
        setOptionId={setNewReminderOptionId}
        time={newReminderTime}
        setTime={setNewReminderTime}
        darkMode={darkMode}
        canManagePlan={canManagePlan}
      />
      <TouchableOpacity
        style={[styles.primaryAction, themed.primary, !canManagePlan && styles.disabledButton]}
        disabled={!canManagePlan}
        accessibilityRole="button"
        accessibilityLabel="Aufgabe hinzufuegen"
        accessibilityState={{ disabled: !canManagePlan }}
        onPress={addTask}
      >
        <Text style={[styles.primaryActionText, !canManagePlan && styles.disabledText]}>Aufgabe hinzufuegen</Text>
      </TouchableOpacity>
      <Text style={[styles.sectionTitle, styles.spacedTitle, themed.text, darkMode && styles.textDark]}>{tasks.length} Aufgaben</Text>
      {tasks.map((task) => {
        const rule = getRuleByTaskId(seedData.scheduleRules, task.id);
        return (
          <TaskTemplateEditor
            key={task.id}
            task={task}
            ruleText={task.recurrenceLabel || ruleLabel(rule)}
            darkMode={darkMode}
            canManagePlan={canManagePlan}
            assignments={selectedWeekAssignments.filter((assignment) => assignment.taskId === task.id)}
            weekAssignments={selectedWeekAssignments}
            tasks={tasks}
            members={members}
            selectedWeek={selectedWeek}
            updateTask={updateTask}
            deleteTask={deleteTask}
            updateAssignmentMember={updateAssignmentMember}
          />
        );
      })}
        </>
      )}
    </View>
  );
}

function LongtermTasksOverview({
  assignments,
  tasks,
  members,
  selectedWeek,
  darkMode,
}: {
  assignments: Assignment[];
  tasks: TaskTemplate[];
  members: Member[];
  selectedWeek: number;
  darkMode: boolean;
}) {
  const themed = useThemeStyles(darkMode);
  const weeks = seedData.family.availableWeeks
    .filter((week) => week >= selectedWeek)
    .slice(0, 12)
    .map((week) => {
      const weekAssignments = assignments
        .filter((assignment) => assignment.year === seedData.family.year && assignment.week === week)
        .filter((assignment) => getTaskById(tasks, assignment.taskId))
        .sort((first, second) => first.dayIndex - second.dayIndex);
      const units = weekAssignments.reduce((sum, assignment) => sum + (getTaskById(tasks, assignment.taskId)?.effortUnits || 0), 0);
      const done = weekAssignments.filter((assignment) => assignment.status === "done").length;
      const recurring = weekAssignments.filter((assignment) => {
        const task = getTaskById(tasks, assignment.taskId);
        return task?.recurrenceType && task.recurrenceType !== "once";
      }).length;
      return { week, weekAssignments, units, done, recurring };
    });

  return (
    <View>
      <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
        Die kommenden 12 Wochen zeigen geplante Aufgaben, Punkte und Wiederholungen. Bearbeiten und Zuordnen erfolgt im Tab Bearbeiten fuer die gewaehlte KW.
      </Text>
      {weeks.map((item) => {
        const previewAssignments = item.weekAssignments.slice(0, 5);
        const remaining = Math.max(0, item.weekAssignments.length - previewAssignments.length);
        return (
          <View key={item.week} style={[styles.longtermMealWeek, darkMode && styles.rowDark, themed.card]}>
            <View style={styles.scoreHeader}>
              <Text style={[styles.dayHeading, styles.taskTextBox, themed.text, darkMode && styles.textDark]}>KW {item.week}</Text>
              <Text style={[styles.readinessBadge, themed.muted, darkMode && styles.mutedDark]}>{formatUnits(item.units)} Punkte</Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
                <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{item.weekAssignments.length}</Text>
                <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Aufgaben</Text>
              </View>
              <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
                <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{item.weekAssignments.length - item.done}</Text>
                <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Offen</Text>
              </View>
              <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
                <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{item.recurring}</Text>
                <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Wiederh.</Text>
              </View>
            </View>
            {!item.weekAssignments.length && (
              <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>Keine Aufgaben geplant.</Text>
            )}
            {previewAssignments.map((assignment) => {
              const task = getTaskById(tasks, assignment.taskId);
              const member = members.find((itemMember) => itemMember.id === assignment.memberId);
              if (!task) return null;
              return (
                <View key={assignment.id} style={[styles.longtermTaskRow, darkMode && styles.rowDark, themed.card]}>
                  <View style={styles.taskTextBox}>
                    <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]} numberOfLines={2}>
                      {task.title}
                    </Text>
                    <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                      {assignment.day} · {member?.name ?? "nicht zugeordnet"}
                    </Text>
                  </View>
                  <Text style={[styles.unit, themed.soft, themed.text]}>{formatUnits(task.effortUnits)}</Text>
                </View>
              );
            })}
            {!!remaining && (
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>+ {remaining} weitere Aufgabe(n)</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function TaskTemplateEditor({
  task,
  ruleText,
  darkMode,
  canManagePlan,
  assignments,
  weekAssignments,
  tasks,
  members,
  selectedWeek,
  updateTask,
  deleteTask,
  updateAssignmentMember,
}: {
  task: TaskTemplate;
  ruleText: string;
  darkMode: boolean;
  canManagePlan: boolean;
  assignments: Assignment[];
  weekAssignments: Assignment[];
  tasks: TaskTemplate[];
  members: Member[];
  selectedWeek: number;
  updateTask: (
    taskId: string,
    title: string,
    effortUnits: number,
    ruleUpdate?: TaskUpdateOptions,
  ) => void;
  deleteTask: (taskId: string) => void;
  updateAssignmentMember: (assignmentId: string, memberId: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [units, setUnits] = useState(String(task.effortUnits).replace(".", ","));
  const [scheduleType, setScheduleType] = useState<NewTaskScheduleType>((task.recurrenceType as NewTaskScheduleType) || "once");
  const [scheduledDays, setScheduledDays] = useState<DayName[]>(task.scheduledDays?.length ? task.scheduledDays : [days[0]]);
  const [startWeek, setStartWeek] = useState(String(task.recurrenceStartWeek || 1));
  const [reminderOptionId, setReminderOptionId] = useState<ReminderOptionId>(getReminderOptionId(task));
  const [reminderTime, setReminderTime] = useState(task.reminderTime || "18:00");
  const fairAssignmentPlan = buildFairAssignmentPlan(assignments, weekAssignments, tasks, members, task);
  const fairAssignmentChanges = fairAssignmentPlan.filter((suggestion) => {
    const assignment = assignments.find((item) => item.id === suggestion.assignmentId);
    return assignment?.memberId !== suggestion.memberId;
  });

  useEffect(() => {
    if (!editing) {
      setTitle(task.title);
      setUnits(String(task.effortUnits).replace(".", ","));
      setScheduleType((task.recurrenceType as NewTaskScheduleType) || "once");
      setScheduledDays(task.scheduledDays?.length ? task.scheduledDays : [days[0]]);
      setStartWeek(String(task.recurrenceStartWeek || 1));
      setReminderOptionId(getReminderOptionId(task));
      setReminderTime(task.reminderTime || "18:00");
    }
  }, [
    editing,
    task.effortUnits,
    task.recurrenceStartWeek,
    task.recurrenceType,
    task.reminderEnabled,
    task.reminderLeadDays,
    task.reminderTime,
    task.scheduledDays,
    task.title,
  ]);

  function save() {
    const parsedUnits = Number(units.replace(",", "."));
    const parsedStartWeek = Math.min(53, Math.max(1, Number(startWeek) || task.recurrenceStartWeek || 1));
    const nextScheduledDays =
      scheduleType === "daily" ? days : scheduleType === "weekly_days" ? (scheduledDays.length ? scheduledDays : [days[0]]) : scheduledDays;
    updateTask(
      task.id,
      title,
      parsedUnits,
      task.source === "custom"
        ? {
            recurrenceType: scheduleType,
            scheduledDays: nextScheduledDays,
            recurrenceStartWeek: parsedStartWeek,
            reminderOptionId,
            reminderTime,
          }
        : {
            reminderOptionId,
            reminderTime,
          },
    );
    setEditing(false);
  }

  function toggleScheduledDay(day: DayName) {
    setScheduledDays((items) => (items.includes(day) ? items.filter((item) => item !== day) : [...items, day]));
  }

  function confirmDelete() {
    Alert.alert("Aufgabe loeschen?", `"${task.title}" wird aus dem Plan entfernt.`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Loeschen", style: "destructive", onPress: () => deleteTask(task.id) },
    ]);
  }

  function confirmApplyFairAssignmentPlan() {
    if (!fairAssignmentChanges.length) {
      Alert.alert("Schon fair verteilt", "Die aktuelle Zuordnung passt bereits zum Fairness-Vorschlag fuer diese Woche.");
      return;
    }

    Alert.alert(
      "Fair verteilen?",
      `Homely passt ${fairAssignmentChanges.length} Zuordnung(en) in KW ${selectedWeek} an. Du kannst danach weiterhin jeden Tag manuell aendern.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Anwenden",
          onPress: () => fairAssignmentChanges.forEach((suggestion) => updateAssignmentMember(suggestion.assignmentId, suggestion.memberId)),
        },
      ],
    );
  }

  if (editing) {
    return (
      <View style={[styles.taskEditorCard, styles.editorRow, darkMode && styles.rowDark, themed.card]}>
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={title}
          onChangeText={setTitle}
          accessibilityLabel="Aufgabentitel bearbeiten"
          placeholder="Aufgabe"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={units}
          onChangeText={setUnits}
          keyboardType="numeric"
          accessibilityLabel="Aufgabenpunkte bearbeiten"
          placeholder="Punkte"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
        {task.source === "custom" ? (
          <>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Regel</Text>
            <View style={styles.segmentedWrap}>
              {scheduleOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.segmentButtonCompact, themed.buttonSurface, scheduleType === option.id && themed.active]}
                  accessibilityRole="button"
                  accessibilityLabel={`Wiederholung ${option.label}`}
                  accessibilityState={{ selected: scheduleType === option.id }}
                  onPress={() => setScheduleType(option.id)}
                >
                  <Text style={[styles.segmentButtonText, themed.muted, scheduleType === option.id && styles.segmentButtonTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, themed.input, darkMode && styles.inputDark]}
              value={startWeek}
              onChangeText={setStartWeek}
              keyboardType="numeric"
              accessibilityLabel="Start-Kalenderwoche"
              placeholder="Start-KW"
              placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
            />
            {scheduleType === "weekly_days" && (
              <View style={styles.dayToggleGrid}>
                {days.map((day) => {
                  const active = scheduledDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayToggle, themed.buttonSurface, active && themed.active]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${day} fuer Aufgabe planen`}
                      accessibilityState={{ checked: active }}
                      onPress={() => toggleScheduledDay(day)}
                    >
                      <Text style={[styles.dayToggleText, themed.muted, active && styles.dayToggleTextActive]}>{day.slice(0, 2)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
            Excel-Aufgaben nutzen die importierte Vorlage. Voll editierbare Regeln sind fuer eigene Aufgaben aktiv.
          </Text>
        )}
        <ReminderControls
          optionId={reminderOptionId}
          setOptionId={setReminderOptionId}
          time={reminderTime}
          setTime={setReminderTime}
          darkMode={darkMode}
          canManagePlan={canManagePlan}
        />
        {!!assignments.length && (
          <View style={styles.editorRow}>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Zuordnung in KW {selectedWeek}</Text>
            {!!fairAssignmentPlan.length && canManagePlan && (
              <View style={[styles.fairAssignBox, darkMode && styles.rowDark, themed.soft]}>
                <View style={styles.scoreHeader}>
                  <View style={styles.taskTextBox}>
                    <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>Fair verteilen</Text>
                    <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                      Vorschlag nach aktueller Wochenlast, ohne diese Aufgabe doppelt zu zaehlen.
                    </Text>
                  </View>
                  <Text style={[styles.readinessBadge, themed.muted, darkMode && styles.mutedDark]}>
                    {fairAssignmentChanges.length ? `${fairAssignmentChanges.length} offen` : "passt"}
                  </Text>
                </View>
                <View style={styles.fairAssignPreview}>
                  {fairAssignmentPlan.slice(0, 4).map((suggestion) => (
                    <View key={suggestion.assignmentId} style={[styles.fairAssignChip, themed.card, darkMode && styles.rowDark]}>
                      <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{suggestion.day.slice(0, 2)}</Text>
                      <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{suggestion.memberName}</Text>
                      <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                        {`${formatUnits(suggestion.beforeUnits)} -> ${formatUnits(suggestion.projectedUnits)}`}
                      </Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.secondaryActionFull, themed.card, !fairAssignmentChanges.length && styles.disabledButton]}
                  disabled={!fairAssignmentChanges.length}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title} fair verteilen`}
                  accessibilityState={{ disabled: !fairAssignmentChanges.length }}
                  onPress={confirmApplyFairAssignmentPlan}
                >
                  <Text style={[styles.secondaryActionText, themed.muted]}>Vorschlag anwenden</Text>
                </TouchableOpacity>
              </View>
            )}
            {assignments.map((assignment) => {
              const assignedMember = members.find((member) => member.id === assignment.memberId);
              return (
                <View key={assignment.id} style={[styles.assignmentEditor, darkMode && styles.rowDark, themed.card]}>
                  <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                    {assignment.day} · aktuell {assignedMember?.name ?? "nicht zugeordnet"}
                  </Text>
                  <View style={styles.memberPreviewGrid}>
                    {members.map((member) => {
                      const active = assignment.memberId === member.id;
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={[styles.memberPreviewChip, darkMode && styles.rowDark, themed.card, active && themed.active]}
                          accessibilityRole="button"
                          accessibilityLabel={`${task.title} am ${assignment.day} ${member.name} zuordnen`}
                          accessibilityState={{ selected: active }}
                          onPress={() => updateAssignmentMember(assignment.id, member.id)}
                        >
                          <View style={[styles.dot, { backgroundColor: member.color }]} />
                          <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{member.shortCode}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.editorActions}>
          <TouchableOpacity style={[styles.secondaryAction, themed.soft]} accessibilityRole="button" accessibilityLabel="Bearbeitung abbrechen" onPress={() => setEditing(false)}>
            <Text style={[styles.secondaryActionText, themed.muted]}>Abbrechen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryActionInline, themed.primary]} accessibilityRole="button" accessibilityLabel="Aufgabe speichern" onPress={save}>
            <Text style={styles.primaryActionText}>Speichern</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.templateRow, darkMode && styles.rowDark, themed.card]}>
      <View style={styles.templateSummary}>
        <View style={styles.taskTextBox}>
          <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{task.title}</Text>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{ruleText}</Text>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{reminderLabel(task)}</Text>
        </View>
        <Text style={[styles.unit, themed.soft, themed.text]}>{formatUnits(task.effortUnits)}</Text>
      </View>
      {canManagePlan && (
        <View style={styles.templateActions}>
          <TouchableOpacity style={[styles.editButton, { borderColor: themed.theme.primary }]} accessibilityRole="button" accessibilityLabel={`${task.title} bearbeiten`} onPress={() => setEditing(true)}>
            <Text style={[styles.editButtonText, { color: themed.theme.primary }]}>Bearbeiten</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`${task.title} loeschen`} onPress={confirmDelete}>
            <Text style={styles.deleteButtonText}>Loeschen</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ReminderControls({
  optionId,
  setOptionId,
  time,
  setTime,
  darkMode,
  canManagePlan,
}: {
  optionId: ReminderOptionId;
  setOptionId: (value: ReminderOptionId) => void;
  time: string;
  setTime: (value: string) => void;
  darkMode: boolean;
  canManagePlan: boolean;
}) {
  const themed = useThemeStyles(darkMode);
  return (
    <>
      <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Erinnerung</Text>
      <View style={styles.segmentedWrap}>
        {reminderOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.segmentButtonCompact, themed.buttonSurface, optionId === option.id && themed.active, !canManagePlan && styles.disabledButton]}
            disabled={!canManagePlan}
            accessibilityRole="button"
            accessibilityLabel={`Erinnerung ${option.label}`}
            accessibilityState={{ selected: optionId === option.id, disabled: !canManagePlan }}
            onPress={() => setOptionId(option.id)}
          >
            <Text style={[styles.segmentButtonText, themed.muted, optionId === option.id && styles.segmentButtonTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {optionId !== "none" && (
        <TextInput
          style={[styles.input, themed.input, darkMode && styles.inputDark]}
          value={time}
          onChangeText={setTime}
          editable={canManagePlan}
          accessibilityLabel="Uhrzeit der Erinnerung"
          placeholder="Uhrzeit, z. B. 18:00"
          placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
        />
      )}
    </>
  );
}
