const fs = require("fs");
const https = require("https");
const path = require("path");

const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..", "..");

const results = [];
const liveMode = process.argv.includes("--live");
const authLiveMode = process.argv.includes("--auth-live");
const multiAuthLiveMode = process.argv.includes("--multi-auth-live");
const buildMode = process.argv.includes("--build");

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function loadEnv() {
  return [".env", ".env.check.local"].reduce((merged, fileName) => {
    const envPath = path.join(root, fileName);
    if (!fs.existsSync(envPath)) return merged;
    const values = fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .reduce((items, line) => {
        const index = line.indexOf("=");
        if (index === -1) return items;
        items[line.slice(0, index).trim()] = line.slice(index + 1).trim();
        return items;
      }, {});
    return { ...merged, ...values };
  }, {});
}

function requestSupabase(url, publishableKey, pathName, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(pathName, url);
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const request = https.request(
      target,
      {
        method: options.method || "GET",
        headers: {
          apikey: publishableKey,
          authorization: `Bearer ${options.accessToken || publishableKey}`,
          ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}),
          ...(options.headers || {}),
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ status: response.statusCode || 0, body });
        });
      },
    );

    request.on("error", reject);
    request.setTimeout(15000, () => {
      request.destroy(new Error("Supabase request timed out"));
    });
    if (body) request.write(body);
    request.end();
  });
}

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function normalizeShortCode(shortCode) {
  return shortCode.trim().slice(0, 4).toUpperCase() || "M";
}

function normalizeRole(role) {
  return role === "owner" || role === "adult" || role === "child" ? role : "child";
}

