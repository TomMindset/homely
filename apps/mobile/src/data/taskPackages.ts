import { seedData } from "./seedData";

export type TaskPackageId = "basis" | "family" | "shared_home" | "cleaning" | "meal_week" | "seasonal";

export type TaskPackage = {
  id: TaskPackageId;
  title: string;
  shortTitle: string;
  description: string;
  taskIds: string[];
  recommendedFor: string[];
};

export const taskPackages: TaskPackage[] = [
  {
    id: "basis",
    title: "Basis-Haushalt",
    shortTitle: "Basis",
    description: "Die wichtigsten Aufgaben fuer einen leichten Start ohne Ueberforderung.",
    taskIds: ["dishwasher", "kitchen", "trash", "bathroom", "vacuum"],
    recommendedFor: ["Familie", "WG", "Paar"],
  },
  {
    id: "family",
    title: "Familienalltag",
    shortTitle: "Familie",
    description: "Mehr Alltag: Waesche, Zimmer, Getraenke und Einkauf fuer mehrere Personen.",
    taskIds: ["laundry-wash", "laundry-fold", "own-room", "drinks", "shopping"],
    recommendedFor: ["Familie"],
  },
  {
    id: "shared_home",
    title: "WG & geteilter Haushalt",
    shortTitle: "WG",
    description: "Klare gemeinsame Aufgaben fuer Kueche, Muell, Bad und Gemeinschaftsflaechen.",
    taskIds: ["dishwasher", "kitchen", "trash", "paper-glass", "vacuum", "mop", "bathroom", "shopping"],
    recommendedFor: ["WG", "Paar"],
  },
  {
    id: "cleaning",
    title: "Groessere Reinigung",
    shortTitle: "Putzen",
    description: "Regelmaessige Grundreinigung und laengere Aufgaben fuer planbare Putztage.",
    taskIds: ["dust", "mop", "descale", "windows"],
    recommendedFor: ["Familie", "WG", "Haus"],
  },
  {
    id: "meal_week",
    title: "Essen & Einkauf",
    shortTitle: "Essen",
    description: "Kochen und Einkaufen als sichtbarer Teil der fairen Wochenplanung.",
    taskIds: ["cook", "shopping", "drinks"],
    recommendedFor: ["Familie", "WG", "Paar"],
  },
  {
    id: "seasonal",
    title: "Saison & Extras",
    shortTitle: "Extras",
    description: "Sommer-, Auto- und seltene Aufgaben, die nicht jeder Haushalt sofort braucht.",
    taskIds: ["flowers", "compost", "bmw", "astra"],
    recommendedFor: ["Haus", "Garten", "Auto"],
  },
];

export const defaultTaskPackageIds: TaskPackageId[] = ["basis", "meal_week"];

const knownSeedTaskIds = new Set(seedData.taskTemplates.map((task) => task.id));

export function getTaskIdsForPackages(packageIds: TaskPackageId[]) {
  const selectedPackages = taskPackages.filter((taskPackage) => packageIds.includes(taskPackage.id));
  const taskIds = selectedPackages.flatMap((taskPackage) => taskPackage.taskIds).filter((taskId) => knownSeedTaskIds.has(taskId));
  return [...new Set(taskIds)];
}

export function getTaskPackageStats(taskPackage: TaskPackage) {
  const taskIds = new Set(taskPackage.taskIds);
  const tasks = seedData.taskTemplates.filter((task) => taskIds.has(task.id));
  return {
    taskCount: tasks.length,
    totalUnits: tasks.reduce((sum, task) => sum + task.effortUnits, 0),
  };
}
