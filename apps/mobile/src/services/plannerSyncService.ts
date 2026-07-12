import { Assignment, DayName, MealPlanEntry, Member, TaskTemplate } from "../utils/planner";
import { scheduleLabel, type NewTaskScheduleType } from "../constants/planner";
import { requireSupabase } from "./supabaseClient";

export type PlannerSnapshot = {
  householdName: string;
  members: Member[];
  tasks: TaskTemplate[];
  assignments: Assignment[];
  meals: MealPlanEntry[];
};

export type PlannerSyncResult = {
  memberCount: number;
  taskCount: number;
  assignmentCount: number;
  mealCount: number;
};

type ServiceResult<T = undefined> = {
  ok: boolean;
  message: string;
  data?: T;
};

type RemoteMemberRow = {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  short_code: string;
  role: string;
  color: string;
  client_key: string | null;
};

type RemoteTaskRow = {
  id: string;
  title: string;
  category: string;
  effort_units: number | string;
  recurrence_type: string;
  scheduled_days: DayName[] | null;
  recurrence_start_year: number | null;
  recurrence_start_week: number | null;
  recurrence_interval_weeks: number | null;
  recurrence_day_of_month: number | null;
  recurrence_month: number | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  reminder_lead_days: number;
  client_key: string | null;
};

type RemoteAssignmentRow = {
  id: string;
  task_id: string;
  member_id: string;
  completed_by_member_id: string | null;
  year: number;
  week: number;
  day: DayName;
  day_index: number;
  date: string | null;
  status: Assignment["status"];
  client_key: string | null;
};

type RemoteMealRow = {
  id: string;
  year: number;
  week: number;
  day: DayName;
  day_index: number;
  date: string | null;
  title: string;
  cook_member_id: string | null;
  client_key: string | null;
};

type AssignmentUpsertRow = {
  household_id: string;
  client_key: string;
  task_id: string;
  member_id: string;
  completed_by_member_id: string | null;
  year: number;
  week: number;
  day: DayName;
  day_index: number;
  date: string | null;
  status: Assignment["status"];
};

type MealUpsertRow = {
  household_id: string;
  client_key: string;
  year: number;
  week: number;
  day: DayName;
  day_index: number;
  date: string | null;
  title: string;
  cook_member_id: string | null;
  deleted_at: null;
};

const dayNames: DayName[] = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function taskPayload(householdId: string, task: TaskTemplate) {
  return {
    household_id: householdId,
    client_key: task.id,
    title: task.title.trim(),
    category: task.category || "custom",
    effort_units: task.effortUnits,
    recurrence_type: task.recurrenceType || "once",
    scheduled_days: task.scheduledDays ?? [],
    recurrence_start_year: task.recurrenceStartYear ?? null,
    recurrence_start_week: task.recurrenceStartWeek ?? null,
    recurrence_interval_weeks: task.recurrenceIntervalWeeks ?? null,
    recurrence_day_of_month: task.recurrenceDayOfMonth ?? null,
    recurrence_month: task.recurrenceMonth ?? null,
    reminder_enabled: !!task.reminderEnabled,
    reminder_time: task.reminderTime ?? null,
    reminder_lead_days: task.reminderLeadDays ?? 0,
    deleted_at: null,
  };
}

function mealPayload(householdId: string, meal: MealPlanEntry, memberIdByClientKey: Map<string | null, string>): MealUpsertRow {
  return {
    household_id: householdId,
    client_key: meal.id,
    year: meal.year,
    week: meal.week,
    day: meal.day,
    day_index: dayNames.indexOf(meal.day) + 1,
    date: meal.date || null,
    title: meal.title.trim(),
    cook_member_id: meal.cookMemberId ? memberIdByClientKey.get(meal.cookMemberId) ?? null : null,
    deleted_at: null,
  };
}

function serviceError(message?: string) {
  if (!message) return "Die Sync-Aktion konnte nicht abgeschlossen werden.";
  if (message.includes("client_key")) {
    return "Die Sync-Spalten fehlen noch. Bitte Migration 0004_add_planner_sync_keys.sql in Supabase ausfuehren.";
  }
  if (message.includes("row-level security")) return "Supabase blockiert die Aktion per RLS. Bitte pruefen, ob du Gruender oder Verwalter bist.";
  if (message.includes("duplicate key")) return "Ein Name, Kuerzel oder Sync-Schluessel existiert bereits im Haushalt.";
  return message;
}

