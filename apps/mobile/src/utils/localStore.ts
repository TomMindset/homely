import * as FileSystem from "expo-file-system/legacy";

const fallbackStorage = new Map<string, string>();
const storeFileUri = `${FileSystem.documentDirectory ?? ""}family-planner-state.json`;

let writeQueue = Promise.resolve();

async function readStore() {
  if (!FileSystem.documentDirectory) {
    return Object.fromEntries(fallbackStorage.entries());
  }

  try {
    const info = await FileSystem.getInfoAsync(storeFileUri);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(storeFileUri);
    return JSON.parse(content) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeStore(values: Record<string, string>) {
  if (!FileSystem.documentDirectory) {
    fallbackStorage.clear();
    Object.entries(values).forEach(([key, value]) => fallbackStorage.set(key, value));
    return;
  }

  await FileSystem.writeAsStringAsync(storeFileUri, JSON.stringify(values));
}

export async function getStoredItem(key: string) {
  const values = await readStore();
  return values[key] ?? null;
}

export async function setStoredItem(key: string, value: string) {
  writeQueue = writeQueue.then(async () => {
    const values = await readStore();
    values[key] = value;
    await writeStore(values);
  });

  return writeQueue;
}

export async function removeStoredItems(keys: string[]) {
  writeQueue = writeQueue.then(async () => {
    const values = await readStore();
    keys.forEach((key) => {
      delete values[key];
    });
    await writeStore(values);
  });

  return writeQueue;
}
