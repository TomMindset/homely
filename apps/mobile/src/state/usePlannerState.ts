import { useEffect, useMemo, useState } from "react";
import {
  canManageFamily,
  days,
  memberColors,
  reminderOptions,
  scheduleLabel,
  type DesignSetId,
  type NewTaskScheduleType,
  type ReminderOptionId,
  type ViewId,
} from "../constants/planner";
import { seedData } from "../data/seedData";
import {
  deleteRemoteMember,
  deleteRemoteTask,
  downloadPlannerSnapshot,
  markRemoteAssignmentStatus,
  updateRemoteAssignmentMember,
  upsertRemoteMember,
  upsertRemoteMeal,
  upsertRemoteTaskWithAssignments,
  type PlannerSnapshot,
} from "../services/plannerSyncService";
import { getStoredItem, removeStoredItems, setStoredItem } from "../utils/localStore";
import {
  Assignment,
  DayName,
  MealPlanEntry,
  Member,
  TaskTemplate,
  getCurrentIsoWeek,
  getDateForWeekDay,
  getDayName,
  getTaskById,
  getWeekAssignments,
  getWeekMeals,
} from "../utils/planner";

const storageKeys = {
  doneIds: "familyPlanner.doneIds",
  taskOverrides: "familyPlanner.taskOverrides",
  deletedTaskIds: "familyPlanner.deletedTaskIds",
  customTasks: "familyPlanner.customTasks",
  memberOverrides: "familyPlanner.memberOverrides",
  deletedMemberIds: "familyPlanner.deletedMemberIds",
  customMembers: "familyPlanner.customMembers",
  assignmentOverrides: "familyPlanner.assignmentOverrides",
  customAssignments: "familyPlanner.customAssignments",
  mealOverrides: "familyPlanner.mealOverrides",
  familyName: "familyPlanner.familyName",
  activeMemberId: "familyPlanner.activeMemberId",
  onboardingComplete: "familyPlanner.onboardingComplete",
  darkMode: "familyPlanner.darkMode",
  designSetId: "familyPlanner.designSetId",
  accountEmail: "familyPlanner.accountEmail",
  activeRemoteHouseholdId: "familyPlanner.activeRemoteHouseholdId",
};

const defaultHouseholdName = "Mein Haushalt";

type HouseholdMemberInput = {
  name: string;
  role: string;
};

type TaskRuleUpdate = {
  recurrenceType?: NewTaskScheduleType;
  scheduledDays?: DayName[];
  recurrenceStartWeek?: number;
  reminderOptionId?: ReminderOptionId;
  reminderTime?: string;
};

type AssignmentSummary = {
  total: number;
  done: number;
  open: number;
  units: number;
  recurring: number;
};

type SyncStatus = {
  state: "local" | "syncing" | "synced" | "error";
  message: string;
};

function summarizeAssignments(items: Assignment[], tasks: TaskTemplate[]): AssignmentSummary {
  return items.reduce<AssignmentSummary>(
    (summary, assignment) => {
      const task = getTaskById(tasks, assignment.taskId);
      if (!task) return summary;

      return {
        total: summary.total + 1,
        done: summary.done + (assignment.status === "done" ? 1 : 0),
        open: summary.open + (assignment.status === "done" ? 0 : 1),
        units: summary.units + task.effortUnits,
        recurring: summary.recurring + (task.source === "custom" && task.recurrenceType && task.recurrenceType !== "once" ? 1 : 0),
      };
    },
    { total: 0, done: 0, open: 0, units: 0, recurring: 0 },
  );
}

function getCustomTaskStartWeek(task: TaskTemplate, existingAssignments: Assignment[], fallbackWeek: number) {
  if (task.recurrenceStartWeek) return task.recurrenceStartWeek;
  const existingWeeks = existingAssignments.filter((assignment) => assignment.taskId === task.id).map((assignment) => assignment.week);
  return existingWeeks.length ? Math.min(...existingWeeks) : fallbackWeek;
}

function getCustomTaskScheduledDays(task: TaskTemplate, fallbackDay: DayName) {
  if (task.recurrenceType === "daily") return days;
  if (task.recurrenceType === "weekly_days") return task.scheduledDays?.length ? task.scheduledDays : [fallbackDay];
  return task.scheduledDays?.length ? task.scheduledDays : [fallbackDay];
}

function buildCustomTaskAssignments({
  task,
  startWeek,
  fallbackDay,
  memberId,
}: {
  task: TaskTemplate;
  startWeek: number;
  fallbackDay: DayName;
  memberId: string;
}) {
  const scheduledDays = getCustomTaskScheduledDays(task, fallbackDay);
  const weeks =
    task.recurrenceType === "daily" || task.recurrenceType === "weekly_days"
      ? seedData.family.availableWeeks.filter((week) => week >= startWeek)
      : [startWeek];

  return weeks.flatMap((week) =>
    scheduledDays.map((day) => ({
      id: `${task.id}-kw${week}-${days.indexOf(day) + 1}`,
      year: seedData.family.year,
      week,
      date: getDateForWeekDay(seedData.family.year, week, day).toISOString().slice(0, 10),
      taskId: task.id,
      memberId,
      day,
      dayIndex: days.indexOf(day) + 1,
      status: "open" as Assignment["status"],
      source: "custom",
    })),
  );
}