function taskPayload(householdId, task) {
  return {
    household_id: householdId,
    client_key: task.id,
    title: task.title.trim(),
    category: task.category || "custom",
    effort_units: task.effortUnits,
    recurrence_type: task.recurrenceType || "once",
    scheduled_days: task.scheduledDays || [],
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

function memberPayload(householdId, member) {
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

function mealPayload(householdId, meal, memberIdByClientKey) {
  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  return {
    household_id: householdId,
    client_key: meal.id,
    year: meal.year,
    week: meal.week,
    day: meal.day,
    day_index: days.indexOf(meal.day) + 1,
    date: meal.date || null,
    title: meal.title.trim(),
    cook_member_id: meal.cookMemberId ? memberIdByClientKey.get(meal.cookMemberId) ?? null : null,
    deleted_at: null,
  };
}

function assignmentPayload(householdId, assignment, taskIdByClientKey, memberIdByClientKey) {
  const taskId = taskIdByClientKey.get(assignment.taskId);
  const memberId = memberIdByClientKey.get(assignment.memberId);
  if (!taskId || !memberId) return null;

  return {
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
    status: assignment.status === "done" || assignment.status === "skipped" || assignment.status === "moved" ? assignment.status : "open",
  };
}

function unitsFor(assignments, tasks, memberId, actual = false) {
  return assignments
    .filter((assignment) => (actual ? assignment.completedByMemberId || assignment.memberId : assignment.memberId) === memberId)
    .reduce((sum, assignment) => sum + (tasks.find((task) => task.id === assignment.taskId)?.effortUnits || 0), 0);
}

const fixture = {
  householdId: "00000000-0000-4000-8000-000000000001",
  members: [
    { id: "m-owner", name: "Alex Admin", shortCode: "aa", role: "owner", color: "#256F63" },
    { id: "m-child", name: "Kim Kind", shortCode: "kk", role: "child", color: "#2563eb" },
  ],
  tasks: [
    {
      id: "t-dishes",
      title: " Spuelmaschine ",
      category: "kitchen",
      effortUnits: 2,
      recurrenceType: "weekly_days",
      scheduledDays: ["Montag", "Mittwoch"],
      recurrenceStartYear: 2026,
      recurrenceStartWeek: 27,
      recurrenceIntervalWeeks: 2,
      recurrenceDayOfMonth: 15,
      recurrenceMonth: 7,
      reminderEnabled: true,
      reminderTime: "18:00",
      reminderLeadDays: 0,
    },
  ],
  assignments: [
    {
      id: "a-dishes-1",
      taskId: "t-dishes",
      memberId: "m-child",
      completedByMemberId: "m-owner",
      year: 2026,
      week: 27,
      day: "Montag",
      dayIndex: 1,
      date: "2026-06-29",
      status: "done",
    },
  ],
  meals: [
    {
      id: "meal-2026-27-1",
      year: 2026,
      week: 27,
      day: "Montag",
      date: "2026-06-29",
      title: " Pasta ",
      cookMemberId: "m-owner",
    },
  ],
};

check("required Supabase migrations exist", () => {
  [
    "0001_homely_core.sql",
    "0002_data_api_grants.sql",
    "0003_create_household_with_owner.sql",
    "0004_add_planner_sync_keys.sql",
    "0005_assignment_client_key_rpcs.sql",
    "0006_delete_household_with_data.sql",
    "0007_account_deletion_support.sql",
    "0008_repair_invitation_and_deletion_rpcs.sql",
    "0009_push_notifications.sql",
    "0010_task_reminder_dispatch.sql",
    "0011_notification_preference_controls.sql",
    "0012_notification_dispatch_expansion.sql",
    "0013_task_recurrence_options.sql",
  ].forEach((file) => {
    assert(exists(`supabase/migrations/${file}`), `Missing migration ${file}`);
  });
});

check("Android production build config is Play-ready", () => {
  const appConfig = readJson("apps/mobile/app.json").expo;
  const easConfig = readJson("apps/mobile/eas.json");
  const packageJson = readJson("apps/mobile/package.json");

  assert(appConfig.name === "Homely", "Expo app name should be Homely");
  assert(
    ["homely", "homely-haushaltsmanager", "right-to-lead"].includes(appConfig.slug),
    "Expo slug should be homely, homely-haushaltsmanager or the currently linked EAS project slug",
  );
  assert(appConfig.scheme === "homely", "Deep-link scheme should be homely");
  assert(appConfig.android?.package === "com.homely.haushaltsmanager", "Android package should be stable for Google Play");
  assert(Number.isInteger(appConfig.android?.versionCode) && appConfig.android.versionCode >= 1, "Android versionCode must be a positive integer");
  assert(appConfig.plugins?.includes("expo-notifications"), "Expo notifications plugin should be configured");
  assert(appConfig.android?.permissions?.includes("POST_NOTIFICATIONS"), "Android should request notification permission explicitly");
  assert(packageJson.dependencies?.["expo-notifications"], "expo-notifications dependency should be installed");
  assert(packageJson.dependencies?.["expo-device"], "expo-device dependency should be installed");
  assert(easConfig.build?.production?.android?.buildType === "app-bundle", "Production build must create an Android App Bundle");
  assert(easConfig.cli?.appVersionSource === "local", "EAS app version source should stay local while app.json is source of truth");
  assert(easConfig.build?.production?.autoIncrement === true, "Production builds should auto-increment Android versionCode");
  assert(packageJson.dependencies?.expo?.startsWith("~54."), "Expo SDK should stay on SDK 54 or newer before Play upload");
});

if (buildMode) {
  check("EAS project link is configured for production builds", () => {
    const appConfig = readJson("apps/mobile/app.json").expo;
    const projectId = appConfig.extra?.eas?.projectId;

    assert(projectId, "Missing extra.eas.projectId. Link Homely to an EAS project before production build.");
    assert(appConfig.name === "Homely", "App name must remain Homely before production build.");
    assert(appConfig.android?.package === "com.homely.haushaltsmanager", "Android package must remain com.homely.haushaltsmanager.");
  });
}

check("client_key schema is present for sync tables", () => {
  const migration = read("supabase/migrations/0004_add_planner_sync_keys.sql");
  ["household_memberships", "tasks", "assignments", "meals"].forEach((table) => {
    assert(migration.includes(`public.${table}`), `Missing client_key migration for ${table}`);
  });
  ["household_memberships_household_client_key_unique", "tasks_household_client_key_unique", "assignments_household_client_key_unique", "meals_household_client_key_unique"].forEach((constraint) => {
    assert(migration.includes(constraint), `Missing unique constraint ${constraint}`);
  });
});

check("assignment RPC migration exposes client-key operations", () => {
  const migration = read("supabase/migrations/0005_assignment_client_key_rpcs.sql");
  assert(migration.includes("mark_assignment_status_by_client_key"), "Missing status RPC");
  assert(migration.includes("update_assignment_member_by_client_key"), "Missing member update RPC");
  assert(migration.includes("grant execute"), "Missing authenticated execute grants");
});

check("household deletion RPC is owner-scoped and soft-deletes household data", () => {
  const migration = read("supabase/migrations/0006_delete_household_with_data.sql");
  assert(migration.includes("delete_household_with_data"), "Missing household deletion RPC");
  assert(migration.includes("is_household_owner"), "Deletion RPC must require owner role");
  ["household_invitations", "assignments", "meals", "tasks", "household_memberships", "households"].forEach((table) => {
    assert(migration.includes(`public.${table}`), `Deletion RPC missing ${table}`);
  });
  assert(migration.includes("grant execute"), "Deletion RPC missing authenticated execute grant");
});

check("remote RPC repair migration is present for invitations and cleanup", () => {
  const migration = read("supabase/migrations/0008_repair_invitation_and_deletion_rpcs.sql");
  assert(migration.includes("extensions.gen_random_bytes"), "Invitation repair should schema-qualify gen_random_bytes");
  assert(migration.includes("extensions.digest"), "Invitation repair should schema-qualify digest");
  assert(migration.includes("create or replace function public.delete_household_with_data"), "Repair should restore deletion RPC");
  assert(migration.includes("grant execute on function public.delete_household_with_data"), "Repair deletion RPC execute grant missing");
});

check("account deletion uses server-side Edge Function and prep RPC", () => {
  const migration = read("supabase/migrations/0007_account_deletion_support.sql");
  const edgeFunction = read("supabase/functions/delete-account/index.ts");
  const authService = read("apps/mobile/src/services/authService.ts");
  assert(migration.includes("prepare_account_deletion"), "Missing account deletion prep RPC");
  assert(migration.includes("on delete set null"), "Account deletion should relax auth user foreign keys");
  assert(edgeFunction.includes("auth.admin.deleteUser"), "Edge Function must delete Auth user server-side");
  assert(
    edgeFunction.includes("HOMELY_SUPABASE_SECRET_KEY") ||
      edgeFunction.includes("SUPABASE_SECRET_KEYS") ||
      edgeFunction.includes("SUPABASE_SERVICE_ROLE_KEY"),
    "Edge Function must use a server secret",
  );
  assert(authService.includes("/functions/v1/delete-account"), "Mobile app should call delete-account Edge Function");
  assert(authService.includes('"x-homely-user-token": accessToken'), "Mobile app should pass user access token to deletion function");
  assert(edgeFunction.includes("x-homely-user-token"), "Edge Function should accept explicit user access token");
});

check("push notification foundation is opt-in and RLS protected", () => {
  const migration = read("supabase/migrations/0009_push_notifications.sql");
  const preferenceMigration = read("supabase/migrations/0011_notification_preference_controls.sql");
  const service = read("apps/mobile/src/services/pushNotificationService.ts");
  const settings = read("apps/mobile/src/screens/SettingsScreen.tsx");
  const databaseHealth = read("apps/mobile/src/services/databaseHealthService.ts");
  assert(migration.includes("create table if not exists public.push_tokens"), "Missing push token table");
  assert(migration.includes("create table if not exists public.notification_preferences"), "Missing notification preferences table");
  assert(migration.includes("enable row level security"), "Push tables must enable RLS");
  assert(migration.includes("user_id = auth.uid()"), "Push policies must be scoped to the signed-in user");
  assert(service.includes("requestPermissionsAsync"), "Push service must ask for notification permission");
  assert(service.includes("getExpoPushTokenAsync"), "Push service must register Expo push token");
  assert(service.includes("sendTestPushNotification"), "Push service should expose a local test notification");
  assert(service.includes("updatePushPreferences"), "Push service should persist user notification preferences");
  assert(preferenceMigration.includes("overdue_reminders_enabled"), "Push preferences should include overdue reminder control");
  assert(preferenceMigration.includes("household_summary_enabled"), "Push preferences should include household summary control");
  assert(settings.includes("Push-Benachrichtigungen") && settings.includes("Push deaktivieren"), "Settings should expose opt-in and opt-out controls");
  assert(settings.includes("Test senden") && settings.includes("Ruhezeiten"), "Settings should expose test notification and quiet hours controls");
  assert(databaseHealth.includes("push_tokens") && databaseHealth.includes("notification_preferences"), "Database health check should include push tables");
});

check("server-side task reminder dispatch is claim-logged and scheduled-ready", () => {
  const migration = read("supabase/migrations/0010_task_reminder_dispatch.sql");
  const preferenceMigration = read("supabase/migrations/0011_notification_preference_controls.sql");
  const expansionMigration = read("supabase/migrations/0012_notification_dispatch_expansion.sql");
  const edgeFunction = read("supabase/functions/send-task-reminders/index.ts");
  const dispatchDoc = read("docs/24-push-reminder-dispatch.md");
  const databaseHealth = read("apps/mobile/src/services/databaseHealthService.ts");
  assert(migration.includes("create table if not exists public.notification_log"), "Reminder dispatch should log notification attempts");
  assert(migration.includes("notification_log_task_reminder_unique"), "Reminder log should prevent duplicate task reminders");
  assert(migration.includes("claim_due_task_reminders"), "Reminder dispatch should claim due reminders atomically");
  assert(migration.includes("grant execute on function public.claim_due_task_reminders"), "Claim RPC should be executable by service role");
  assert(edgeFunction.includes("https://exp.host/--/api/v2/push/send"), "Reminder function should send via Expo Push API");
  assert(edgeFunction.includes("x-homely-reminder-secret"), "Reminder function should require a scheduler secret");
  assert(edgeFunction.includes("DeviceNotRegistered"), "Reminder function should disable unregistered device tokens");
  assert(preferenceMigration.includes("quiet_hours_start") && preferenceMigration.includes("local_due_at"), "Reminder claims should respect quiet hours");
  assert(expansionMigration.includes("notification_key"), "Expanded dispatch should add a reusable notification key");
  assert(expansionMigration.includes("claim_overdue_task_summaries"), "Expanded dispatch should claim overdue summaries");
  assert(expansionMigration.includes("claim_household_status_summaries"), "Expanded dispatch should claim household status summaries");
  assert(edgeFunction.includes("claim_overdue_task_summaries"), "Edge function should send overdue summaries");
  assert(edgeFunction.includes("claim_household_status_summaries"), "Edge function should send household summaries");
  assert(databaseHealth.includes("notification_log"), "Database health check should include notification log table");
  assert(dispatchDoc.includes("pg_cron") && dispatchDoc.includes("0012_notification_dispatch_expansion"), "Reminder dispatch docs should describe Cron and latest deployment");
});

check("member payload normalizes role, short code and soft-delete reset", () => {
  const payload = memberPayload(fixture.householdId, { ...fixture.members[0], shortCode: "alex", role: "manager" });
  assert(payload.short_code === "ALEX", "Short code should be upper-case and max four chars");
  assert(payload.role === "child", "Unexpected roles should normalize to child");
  assert(payload.deleted_at === null, "Upsert should reactivate soft-deleted rows");
});

check("task payload trims title and preserves scheduling fields", () => {
  const payload = taskPayload(fixture.householdId, fixture.tasks[0]);
  assert(payload.title === "Spuelmaschine", "Task title should be trimmed");
  assert(payload.recurrence_type === "weekly_days", "Recurrence type should be preserved");
  assert(payload.scheduled_days.length === 2, "Scheduled days should be preserved");
  assert(payload.recurrence_interval_weeks === 2, "Week interval should be preserved");
  assert(payload.recurrence_day_of_month === 15, "Month day should be preserved");
  assert(payload.recurrence_month === 7, "Yearly month should be preserved");
  assert(payload.reminder_enabled === true, "Reminder flag should be preserved");
});

check("advanced task recurrence stays wired through UI, state and sync", () => {
  const constants = read("apps/mobile/src/constants/planner.ts");
  const plannerState = read("apps/mobile/src/state/usePlannerState.ts");
  const tasks = read("apps/mobile/src/screens/TasksScreen.tsx");
  const syncService = read("apps/mobile/src/services/plannerSyncService.ts");
  const migration = read("supabase/migrations/0013_task_recurrence_options.sql");
  ["every_x_weeks", "monthly", "yearly"].forEach((type) => {
    assert(constants.includes(type), `Missing recurrence option ${type}`);
    assert(plannerState.includes(type), `Planner state missing recurrence handling for ${type}`);
    assert(tasks.includes(type), `Tasks UI missing recurrence controls for ${type}`);
  });
  assert(plannerState.includes("normalizeWeekInterval") && plannerState.includes("recurrenceDayOfMonth"), "Planner should normalize advanced recurrence values");
  assert(tasks.includes("RecurrenceDetailFields"), "Tasks UI should expose detail fields for advanced recurrence");
  assert(syncService.includes("recurrence_interval_weeks") && syncService.includes("recurrence_day_of_month") && syncService.includes("recurrence_month"), "Sync should preserve advanced recurrence fields");
  assert(migration.includes("recurrence_interval_weeks") && migration.includes("tasks_recurrence_month_range"), "Migration should add guarded recurrence columns");
});

check("assignment payload maps client ids to remote ids", () => {
  const taskMap = new Map([["t-dishes", "remote-task"]]);
  const memberMap = new Map([
    ["m-owner", "remote-owner"],
    ["m-child", "remote-child"],
  ]);
  const payload = assignmentPayload(fixture.householdId, fixture.assignments[0], taskMap, memberMap);
  assert(payload.task_id === "remote-task", "Task id should map to remote id");
  assert(payload.member_id === "remote-child", "Assigned member should map to remote id");
  assert(payload.completed_by_member_id === "remote-owner", "Completed-by member should map to remote id");
  assert(payload.status === "done", "Status should be preserved");
});

check("meal payload maps cook member and day index", () => {
  const memberMap = new Map([["m-owner", "remote-owner"]]);
  const payload = mealPayload(fixture.householdId, fixture.meals[0], memberMap);
  assert(payload.title === "Pasta", "Meal title should be trimmed");
  assert(payload.cook_member_id === "remote-owner", "Cook member should map to remote id");
  assert(payload.day_index === 1, "Monday should map to day index 1");
});

check("fairness plan/actual units distinguish assignment and substitute completion", () => {
  const plannedChild = unitsFor(fixture.assignments, fixture.tasks, "m-child");
  const actualOwner = unitsFor(fixture.assignments, fixture.tasks, "m-owner", true);
  assert(plannedChild === 2, "Planned units should count assigned member");
  assert(actualOwner === 2, "Actual units should count completing member");
});

check("source files keep sync-status UI and remote writers connected", () => {
  const plannerState = read("apps/mobile/src/state/usePlannerState.ts");
  const app = read("apps/mobile/App.tsx");
  const hero = read("apps/mobile/src/components/Hero.tsx");
  const settings = read("apps/mobile/src/screens/SettingsScreen.tsx");
  const health = read("apps/mobile/src/services/databaseHealthService.ts");
  const authService = read("apps/mobile/src/services/authService.ts");
  ["runRemoteSync", "upsertRemoteMember", "upsertRemoteMeal", "upsertRemoteTaskWithAssignments", "deleteRemoteTask"].forEach((needle) => {
    assert(plannerState.includes(needle), `Planner state missing ${needle}`);
  });
  assert(hero.includes("syncStatus"), "Hero should show sync status");
  assert(hero.includes("syncNotice") && hero.includes("Cloud-Sync pruefen"), "Hero should explain sync loading and error states");
  assert(settings.includes("deleteRemoteHousehold"), "Settings should expose remote household deletion");
  assert(settings.includes("Sync trennen"), "Settings should expose local sync disconnect");
  assert(settings.includes("requestAccountDeletion"), "Settings should expose account deletion");
  assert(health.includes("delete_household_with_data"), "Database health should check deletion RPC");
  assert(authService.includes("homely://auth/callback"), "Auth service should define mobile redirect URL");
  assert(authService.includes("emailRedirectTo"), "Sign-up should use mobile redirect URL");
  assert(authService.includes("exchangeCodeForSession"), "Auth service should exchange deep-link code for a session");
  assert(app.includes("Linking.addEventListener"), "App should listen for auth deep links");
});

check("professional MVP UI gates are wired", () => {
  const app = read("apps/mobile/App.tsx");
  const plannerState = read("apps/mobile/src/state/usePlannerState.ts");
  const today = read("apps/mobile/src/screens/TodayScreen.tsx");
  const week = read("apps/mobile/src/screens/WeekScreen.tsx");
  const meals = read("apps/mobile/src/screens/MealsScreen.tsx");
  const tasks = read("apps/mobile/src/screens/TasksScreen.tsx");
  const fairness = read("apps/mobile/src/screens/FairnessScreen.tsx");
  const settings = read("apps/mobile/src/screens/SettingsScreen.tsx");
  const onboarding = read("apps/mobile/src/screens/OnboardingScreen.tsx");
  const taskPackages = read("apps/mobile/src/data/taskPackages.ts");
  const family = read("apps/mobile/src/screens/FamilyScreen.tsx");
  const styles = read("apps/mobile/src/styles/plannerStyles.ts");
  assert(app.includes("syncStatus={planner.syncStatus}"), "Settings should receive planner sync status");
  assert(today.includes('"mine" | "all"') && today.includes("Meine"), "Today should support mine/all personal scope");
  assert(
    today.includes("TodayFocus") &&
      today.includes("groupTodayAssignments") &&
      today.includes("Jetzt wichtig") &&
      today.includes("Spaeter heute") &&
      today.includes("Haushalt helfen"),
    "Today should group tasks into personal daily priority sections",
  );
  assert(week.includes("Keine Aufgaben geplant"), "Week day view should explain empty days");
  assert(plannerState.includes("setSelectedMemberId(nextActiveMemberId || \"all\")"), "Planner should start on the active member when available");
  assert(plannerState.includes("setSelectedMemberId(memberId)") && plannerState.includes("setView(\"today\")"), "Active member switching should return to today and personal scope");
  assert(week.includes("modeSummary"), "Week summary should follow selected week mode");
  assert(app.includes("assignments={planner.weekAssignments}") && app.includes("allAssignments={planner.assignments}"), "Fairness should receive week and trend assignments");
  assert(fairness.includes("useMemo") && fairness.includes("taskById"), "Fairness should memoize task lookups");
  assert(fairness.includes("FairnessInsight") && fairness.includes("Entlastungsvorschlag"), "Fairness should explain balance and suggest relief");
  assert(fairness.includes("Im Ziel") && fairness.includes("Traegt mehr") && fairness.includes("Hat Luft"), "Fairness should classify member load");
  assert(fairness.includes("FairnessMetricBar") && fairness.includes("Wochenverlauf"), "Fairness should visualize bars and weekly trend");
  assert(today.includes("Danke-Moment") && plannerState.includes("lastCompletionPraise"), "Completed tasks should create a small thanks moment");
  assert(settings.includes("Fairness & Motivation"), "Settings should describe fairness readiness");
  assert(meals.includes("Tauschen aktiv") && meals.includes("longterm"), "Meals should support long-term swap workflow");
  assert(plannerState.includes("restoreDefaultTasks"), "Planner state should restore default task templates");
  assert(tasks.includes("Vorlagen wiederherstellen"), "Tasks screen should expose default template restore");
  assert(plannerState.includes("activateTaskPackage") && tasks.includes("Musteraufgabenpakete"), "Tasks should allow task packages after onboarding");
  assert(tasks.includes("LongtermTasksOverview") && tasks.includes("Langfristig"), "Tasks screen should include a long-term overview");
  assert(app.includes("assignments={planner.assignments}") && tasks.includes("LongtermTasksOverview"), "Tasks long-term view should receive the full assignment plan");
  assert(tasks.includes("Zuordnung in KW"), "Task editing should expose assignment controls");
  assert(plannerState.includes("applyTaskDefaultMember") && tasks.includes("Uebliche Zustaendigkeit"), "Task editing should support usual/default assignees");
  assert(tasks.includes("buildFairAssignmentPlan") && tasks.includes("Fair verteilen"), "Task editing should offer fair assignment suggestions");
  assert(plannerState.includes("undoDeleteTask") && tasks.includes("Rueckgaengig"), "Task deletion should expose undo");
  assert(tasks.includes("taskEditorCard"), "Task editing should use a dedicated full-width editor card");
  assert(tasks.includes("templateSummary") && tasks.includes("templateActions"), "Task rows should separate summary and actions to avoid narrow overflow");
  assert(meals.includes("mealInfoRow"), "Meal rows should separate info and actions to avoid narrow overflow");
  assert(family.includes("memberSummary") && family.includes("memberActions"), "Household member rows should separate info and actions");
  assert(settings.includes("releaseGateItems") && settings.includes("Play Console"), "Readiness screen should include Play release gates");
  assert(settings.includes("accountArea") && settings.includes("Identitaet") && settings.includes("Cloud"), "Account settings should be grouped into subareas");
  assert(onboarding.includes("Musteraufgabenpakete") && onboarding.includes("selectedTaskPackageIds"), "Onboarding should expose task package selection");
  assert(onboarding.includes("householdProfiles") && onboarding.includes("Startplan-Vorschau"), "Onboarding should guide users with household profiles and preview");
  assert(taskPackages.includes("getTaskPackageSelectionStats"), "Task packages should expose selection stats for onboarding preview");
  assert(taskPackages.includes("Basis-Haushalt") && taskPackages.includes("WG & geteilter Haushalt"), "Task packages should include household-specific starter sets");
  assert(plannerState.includes("getTaskIdsForPackages") && plannerState.includes("deletedSeedTaskIds"), "Onboarding should activate only selected task package templates");
  assert(family.includes("Supabase-Sync aktivierst"), "Privacy copy should mention optional cloud sync");
  assert(styles.includes("navBottomInset = Platform.OS === \"android\" ? 52"), "Android bottom nav inset should protect system controls");
});

check("manual test plan exists for device and Supabase checks", () => {
  const testPlan = read("docs/12-sync-testplan.md");
  ["Supabase-Grundcheck", "Aufgaben", "Essensplan", "Mitglieder", "Einladungen und Rechte"].forEach((section) => {
    assert(testPlan.includes(section), `Test plan missing ${section}`);
  });
});

check("Homely design quality standard covers modern app expectations", () => {
  const designStandard = read("docs/17-homely-design-quality-standard.md");
  [
    "Material Design 3",
    "Android Core App Quality",
    "WCAG 2.2",
    "Heute",
    "Woche",
    "Fairness",
    "Essen",
    "Accessibility",
    "Store-Screenshot-Standard",
  ].forEach((section) => {
    assert(designStandard.includes(section), `Design standard missing ${section}`);
  });
});

check("Google Play release pack is prepared", () => {
  const releasePack = read("docs/18-google-play-release-pack.md");
  const journey = read("docs/19-customer-journey-live-readiness.md");
  const paidRoadmap = read("docs/23-bezahlwuerdige-app-roadmap.md");
  const websiteReadme = read("website/homely-haushaltsmanager.de/README.md");
  const websiteCname = read("website/homely-haushaltsmanager.de/CNAME");
  [
    "Data Safety",
    "Kontoloeschung",
    "Kurzbeschreibung",
    "Feature Graphic",
    "Screenshots",
    "Interner Test",
    "Production AAB",
  ].forEach((section) => {
    assert(releasePack.includes(section), `Release pack missing ${section}`);
  });
  assert(journey.includes("Regelmaessiger Nutzer") && journey.includes("https://aesti.de/datenschutz"), "Customer journey and live readiness doc missing");
  assert(paidRoadmap.includes("Musteraufgabenpakete") && paidRoadmap.includes("Zuverlaessige Erinnerungen"), "Paid-quality roadmap should include packages and reminders");
  assert(websiteReadme.includes("https://aesti.de/datenschutz"), "Website README should use the temporary aesti.de privacy URL");
  assert(websiteCname.trim() === "aesti.de", "GitHub Pages CNAME should point to aesti.de");
});

check("seven concept status reflects current implementation", () => {
  const status = read("docs/25-7-konzepte-status.md");
  const calendarOptions = read("docs/26-kalender-optionen-muell-urlaub.md");
  [
    "Testbenachrichtigung",
    "Ruhezeiten",
    "Startplan-Vorschau",
    "Fair verteilen",
    "Uebliche Zustaendigkeit",
    "Undo nach Aufgabenloeschung",
    "Ueberfaellig-Erinnerungen",
    "Haushaltsstatus fuer Verwalter",
  ].forEach((item) => {
    assert(status.includes(item), `Seven concept status missing ${item}`);
  });
  assert(calendarOptions.includes("Muelltermine") && calendarOptions.includes("Urlaub und Ferien"), "Calendar options should cover trash dates and vacations");
});

async function liveCheck(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

async function runLiveChecks() {
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  await liveCheck("Supabase env is configured", async () => {
    assert(supabaseUrl && /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl), "EXPO_PUBLIC_SUPABASE_URL must be a supabase.co URL");
    assert(publishableKey && publishableKey.startsWith("sb_publishable_"), "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing or not a publishable key");
  });

  if (!supabaseUrl || !publishableKey) return;

  await liveCheck("Supabase REST endpoint is reachable", async () => {
    const response = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/");
    assert(response.status >= 200 && response.status < 500, `Unexpected REST status ${response.status}`);
  });

  await liveCheck("anonymous RLS blocks household data", async () => {
    const tables = ["profiles", "households", "household_memberships", "tasks", "assignments", "meals", "household_invitations"];
    const statuses = await Promise.all(
      tables.map(async (table) => {
        const response = await requestSupabase(supabaseUrl, publishableKey, `/rest/v1/${table}?select=id&limit=1`);
        return { table, status: response.status };
      }),
    );
    const openTables = statuses.filter((item) => item.status >= 200 && item.status < 300);
    assert(!openTables.length, `Anonymous access unexpectedly succeeded for: ${openTables.map((item) => item.table).join(", ")}`);
    const unexpected = statuses.filter((item) => ![401, 403].includes(item.status));
    assert(!unexpected.length, `Unexpected anonymous statuses: ${unexpected.map((item) => `${item.table}:${item.status}`).join(", ")}`);
  });
}

async function signInWithPassword(supabaseUrl, publishableKey, email, password) {
  const response = await requestSupabase(supabaseUrl, publishableKey, "/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  const payload = parseJson(response.body);
  assert(response.status === 200, `Auth sign-in failed with status ${response.status}: ${payload?.msg || payload?.message || response.body}`);
  assert(payload?.access_token, "Auth response did not include an access token");
  return payload;
}

function firstRow(payload) {
  return Array.isArray(payload) ? payload[0] : payload;
}

function assertOk(response, message) {
  const payload = parseJson(response.body);
  assert(response.status >= 200 && response.status < 300, `${message} failed with status ${response.status}: ${response.body}`);
  return payload;
}

function assertBlocked(response, message) {
  assert(response.status >= 400, `${message} unexpectedly succeeded with status ${response.status}`);
}

function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function insertRemoteRow(supabaseUrl, publishableKey, table, accessToken, body) {
  const response = await requestSupabase(supabaseUrl, publishableKey, `/rest/v1/${table}?select=*`, {
    method: "POST",
    accessToken,
    headers: { Prefer: "return=representation" },
    body,
  });
  return assertOk(response, `${table} insert`);
}

async function patchRemoteRows(supabaseUrl, publishableKey, table, filter, accessToken, body) {
  const response = await requestSupabase(supabaseUrl, publishableKey, `/rest/v1/${table}?${filter}&select=*`, {
    method: "PATCH",
    accessToken,
    headers: { Prefer: "return=representation" },
    body,
  });
  return assertOk(response, `${table} patch`);
}

async function runMultiAccountLiveChecks() {
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const ownerEmail = env.HOMELY_OWNER_EMAIL;
  const ownerPassword = env.HOMELY_OWNER_PASSWORD;
  const secondEmail = env.HOMELY_SECOND_EMAIL;
  const secondPassword = env.HOMELY_SECOND_PASSWORD;
  const suffix = uniqueSuffix();
  const ownerClientKey = `owner-${suffix}`;
  const secondClientKey = `second-${suffix}`;
  const taskClientKey = `task-${suffix}`;
  const assignmentClientKey = `assignment-${suffix}`;
  const mealClientKey = `meal-${suffix}`;
  let ownerToken = "";
  let secondToken = "";
  let householdId = "";
  let ownerMembershipId = "";
  let secondMembershipId = "";
  let taskId = "";

  await liveCheck("multi-account env is configured", async () => {
    assert(supabaseUrl && /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl), "EXPO_PUBLIC_SUPABASE_URL must be configured");
    assert(publishableKey && publishableKey.startsWith("sb_publishable_"), "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured");
    assert(
      ownerEmail && ownerPassword && secondEmail && secondPassword,
      "HOMELY_OWNER_EMAIL, HOMELY_OWNER_PASSWORD, HOMELY_SECOND_EMAIL and HOMELY_SECOND_PASSWORD must be set in apps/mobile/.env.check.local",
    );
    assert(ownerEmail !== secondEmail, "Owner and second account must use different e-mail addresses");
  });

  if (!supabaseUrl || !publishableKey || !ownerEmail || !ownerPassword || !secondEmail || !secondPassword) return;

  await liveCheck("owner account can sign in", async () => {
    ownerToken = (await signInWithPassword(supabaseUrl, publishableKey, ownerEmail, ownerPassword)).access_token;
  });

  await liveCheck("second account can sign in", async () => {
    secondToken = (await signInWithPassword(supabaseUrl, publishableKey, secondEmail, secondPassword)).access_token;
  });

  if (!ownerToken || !secondToken) return;

  try {
    await liveCheck("owner can create household and seed plan", async () => {
      const createHouseholdResponse = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/create_household_with_owner", {
        method: "POST",
        accessToken: ownerToken,
        body: {
          target_name: `Homely Mehrkonto Test ${suffix}`,
          owner_display_name: "Gruender Test",
          owner_short_code: "GT",
          owner_color: "#256F63",
        },
      });
      const createdHousehold = firstRow(assertOk(createHouseholdResponse, "create_household_with_owner"));
      householdId = createdHousehold?.household_id;
      ownerMembershipId = createdHousehold?.membership_id;
      assert(householdId && ownerMembershipId, "Household creation response did not include ids");

      const ownerRows = await patchRemoteRows(
        supabaseUrl,
        publishableKey,
        "household_memberships",
        `id=eq.${ownerMembershipId}`,
        ownerToken,
        { client_key: ownerClientKey },
      );
      assert(firstRow(ownerRows)?.client_key === ownerClientKey, "Owner client key was not stored");

      const tasks = await insertRemoteRow(supabaseUrl, publishableKey, "tasks", ownerToken, {
        household_id: householdId,
        client_key: taskClientKey,
        title: "Mehrkonto Testaufgabe",
        category: "test",
        effort_units: 2,
        recurrence_type: "weekly_days",
        scheduled_days: ["Montag"],
        recurrence_start_year: 2026,
        recurrence_start_week: 28,
        reminder_enabled: false,
        reminder_lead_days: 0,
        deleted_at: null,
      });
      taskId = firstRow(tasks)?.id;
      assert(taskId, "Task insert response did not include id");

      const assignments = await insertRemoteRow(supabaseUrl, publishableKey, "assignments", ownerToken, {
        household_id: householdId,
        client_key: assignmentClientKey,
        task_id: taskId,
        member_id: ownerMembershipId,
        year: 2026,
        week: 28,
        day: "Montag",
        day_index: 1,
        date: "2026-07-06",
        status: "open",
        deleted_at: null,
      });
      assert(firstRow(assignments)?.client_key === assignmentClientKey, "Assignment was not seeded");

      const meals = await insertRemoteRow(supabaseUrl, publishableKey, "meals", ownerToken, {
        household_id: householdId,
        client_key: mealClientKey,
        year: 2026,
        week: 28,
        day: "Montag",
        day_index: 1,
        date: "2026-07-06",
        title: "Mehrkonto Testessen",
        cook_member_id: ownerMembershipId,
        deleted_at: null,
      });
      assert(firstRow(meals)?.client_key === mealClientKey, "Meal was not seeded");
    });

    await liveCheck("owner can invite second account as member", async () => {
      const inviteResponse = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/create_household_invitation", {
        method: "POST",
        accessToken: ownerToken,
        body: {
          target_household_id: householdId,
          target_display_name: "Mitglied Test",
          target_short_code: "MT",
          target_role: "child",
          target_invited_email: secondEmail,
          target_color: "#2563eb",
        },
      });
      const invitation = firstRow(assertOk(inviteResponse, "create_household_invitation"));
      assert(invitation?.invitation_code, "Invitation response did not include a code");

      const acceptResponse = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/accept_household_invitation", {
        method: "POST",
        accessToken: secondToken,
        body: { invitation_code: invitation.invitation_code },
      });
      const membership = assertOk(acceptResponse, "accept_household_invitation");
      secondMembershipId = membership?.id;
      assert(secondMembershipId, "Invitation accept response did not include second membership id");

      const secondRows = await patchRemoteRows(
        supabaseUrl,
        publishableKey,
        "household_memberships",
        `id=eq.${secondMembershipId}`,
        ownerToken,
        { client_key: secondClientKey },
      );
      assert(firstRow(secondRows)?.client_key === secondClientKey, "Second member client key was not stored");
    });

    await liveCheck("second account sees shared household and plan", async () => {
      const householdsResponse = await requestSupabase(
        supabaseUrl,
        publishableKey,
        `/rest/v1/households?select=id,name&id=eq.${householdId}&deleted_at=is.null`,
        { accessToken: secondToken },
      );
      const households = assertOk(householdsResponse, "second household select");
      assert(Array.isArray(households) && households.length === 1, "Second account cannot see the shared household");

      for (const table of ["tasks", "assignments", "meals"]) {
        const response = await requestSupabase(
          supabaseUrl,
          publishableKey,
          `/rest/v1/${table}?select=id&household_id=eq.${householdId}&deleted_at=is.null&limit=1`,
          { accessToken: secondToken },
        );
        const rows = assertOk(response, `second ${table} select`);
        assert(Array.isArray(rows) && rows.length === 1, `Second account cannot see seeded ${table}`);
      }
    });

    await liveCheck("member may complete but not manage plan", async () => {
      const markResponse = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/mark_assignment_status_by_client_key", {
        method: "POST",
        accessToken: secondToken,
        body: {
          target_household_id: householdId,
          target_assignment_client_key: assignmentClientKey,
          target_status: "done",
        },
      });
      const marked = assertOk(markResponse, "member mark assignment");
      assert(marked?.completed_by_member_id === secondMembershipId, "Completed-by member should be the second account");

      const blockedTaskInsert = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/tasks", {
        method: "POST",
        accessToken: secondToken,
        body: {
          household_id: householdId,
          client_key: `blocked-task-${suffix}`,
          title: "Soll blockiert sein",
          category: "test",
          effort_units: 1,
          recurrence_type: "once",
          scheduled_days: [],
          reminder_enabled: false,
          reminder_lead_days: 0,
          deleted_at: null,
        },
      });
      assertBlocked(blockedTaskInsert, "member task insert");

      const blockedReassign = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/update_assignment_member_by_client_key", {
        method: "POST",
        accessToken: secondToken,
        body: {
          target_household_id: householdId,
          target_assignment_client_key: assignmentClientKey,
          target_member_client_key: secondClientKey,
        },
      });
      assertBlocked(blockedReassign, "member assignment reassignment");
    });

    await liveCheck("promoted manager can manage tasks and assignments", async () => {
      const promotedRows = await patchRemoteRows(
        supabaseUrl,
        publishableKey,
        "household_memberships",
        `id=eq.${secondMembershipId}`,
        ownerToken,
        { role: "adult" },
      );
      assert(firstRow(promotedRows)?.role === "adult", "Second account was not promoted to adult");

      const managerTaskRows = await insertRemoteRow(supabaseUrl, publishableKey, "tasks", secondToken, {
        household_id: householdId,
        client_key: `manager-task-${suffix}`,
        title: "Verwalter Testaufgabe",
        category: "test",
        effort_units: 1,
        recurrence_type: "once",
        scheduled_days: [],
        reminder_enabled: false,
        reminder_lead_days: 0,
        deleted_at: null,
      });
      assert(firstRow(managerTaskRows)?.client_key === `manager-task-${suffix}`, "Promoted manager could not create a task");

      const reassignResponse = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/update_assignment_member_by_client_key", {
        method: "POST",
        accessToken: secondToken,
        body: {
          target_household_id: householdId,
          target_assignment_client_key: assignmentClientKey,
          target_member_client_key: secondClientKey,
        },
      });
      const reassigned = assertOk(reassignResponse, "manager assignment reassignment");
      assert(reassigned?.member_id === secondMembershipId, "Promoted manager did not reassign assignment to self");
    });
  } finally {
    if (householdId && ownerToken) {
      await liveCheck("temporary multi-account household is cleaned up", async () => {
        const deleteResponse = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/delete_household_with_data", {
          method: "POST",
          accessToken: ownerToken,
          body: { target_household_id: householdId },
        });
        assert(deleteResponse.status >= 200 && deleteResponse.status < 300, `Cleanup failed with status ${deleteResponse.status}: ${deleteResponse.body}`);
      });
    }
  }
}

