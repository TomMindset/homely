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
import {
  Assignment,
  AvailabilityWindow,
  DayName,
  Member,
  TaskPreference,
  TaskPreferenceValue,
  TaskTemplate,
  getDateForWeekDay,
  getRuleByTaskId,
  getTaskById,
  ruleLabel,
} from "../utils/planner";
import { StateMessage, UndoToast } from "../components/StateMessage";

type TaskUpdateOptions = {
  recurrenceType?: NewTaskScheduleType;
  scheduledDays?: DayName[];
  recurrenceStartWeek?: number;
  recurrenceIntervalWeeks?: number;
  recurrenceDayOfMonth?: number;
  recurrenceMonth?: number;
  reminderOptionId?: ReminderOptionId;
  reminderTime?: string;
};

type WasteTaskInput = {
  title: string;
  effortUnits: number;
  recurrenceType: NewTaskScheduleType;
  scheduledDays: DayName[];
  recurrenceIntervalWeeks?: number;
  recurrenceDayOfMonth?: number;
  reminderOptionId?: ReminderOptionId;
  reminderTime?: string;
};

type AvailabilityWindowInput = {
  title: string;
  type: AvailabilityWindow["type"];
  startWeek: number;
  endWeek: number;
  memberId?: string | null;
  note?: string;
};

type FairAssignmentSuggestion = {
  assignmentId: string;
  memberId: string;
  memberName: string;
  day: DayName;
  beforeUnits: number;
  projectedUnits: number;
};

const monthLabels = ["Jan", "Feb", "Maerz", "Apr", "Mai", "Juni", "Juli", "Aug", "Sept", "Okt", "Nov", "Dez"];

const taskPreferenceOptions: Array<{ id: TaskPreferenceValue | "neutral"; label: string }> = [
  { id: "preferred", label: "Mag" },
  { id: "capable", label: "Kann" },
  { id: "neutral", label: "Neutral" },
  { id: "avoid", label: "Lieber nicht" },
];

function getTaskPreferenceValue(taskPreferences: TaskPreference[], taskId: string, memberId: string) {
  return taskPreferences.find((item) => item.taskId === taskId && item.memberId === memberId)?.value ?? "neutral";
}

function taskPreferenceWeight(value: TaskPreferenceValue | "neutral") {
  if (value === "preferred") return -2;
  if (value === "capable") return -1;
  if (value === "avoid") return 4;
  return 0;
}

const wastePresets = [
  { id: "rest", label: "Restmuell", title: "Restmuell rausstellen", effortUnits: 1 },
  { id: "bio", label: "Bio", title: "Biotonne rausstellen", effortUnits: 1 },
  { id: "paper", label: "Papier", title: "Papiertonne rausstellen", effortUnits: 1 },
  { id: "yellow", label: "Gelbe Tonne", title: "Gelbe Tonne rausstellen", effortUnits: 1 },
  { id: "glass", label: "Glas", title: "Altglas wegbringen", effortUnits: 1 },
];

const wasteRhythms: Array<{
  id: "weekly" | "two_weeks" | "four_weeks" | "monthly";
  label: string;
  recurrenceType: NewTaskScheduleType;
  intervalWeeks?: number;
}> = [
  { id: "weekly", label: "Woechentlich", recurrenceType: "weekly_days" },
  { id: "two_weeks", label: "Alle 2 Wochen", recurrenceType: "every_x_weeks", intervalWeeks: 2 },
  { id: "four_weeks", label: "Alle 4 Wochen", recurrenceType: "every_x_weeks", intervalWeeks: 4 },
  { id: "monthly", label: "Monatlich", recurrenceType: "monthly" },
];

