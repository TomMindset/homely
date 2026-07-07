const app = document.querySelector("#app");
const seedData = window.seedData;

const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const storageKeys = {
  customTasks: "familyPlanner.customTasks",
  customAssignments: "familyPlanner.customAssignments",
  doneAssignments: "familyPlanner.doneAssignments",
};

function loadStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getIsoWeekInfo(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

function getDayName(date) {
  return days[(date.getDay() + 6) % 7];
}

function getDateForWeekDay(year, week, dayName) {
  const dayIndex = days.indexOf(dayName) + 1;
  const simple = new Date(Date.UTC(year, 0, 4));
  const simpleDay = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - simpleDay + 1 + (week - 1) * 7);
  const target = new Date(monday);
  target.setUTCDate(monday.getUTCDate() + dayIndex - 1);
  return target;
}

function formatDate(date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

const today = new Date();
const currentIso = getIsoWeekInfo(today);
const currentDay = getDayName(today);
const storedDoneAssignments = new Set(loadStoredJson(storageKeys.doneAssignments, []));
const storedCustomTasks = loadStoredJson(storageKeys.customTasks, []);
const storedCustomAssignments = loadStoredJson(storageKeys.customAssignments, []);

const state = {
  view: "today",
  selectedYear: seedData.family.year,
  selectedWeek: seedData.family.availableWeeks.includes(currentIso.week) ? currentIso.week : seedData.family.week,
  selectedDay: currentDay,
  selectedMemberId: "all",
  customTasks: storedCustomTasks,
  assignments: [
    ...seedData.assignments.map((assignment) => ({
      ...assignment,
      status: storedDoneAssignments.has(assignment.id) ? "done" : assignment.status,
    })),
    ...storedCustomAssignments,
  ],
};

const navItems = [
  { id: "today", label: "Heute" },
  { id: "week", label: "Woche" },
  { id: "fairness", label: "Fairness" },
  { id: "meals", label: "Essen" },
  { id: "tasks", label: "Aufgaben" },
];

const categoryLabels = {
  daily: "Taeglich",
  twice_weekly: "2x pro Woche",
  weekly: "Woechentlich",
  long_term: "Langfristig",
  meal: "Essen",
  custom: "Eigene Aufgabe",
};

const ruleTypeLabels = {
  daily: "jeden Tag",
  seasonal_daily: "saisonal taeglich",
  weekly_days: "woechentlich",
  interval_days: "Intervall",
};

function byId(items) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

const membersById = byId(seedData.members);

function getTaskTemplates() {
  return [...seedData.taskTemplates, ...state.customTasks];
}

function getTasksById() {
  return byId(getTaskTemplates());
}

function getRuleByTaskId(taskId) {
  return seedData.scheduleRules?.find((rule) => rule.taskId === taskId);
}

function formatRule(rule) {
  if (!rule) return "Manuell geplant";
  if (rule.type === "daily") return "Jeden Tag";
  if (rule.type === "seasonal_daily") return `Jeden Tag von ${rule.seasonStart} bis ${rule.seasonEnd}`;
  if (rule.type === "weekly_days") return `Jede Woche: ${rule.days.join(", ")}`;
  if (rule.type === "interval_days") return `Alle ${rule.intervalDays} Tage: ${rule.days.join(", ")}`;
  return ruleTypeLabels[rule.type] ?? "Regelbasiert";
}

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAssignmentDetails(assignment) {
  const tasksById = getTasksById();
  return {
    ...assignment,
    member: membersById[assignment.memberId],
    task: tasksById[assignment.taskId],
  };
}

function formatUnits(units) {
  const numericUnits = Number(units);
  return Number.isInteger(numericUnits) ? `${numericUnits}` : numericUnits.toFixed(1).replace(".", ",");
}

function getVisibleAssignments() {
  return state.assignments
    .map(getAssignmentDetails)
    .filter((assignment) => assignment.member && assignment.task)
    .filter((assignment) => assignment.year === state.selectedYear)
    .filter((assignment) => assignment.week === state.selectedWeek)
    .filter((assignment) => state.selectedMemberId === "all" || assignment.memberId === state.selectedMemberId);
}

function getCompletionStats() {
  const visible = getVisibleAssignments();
  const done = visible.filter((assignment) => assignment.status === "done").length;
  const total = visible.length;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

function getMemberScores() {
  return seedData.members.map((member) => {
    const assigned = state.assignments
      .map(getAssignmentDetails)
      .filter((assignment) => assignment.member && assignment.task)
      .filter((assignment) => assignment.year === state.selectedYear)
      .filter((assignment) => assignment.week === state.selectedWeek)
      .filter((assignment) => assignment.memberId === member.id);
    const units = assigned.reduce((sum, assignment) => sum + assignment.task.effortUnits, 0);
    const doneUnits = assigned
      .filter((assignment) => assignment.status === "done")
      .reduce((sum, assignment) => sum + assignment.task.effortUnits, 0);

    return {
      ...member,
      units,
      doneUnits,
      taskCount: assigned.length,
    };
  });
}

function toggleAssignment(id) {
  state.assignments = state.assignments.map((assignment) =>
    assignment.id === id
      ? { ...assignment, status: assignment.status === "done" ? "open" : "done" }
      : assignment,
  );
  const doneIds = state.assignments
    .filter((assignment) => assignment.status === "done")
    .map((assignment) => assignment.id);
  saveStoredJson(storageKeys.doneAssignments, doneIds);
  render();
}

function setView(view) {
  state.view = view;
  render();
}

function setSelectedMember(memberId) {
  state.selectedMemberId = memberId;
  render();
}

function setSelectedWeek(week) {
  state.selectedWeek = Number(week);
  render();
}

function setSelectedDay(day) {
  state.selectedDay = day;
  render();
}

function jumpToToday() {
  state.selectedYear = currentIso.year;
  state.selectedWeek = currentIso.week;
  state.selectedDay = currentDay;
  state.view = "today";
  render();
}

function persistCustomData() {
  saveStoredJson(storageKeys.customTasks, state.customTasks);
  const customAssignments = state.assignments.filter((assignment) => assignment.source === "custom");
  saveStoredJson(storageKeys.customAssignments, customAssignments);
}

function addCustomTask(form) {
  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const effortUnits = Number(formData.get("effortUnits") || 1);
  const category = String(formData.get("category") || "custom");
  const memberId = String(formData.get("memberId") || seedData.members[0].id);
  const day = String(formData.get("day") || state.selectedDay);
  const repeatMode = String(formData.get("repeatMode") || "current");

  if (!title || !Number.isFinite(effortUnits) || effortUnits <= 0) {
    return;
  }

  const taskId = `custom-${Date.now()}-${slugify(title) || "aufgabe"}`;
  const task = {
    id: taskId,
    title,
    category,
    effortUnits,
    source: "custom",
  };

  const targetWeeks =
    repeatMode === "restOfYear"
      ? seedData.family.availableWeeks.filter((week) => week >= state.selectedWeek)
      : [state.selectedWeek];

  const newAssignments = targetWeeks.map((week) => {
    const taskDate = getDateForWeekDay(state.selectedYear, week, day);
    return {
      id: `${taskId}-kw${week}-${slugify(day)}`,
      year: state.selectedYear,
      week,
      date: taskDate.toISOString().slice(0, 10),
      taskId,
      memberId,
      day,
      dayIndex: days.indexOf(day) + 1,
      status: "open",
      source: "custom",
    };
  });

  state.customTasks = [...state.customTasks, task];
  state.assignments = [...state.assignments, ...newAssignments];
  persistCustomData();
  form.reset();
  state.selectedDay = day;
  render();
}

function renderTopbar() {
  const weekOptions = seedData.family.availableWeeks
    .map((week) => `<option value="${week}" ${state.selectedWeek === week ? "selected" : ""}>KW ${week}</option>`)
    .join("");

  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">FP</div>
        <div class="brand-copy">
          <p class="eyebrow">Prototyp</p>
          <h1>${seedData.family.name}</h1>
        </div>
      </div>
      <label class="week-picker">
        <span>Woche</span>
        <select data-week-select aria-label="Kalenderwoche auswählen">${weekOptions}</select>
      </label>
      <button class="today-jump" data-jump-today title="Zur aktuellen Woche springen">Heute</button>
    </header>
  `;
}

function renderCalendarStrip() {
  return `
    <div class="calendar-strip" aria-label="Wochentage">
      ${days
        .map((day) => {
          const date = getDateForWeekDay(state.selectedYear, state.selectedWeek, day);
          const isCurrentDate = state.selectedYear === currentIso.year && state.selectedWeek === currentIso.week && day === currentDay;
          const isSelected = state.selectedDay === day;
          return `
            <button class="day-button ${isSelected ? "active" : ""} ${isCurrentDate ? "today" : ""}" data-day-id="${day}">
              <span>${day.slice(0, 2)}</span>
              <strong>${formatDate(date)}</strong>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderHero() {
  const stats = getCompletionStats();
  const selectedDate = getDateForWeekDay(state.selectedYear, state.selectedWeek, state.selectedDay);
  return `
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Familienwoche</p>
        <h2 class="hero-title">KW ${state.selectedWeek}: ${state.selectedDay}, ${formatDate(selectedDate)}.</h2>
        <p class="hero-text">
          Der Prototyp nutzt die Logik aus der Excel: Aufgaben haben Einheiten, Personen uebernehmen Verantwortung,
          und der Kalender springt beim Oeffnen automatisch auf das aktuelle Datum.
        </p>
        ${renderCalendarStrip()}
        ${renderMemberFilter()}
      </div>
      <aside class="progress-card">
        <div class="progress-ring" style="--progress: ${stats.percent * 3.6}deg">
          <span>${stats.percent}%</span>
        </div>
        <p class="progress-caption">${stats.done} von ${stats.total} sichtbaren Aufgaben erledigt</p>
      </aside>
    </section>
  `;
}

function renderMemberFilter() {
  const memberButtons = seedData.members
    .map(
      (member) => `
        <button class="member-button ${state.selectedMemberId === member.id ? "active" : ""}"
          style="--member-color: ${member.color}"
          data-member-id="${member.id}">
          <span class="avatar-dot"></span>${member.name}
        </button>
      `,
    )
    .join("");

  return `
    <div class="member-filter" aria-label="Personenfilter">
      <button class="member-button ${state.selectedMemberId === "all" ? "active" : ""}" data-member-id="all">
        Alle
      </button>
      ${memberButtons}
    </div>
  `;
}

function renderTaskRow(assignment) {
  const rule = getRuleByTaskId(assignment.taskId);
  return `
    <article class="task-row ${assignment.status === "done" ? "done" : ""}">
      <button class="task-check" title="Aufgabe umschalten" data-toggle-id="${assignment.id}">
        ${assignment.status === "done" ? "✓" : ""}
      </button>
      <div>
        <p class="task-title">${assignment.task.title}</p>
        <p class="task-meta">
          ${assignment.day} · ${assignment.member.name} · ${categoryLabels[assignment.task.category]} · ${formatRule(rule)}
        </p>
      </div>
      <div class="unit-pill">${formatUnits(assignment.task.effortUnits)}</div>
    </article>
  `;
}

function renderTodayView() {
  const selectedDate = getDateForWeekDay(state.selectedYear, state.selectedWeek, state.selectedDay);
  const assignments = getVisibleAssignments().filter((assignment) => assignment.day === state.selectedDay);
  const meal = seedData.meals.find(
    (item) => item.year === state.selectedYear && item.week === state.selectedWeek && item.day === state.selectedDay,
  );
  const cook = meal?.cookMemberId ? membersById[meal.cookMemberId] : null;
  const isToday = state.selectedYear === currentIso.year && state.selectedWeek === currentIso.week && state.selectedDay === currentDay;

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">${isToday ? "Heute" : "Ausgewaehlter Tag"}</p>
          <h2>${state.selectedDay}, ${formatDate(selectedDate)}</h2>
        </div>
        <p class="small">${assignments.length} Aufgaben</p>
      </div>
      <div class="task-list">
        ${assignments.length ? assignments.map(renderTaskRow).join("") : '<div class="empty-state">Keine Aufgaben fuer diese Auswahl.</div>'}
      </div>
    </section>
    <section class="section">
      <p class="eyebrow">Essen</p>
      <h2>${meal?.title ?? "Noch kein Essen geplant"}</h2>
      <p class="muted">${cook ? `${cook.name} ist heute eingetragen.` : "Noch keine Person eingetragen."}</p>
    </section>
  `;
}

function renderWeekView() {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Wochenplan</p>
          <h2>KW ${state.selectedWeek}</h2>
        </div>
        <p class="small">Montag bis Sonntag</p>
      </div>
      <div class="week-grid">
        ${days
          .map((day) => {
            const assignments = getVisibleAssignments().filter((assignment) => assignment.day === day);
            return `
              <article class="day-column">
                <div class="day-title">${day}</div>
                ${
                  assignments.length
                    ? assignments
                        .map(
                          (assignment) => `
                            <div class="mini-task" style="--member-color: ${assignment.member.color}">
                              <strong>${assignment.task.title}</strong>
                              <span class="small">${assignment.member.name} · ${formatUnits(assignment.task.effortUnits)} Einh.</span>
                            </div>
                          `,
                        )
                        .join("")
                    : '<p class="small">Keine Aufgaben</p>'
                }
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderFairnessView() {
  const scores = getMemberScores();
  const maxUnits = Math.max(...scores.map((score) => score.units), seedData.family.weeklyTargetPerMember);

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Fairness</p>
          <h2>Einheiten pro Person</h2>
        </div>
        <p class="small">Ziel: ${seedData.family.weeklyTargetPerMember.toString().replace(".", ",")} Einh.</p>
      </div>
      <div class="member-grid">
        ${scores
          .map((score) => {
            const width = Math.min(100, Math.round((score.units / maxUnits) * 100));
            const diff = score.units - seedData.family.weeklyTargetPerMember;
            return `
              <article class="member-card" style="--member-color: ${score.color}">
                <div class="member-card-header">
                  <span class="member-name">${score.name}</span>
                  <span class="avatar-dot"></span>
                </div>
                <div class="score">${formatUnits(score.units)}</div>
                <p class="small">${score.taskCount} Aufgaben · ${formatUnits(score.doneUnits)} erledigte Einh.</p>
                <div class="bar-track" aria-hidden="true">
                  <div class="bar-fill" style="--bar-width: ${width}%"></div>
                </div>
                <p class="small">${diff >= 0 ? "+" : ""}${formatUnits(diff)} zum Wochenziel</p>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderMealsView() {
  const meals = seedData.meals.filter((meal) => meal.year === state.selectedYear && meal.week === state.selectedWeek);

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Essensplan</p>
          <h2>KW ${state.selectedWeek}</h2>
        </div>
        <p class="small">aus der Excel uebernommen</p>
      </div>
      <div class="meal-list">
        ${meals.length ? meals
          .map((meal) => {
            const cook = meal.cookMemberId ? membersById[meal.cookMemberId] : null;
            return `
              <article class="meal-row" style="--member-color: ${cook?.color ?? "#0f766e"}">
                <div class="meal-day">${meal.day}</div>
                <div>
                  <div class="meal-title">${meal.title || "Noch offen"}</div>
                  <p class="small">${cook ? `${cook.name} kocht` : "Koch/Koechin offen"}</p>
                </div>
                <span class="avatar-dot"></span>
              </article>
            `;
          })
          .join("") : '<div class="empty-state">Fuer diese Woche ist noch kein Essen eingetragen.</div>'}
      </div>
    </section>
  `;
}

function renderTasksView() {
  const taskTemplates = getTaskTemplates();
  const memberOptions = seedData.members
    .map(
      (member) =>
        `<option value="${member.id}" ${state.selectedMemberId === member.id ? "selected" : ""}>${escapeHtml(member.name)}</option>`,
    )
    .join("");
  const dayOptions = days
    .map((day) => `<option value="${day}" ${state.selectedDay === day ? "selected" : ""}>${day}</option>`)
    .join("");
  const categoryOptions = Object.entries(categoryLabels)
    .map(([key, label]) => `<option value="${key}" ${key === "custom" ? "selected" : ""}>${label}</option>`)
    .join("");

  return `
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Neue Aufgabe</p>
          <h2>Aufgabe hinzufuegen</h2>
        </div>
        <p class="small">KW ${state.selectedWeek}</p>
      </div>
      <form class="task-form" data-task-form>
        <label>
          <span>Titel</span>
          <input name="title" type="text" placeholder="z. B. Haustuer fegen" required />
        </label>
        <label>
          <span>Einheiten</span>
          <input name="effortUnits" type="number" min="0.5" step="0.5" value="1" required />
        </label>
        <label>
          <span>Kategorie</span>
          <select name="category">${categoryOptions}</select>
        </label>
        <label>
          <span>Person</span>
          <select name="memberId">${memberOptions}</select>
        </label>
        <label>
          <span>Tag</span>
          <select name="day">${dayOptions}</select>
        </label>
        <label>
          <span>Wiederholung</span>
          <select name="repeatMode">
            <option value="current">Nur diese Woche</option>
            <option value="restOfYear">Woechentlich bis Jahresende</option>
          </select>
        </label>
        <button class="primary-action" type="submit">Aufgabe hinzufuegen</button>
      </form>
    </section>
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">Aufgabenstamm</p>
          <h2>${taskTemplates.length} Vorlagen</h2>
        </div>
        <p class="small">${seedData.taskTemplates.length} aus Excel · ${seedData.scheduleRules?.length ?? 0} Regeln · ${state.customTasks.length} eigene</p>
      </div>
      <div class="task-template-list">
        ${taskTemplates
          .map((task) => {
            const rule = getRuleByTaskId(task.id);
            return `
              <article class="task-template">
                <div>
                  <strong>${escapeHtml(task.title)}</strong>
                  <div class="template-meta">
                    <span class="category-label">${categoryLabels[task.category] ?? categoryLabels.custom}</span>
                    <span class="rule-label">${formatRule(rule)}</span>
                  </div>
                </div>
                <div class="unit-pill">${formatUnits(task.effortUnits)}</div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderView() {
  if (state.view === "week") return renderWeekView();
  if (state.view === "fairness") return renderFairnessView();
  if (state.view === "meals") return renderMealsView();
  if (state.view === "tasks") return renderTasksView();
  return renderTodayView();
}

function renderNav() {
  return `
    <nav class="bottom-nav" aria-label="Hauptnavigation">
      ${navItems
        .map(
          (item) => `
            <button class="nav-button ${state.view === item.id ? "active" : ""}" data-view-id="${item.id}">
              ${item.label}
            </button>
          `,
        )
        .join("")}
    </nav>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewId));
  });

  document.querySelectorAll("[data-member-id]").forEach((button) => {
    button.addEventListener("click", () => setSelectedMember(button.dataset.memberId));
  });

  document.querySelectorAll("[data-toggle-id]").forEach((button) => {
    button.addEventListener("click", () => toggleAssignment(button.dataset.toggleId));
  });

  document.querySelectorAll("[data-week-select]").forEach((select) => {
    select.addEventListener("change", () => setSelectedWeek(select.value));
  });

  document.querySelectorAll("[data-day-id]").forEach((button) => {
    button.addEventListener("click", () => setSelectedDay(button.dataset.dayId));
  });

  document.querySelectorAll("[data-jump-today]").forEach((button) => {
    button.addEventListener("click", jumpToToday);
  });

  document.querySelectorAll("[data-task-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addCustomTask(form);
    });
  });
}

function render() {
  app.innerHTML = `
    ${renderTopbar()}
    ${renderHero()}
    <div class="view">${renderView()}</div>
    ${renderNav()}
  `;
  bindEvents();
}

render();