function ensureRecurringCustomAssignments(customTasks: TaskTemplate[], customAssignments: Assignment[]) {
  const assignmentsById = new Map(customAssignments.map((assignment) => [assignment.id, assignment]));

  customTasks.forEach((task) => {
    if (task.recurrenceType !== "daily" && task.recurrenceType !== "weekly_days") return;

    const taskAssignments = customAssignments.filter((assignment) => assignment.taskId === task.id);
    const firstAssignment = taskAssignments[0];
    if (!firstAssignment) return;

    const startWeek = getCustomTaskStartWeek(task, customAssignments, firstAssignment.week);
    const generatedAssignments = buildCustomTaskAssignments({
      task,
      startWeek,
      fallbackDay: firstAssignment.day,
      memberId: firstAssignment.memberId,
    });

    generatedAssignments.forEach((assignment) => {
      if (!assignmentsById.has(assignment.id)) {
        assignmentsById.set(assignment.id, assignment);
      }
    });
  });

  return Array.from(assignmentsById.values());
}

function replaceCustomTaskAssignments(assignments: Assignment[], task: TaskTemplate, fallbackDay: DayName, fallbackMemberId: string) {
  const existingTaskAssignments = assignments.filter((assignment) => assignment.taskId === task.id);
  const existingById = new Map(existingTaskAssignments.map((assignment) => [assignment.id, assignment]));
  const startWeek = getCustomTaskStartWeek(task, existingTaskAssignments, task.recurrenceStartWeek ?? 1);
  const generatedAssignments = buildCustomTaskAssignments({
    task,
    startWeek,
    fallbackDay,
    memberId: existingTaskAssignments[0]?.memberId ?? fallbackMemberId,
  }).map((assignment) => {
    const existing = existingById.get(assignment.id);
    return existing ? { ...assignment, status: existing.status, memberId: existing.memberId } : assignment;
  });

  return [...assignments.filter((assignment) => assignment.taskId !== task.id), ...generatedAssignments];
}

function buildShortCode(name: string, usedCodes: Set<string>) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const parts = cleanName.split(" ").filter(Boolean);
  const base =
    parts.length > 1
      ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();
  let code = base || "M";
  let suffix = 2;

  while (usedCodes.has(code)) {
    code = `${base.slice(0, 1) || "M"}${suffix}`;
    suffix += 1;
  }

  usedCodes.add(code);
  return code;
}

function buildHouseholdMembers(inputs: HouseholdMemberInput[]) {
  const usedCodes = new Set<string>();
  const normalizedInputs = inputs.filter((input) => input.name.trim());
  const safeInputs = normalizedInputs.length ? normalizedInputs : [{ name: "Ich", role: "owner" }];

  return safeInputs.map<Member>((input, index) => ({
    id: `household-member-${Date.now()}-${index}`,
    name: input.name.trim(),
    shortCode: buildShortCode(input.name, usedCodes),
    color: memberColors[index % memberColors.length],
    role: index === 0 ? "owner" : input.role === "adult" ? "adult" : "child",
    source: "custom",
  }));
}

function redistributeSeedAssignments(targetMembers: Member[]) {
  const memberIds = targetMembers.map((member) => member.id);
  const seedMemberIds = seedData.members.map((member) => member.id);

  if (!memberIds.length) return [];

  return seedData.assignments.map((assignment) => {
    const seedIndex = Math.max(0, seedMemberIds.indexOf(assignment.memberId));
    return {
      ...assignment,
      memberId: memberIds[seedIndex % memberIds.length],
      completedByMemberId: undefined,
      status: "open" as Assignment["status"],
    };
  });
}