function buildFairAssignmentPlan(
  taskAssignments: Assignment[],
  weekAssignments: Assignment[],
  tasks: TaskTemplate[],
  members: Member[],
  task: TaskTemplate,
  taskPreferences: TaskPreference[],
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
        const firstScore =
          (workload.get(first.id) ?? 0) + taskPreferenceWeight(getTaskPreferenceValue(taskPreferences, task.id, first.id)) * Math.max(1, task.effortUnits);
        const secondScore =
          (workload.get(second.id) ?? 0) + taskPreferenceWeight(getTaskPreferenceValue(taskPreferences, task.id, second.id)) * Math.max(1, task.effortUnits);
        const unitDelta = firstScore - secondScore;
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

function RecurrenceDetailFields({
  scheduleType,
  intervalWeeks,
  setIntervalWeeks,
  dayOfMonth,
  setDayOfMonth,
  month,
  setMonth,
  darkMode,
  canManagePlan,
}: {
  scheduleType: NewTaskScheduleType;
  intervalWeeks: string;
  setIntervalWeeks: (value: string) => void;
  dayOfMonth: string;
  setDayOfMonth: (value: string) => void;
  month: string;
  setMonth: (value: string) => void;
  darkMode: boolean;
  canManagePlan: boolean;
}) {
  const themed = useThemeStyles(darkMode);
  if (scheduleType !== "every_x_weeks" && scheduleType !== "monthly" && scheduleType !== "yearly") return null;

  return (
    <View style={styles.quietTimeRow}>
      {scheduleType === "every_x_weeks" && (
        <View style={styles.quietTimeField}>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Abstand in Wochen</Text>
          <TextInput
            style={[styles.input, themed.input, darkMode && styles.inputDark]}
            value={intervalWeeks}
            onChangeText={setIntervalWeeks}
            keyboardType="numeric"
            editable={canManagePlan}
            accessibilityLabel="Abstand der Wiederholung in Wochen"
            placeholder="z. B. 2"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
        </View>
      )}
      {(scheduleType === "monthly" || scheduleType === "yearly") && (
        <View style={styles.quietTimeField}>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Tag im Monat</Text>
          <TextInput
            style={[styles.input, themed.input, darkMode && styles.inputDark]}
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="numeric"
            editable={canManagePlan}
            accessibilityLabel="Tag im Monat fuer Wiederholung"
            placeholder="1-31"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
        </View>
      )}
      {scheduleType === "yearly" && (
        <View style={styles.quietTimeField}>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Monat</Text>
          <TextInput
            style={[styles.input, themed.input, darkMode && styles.inputDark]}
            value={month}
            onChangeText={setMonth}
            keyboardType="numeric"
            editable={canManagePlan}
            accessibilityLabel="Monat fuer jaehrliche Wiederholung"
            placeholder="1-12"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
        </View>
      )}
    </View>
  );
}

function WasteSeriesBuilder({
  darkMode,
  canManagePlan,
  selectedWeek,
  addWasteTask,
}: {
  darkMode: boolean;
  canManagePlan: boolean;
  selectedWeek: number;
  addWasteTask: (input: WasteTaskInput) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [presetId, setPresetId] = useState(wastePresets[0].id);
  const [rhythmId, setRhythmId] = useState<(typeof wasteRhythms)[number]["id"]>("two_weeks");
  const [day, setDay] = useState<DayName>("Montag");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [reminderOptionId, setReminderOptionId] = useState<ReminderOptionId>("day_before");
  const [reminderTime, setReminderTime] = useState("18:00");
  const preset = wastePresets.find((item) => item.id === presetId) ?? wastePresets[0];
  const rhythm = wasteRhythms.find((item) => item.id === rhythmId) ?? wasteRhythms[1];

  function createWasteTask() {
    addWasteTask({
      title: preset.title,
      effortUnits: preset.effortUnits,
      recurrenceType: rhythm.recurrenceType,
      scheduledDays: [day],
      recurrenceIntervalWeeks: rhythm.intervalWeeks,
      recurrenceDayOfMonth: Number(dayOfMonth),
      reminderOptionId,
      reminderTime,
    });
  }

  return (
    <View style={[styles.settingsCard, darkMode && styles.rowDark, themed.card]}>
      <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Muelltermine</Text>
      <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
        Als Aufgabenserie ab KW {selectedWeek}, mit Erinnerung und normaler Zuordnung.
      </Text>
      <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Art</Text>
      <View style={styles.segmentedWrap}>
        {wastePresets.map((item) => {
          const active = presetId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentButtonCompact, themed.buttonSurface, active && themed.active, !canManagePlan && styles.disabledButton]}
              disabled={!canManagePlan}
              accessibilityRole="button"
              accessibilityLabel={`Muelltermin ${item.label}`}
              accessibilityState={{ selected: active, disabled: !canManagePlan }}
              onPress={() => setPresetId(item.id)}
            >
              <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Rhythmus</Text>
      <View style={styles.segmentedWrap}>
        {wasteRhythms.map((item) => {
          const active = rhythmId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.segmentButtonCompact, themed.buttonSurface, active && themed.active, !canManagePlan && styles.disabledButton]}
              disabled={!canManagePlan}
              accessibilityRole="button"
              accessibilityLabel={`Muellrhythmus ${item.label}`}
              accessibilityState={{ selected: active, disabled: !canManagePlan }}
              onPress={() => setRhythmId(item.id)}
            >
              <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {rhythm.recurrenceType === "monthly" ? (
        <View style={styles.quietTimeField}>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Tag im Monat</Text>
          <TextInput
            style={[styles.input, themed.input, darkMode && styles.inputDark]}
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="numeric"
            editable={canManagePlan}
            accessibilityLabel="Tag im Monat fuer Muelltermin"
            placeholder="1-31"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
        </View>
      ) : (
        <>
          <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Wochentag</Text>
          <View style={styles.dayToggleGrid}>
            {days.map((item) => {
              const active = day === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.dayToggle, themed.buttonSurface, active && themed.active, !canManagePlan && styles.disabledButton]}
                  disabled={!canManagePlan}
                  accessibilityRole="button"
                  accessibilityLabel={`Muelltermin am ${item}`}
                  accessibilityState={{ selected: active, disabled: !canManagePlan }}
                  onPress={() => setDay(item)}
                >
                  <Text style={[styles.dayToggleText, themed.muted, active && styles.dayToggleTextActive]}>{item.slice(0, 2)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      <ReminderControls
        optionId={reminderOptionId}
        setOptionId={setReminderOptionId}
        time={reminderTime}
        setTime={setReminderTime}
        darkMode={darkMode}
        canManagePlan={canManagePlan}
      />
      <TouchableOpacity
        style={[styles.primaryAction, themed.primary, !canManagePlan && styles.disabledButton]}
        disabled={!canManagePlan}
        accessibilityRole="button"
        accessibilityLabel={`${preset.title} als Aufgabenserie anlegen`}
        accessibilityState={{ disabled: !canManagePlan }}
        onPress={createWasteTask}
      >
        <Text style={[styles.primaryActionText, !canManagePlan && styles.disabledText]}>Muelltermin anlegen</Text>
      </TouchableOpacity>
    </View>
  );
}

export function TasksScreen({
  tasks,
  taskPreferences,
  darkMode,
  newTitle,
  setNewTitle,
  newUnits,
  setNewUnits,
  newScheduleType,
  setNewScheduleType,
  newTaskDays,
  toggleNewTaskDay,
  newIntervalWeeks,
  setNewIntervalWeeks,
  newDayOfMonth,
  setNewDayOfMonth,
  newMonth,
  setNewMonth,
  newReminderOptionId,
  setNewReminderOptionId,
  newReminderTime,
  setNewReminderTime,
  canManagePlan,
  addTask,
  addWasteTask,
  applyTaskDefaultMember,
  updateTask,
  deleteTask,
  restoreDefaultTasks,
  activateTaskPackage,
  hiddenDefaultTaskCount,
  lastDeletedTaskTitle,
  undoDeleteTask,
  assignments,
  availabilityWindows,
  members,
  selectedWeek,
  addAvailabilityWindow,
  deleteAvailabilityWindow,
  updateTaskPreference,
  updateAssignmentMember,
}: {
  tasks: TaskTemplate[];
  taskPreferences: TaskPreference[];
  darkMode: boolean;
  newTitle: string;
  setNewTitle: (value: string) => void;
  newUnits: string;
  setNewUnits: (value: string) => void;
  newScheduleType: NewTaskScheduleType;
  setNewScheduleType: (value: NewTaskScheduleType) => void;
  newTaskDays: DayName[];
  toggleNewTaskDay: (day: DayName) => void;
  newIntervalWeeks: string;
  setNewIntervalWeeks: (value: string) => void;
  newDayOfMonth: string;
  setNewDayOfMonth: (value: string) => void;
  newMonth: string;
  setNewMonth: (value: string) => void;
  newReminderOptionId: ReminderOptionId;
  setNewReminderOptionId: (value: ReminderOptionId) => void;
  newReminderTime: string;
  setNewReminderTime: (value: string) => void;
  canManagePlan: boolean;
  addTask: () => void;
  addWasteTask: (input: WasteTaskInput) => void;
  applyTaskDefaultMember: (taskId: string, memberId: string, fromWeek: number) => void;
  updateTask: (taskId: string, title: string, effortUnits: number, ruleUpdate?: TaskUpdateOptions) => void;
  deleteTask: (taskId: string) => void;
  restoreDefaultTasks: () => void;
  activateTaskPackage: (taskPackageId: TaskPackageId) => void;
  hiddenDefaultTaskCount: number;
  lastDeletedTaskTitle: string;
  undoDeleteTask: () => void;
  assignments: Assignment[];
  availabilityWindows: AvailabilityWindow[];
  members: Member[];
  selectedWeek: number;
  addAvailabilityWindow: (input: AvailabilityWindowInput) => void;
  deleteAvailabilityWindow: (windowId: string) => void;
  updateTaskPreference: (taskId: string, memberId: string, value: TaskPreferenceValue | "neutral") => void;
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
          availabilityWindows={availabilityWindows}
          tasks={tasks}
          members={members}
          selectedWeek={selectedWeek}
          darkMode={darkMode}
          canManagePlan={canManagePlan}
          addAvailabilityWindow={addAvailabilityWindow}
          deleteAvailabilityWindow={deleteAvailabilityWindow}
        />
      )}

      {mode === "manage" && (
        <>
      <Text style={[styles.eyebrow, themed.muted]}>Neue Aufgabe</Text>
      {!canManagePlan && <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>Nur Gruender und Verwalter koennen Aufgaben verwalten.</Text>}
      {hiddenDefaultTaskCount > 0 && canManagePlan && (
        <StateMessage
          darkMode={darkMode}
          tone="info"
          title="Standard-Aufgaben ausgeblendet"
          message={`${hiddenDefaultTaskCount} Vorlage(n) sind ausgeblendet. Du kannst sie als Startmaske wiederherstellen und danach anpassen.`}
        >
          <TouchableOpacity
            style={[styles.secondaryActionFull, themed.soft]}
            accessibilityRole="button"
            accessibilityLabel="Standard-Aufgaben wiederherstellen"
            onPress={restoreDefaultTasks}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>Vorlagen wiederherstellen</Text>
          </TouchableOpacity>
        </StateMessage>
      )}
      {!!lastDeletedTaskTitle && canManagePlan && (
        <UndoToast
          darkMode={darkMode}
          title="Aufgabe geloescht"
          message={`${lastDeletedTaskTitle} wurde entfernt. Du kannst die Aufgabe inklusive Zuordnungen direkt wiederherstellen.`}
        >
          <TouchableOpacity
            style={[styles.secondaryActionFull, themed.soft]}
            accessibilityRole="button"
            accessibilityLabel="Aufgabenloeschung rueckgaengig machen"
            onPress={undoDeleteTask}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>Rueckgaengig</Text>
          </TouchableOpacity>
        </UndoToast>
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
      {canManagePlan && (
        <WasteSeriesBuilder
          darkMode={darkMode}
          canManagePlan={canManagePlan}
          selectedWeek={selectedWeek}
          addWasteTask={addWasteTask}
        />
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
      {(newScheduleType === "weekly_days" || newScheduleType === "every_x_weeks") && (
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
      <RecurrenceDetailFields
        scheduleType={newScheduleType}
        intervalWeeks={newIntervalWeeks}
        setIntervalWeeks={setNewIntervalWeeks}
        dayOfMonth={newDayOfMonth}
        setDayOfMonth={setNewDayOfMonth}
        month={newMonth}
        setMonth={setNewMonth}
        darkMode={darkMode}
        canManagePlan={canManagePlan}
      />
      {newScheduleType !== "once" && (
        <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
          Wird ab der aktuellen Kalenderwoche fuer das laufende Jahr geplant.
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
        const taskAssignments = selectedWeekAssignments.filter((assignment) => assignment.taskId === task.id);
        const futureTaskAssignments = assignments.filter(
          (assignment) =>
            assignment.taskId === task.id &&
            assignment.year === seedData.family.year &&
            assignment.week >= selectedWeek,
        );
        return (
          <TaskTemplateEditor
            key={task.id}
            task={task}
            ruleText={task.recurrenceLabel || ruleLabel(rule)}
            darkMode={darkMode}
            canManagePlan={canManagePlan}
            assignments={taskAssignments}
            futureAssignments={futureTaskAssignments}
            weekAssignments={selectedWeekAssignments}
            tasks={tasks}
            taskPreferences={taskPreferences}
            members={members}
            selectedWeek={selectedWeek}
            updateTask={updateTask}
            deleteTask={deleteTask}
            applyTaskDefaultMember={applyTaskDefaultMember}
            updateTaskPreference={updateTaskPreference}
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
  availabilityWindows,
  tasks,
  members,
  selectedWeek,
  darkMode,
  canManagePlan,
  addAvailabilityWindow,
  deleteAvailabilityWindow,
}: {
  assignments: Assignment[];
  availabilityWindows: AvailabilityWindow[];
  tasks: TaskTemplate[];
  members: Member[];
  selectedWeek: number;
  darkMode: boolean;
  canManagePlan: boolean;
  addAvailabilityWindow: (input: AvailabilityWindowInput) => void;
  deleteAvailabilityWindow: (windowId: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [absenceTitle, setAbsenceTitle] = useState("Ferien");
  const [absenceType, setAbsenceType] = useState<AvailabilityWindow["type"]>("holiday");
  const [absenceMemberId, setAbsenceMemberId] = useState("household");
  const [absenceStartWeek, setAbsenceStartWeek] = useState(String(selectedWeek));
  const [absenceEndWeek, setAbsenceEndWeek] = useState(String(Math.min(53, selectedWeek + 1)));
  const [calendarMode, setCalendarMode] = useState<"weeks" | "months" | "year">("weeks");
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
      const availability = availabilityWindows.filter((window) => week >= window.startWeek && week <= window.endWeek);
      return { week, weekAssignments, units, done, recurring, availability };
    });
  const yearAssignments = assignments
    .filter((assignment) => assignment.year === seedData.family.year)
    .filter((assignment) => getTaskById(tasks, assignment.taskId));
  const monthSummaries = monthLabels.map((label, index) => {
    const month = index + 1;
    const monthAssignments = yearAssignments.filter((assignment) => {
      const assignmentDate = assignment.date
        ? new Date(`${assignment.date}T00:00:00Z`)
        : getDateForWeekDay(assignment.year, assignment.week, assignment.day);
      return assignmentDate.getUTCMonth() + 1 === month;
    });
    const units = monthAssignments.reduce((sum, assignment) => sum + (getTaskById(tasks, assignment.taskId)?.effortUnits || 0), 0);
    const done = monthAssignments.filter((assignment) => assignment.status === "done").length;
    const availability = availabilityWindows.filter((window) =>
      seedData.family.availableWeeks.some((week) => {
        if (week < window.startWeek || week > window.endWeek) return false;
        return getDateForWeekDay(seedData.family.year, week, "Montag").getUTCMonth() + 1 === month;
      }),
    );
    return { label, month, assignments: monthAssignments.length, done, units, availability };
  });
  const yearUnits = yearAssignments.reduce((sum, assignment) => sum + (getTaskById(tasks, assignment.taskId)?.effortUnits || 0), 0);
  const yearOpen = yearAssignments.filter((assignment) => assignment.status !== "done").length;
  const yearRecurring = yearAssignments.filter((assignment) => {
    const task = getTaskById(tasks, assignment.taskId);
    return task?.recurrenceType && task.recurrenceType !== "once";
  }).length;
  const busiestMonth = [...monthSummaries].sort((first, second) => second.units - first.units)[0];

  function createAvailabilityWindow() {
    addAvailabilityWindow({
      title: absenceTitle,
      type: absenceType,
      startWeek: Number(absenceStartWeek),
      endWeek: Number(absenceEndWeek),
      memberId: absenceMemberId === "household" ? null : absenceMemberId,
      note: "Noch reine Anzeige. Aufgaben-Pausierung folgt spaeter.",
    });
  }

  return (
    <View>
      <Text style={[styles.permissionHint, themed.muted, darkMode && styles.mutedDark]}>
        Die kommenden 12 Wochen zeigen geplante Aufgaben, Punkte und Wiederholungen. Bearbeiten und Zuordnen erfolgt im Tab Bearbeiten fuer die gewaehlte KW.
      </Text>
      {canManagePlan && (
        <View style={styles.segmentedWrap}>
          {[
            { id: "weeks", label: "12 Wochen" },
            { id: "months", label: "Monate" },
            { id: "year", label: "Jahr" },
          ].map((item) => {
            const active = calendarMode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.segmentButtonCompact, themed.buttonSurface, active && themed.active]}
                accessibilityRole="button"
                accessibilityLabel={`Langzeitansicht ${item.label}`}
                accessibilityState={{ selected: active }}
                onPress={() => setCalendarMode(item.id as "weeks" | "months" | "year")}
              >
                <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {canManagePlan && (
        <View style={[styles.longtermMealWeek, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Urlaub & Ferien vormerken</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            Diese Markierung ist zunaechst nur sichtbar. Aufgaben werden noch nicht automatisch pausiert oder verteilt.
          </Text>
          <View style={styles.segmentedWrap}>
            {[
              { id: "holiday", label: "Ferien" },
              { id: "vacation", label: "Urlaub" },
            ].map((item) => {
              const active = absenceType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.segmentButtonCompact, themed.buttonSurface, active && themed.active]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} vormerken`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setAbsenceType(item.id as AvailabilityWindow["type"])}
                >
                  <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={[styles.input, themed.input, darkMode && styles.inputDark]}
            value={absenceTitle}
            onChangeText={setAbsenceTitle}
            accessibilityLabel="Titel der Abwesenheit"
            placeholder="z. B. Sommerferien"
            placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
          />
          <View style={styles.quietTimeRow}>
            <View style={styles.quietTimeField}>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Von KW</Text>
              <TextInput
                style={[styles.input, themed.input, darkMode && styles.inputDark]}
                value={absenceStartWeek}
                onChangeText={setAbsenceStartWeek}
                keyboardType="numeric"
                accessibilityLabel="Start-Kalenderwoche der Abwesenheit"
                placeholder="Start"
                placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
              />
            </View>
            <View style={styles.quietTimeField}>
              <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Bis KW</Text>
              <TextInput
                style={[styles.input, themed.input, darkMode && styles.inputDark]}
                value={absenceEndWeek}
                onChangeText={setAbsenceEndWeek}
                keyboardType="numeric"
                accessibilityLabel="End-Kalenderwoche der Abwesenheit"
                placeholder="Ende"
                placeholderTextColor={darkMode ? "#94a3b8" : "#8d8479"}
              />
            </View>
          </View>
          <View style={styles.segmentedWrap}>
            <TouchableOpacity
              style={[styles.segmentButtonCompact, themed.buttonSurface, absenceMemberId === "household" && themed.active]}
              accessibilityRole="button"
              accessibilityLabel="Abwesenheit fuer ganzen Haushalt"
              accessibilityState={{ selected: absenceMemberId === "household" }}
              onPress={() => setAbsenceMemberId("household")}
            >
              <Text style={[styles.segmentButtonText, themed.muted, absenceMemberId === "household" && styles.segmentButtonTextActive]}>Haushalt</Text>
            </TouchableOpacity>
            {members.map((member) => {
              const active = absenceMemberId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.segmentButtonCompact, themed.buttonSurface, active && themed.active]}
                  accessibilityRole="button"
                  accessibilityLabel={`Abwesenheit fuer ${member.name}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setAbsenceMemberId(member.id)}
                >
                  <Text style={[styles.segmentButtonText, themed.muted, active && styles.segmentButtonTextActive]}>{member.shortCode}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[styles.primaryAction, themed.primary]} accessibilityRole="button" onPress={createAvailabilityWindow}>
            <Text style={styles.primaryActionText}>Abwesenheit vormerken</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!availabilityWindows.length && (
        <View style={[styles.longtermMealWeek, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Vorgemerkte Abwesenheiten</Text>
          {availabilityWindows.map((window) => {
            const member = members.find((item) => item.id === window.memberId);
            return (
              <View key={window.id} style={[styles.longtermTaskRow, darkMode && styles.rowDark, themed.card]}>
                <View style={styles.taskTextBox}>
                  <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{window.title}</Text>
                  <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                    KW {window.startWeek}-{window.endWeek} · {member?.name ?? "Haushalt"} · {window.type === "holiday" ? "Ferien" : "Urlaub"}
                  </Text>
                </View>
                {canManagePlan && (
                  <TouchableOpacity style={styles.deleteButton} accessibilityRole="button" onPress={() => deleteAvailabilityWindow(window.id)}>
                    <Text style={styles.deleteButtonText}>Loeschen</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
      {calendarMode === "months" && (
        <View style={[styles.longtermMealWeek, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Monatskalender fuer Verwalter</Text>
          <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
            Schneller Blick auf Lastspitzen, offene Aufgaben und vorgemerkte Ferien oder Urlaube.
          </Text>
          <View style={styles.longtermMealGrid}>
            {monthSummaries.map((month) => (
              <View key={month.month} style={[styles.longtermMealCell, darkMode && styles.rowDark, themed.card]}>
                <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{month.label}</Text>
                <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{month.assignments} Aufgaben</Text>
                <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{formatUnits(month.units)} Punkte</Text>
                <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                  {month.availability.length ? `${month.availability.length} Marker` : "keine Marker"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {calendarMode === "year" && (
        <View style={[styles.longtermMealWeek, darkMode && styles.rowDark, themed.card]}>
          <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>Jahresblick {seedData.family.year}</Text>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
              <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{yearAssignments.length}</Text>
              <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Termine</Text>
            </View>
            <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
              <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{formatUnits(yearUnits)}</Text>
              <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Punkte</Text>
            </View>
            <View style={[styles.summaryTile, darkMode && styles.rowDark, themed.soft]}>
              <Text style={[styles.summaryNumber, themed.text, darkMode && styles.textDark]}>{yearOpen}</Text>
              <Text style={[styles.summaryLabel, themed.muted, darkMode && styles.mutedDark]}>Offen</Text>
            </View>
          </View>
          <View style={[styles.compactInfoBox, darkMode && styles.rowDark, themed.soft]}>
            <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>Planungsnotiz</Text>
            <Text style={[styles.privacyText, themed.muted, darkMode && styles.mutedDark]}>
              Staerkster Monat: {busiestMonth?.label ?? "n/a"} mit {formatUnits(busiestMonth?.units ?? 0)} Punkten. Wiederkehrende Termine im Jahr: {yearRecurring}.
            </Text>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              Urlaub/Ferien-Marker werden hier bereits sichtbar. Automatische Pausierung oder Verschiebung folgt in einem separaten Schritt.
            </Text>
          </View>
        </View>
      )}
      {calendarMode === "weeks" && weeks.map((item) => {
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
            {!!item.availability.length && (
              <View style={styles.memberPreviewGrid}>
                {item.availability.map((window) => {
                  const member = members.find((itemMember) => itemMember.id === window.memberId);
                  return (
                    <View key={window.id} style={[styles.memberPreviewChip, darkMode && styles.rowDark, themed.soft]}>
                      <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                        {window.title} · {member?.shortCode ?? "HH"}
                      </Text>
                    </View>
                  );
                })}
              </View>
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
  futureAssignments,
  weekAssignments,
  tasks,
  taskPreferences,
  members,
  selectedWeek,
  updateTask,
  deleteTask,
  applyTaskDefaultMember,
  updateTaskPreference,
  updateAssignmentMember,
}: {
  task: TaskTemplate;
  ruleText: string;
  darkMode: boolean;
  canManagePlan: boolean;
  assignments: Assignment[];
  futureAssignments: Assignment[];
  weekAssignments: Assignment[];
  tasks: TaskTemplate[];
  taskPreferences: TaskPreference[];
  members: Member[];
  selectedWeek: number;
  updateTask: (
    taskId: string,
    title: string,
    effortUnits: number,
    ruleUpdate?: TaskUpdateOptions,
  ) => void;
  deleteTask: (taskId: string) => void;
  applyTaskDefaultMember: (taskId: string, memberId: string, fromWeek: number) => void;
  updateTaskPreference: (taskId: string, memberId: string, value: TaskPreferenceValue | "neutral") => void;
  updateAssignmentMember: (assignmentId: string, memberId: string) => void;
}) {
  const themed = useThemeStyles(darkMode);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [units, setUnits] = useState(String(task.effortUnits).replace(".", ","));
  const [scheduleType, setScheduleType] = useState<NewTaskScheduleType>((task.recurrenceType as NewTaskScheduleType) || "once");
  const [scheduledDays, setScheduledDays] = useState<DayName[]>(task.scheduledDays?.length ? task.scheduledDays : [days[0]]);
  const [startWeek, setStartWeek] = useState(String(task.recurrenceStartWeek || 1));
  const [intervalWeeks, setIntervalWeeks] = useState(String(task.recurrenceIntervalWeeks || 2));
  const [dayOfMonth, setDayOfMonth] = useState(String(task.recurrenceDayOfMonth || 1));
  const [month, setMonth] = useState(String(task.recurrenceMonth || 1));
  const [reminderOptionId, setReminderOptionId] = useState<ReminderOptionId>(getReminderOptionId(task));
  const [reminderTime, setReminderTime] = useState(task.reminderTime || "18:00");
  const fairAssignmentPlan = buildFairAssignmentPlan(assignments, weekAssignments, tasks, members, task, taskPreferences);
  const fairAssignmentChanges = fairAssignmentPlan.filter((suggestion) => {
    const assignment = assignments.find((item) => item.id === suggestion.assignmentId);
    return assignment?.memberId !== suggestion.memberId;
  });
  const openFutureAssignments = futureAssignments.filter((assignment) => assignment.status === "open");
  const usualMemberId = members
    .map((member) => ({
      member,
      count: openFutureAssignments.filter((assignment) => assignment.memberId === member.id).length,
    }))
    .sort((first, second) => {
      if (second.count !== first.count) return second.count - first.count;
      return first.member.name.localeCompare(second.member.name);
    })[0]?.member.id;

  useEffect(() => {
    if (!editing) {
      setTitle(task.title);
      setUnits(String(task.effortUnits).replace(".", ","));
      setScheduleType((task.recurrenceType as NewTaskScheduleType) || "once");
      setScheduledDays(task.scheduledDays?.length ? task.scheduledDays : [days[0]]);
      setStartWeek(String(task.recurrenceStartWeek || 1));
      setIntervalWeeks(String(task.recurrenceIntervalWeeks || 2));
      setDayOfMonth(String(task.recurrenceDayOfMonth || 1));
      setMonth(String(task.recurrenceMonth || 1));
      setReminderOptionId(getReminderOptionId(task));
      setReminderTime(task.reminderTime || "18:00");
    }
  }, [
    editing,
    task.effortUnits,
    task.recurrenceDayOfMonth,
    task.recurrenceIntervalWeeks,
    task.recurrenceMonth,
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
      scheduleType === "daily"
        ? days
        : scheduleType === "weekly_days" || scheduleType === "every_x_weeks"
          ? scheduledDays.length
            ? scheduledDays
            : [days[0]]
          : scheduledDays;
    updateTask(
      task.id,
      title,
      parsedUnits,
      task.source === "custom"
        ? {
            recurrenceType: scheduleType,
            scheduledDays: nextScheduledDays,
            recurrenceStartWeek: parsedStartWeek,
            recurrenceIntervalWeeks: Number(intervalWeeks),
            recurrenceDayOfMonth: Number(dayOfMonth),
            recurrenceMonth: Number(month),
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

  function confirmApplyDefaultMember(member: Member) {
    const affectedCount = openFutureAssignments.filter((assignment) => assignment.memberId !== member.id).length;
    if (!affectedCount) {
      Alert.alert("Schon gesetzt", `${member.name} ist bereits die uebliche Person fuer offene Termine dieser Aufgabe.`);
      return;
    }

    Alert.alert(
      "Uebliche Zustaendigkeit setzen?",
      `${member.name} wird ab KW ${selectedWeek} fuer ${affectedCount} offene Termin(e) dieser Aufgabe eingetragen. Erledigte Aufgaben bleiben unveraendert.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Setzen",
          onPress: () => applyTaskDefaultMember(task.id, member.id, selectedWeek),
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
            {(scheduleType === "weekly_days" || scheduleType === "every_x_weeks") && (
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
            <RecurrenceDetailFields
              scheduleType={scheduleType}
              intervalWeeks={intervalWeeks}
              setIntervalWeeks={setIntervalWeeks}
              dayOfMonth={dayOfMonth}
              setDayOfMonth={setDayOfMonth}
              month={month}
              setMonth={setMonth}
              darkMode={darkMode}
              canManagePlan={canManagePlan}
            />
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
        {canManagePlan && (
          <View style={[styles.defaultAssignBox, darkMode && styles.rowDark, themed.soft]}>
            <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>Faehigkeit & Vorlieben</Text>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
              Hilft Homely bei fairen Vorschlaegen. Die feste Zuordnung bleibt darunter steuerbar.
            </Text>
            {members.map((member) => {
              const preference = getTaskPreferenceValue(taskPreferences, task.id, member.id);
              return (
                <View key={member.id} style={styles.preferenceLine}>
                  <View style={styles.scoreHeader}>
                    <View style={[styles.dot, { backgroundColor: member.color }]} />
                    <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>{member.name}</Text>
                  </View>
                  <View style={styles.preferenceChoiceRow}>
                    {taskPreferenceOptions.map((option) => {
                      const active = preference === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.preferenceChoiceButton, themed.buttonSurface, active && themed.active]}
                          accessibilityRole="button"
                          accessibilityLabel={`${member.name}: ${option.label} fuer ${task.title}`}
                          accessibilityState={{ selected: active }}
                          onPress={() => updateTaskPreference(task.id, member.id, option.id)}
                        >
                          <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {!!(assignments.length || openFutureAssignments.length) && (
          <View style={styles.editorRow}>
            <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>Zuordnung in KW {selectedWeek}</Text>
            {!!openFutureAssignments.length && canManagePlan && (
              <View style={[styles.defaultAssignBox, darkMode && styles.rowDark, themed.card]}>
                <Text style={[styles.taskTitle, themed.text, darkMode && styles.textDark]}>Uebliche Zustaendigkeit</Text>
                <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>
                  Setzt offene Termine dieser Aufgabe ab KW {selectedWeek}. Erledigte Aufgaben bleiben als Historie erhalten.
                </Text>
                <View style={styles.memberPreviewGrid}>
                  {members.map((member) => {
                    const active = usualMemberId === member.id;
                    const affectedCount = openFutureAssignments.filter((assignment) => assignment.memberId !== member.id).length;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.memberPreviewChip, darkMode && styles.rowDark, themed.card, active && themed.active]}
                        accessibilityRole="button"
                        accessibilityLabel={`${member.name} als uebliche Person fuer ${task.title} setzen`}
                        accessibilityState={{ selected: active }}
                        onPress={() => confirmApplyDefaultMember(member)}
                      >
                        <View style={[styles.dot, { backgroundColor: member.color }]} />
                        <Text style={[styles.taskMeta, themed.muted, active && styles.segmentButtonTextActive]}>
                          {member.shortCode} {affectedCount ? `+${affectedCount}` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
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