function normalizeRole(role: string) {
  return role === "owner" || role === "adult" || role === "child" ? role : "child";
}

function normalizeStatus(status: Assignment["status"]): Assignment["status"] {
  return status === "done" || status === "skipped" || status === "moved" ? status : "open";
}

function normalizeShortCode(shortCode: string) {
  return shortCode.trim().slice(0, 4).toUpperCase() || "M";
}

function memberPayload(householdId: string, member: Member) {
  const shortCode = normalizeShortCode(member.shortCode);
  return {
    household_id: householdId,
    client_key: member.id,
    display_name: member.name.trim() || shortCode,
    short_code: shortCode,
    role: normalizeRole(member.role),
    color: member.color,
    deleted_at: null,
  };
}

async function fetchMembers(client: NonNullable<ReturnType<typeof requireSupabase>["client"]>, householdId: string) {
  const { data, error } = await client
    .from("household_memberships")
    .select("id,household_id,user_id,display_name,short_code,role,color,client_key")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as RemoteMemberRow[];
}

async function syncMembers(
  client: NonNullable<ReturnType<typeof requireSupabase>["client"]>,
  householdId: string,
  members: Member[],
) {
  const remoteMembers = await fetchMembers(client, householdId);

  for (const member of members) {
    const shortCode = normalizeShortCode(member.shortCode);
    const existing =
      remoteMembers.find((item) => item.client_key === member.id) ||
      remoteMembers.find((item) => item.short_code.toUpperCase() === shortCode);

    const payload = memberPayload(householdId, member);

    const result = existing
      ? await client.from("household_memberships").update(payload).eq("id", existing.id)
      : await client.from("household_memberships").insert(payload);

    if (result.error) throw new Error(result.error.message);
  }

  return fetchMembers(client, householdId);
}

export async function upsertRemoteMember({
  householdId,
  member,
}: {
  householdId: string;
  member: Member;
}): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Kein aktiver Sync-Haushalt gesetzt." };

  try {
    const remoteMembers = await fetchMembers(client, householdId);
    const shortCode = normalizeShortCode(member.shortCode);
    const existing =
      remoteMembers.find((item) => item.client_key === member.id) ||
      remoteMembers.find((item) => item.short_code.toUpperCase() === shortCode);
    const payload = memberPayload(householdId, member);
    const result = existing
      ? await client.from("household_memberships").update(payload).eq("id", existing.id)
      : await client.from("household_memberships").insert(payload);

    if (result.error) throw new Error(result.error.message);
    return { ok: true, message: "Mitglied synchronisiert." };
  } catch (syncError) {
    return { ok: false, message: serviceError(syncError instanceof Error ? syncError.message : undefined) };
  }
}

export async function deleteRemoteMember({
  householdId,
  memberId,
}: {
  householdId: string;
  memberId: string;
}): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Kein aktiver Sync-Haushalt gesetzt." };

  const deletedShortCode = `D${Date.now().toString(36).slice(-3).toUpperCase()}`;
  const { error: updateError } = await client
    .from("household_memberships")
    .update({ deleted_at: new Date().toISOString(), short_code: deletedShortCode })
    .eq("household_id", householdId)
    .eq("client_key", memberId);

  if (updateError) return { ok: false, message: serviceError(updateError.message) };
  return { ok: true, message: "Mitglied remote geloescht." };
}