export function usePlannerState() {
  const current = getCurrentIsoWeek(new Date());
  const currentDay = getDayName(new Date());
  const [view, setView] = useState<ViewId>("today");
  const [selectedWeek, setSelectedWeek] = useState(
    seedData.family.availableWeeks.includes(current.week) ? current.week : seedData.family.week,
  );
  const [selectedDay, setSelectedDay] = useState<DayName>(currentDay);
  const [selectedMemberId, setSelectedMemberId] = useState("all");
  const [activeMemberId, setActiveMemberIdState] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [taskOverrides, setTaskOverrides] = useState<Record<string, Partial<TaskTemplate>>>({});
  const [deletedTaskIds, setDeletedTaskIds] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState<TaskTemplate[]>([]);
  const [mealOverrides, setMealOverrides] = useState<Record<string, Partial<MealPlanEntry>>>({});
  const [familyName, setFamilyNameState] = useState(defaultHouseholdName);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUnits, setNewUnits] = useState("1");
  const [newScheduleType, setNewScheduleType] = useState<NewTaskScheduleType>("once");
  const [newTaskDays, setNewTaskDays] = useState<DayName[]>([currentDay]);
  const [newReminderOptionId, setNewReminderOptionId] = useState<ReminderOptionId>("none");
  const [newReminderTime, setNewReminderTime] = useState("18:00");
  const [darkMode, setDarkMode] = useState(false);
  const [designSetId, setDesignSetIdState] = useState<DesignSetId>("homely");
  const [accountEmail, setAccountEmail] = useState("");
  const [activeRemoteHouseholdId, setActiveRemoteHouseholdIdState] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: "local", message: "Nur lokal gespeichert" });

  useEffect(() => {
    async function loadStoredState() {
      const [
        doneIdsJson,
        taskOverridesJson,
        deletedTaskIdsJson,
        customTasksJson,
        memberOverridesJson,
        deletedMemberIdsJson,
        customMembersJson,
        assignmentOverridesJson,
        customAssignmentsJson,
        mealOverridesJson,
        familyNameJson,
        activeMemberIdJson,
        onboardingCompleteJson,
        darkModeJson,
        designSetIdJson,
        accountEmailJson,
        activeRemoteHouseholdIdJson,
      ] = await Promise.all([
        getStoredItem(storageKeys.doneIds),
        getStoredItem(storageKeys.taskOverrides),
        getStoredItem(storageKeys.deletedTaskIds),
        getStoredItem(storageKeys.customTasks),
        getStoredItem(storageKeys.memberOverrides),
        getStoredItem(storageKeys.deletedMemberIds),
        getStoredItem(storageKeys.customMembers),
        getStoredItem(storageKeys.assignmentOverrides),
        getStoredItem(storageKeys.customAssignments),
        getStoredItem(storageKeys.mealOverrides),
        getStoredItem(storageKeys.familyName),
        getStoredItem(storageKeys.activeMemberId),
        getStoredItem(storageKeys.onboardingComplete),
        getStoredItem(storageKeys.darkMode),
        getStoredItem(storageKeys.designSetId),
        getStoredItem(storageKeys.accountEmail),
        getStoredItem(storageKeys.activeRemoteHouseholdId),
      ]);
      const doneIds = new Set<string>(doneIdsJson ? JSON.parse(doneIdsJson) : []);
      const loadedTaskOverrides: Record<string, Partial<TaskTemplate>> = taskOverridesJson ? JSON.parse(taskOverridesJson) : {};
      const loadedDeletedTaskIds: string[] = deletedTaskIdsJson ? JSON.parse(deletedTaskIdsJson) : [];
      const loadedCustomTasks: TaskTemplate[] = customTasksJson ? JSON.parse(customTasksJson) : [];
      const loadedMemberOverrides: Record<string, Partial<Member>> = memberOverridesJson ? JSON.parse(memberOverridesJson) : {};
      const loadedDeletedMemberIds = new Set<string>(deletedMemberIdsJson ? JSON.parse(deletedMemberIdsJson) : []);
      const loadedCustomMembers: Member[] = customMembersJson ? JSON.parse(customMembersJson) : [];
      const loadedAssignmentOverrides: Record<string, Partial<Assignment>> = assignmentOverridesJson
        ? JSON.parse(assignmentOverridesJson)
        : {};
      const loadedCustomAssignments: Assignment[] = customAssignmentsJson ? JSON.parse(customAssignmentsJson) : [];
      const expandedCustomAssignments = ensureRecurringCustomAssignments(loadedCustomTasks, loadedCustomAssignments);
      const loadedMealOverrides: Record<string, Partial<MealPlanEntry>> = mealOverridesJson ? JSON.parse(mealOverridesJson) : {};
      const setupComplete = onboardingCompleteJson === "true";
      const hasNeutralHouseholdMembers = loadedCustomMembers.length > 0 || loadedDeletedMemberIds.size > 0;
      const loadedMembers =
        setupComplete && hasNeutralHouseholdMembers
          ? [
              ...seedData.members
                .filter((member) => !loadedDeletedMemberIds.has(member.id))
                .map((member) => ({ ...member, ...loadedMemberOverrides[member.id] })),
              ...loadedCustomMembers,
            ]
          : [];
      const storedActiveMemberId = activeMemberIdJson ? JSON.parse(activeMemberIdJson) : "";
      const fallbackActiveMember = loadedMembers.find((member) => canManageFamily(member.role)) ?? loadedMembers[0];
      const nextActiveMemberId = loadedMembers.some((member) => member.id === storedActiveMemberId)
        ? storedActiveMemberId
        : fallbackActiveMember?.id ?? "";

      setFamilyNameState(familyNameJson ? JSON.parse(familyNameJson) : defaultHouseholdName);
      setTaskOverrides(loadedTaskOverrides);
      setDeletedTaskIds(loadedDeletedTaskIds);
      setCustomTasks(loadedCustomTasks);
      setMembers(loadedMembers);
      setActiveMemberIdState(nextActiveMemberId);
      setSelectedMemberId(nextActiveMemberId || "all");
      setAssignments(
        loadedMembers.length
          ? [
              ...seedData.assignments.map((assignment) => ({
                ...assignment,
                ...loadedAssignmentOverrides[assignment.id],
                status: (doneIds.has(assignment.id) ? "done" : assignment.status) as Assignment["status"],
              })),
              ...expandedCustomAssignments,
            ]
          : [],
      );
      if (expandedCustomAssignments.length !== loadedCustomAssignments.length) {
        setStoredItem(storageKeys.customAssignments, JSON.stringify(expandedCustomAssignments)).catch(() => {});
      }
      setMealOverrides(loadedMealOverrides);
      setOnboardingComplete(setupComplete && loadedMembers.length > 0);
      setDarkMode(darkModeJson === "true");
      setDesignSetIdState(designSetIdJson ? JSON.parse(designSetIdJson) : "homely");
      setAccountEmail(accountEmailJson ? JSON.parse(accountEmailJson) : "");
      const storedRemoteHouseholdId = activeRemoteHouseholdIdJson ? JSON.parse(activeRemoteHouseholdIdJson) : "";
      setActiveRemoteHouseholdIdState(storedRemoteHouseholdId);
      setSyncStatus(
        storedRemoteHouseholdId
          ? { state: "synced", message: "Sync-Haushalt verbunden" }
          : { state: "local", message: "Nur lokal gespeichert" },
      );
      if (storedRemoteHouseholdId) {
        refreshRemoteSnapshot(storedRemoteHouseholdId);
      }
    }

    loadStoredState().catch(() => {
      // Keep the seed data if local storage is unavailable.
    });
  }, []);

  const tasks = useMemo(
    () => [
      ...seedData.taskTemplates
        .filter((task) => !deletedTaskIds.includes(task.id))
        .map((task) => ({ ...task, ...taskOverrides[task.id] })),
      ...customTasks,
    ],
    [customTasks, deletedTaskIds, taskOverrides],
  );
  const meals = useMemo(
    () => seedData.meals.map((meal) => ({ ...meal, ...mealOverrides[meal.id] })),
    [mealOverrides],
  );
  const weekAssignments = useMemo(
    () =>
      getWeekAssignments(assignments, seedData.family.year, selectedWeek)
        .filter((assignment) => members.some((member) => member.id === assignment.memberId))
        .filter((assignment) => getTaskById(tasks, assignment.taskId)),
    [assignments, members, selectedWeek, tasks],
  );
  const visibleAssignments = useMemo(
    () => weekAssignments.filter((assignment) => selectedMemberId === "all" || assignment.memberId === selectedMemberId),
    [selectedMemberId, weekAssignments],
  );
  const selectedDayAssignments = visibleAssignments.filter((assignment) => assignment.day === selectedDay);
  const weekMeals = getWeekMeals(meals, seedData.family.year, selectedWeek);
  const selectedMeal = weekMeals.find((meal) => meal.day === selectedDay);
  const founderMember = members.find((member) => member.role === "owner");
  const activeMember = members.find((member) => member.id === activeMemberId) ?? members.find((member) => canManageFamily(member.role)) ?? members[0];
  const canManagePlan = canManageFamily(activeMember?.role);
  const hiddenDefaultTaskCount = deletedTaskIds.filter((taskId) => seedData.taskTemplates.some((task) => task.id === taskId)).length;
  const completion = visibleAssignments.length
    ? Math.round((visibleAssignments.filter((assignment) => assignment.status === "done").length / visibleAssignments.length) * 100)
    : 0;
  const weekSummary = useMemo(() => summarizeAssignments(visibleAssignments, tasks), [tasks, visibleAssignments]);
  const upcomingWeeks = useMemo(
    () =>
      seedData.family.availableWeeks
        .filter((week) => week >= selectedWeek)
        .slice(0, 8)
        .map((week) => {
          const items = getWeekAssignments(assignments, seedData.family.year, week)
            .filter((assignment) => members.some((member) => member.id === assignment.memberId))
            .filter((assignment) => getTaskById(tasks, assignment.taskId))
            .filter((assignment) => selectedMemberId === "all" || assignment.memberId === selectedMemberId);
          return { week, ...summarizeAssignments(items, tasks) };
        }),
    [assignments, members, selectedMemberId, selectedWeek, tasks],
  );

  function runRemoteSync(label: string, action: () => Promise<{ ok: boolean; message: string }>) {
    setSyncStatus({ state: "syncing", message: `${label} wird gespeichert...` });
    action()
      .then((result) => {
        setSyncStatus({
          state: result.ok ? "synced" : "error",
          message: result.ok ? `${label} gespeichert` : result.message,
        });
      })
      .catch(() => {
        setSyncStatus({ state: "error", message: `${label} konnte nicht synchronisiert werden.` });
      });
  }

  async function refreshRemoteSnapshot(householdId = activeRemoteHouseholdId) {
    if (!householdId) {
      setSyncStatus({ state: "local", message: "Kein Sync-Haushalt gesetzt" });
      return;
    }

    setSyncStatus({ state: "syncing", message: "Supabase-Stand wird geladen..." });
    try {
      const result = await downloadPlannerSnapshot(householdId);
      if (result.ok && result.data) {
        applyRemoteSnapshot(result.data);
        return;
      }
      setSyncStatus({ state: "error", message: result.message });
    } catch {
      setSyncStatus({ state: "error", message: "Supabase-Stand konnte nicht geladen werden." });
    }
  }

  function saveAssignmentState(updated: Assignment[]) {
    const seedById = new Map(seedData.assignments.map((assignment) => [assignment.id, assignment]));
    const assignmentOverrides = updated.reduce<Record<string, Partial<Assignment>>>((overrides, assignment) => {
      const seedAssignment = seedById.get(assignment.id);
      if (seedAssignment && (seedAssignment.memberId !== assignment.memberId || assignment.completedByMemberId)) {
        overrides[assignment.id] = {
          ...(seedAssignment.memberId !== assignment.memberId ? { memberId: assignment.memberId } : {}),
          ...(assignment.completedByMemberId ? { completedByMemberId: assignment.completedByMemberId } : {}),
        };
      }
      return overrides;
    }, {});

    setStoredItem(
      storageKeys.doneIds,
      JSON.stringify(updated.filter((assignment) => assignment.status === "done").map((assignment) => assignment.id)),
    ).catch(() => {});
    setStoredItem(storageKeys.assignmentOverrides, JSON.stringify(assignmentOverrides)).catch(() => {});
    setStoredItem(storageKeys.customAssignments, JSON.stringify(updated.filter((item) => !seedById.has(item.id)))).catch(() => {});
  }

  function toggleAssignment(id: string, completedByMemberId?: string) {
    setAssignments((items) => {
      const currentAssignment = items.find((assignment) => assignment.id === id);
      const nextStatus: Assignment["status"] = currentAssignment?.status === "done" ? "open" : "done";
      const updated = items.map((assignment) =>
        assignment.id === id
          ? {
              ...assignment,
              status: nextStatus,
              completedByMemberId: assignment.status === "done" ? undefined : completedByMemberId ?? assignment.memberId,
            }
          : assignment,
      );
      saveAssignmentState(updated);
      if (activeRemoteHouseholdId && currentAssignment) {
        runRemoteSync("Aufgabe", () =>
          markRemoteAssignmentStatus({ householdId: activeRemoteHouseholdId, assignmentId: id, status: nextStatus }),
        );
      }
      return updated;
    });
  }

  function updateAssignmentMember(assignmentId: string, memberId: string) {
    if (!canManagePlan) return;
    setAssignments((items) => {
      const updated = items.map((assignment) => (assignment.id === assignmentId ? { ...assignment, memberId } : assignment));
      saveAssignmentState(updated);
      if (activeRemoteHouseholdId) {
        runRemoteSync("Zuordnung", () => updateRemoteAssignmentMember({ householdId: activeRemoteHouseholdId, assignmentId, memberId }));
      }
      return updated;
    });
  }

  function updateTask(taskId: string, title: string, effortUnits: number, ruleUpdate?: TaskRuleUpdate) {
    if (!canManagePlan) return;
    if (!title.trim() || !Number.isFinite(effortUnits) || effortUnits <= 0) return;
    const taskBeforeUpdate = tasks.find((task) => task.id === taskId);
    const reminderOption = reminderOptions.find((option) => option.id === ruleUpdate?.reminderOptionId);
    const reminderPatch =
      reminderOption || ruleUpdate?.reminderTime
        ? {
            reminderEnabled: reminderOption ? reminderOption.enabled : undefined,
            reminderLeadDays: reminderOption ? reminderOption.leadDays : undefined,
            reminderTime: ruleUpdate?.reminderTime?.trim() || "18:00",
          }
        : {};

    if (customTasks.some((task) => task.id === taskId)) {
      setCustomTasks((items) => {
        let updatedTask: TaskTemplate | undefined;
        const updated = items.map((task) => {
          if (task.id !== taskId) return task;
          const scheduledDays = ruleUpdate?.scheduledDays?.length ? ruleUpdate.scheduledDays : task.scheduledDays;
          updatedTask = {
            ...task,
            title: title.trim(),
            effortUnits,
            ...reminderPatch,
            ...(ruleUpdate?.recurrenceType ? { recurrenceType: ruleUpdate.recurrenceType } : {}),
            ...(scheduledDays ? { scheduledDays } : {}),
            ...(ruleUpdate?.recurrenceStartWeek ? { recurrenceStartWeek: ruleUpdate.recurrenceStartWeek } : {}),
          };
          updatedTask.recurrenceLabel = scheduleLabel(
            (updatedTask.recurrenceType || "once") as NewTaskScheduleType,
            getCustomTaskScheduledDays(updatedTask, selectedDay),
          );
          return updatedTask;
        });
        setStoredItem(storageKeys.customTasks, JSON.stringify(updated)).catch(() => {});
        if (updatedTask) {
          const taskForAssignments = updatedTask;
          setAssignments((assignmentItems) => {
            const updatedAssignments = replaceCustomTaskAssignments(assignmentItems, taskForAssignments, selectedDay, members[0]?.id ?? "");
            saveAssignmentState(updatedAssignments);
            if (activeRemoteHouseholdId) {
              runRemoteSync("Aufgabe", () =>
                upsertRemoteTaskWithAssignments({
                  householdId: activeRemoteHouseholdId,
                  task: taskForAssignments,
                  assignments: updatedAssignments,
                }),
              );
            }
            return updatedAssignments;
          });
        }
        return updated;
      });
      return;
    }

    setTaskOverrides((items) => {
      const updatedTask = taskBeforeUpdate
        ? {
            ...taskBeforeUpdate,
            title: title.trim(),
            effortUnits,
            ...reminderPatch,
          }
        : undefined;
      const updated = {
        ...items,
        [taskId]: {
          ...items[taskId],
          title: title.trim(),
          effortUnits,
          ...reminderPatch,
        },
      };
      setStoredItem(storageKeys.taskOverrides, JSON.stringify(updated)).catch(() => {});
      if (activeRemoteHouseholdId && updatedTask) {
        runRemoteSync("Aufgabe", () =>
          upsertRemoteTaskWithAssignments({
            householdId: activeRemoteHouseholdId,
            task: updatedTask,
            assignments,
          }),
        );
      }
      return updated;
    });
  }

  function deleteTask(taskId: string) {
    if (!canManagePlan) return;
    if (activeRemoteHouseholdId) {
      runRemoteSync("Aufgabe", () => deleteRemoteTask({ householdId: activeRemoteHouseholdId, taskId }));
    }
    if (customTasks.some((task) => task.id === taskId)) {
      setCustomTasks((items) => {
        const updated = items.filter((task) => task.id !== taskId);
        setStoredItem(storageKeys.customTasks, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } else {
      setDeletedTaskIds((items) => {
        const updated = items.includes(taskId) ? items : [...items, taskId];
        setStoredItem(storageKeys.deletedTaskIds, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }

    setAssignments((items) => {
      const updated = items.filter((assignment) => assignment.taskId !== taskId);
      saveAssignmentState(updated);
      return updated;
    });
  }

  function addMember(name: string, shortCode: string, role: string, color: string) {
    if (!canManagePlan) return;
    if (!name.trim() || !shortCode.trim()) return;
    const member: Member = {
      id: `custom-member-${Date.now()}`,
      name: name.trim(),
      shortCode: shortCode.trim().slice(0, 2).toUpperCase(),
      color,
      role,
      source: "custom",
    };
    setMembers((items) => {
      const updated = [...items, member];
      setStoredItem(storageKeys.customMembers, JSON.stringify(updated.filter((item) => item.source === "custom"))).catch(() => {});
      if (activeRemoteHouseholdId) {
        runRemoteSync("Mitglied", () => upsertRemoteMember({ householdId: activeRemoteHouseholdId, member }));
      }
      return updated;
    });
  }

  function updateMember(memberId: string, patch: Partial<Member>) {
    if (!canManagePlan) return;
    setMembers((items) => {
      const updated = items.map((member) => (member.id === memberId ? { ...member, ...patch } : member));
      if (!updated.some((member) => canManageFamily(member.role))) {
        return items;
      }
      const seedIds = new Set(seedData.members.map((member) => member.id));
      const memberOverrides = updated.reduce<Record<string, Partial<Member>>>((overrides, member) => {
        if (seedIds.has(member.id)) {
          overrides[member.id] = {
            name: member.name,
            shortCode: member.shortCode,
            color: member.color,
            role: member.role,
          };
        }
        return overrides;
      }, {});
      setStoredItem(storageKeys.memberOverrides, JSON.stringify(memberOverrides)).catch(() => {});
      setStoredItem(storageKeys.customMembers, JSON.stringify(updated.filter((member) => member.source === "custom"))).catch(() => {});
      const updatedMember = updated.find((member) => member.id === memberId);
      if (activeRemoteHouseholdId && updatedMember) {
        runRemoteSync("Mitglied", () => upsertRemoteMember({ householdId: activeRemoteHouseholdId, member: updatedMember }));
      }
      return updated;
    });
  }

  function deleteMember(memberId: string) {
    if (!canManagePlan) return;
    const remainingMembers = members.filter((member) => member.id !== memberId);
    if (!remainingMembers.length) return;
    if (!remainingMembers.some((member) => canManageFamily(member.role))) return;
    const fallbackMemberId = remainingMembers[0].id;

    setMembers(remainingMembers);
    setSelectedMemberId((value) => (value === memberId ? fallbackMemberId : value));
    setActiveMemberIdState((value) => {
      const next = value === memberId ? remainingMembers[0].id : value;
      setStoredItem(storageKeys.activeMemberId, JSON.stringify(next)).catch(() => {});
      return next;
    });

    const seedIds = new Set(seedData.members.map((member) => member.id));
    const explicitlyDeletedSeedIds = seedIds.has(memberId) ? [memberId] : [];

    setStoredItem(
      storageKeys.deletedMemberIds,
      JSON.stringify([
        ...new Set([
          ...explicitlyDeletedSeedIds,
          ...seedData.members.filter((member) => !remainingMembers.some((item) => item.id === member.id)).map((member) => member.id),
        ]),
      ]),
    ).catch(() => {});
    setStoredItem(storageKeys.customMembers, JSON.stringify(remainingMembers.filter((member) => member.source === "custom"))).catch(() => {});
    if (activeRemoteHouseholdId) {
      runRemoteSync("Mitglied", () => deleteRemoteMember({ householdId: activeRemoteHouseholdId, memberId }));
    }

    setAssignments((items) => {
      const updated = items.map((assignment) =>
        assignment.memberId === memberId ? { ...assignment, memberId: fallbackMemberId } : assignment,
      );
      saveAssignmentState(updated);
      if (activeRemoteHouseholdId) {
        updated
          .filter((assignment) => assignment.memberId === fallbackMemberId)
          .forEach((assignment) => {
            runRemoteSync("Zuordnung", () =>
              updateRemoteAssignmentMember({
                householdId: activeRemoteHouseholdId,
                assignmentId: assignment.id,
                memberId: fallbackMemberId,
              }),
            );
          });
      }
      return updated;
    });

    setMealOverrides((items) => {
      const updated = meals.reduce<Record<string, Partial<MealPlanEntry>>>(
        (overrides, meal) => ({
          ...overrides,
          ...(items[meal.id] ? { [meal.id]: items[meal.id] } : {}),
          ...(meal.cookMemberId === memberId ? { [meal.id]: { ...items[meal.id], cookMemberId: null } } : {}),
        }),
        {},
      );
      setStoredItem(storageKeys.mealOverrides, JSON.stringify(updated)).catch(() => {});
      if (activeRemoteHouseholdId) {
        meals
          .filter((meal) => meal.cookMemberId === memberId)
          .forEach((meal) => {
            runRemoteSync("Essensplan", () =>
              upsertRemoteMeal({ householdId: activeRemoteHouseholdId, meal: { ...meal, cookMemberId: null } }),
            );
          });
      }
      return updated;
    });
  }

  function updateMeal(mealId: string, title: string, cookMemberId?: string | null) {
    if (!canManagePlan) return;
    const currentMeal = meals.find((meal) => meal.id === mealId);
    const nextMeal = currentMeal
      ? {
          ...currentMeal,
          title: title.trim(),
          ...(cookMemberId !== undefined ? { cookMemberId } : {}),
        }
      : undefined;
    setMealOverrides((items) => {
      const updated = {
        ...items,
        [mealId]: {
          ...items[mealId],
          title: title.trim(),
          ...(cookMemberId !== undefined ? { cookMemberId } : {}),
        },
      };
      setStoredItem(storageKeys.mealOverrides, JSON.stringify(updated)).catch(() => {});
      if (activeRemoteHouseholdId && nextMeal) {
        runRemoteSync("Essensplan", () => upsertRemoteMeal({ householdId: activeRemoteHouseholdId, meal: nextMeal }));
      }
      return updated;
    });
  }

  function updateFamilyName(name: string) {
    if (!canManagePlan) return;
    setFamilyNameState(name);
    setStoredItem(storageKeys.familyName, JSON.stringify(name)).catch(() => {});
  }

  function completeOnboarding(name = defaultHouseholdName, householdMembers: HouseholdMemberInput[] = []) {
    const nextMembers = buildHouseholdMembers(householdMembers);
    const nextAssignments = redistributeSeedAssignments(nextMembers);
    const nextFamilyName = name.trim() || defaultHouseholdName;
    const activeOwner = nextMembers.find((member) => member.role === "owner") ?? nextMembers[0];
    const deletedSeedMemberIds = seedData.members.map((member) => member.id);

    setFamilyNameState(nextFamilyName);
    setMembers(nextMembers);
    setAssignments(nextAssignments);
    setSelectedMemberId(activeOwner?.id ?? "all");
    setActiveMemberIdState(activeOwner?.id ?? "");
    setOnboardingComplete(true);
    setStoredItem(storageKeys.familyName, JSON.stringify(nextFamilyName)).catch(() => {});
    setStoredItem(storageKeys.customMembers, JSON.stringify(nextMembers)).catch(() => {});
    setStoredItem(storageKeys.deletedMemberIds, JSON.stringify(deletedSeedMemberIds)).catch(() => {});
    setStoredItem(storageKeys.activeMemberId, JSON.stringify(activeOwner?.id ?? "")).catch(() => {});
    setStoredItem(storageKeys.onboardingComplete, "true").catch(() => {});
    saveAssignmentState(nextAssignments);
  }

  function toggleDarkMode() {
    setDarkMode((value) => {
      const next = !value;
      setStoredItem(storageKeys.darkMode, String(next)).catch(() => {});
      return next;
    });
  }

  function setDesignSetId(id: DesignSetId) {
    setDesignSetIdState(id);
    setStoredItem(storageKeys.designSetId, JSON.stringify(id)).catch(() => {});
  }

  function updateAccountEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    setAccountEmail(normalizedEmail);
    setStoredItem(storageKeys.accountEmail, JSON.stringify(normalizedEmail)).catch(() => {});
  }

  function setActiveRemoteHouseholdId(householdId: string) {
    setActiveRemoteHouseholdIdState(householdId);
    setStoredItem(storageKeys.activeRemoteHouseholdId, JSON.stringify(householdId)).catch(() => {});
    setSyncStatus(
      householdId
        ? { state: "synced", message: "Sync-Haushalt verbunden" }
        : { state: "local", message: "Nur lokal gespeichert" },
    );
  }

  function applyRemoteSnapshot(snapshot: PlannerSnapshot) {
    const nextFamilyName = snapshot.householdName.trim() || defaultHouseholdName;
    const nextMembers = snapshot.members;
    const nextTasks = snapshot.tasks;
    const nextAssignments = snapshot.assignments.length ? snapshot.assignments : redistributeSeedAssignments(nextMembers);
    const nextMeals = snapshot.meals;
    const activeManager = nextMembers.find((member) => canManageFamily(member.role)) ?? nextMembers[0];
    const deletedSeedMemberIds = seedData.members.map((member) => member.id);
    const remoteTaskIds = new Set(nextTasks.map((task) => task.id));
    const deletedSeedTaskIds = seedData.taskTemplates.filter((task) => remoteTaskIds.has(task.id)).map((task) => task.id);

    setFamilyNameState(nextFamilyName);
    setMembers(nextMembers);
    setTaskOverrides({});
    setDeletedTaskIds(deletedSeedTaskIds);
    setCustomTasks(nextTasks);
    setAssignments(nextAssignments);
    setMealOverrides(Object.fromEntries(nextMeals.map((meal) => [meal.id, meal])));
    setSelectedMemberId(activeManager?.id ?? "all");
    setActiveMemberIdState(activeManager?.id ?? "");
    setOnboardingComplete(nextMembers.length > 0);

    setStoredItem(storageKeys.familyName, JSON.stringify(nextFamilyName)).catch(() => {});
    setStoredItem(storageKeys.memberOverrides, JSON.stringify({})).catch(() => {});
    setStoredItem(storageKeys.deletedMemberIds, JSON.stringify(deletedSeedMemberIds)).catch(() => {});
    setStoredItem(storageKeys.customMembers, JSON.stringify(nextMembers)).catch(() => {});
    setStoredItem(storageKeys.taskOverrides, JSON.stringify({})).catch(() => {});
    setStoredItem(storageKeys.deletedTaskIds, JSON.stringify(deletedSeedTaskIds)).catch(() => {});
    setStoredItem(storageKeys.customTasks, JSON.stringify(nextTasks)).catch(() => {});
    setStoredItem(storageKeys.mealOverrides, JSON.stringify(Object.fromEntries(nextMeals.map((meal) => [meal.id, meal])))).catch(() => {});
    setStoredItem(storageKeys.activeMemberId, JSON.stringify(activeManager?.id ?? "")).catch(() => {});
    setStoredItem(storageKeys.onboardingComplete, "true").catch(() => {});
    saveAssignmentState(nextAssignments);
    setSyncStatus({ state: "synced", message: "Plan aus Supabase geladen" });
  }

  function addTask() {
    if (!canManagePlan) return;
    const units = Number(newUnits);
    const defaultMemberId = activeMember?.id ?? members[0]?.id;
    if (!newTitle.trim() || !Number.isFinite(units) || units <= 0 || !defaultMemberId) return;
    const scheduledDays =
      newScheduleType === "daily" ? days : newScheduleType === "weekly_days" ? (newTaskDays.length ? newTaskDays : [selectedDay]) : [selectedDay];
    const reminderOption = reminderOptions.find((option) => option.id === newReminderOptionId) ?? reminderOptions[0];

    const taskId = `custom-${Date.now()}`;
    const task: TaskTemplate = {
      id: taskId,
      title: newTitle.trim(),
      category: "custom",
      effortUnits: units,
      source: "custom",
      recurrenceType: newScheduleType,
      scheduledDays,
      recurrenceLabel: scheduleLabel(newScheduleType, scheduledDays),
      recurrenceStartYear: seedData.family.year,
      recurrenceStartWeek: selectedWeek,
      reminderEnabled: reminderOption.enabled,
      reminderLeadDays: reminderOption.leadDays,
      reminderTime: newReminderTime.trim() || "18:00",
    };
    const newAssignments = buildCustomTaskAssignments({
      task,
      startWeek: selectedWeek,
      fallbackDay: selectedDay,
      memberId: selectedMemberId === "all" ? defaultMemberId : selectedMemberId,
    });

    setCustomTasks((items) => {
      const updated = [...items, task];
      setStoredItem(storageKeys.customTasks, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    setAssignments((items) => {
      const updated = [...items, ...newAssignments];
      setStoredItem(
        storageKeys.customAssignments,
        JSON.stringify(updated.filter((item) => item.source === "custom")),
      ).catch(() => {});
      if (activeRemoteHouseholdId) {
        runRemoteSync("Aufgabe", () =>
          upsertRemoteTaskWithAssignments({
            householdId: activeRemoteHouseholdId,
            task,
            assignments: updated,
          }),
        );
      }
      return updated;
    });
    setNewTitle("");
    setNewUnits("1");
    setNewScheduleType("once");
    setNewTaskDays([selectedDay]);
    setNewReminderOptionId("none");
    setNewReminderTime("18:00");
  }

  function restoreDefaultTasks() {
    if (!canManagePlan) return;
    setDeletedTaskIds([]);
    setStoredItem(storageKeys.deletedTaskIds, JSON.stringify([])).catch(() => {});
    setAssignments((items) => {
      const existingById = new Map(items.map((assignment) => [assignment.id, assignment]));
      const seedAssignments = members.length ? redistributeSeedAssignments(members) : seedData.assignments;
      const restoredAssignments = seedAssignments.map((assignment) => existingById.get(assignment.id) ?? assignment);
      const seedAssignmentIds = new Set(seedAssignments.map((assignment) => assignment.id));
      const updated = [...restoredAssignments, ...items.filter((assignment) => !seedAssignmentIds.has(assignment.id))];
      saveAssignmentState(updated);
      return updated;
    });
  }

  function toggleNewTaskDay(day: DayName) {
    setNewTaskDays((items) => (items.includes(day) ? items.filter((item) => item !== day) : [...items, day]));
  }

  function selectActiveMember(memberId: string) {
    if (founderMember && activeMemberId !== founderMember.id && memberId !== founderMember.id) return;
    setActiveMemberIdState(memberId);
    setSelectedMemberId(memberId);
    setView("today");
    setStoredItem(storageKeys.activeMemberId, JSON.stringify(memberId)).catch(() => {});
  }

  function resetLocalData() {
    if (!canManagePlan) return;

    removeStoredItems(Object.values(storageKeys)).catch(() => {});
    setView("today");
    setSelectedWeek(seedData.family.availableWeeks.includes(current.week) ? current.week : seedData.family.week);
    setSelectedDay(currentDay);
    setSelectedMemberId("all");
    setMembers([]);
    setAssignments([]);
    setTaskOverrides({});
    setDeletedTaskIds([]);
    setCustomTasks([]);
    setMealOverrides({});
    setFamilyNameState(defaultHouseholdName);
    setActiveMemberIdState("");
    setOnboardingComplete(false);
    setNewTitle("");
    setNewUnits("1");
    setNewScheduleType("once");
    setNewTaskDays([currentDay]);
    setNewReminderOptionId("none");
    setNewReminderTime("18:00");
    setDarkMode(false);
    setDesignSetIdState("homely");
    setAccountEmail("");
    setActiveRemoteHouseholdIdState("");
    setSyncStatus({ state: "local", message: "Nur lokal gespeichert" });
  }

  return {
    accountEmail,
    addMember,
    addTask,
    activeMember,
    activeMemberId: activeMember?.id ?? activeMemberId,
    activeRemoteHouseholdId,
    applyRemoteSnapshot,
    assignments,
    canManagePlan,
    completeOnboarding,
    completion,
    current,
    currentDay,
    darkMode,
    deleteMember,
    deleteTask,
    designSetId,
    familyName,
    founderMemberId: founderMember?.id ?? "",
    hiddenDefaultTaskCount,
    meals,
    members,
    newTitle,
    newUnits,
    newScheduleType,
    newTaskDays,
    newReminderOptionId,
    newReminderTime,
    onboardingComplete,
    selectedDay,
    selectedDayAssignments,
    selectedMeal,
    selectedMemberId,
    selectedWeek,
    selectActiveMember,
    resetLocalData,
    restoreDefaultTasks,
    refreshRemoteSnapshot,
    setDesignSetId,
    setActiveRemoteHouseholdId,
    setNewTitle,
    setNewUnits,
    setNewScheduleType,
    setNewReminderOptionId,
    setNewReminderTime,
    setSelectedDay,
    setSelectedMemberId,
    setSelectedWeek,
    setView,
    syncStatus,
    tasks,
    toggleAssignment,
    toggleDarkMode,
    toggleNewTaskDay,
    updateAssignmentMember,
    updateAccountEmail,
    updateFamilyName,
    updateMeal,
    updateMember,
    updateTask,
    upcomingWeeks,
    view,
    visibleAssignments,
    weekAssignments,
    weekSummary,
  };
}