async function runAuthenticatedLiveChecks() {
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const email = env.HOMELY_CHECK_EMAIL;
  const password = env.HOMELY_CHECK_PASSWORD;
  let accessToken = "";
  let households = [];

  await liveCheck("authenticated check env is configured", async () => {
    assert(supabaseUrl && /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl), "EXPO_PUBLIC_SUPABASE_URL must be configured");
    assert(publishableKey && publishableKey.startsWith("sb_publishable_"), "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured");
    assert(email && password, "HOMELY_CHECK_EMAIL and HOMELY_CHECK_PASSWORD must be set in apps/mobile/.env.check.local");
  });

  if (!supabaseUrl || !publishableKey || !email || !password) return;

  await liveCheck("test account can sign in", async () => {
    accessToken = (await signInWithPassword(supabaseUrl, publishableKey, email, password)).access_token;
  });

  await liveCheck("authenticated account can load households", async () => {
    const response = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/households?select=id,name&deleted_at=is.null&limit=10", {
      accessToken,
    });
    assert(response.status === 200, `Household query failed with status ${response.status}`);
    households = parseJson(response.body) || [];
    assert(Array.isArray(households), "Household response must be an array");
  });

  await liveCheck("authenticated account sees only member-scoped rows", async () => {
    if (!households.length) return;
    const householdId = households[0].id;
    const tables = ["household_memberships", "tasks", "assignments", "meals"];
    for (const table of tables) {
      const response = await requestSupabase(
        supabaseUrl,
        publishableKey,
        `/rest/v1/${table}?select=id&household_id=eq.${householdId}&limit=1`,
        { accessToken },
      );
      assert(response.status === 200, `${table} query failed with status ${response.status}`);
    }
  });

  await liveCheck("authenticated account can access invitation RPC metadata", async () => {
    const response = await requestSupabase(supabaseUrl, publishableKey, "/rest/v1/rpc/current_membership_id", {
      method: "POST",
      accessToken,
      body: { target_household_id: households[0]?.id || "00000000-0000-4000-8000-000000000000" },
    });
    assert([200, 400, 404].includes(response.status), `Unexpected RPC status ${response.status}`);
  });
}

async function main() {
  if (liveMode || authLiveMode || multiAuthLiveMode) {
    await runLiveChecks();
  }
  if (authLiveMode) {
    await runAuthenticatedLiveChecks();
  }
  if (multiAuthLiveMode) {
    await runMultiAccountLiveChecks();
  }

  const failed = results.filter((result) => !result.ok);

  for (const result of results) {
    if (result.ok) {
      console.log(`OK  ${result.name}`);
    } else {
      console.error(`ERR ${result.name}: ${result.message}`);
    }
  }

  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