export async function uploadPlannerSnapshot({
  householdId,
  householdName,
  members,
  tasks,
  assignments,
  meals,
}: PlannerSnapshot & { householdId: string }): Promise<ServiceResult<PlannerSyncResult>> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Bitte zuerst einen Supabase-Haushalt waehlen." };
  if (!members.length || !tasks.length) return { ok: false, message: "Es gibt noch keine lokalen Mitglieder oder Aufgaben zum Synchronisieren." };

  try {
    const householdUpdate = await client.from("households").update({ name: householdName.trim() || "Mein Haushalt" }).eq("id", householdId);
    if (householdUpdate.error) throw new Error(householdUpdate.error.message);

    const syncedMembers = await syncMembers(client, householdId, members);
    const memberIdByClientKey = new Map(syncedMembers.map((member) => [member.client_key, member.id]));

    const taskRows = tasks.map((task) => taskPayload(householdId, task));

    const taskUpsert = await client
      .from("tasks")
      .upsert(taskRows, { onConflict: "household_id,client_key" })
      .select("id,client_key");
    if (taskUpsert.error) throw new Error(taskUpsert.error.message);

    const remoteTaskRows = (taskUpsert.data ?? []) as Array<{ id: string; client_key: string | null }>;
    const taskIdByClientKey = new Map(remoteTaskRows.map((task) => [task.client_key, task.id]));

    const assignmentRows = assignments.reduce<AssignmentUpsertRow[]>((rows, assignment) => {
      const taskId = taskIdByClientKey.get(assignment.taskId);
      const memberId = memberIdByClientKey.get(assignment.memberId);
      if (!taskId || !memberId) return rows;

      rows.push({
        household_id: householdId,
        client_key: assignment.id,
        task_id: taskId,
        member_id: memberId,
        completed_by_member_id: assignment.completedByMemberId ? memberIdByClientKey.get(assignment.completedByMemberId) ?? null : null,
        year: assignment.year,
        week: assignment.week,
        day: assignment.day,
        day_index: assignment.dayIndex,
        date: assignment.date || null,
        status: normalizeStatus(assignment.status),
      });
      return rows;
    }, []);

    if (assignmentRows.length) {
      const assignmentUpsert = await client
        .from("assignments")
        .upsert(assignmentRows, { onConflict: "household_id,client_key" });
      if (assignmentUpsert.error) throw new Error(assignmentUpsert.error.message);
    }

    const mealRows = meals.map((meal) => mealPayload(householdId, meal, memberIdByClientKey));
    if (mealRows.length) {
      const mealUpsert = await client.from("meals").upsert(mealRows, { onConflict: "household_id,client_key" });
      if (mealUpsert.error) throw new Error(mealUpsert.error.message);
    }

    return {
      ok: true,
      message: `${members.length} Mitglieder, ${tasks.length} Aufgaben, ${assignmentRows.length} Zuordnungen und ${mealRows.length} Essen synchronisiert.`,
      data: { memberCount: members.length, taskCount: tasks.length, assignmentCount: assignmentRows.length, mealCount: mealRows.length },
    };
  } catch (syncError) {
    return { ok: false, message: serviceError(syncError instanceof Error ? syncError.message : undefined) };
  }
}

export async function upsertRemoteTaskWithAssignments({
  householdId,
  task,
  assignments,
}: {
  householdId: string;
  task: TaskTemplate;
  assignments: Assignment[];
}): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Kein aktiver Sync-Haushalt gesetzt." };

  try {
    const { data: taskData, error: taskError } = await client
      .from("tasks")
      .upsert(taskPayload(householdId, task), { onConflict: "household_id,client_key" })
      .select("id")
      .single();
    if (taskError || !taskData) throw new Error(taskError?.message);

    const taskAssignments = assignments.filter((assignment) => assignment.taskId === task.id);
    if (!taskAssignments.length) return { ok: true, message: "Aufgabe synchronisiert." };

    const syncedMembers = await fetchMembers(client, householdId);
    const memberIdByClientKey = new Map(syncedMembers.map((member) => [member.client_key, member.id]));
    const assignmentRows = taskAssignments.reduce<AssignmentUpsertRow[]>((rows, assignment) => {
      const memberId = memberIdByClientKey.get(assignment.memberId);
      if (!memberId) return rows;
      rows.push({
        household_id: householdId,
        client_key: assignment.id,
        task_id: taskData.id,
        member_id: memberId,
        completed_by_member_id: assignment.completedByMemberId ? memberIdByClientKey.get(assignment.completedByMemberId) ?? null : null,
        year: assignment.year,
        week: assignment.week,
        day: assignment.day,
        day_index: assignment.dayIndex,
        date: assignment.date || null,
        status: normalizeStatus(assignment.status),
      });
      return rows;
    }, []);

    if (assignmentRows.length) {
      const { error: assignmentError } = await client
        .from("assignments")
        .upsert(assignmentRows, { onConflict: "household_id,client_key" });
      if (assignmentError) throw new Error(assignmentError.message);
    }

    return { ok: true, message: "Aufgabe und Zuordnungen synchronisiert." };
  } catch (syncError) {
    return { ok: false, message: serviceError(syncError instanceof Error ? syncError.message : undefined) };
  }
}

