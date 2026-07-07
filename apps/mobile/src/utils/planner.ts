export type DayName =
  | "Montag"
  | "Dienstag"
  | "Mittwoch"
  | "Donnerstag"
  | "Freitag"
  | "Samstag"
  | "Sonntag";

export type Member = {
  id: string;
  name: string;
  shortCode: string;
  color: string;
  role: string;
  source?: string;
};

export type TaskTemplate = {
  id: string;
  title: string;
  category: string;
  effortUnits: number;
  source?: string;
  intervalDays?: number;
  recurrenceType?: string;
  scheduledDays?: DayName[];
  recurrenceLabel?: string;
  recurrenceStartYear?: number;
  recurrenceStartWeek?: number;
  reminderEnabled?: boolean;
  reminderTime?: string;
  reminderLeadDays?: number;
};

export type ScheduleRule = {
  id: string;
  taskId: string;
  type: string;
  days: DayName[];
  intervalDays?: number;
  offsetDays?: number;
  seasonStart?: string;
  seasonEnd?: string;
};

export type Assignment = {
  id: string;
  year: number;
  week: number;
  sourceWeek?: number;
  date: string;
  taskId: string;
  memberId: string;
  completedByMemberId?: string;
  day: DayName;
  dayIndex: number;
  status: "open" | "done" | "skipped" | "moved";
  source?: string;
  generatedFromRule?: string;
};

export type MealPlanEntry = {
  id: string;
  year: number;
  week: number;
  sourceWeek?: number;
  date: string | null;
  day: DayName;
  title: string;
  cookMemberId?: string | null;
};

const days: DayName[] = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function getCurrentIsoWeek(date: Date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: utcDate.getUTCFullYear(), week };
}

export function getDayName(date: Date): DayName {
  return days[(date.getDay() + 6) % 7];
}

export function getDateForWeekDay(year: number, week: number, dayName: DayName) {
  const dayIndex = days.indexOf(dayName) + 1;
  const simple = new Date(Date.UTC(year, 0, 4));
  const simpleDay = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - simpleDay + 1 + (week - 1) * 7);
  const target = new Date(monday);
  target.setUTCDate(monday.getUTCDate() + dayIndex - 1);
  return target;
}

export function getWeekAssignments(assignments: Assignment[], year: number, week: number) {
  return assignments.filter((assignment) => assignment.year === year && assignment.week === week);
}

export function getWeekMeals(meals: MealPlanEntry[], year: number, week: number) {
  return meals.filter((meal) => meal.year === year && meal.week === week);
}

export function getTaskById(tasks: TaskTemplate[], taskId: string) {
  return tasks.find((task) => task.id === taskId);
}

export function getRuleByTaskId(rules: ScheduleRule[], taskId: string) {
  return rules.find((rule) => rule.taskId === taskId);
}

export function ruleLabel(rule?: ScheduleRule) {
  if (!rule) return "Manuell geplant";
  if (rule.type === "daily") return "Jeden Tag";
  if (rule.type === "seasonal_daily") return `Saisonal ${rule.seasonStart}-${rule.seasonEnd}`;
  if (rule.type === "weekly_days") return `Jede Woche: ${rule.days.join(", ")}`;
  if (rule.type === "interval_days") return `Alle ${rule.intervalDays} Tage`;
  return "Regelbasiert";
}
