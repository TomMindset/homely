import type { DayName, TaskTemplate } from "../utils/planner";

export type ViewId = "today" | "week" | "fairness" | "meals" | "tasks" | "family" | "settings";
export type NewTaskScheduleType = "once" | "daily" | "weekly_days" | "every_x_weeks" | "monthly" | "yearly";
export type ReminderOptionId = "none" | "same_day" | "day_before";
export type DesignSetId = "homely" | "fresh" | "calm" | "contrast";

export const navItems: Array<{ id: ViewId; label: string }> = [
  { id: "today", label: "Heute" },
  { id: "week", label: "Woche" },
  { id: "fairness", label: "Fairness" },
  { id: "meals", label: "Essen" },
  { id: "tasks", label: "Aufgaben" },
  { id: "settings", label: "Mehr" },
];

export type DesignSet = {
  id: DesignSetId;
  label: string;
  description: string;
  primary: string;
  soft: string;
  background: string;
  paper: string;
  border: string;
  ink: string;
  muted: string;
  dark: {
    primary: string;
    soft: string;
    background: string;
    paper: string;
    border: string;
    ink: string;
    muted: string;
  };
};

export const homelyLogoColor = "#256F63";

export const designSets: DesignSet[] = [
  {
    id: "homely",
    label: "Homely Classic",
    description: "Warm, ruhig und haushaltsnah.",
    primary: "#256F63",
    soft: "#E5F1ED",
    background: "#F7F2E8",
    paper: "#FFFDF8",
    border: "#D8CCBC",
    ink: "#21302C",
    muted: "#766E64",
    dark: {
      primary: "#4FD1B8",
      soft: "#143B36",
      background: "#071C19",
      paper: "#102A27",
      border: "#25534C",
      ink: "#F2FFFB",
      muted: "#B8D8D1",
    },
  },
  {
    id: "fresh",
    label: "Frisch & Klar",
    description: "Heller, aktiver und etwas moderner.",
    primary: "#0F766E",
    soft: "#CCFBF1",
    background: "#ECFEFF",
    paper: "#F8FFFF",
    border: "#99F6E4",
    ink: "#164E63",
    muted: "#0F766E",
    dark: {
      primary: "#5EEAD4",
      soft: "#134E4A",
      background: "#042F2E",
      paper: "#0F3F3E",
      border: "#2DD4BF",
      ink: "#ECFEFF",
      muted: "#A7F3D0",
    },
  },
  {
    id: "calm",
    label: "Ruhiger Fokus",
    description: "Reduziert, sachlich und gut scannbar.",
    primary: "#475569",
    soft: "#E2E8F0",
    background: "#F1F5F9",
    paper: "#FFFFFF",
    border: "#CBD5E1",
    ink: "#0F172A",
    muted: "#64748B",
    dark: {
      primary: "#94A3B8",
      soft: "#1E293B",
      background: "#0B1120",
      paper: "#111827",
      border: "#334155",
      ink: "#F8FAFC",
      muted: "#CBD5E1",
    },
  },
  {
    id: "contrast",
    label: "Kontrastreich",
    description: "Mehr Lesbarkeit und staerkere Signale.",
    primary: "#1D4ED8",
    soft: "#DBEAFE",
    background: "#F8FAFC",
    paper: "#FFFFFF",
    border: "#93C5FD",
    ink: "#111827",
    muted: "#1E40AF",
    dark: {
      primary: "#93C5FD",
      soft: "#172554",
      background: "#0A1224",
      paper: "#111C33",
      border: "#3B82F6",
      ink: "#F8FAFC",
      muted: "#BFDBFE",
    },
  },
];

export function getDesignSet(id: DesignSetId) {
  return designSets.find((item) => item.id === id) ?? designSets[0];
}

export const categoryLabels: Record<string, string> = {
  daily: "Taeglich",
  twice_weekly: "2x pro Woche",
  weekly: "Woechentlich",
  long_term: "Langfristig",
  custom: "Eigene Aufgabe",
  waste: "Muell",
};

export const days: DayName[] = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export const memberColors = ["#2563eb", "#256F63", "#c2410c", "#7c3aed", "#be123c", "#0891b2", "#ca8a04"];

export const roleOptions = [
  { id: "owner", label: "Gruender" },
  { id: "adult", label: "Verwalter" },
  { id: "child", label: "Mitglied" },
];

export const scheduleOptions: Array<{ id: NewTaskScheduleType; label: string }> = [
  { id: "once", label: "Einmalig" },
  { id: "daily", label: "Taeglich" },
  { id: "weekly_days", label: "Wochentage" },
  { id: "every_x_weeks", label: "Alle X Wochen" },
  { id: "monthly", label: "Monatlich" },
  { id: "yearly", label: "Jaehrlich" },
];

export const reminderOptions: Array<{ id: ReminderOptionId; label: string; enabled: boolean; leadDays: number }> = [
  { id: "none", label: "Keine", enabled: false, leadDays: 0 },
  { id: "same_day", label: "Am Tag", enabled: true, leadDays: 0 },
  { id: "day_before", label: "Vortag", enabled: true, leadDays: 1 },
];

export function scheduleLabel(
  type: NewTaskScheduleType,
  selectedDays: DayName[],
  options?: { intervalWeeks?: number; dayOfMonth?: number; month?: number },
) {
  if (type === "daily") return "Taeglich ab Start-KW";
  if (type === "weekly_days") return `Woechentlich: ${selectedDays.join(", ")}`;
  if (type === "every_x_weeks") {
    const interval = Math.max(1, Math.round(options?.intervalWeeks ?? 2));
    return `Alle ${interval} Wochen: ${selectedDays.join(", ")}`;
  }
  if (type === "monthly") {
    const day = Math.min(31, Math.max(1, Math.round(options?.dayOfMonth ?? 1)));
    return `Monatlich am ${day}.`;
  }
  if (type === "yearly") {
    const day = Math.min(31, Math.max(1, Math.round(options?.dayOfMonth ?? 1)));
    const month = Math.min(12, Math.max(1, Math.round(options?.month ?? 1)));
    return `Jaehrlich am ${day}.${month}.`;
  }
  return "Einmalig";
}

export function getReminderOptionId(task: Pick<TaskTemplate, "reminderEnabled" | "reminderLeadDays">): ReminderOptionId {
  if (!task.reminderEnabled) return "none";
  return task.reminderLeadDays === 1 ? "day_before" : "same_day";
}

export function reminderLabel(task: Pick<TaskTemplate, "reminderEnabled" | "reminderTime" | "reminderLeadDays">) {
  if (!task.reminderEnabled) return "Keine Erinnerung";
  const dayText = task.reminderLeadDays === 1 ? "am Vortag" : "am selben Tag";
  return `Erinnerung ${dayText} um ${task.reminderTime || "18:00"} Uhr`;
}

export function roleLabel(role: string) {
  return roleOptions.find((option) => option.id === role)?.label ?? "Mitglied";
}

export function canManageFamily(role?: string) {
  return role === "owner" || role === "adult";
}

export function formatUnits(units: number) {
  return Number.isInteger(units) ? `${units}` : units.toFixed(1).replace(".", ",");
}

export function nextWeek(weeks: number[], week: number) {
  const index = weeks.indexOf(week);
  return weeks[(index + 1) % weeks.length];
}

export function previousWeek(weeks: number[], week: number) {
  const index = weeks.indexOf(week);
  return weeks[(index - 1 + weeks.length) % weeks.length];
}