export async function deleteRemoteTask({
  householdId,
  taskId,
}: {
  householdId: string;
  taskId: string;
}): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Kein aktiver Sync-Haushalt gesetzt." };

  try {
    const { data: taskData, error: taskLookupError } = await client
      .from("tasks")
      .select("id")
      .eq("household_id", householdId)
      .eq("client_key", taskId)
      .maybeSingle();
    if (taskLookupError) throw new Error(taskLookupError.message);
    if (!taskData) return { ok: true, message: "Aufgabe war remote noch nicht vorhanden." };

    const timestamp = new Date().toISOString();
    const assignmentDelete = await client
      .from("assignments")
      .update({ deleted_at: timestamp })
      .eq("household_id", householdId)
      .eq("task_id", taskData.id);
    if (assignmentDelete.error) throw new Error(assignmentDelete.error.message);

    const taskDelete = await client
      .from("tasks")
      .update({ deleted_at: timestamp })
      .eq("household_id", householdId)
      .eq("client_key", taskId);
    if (taskDelete.error) throw new Error(taskDelete.error.message);

    return { ok: true, message: "Aufgabe remote geloescht." };
  } catch (syncError) {
    return { ok: false, message: serviceError(syncError instanceof Error ? syncError.message : undefined) };
  }
}

export async function upsertRemoteMeal({
  householdId,
  meal,
}: {
  householdId: string;
  meal: MealPlanEntry;
}): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Kein aktiver Sync-Haushalt gesetzt." };

  try {
    const syncedMembers = await fetchMembers(client, householdId);
    const memberIdByClientKey = new Map(syncedMembers.map((member) => [member.client_key, member.id]));
    const { error: mealError } = await client
      .from("meals")
      .upsert(mealPayload(householdId, meal, memberIdByClientKey), { onConflict: "household_id,client_key" });
    if (mealError) throw new Error(mealError.message);

    return { ok: true, message: "Essensplan synchronisiert." };
  } catch (syncError) {
    return { ok: false, message: serviceError(syncError instanceof Error ? syncError.message : undefined) };
  }
}

export async function downloadPlannerSnapshot(householdId: string): Promise<ServiceResult<PlannerSnapshot>> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Bitte zuerst einen Supabase-Haushalt waehlen." };

  try {
    const { data: household, error: householdError } = await client
      .from("households")
      .select("name")
      .eq("id", householdId)
      .single();
    if (householdError) throw new Error(householdError.message);

    const members = await fetchMembers(client, householdId);
    const { data: tasksData, error: tasksError } = await client
      .from("tasks")
      .select(
        "id,title,category,effort_units,recurrence_type,scheduled_days,recurrence_start_year,recurrence_start_week,recurrence_interval_weeks,recurrence_day_of_month,recurrence_month,reminder_enabled,reminder_time,reminder_lead_days,client_key",
      )
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (tasksError) throw new Error(tasksError.message);

    const { data: assignmentsData, error: assignmentsError } = await client
      .from("assignments")
      .select("id,task_id,member_id,completed_by_member_id,year,week,day,day_index,date,status,client_key")
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("year", { ascending: true })
      .order("week", { ascending: true })
      .order("day_index", { ascending: true });
    if (assignmentsError) throw new Error(assignmentsError.message);

    const { data: mealsData, error: mealsError } = await client
      .from("meals")
      .select("id,year,week,day,day_index,date,title,cook_member_id,client_key")
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("year", { ascending: true })
      .order("week", { ascending: true })
      .order("day_index", { ascending: true });
    if (mealsError) throw new Error(mealsError.message);

    const remoteTasks = (tasksData ?? []) as RemoteTaskRow[];
    const remoteAssignments = (assignmentsData ?? []) as RemoteAssignmentRow[];
    const remoteMeals = (mealsData ?? []) as RemoteMealRow[];
    const taskClientKeyById = new Map(remoteTasks.map((task) => [task.id, task.client_key ?? task.id]));
    const memberClientKeyById = new Map(members.map((member) => [member.id, member.client_key ?? member.id]));

    return {
      ok: true,
      message: `${remoteTasks.length} Aufgaben, ${remoteAssignments.length} Zuordnungen und ${remoteMeals.length} Essen aus Supabase geladen.`,
      data: {
        householdName: household?.name || "Mein Haushalt",
        members: members.map((member) => ({
          id: member.client_key ?? member.id,
          name: member.display_name,
          shortCode: member.short_code,
          role: member.role,
          color: member.color,
          source: "remote",
        })),
        tasks: remoteTasks.map((task) => {
          const scheduledDays = task.scheduled_days ?? [];
          const recurrenceType = (task.recurrence_type || "once") as NewTaskScheduleType;
          return {
            id: task.client_key ?? task.id,
            title: task.title,
            category: task.category,
            effortUnits: Number(task.effort_units),
            source: "remote",
            recurrenceType,
            scheduledDays,
            recurrenceLabel: scheduleLabel(recurrenceType, scheduledDays, {
              intervalWeeks: task.recurrence_interval_weeks ?? undefined,
              dayOfMonth: task.recurrence_day_of_month ?? undefined,
              month: task.recurrence_month ?? undefined,
            }),
            recurrenceStartYear: task.recurrence_start_year ?? undefined,
            recurrenceStartWeek: task.recurrence_start_week ?? undefined,
            recurrenceIntervalWeeks: task.recurrence_interval_weeks ?? undefined,
            recurrenceDayOfMonth: task.recurrence_day_of_month ?? undefined,
            recurrenceMonth: task.recurrence_month ?? undefined,
            reminderEnabled: task.reminder_enabled,
            reminderTime: task.reminder_time ?? undefined,
            reminderLeadDays: task.reminder_lead_days,
          };
        }),
        assignments: remoteAssignments
          .map((assignment) => {
            const taskId = taskClientKeyById.get(assignment.task_id);
            const memberId = memberClientKeyById.get(assignment.member_id);
            if (!taskId || !memberId) return null;

            return {
              id: assignment.client_key ?? assignment.id,
              year: assignment.year,
              week: assignment.week,
              date: assignment.date ?? "",
              taskId,
              memberId,
              completedByMemberId: assignment.completed_by_member_id
                ? memberClientKeyById.get(assignment.completed_by_member_id)
                : undefined,
              day: assignment.day,
              dayIndex: assignment.day_index,
              status: normalizeStatus(assignment.status),
              source: "remote",
            };
          })
          .filter(Boolean) as Assignment[],
        meals: remoteMeals.map((meal) => ({
          id: meal.client_key ?? meal.id,
          year: meal.year,
          week: meal.week,
          date: meal.date,
          day: meal.day,
          dayIndex: meal.day_index,
          title: meal.title,
          cookMemberId: meal.cook_member_id ? memberClientKeyById.get(meal.cook_member_id) ?? null : null,
          sourceWeek: undefined,
        })),
      },
    };
  } catch (syncError) {
    return { ok: false, message: serviceError(syncError instanceof Error ? syncError.message : undefined) };
  }
}

export async function markRemoteAssignmentStatus({
  householdId,
  assignmentId,
  status,
}: {
  householdId: string;
  assignmentId: string;
  status: Assignment["status"];
}): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Kein aktiver Sync-Haushalt gesetzt." };

  const { error: rpcError } = await client.rpc("mark_assignment_status_by_client_key", {
    target_household_id: householdId,
    target_assignment_client_key: assignmentId,
    target_status: normalizeStatus(status),
  });

  if (rpcError) return { ok: false, message: serviceError(rpcError.message) };
  return { ok: true, message: "Aufgabenstatus synchronisiert." };
}

export async function updateRemoteAssignmentMember({
  householdId,
  assignmentId,
  memberId,
}: {
  householdId: string;
  assignmentId: string;
  memberId: string;
}): Promise<ServiceResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!householdId) return { ok: false, message: "Kein aktiver Sync-Haushalt gesetzt." };

  const { error: rpcError } = await client.rpc("update_assignment_member_by_client_key", {
    target_household_id: householdId,
    target_assignment_client_key: assignmentId,
    target_member_client_key: memberId,
  });

  if (rpcError) return { ok: false, message: serviceError(rpcError.message) };
  return { ok: true, message: "Aufgabenzuordnung synchronisiert." };
}
