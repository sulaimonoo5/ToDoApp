import * as api from "./api";

const SYNCED_KEY = "data_imported";

export async function loadFromServer() {
  const res = await api.request("/api/sync");
  const { data, user } = res;
  if (data) {
    if (data.lists) localStorage.setItem("todoLists", JSON.stringify(data.lists));
    if (data.goals) localStorage.setItem("goals", JSON.stringify(data.goals));
    if (data.schedule) localStorage.setItem("scheduleData", JSON.stringify(data.schedule));
    if (data.streak) localStorage.setItem("dailyStreak", JSON.stringify(data.streak));
  }
  return { data, user };
}

export async function saveToServer() {
  const data = {};
  try { const v = localStorage.getItem("todoLists"); if (v) data.lists = JSON.parse(v); } catch {}
  try { const v = localStorage.getItem("goals"); if (v) data.goals = JSON.parse(v); } catch {}
  try { const v = localStorage.getItem("scheduleData"); if (v) data.schedule = JSON.parse(v); } catch {}
  try { const v = localStorage.getItem("dailyStreak"); if (v) data.streak = JSON.parse(v); } catch {}
  await api.request("/api/sync", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function importLocalData() {
  const data = {};
  try { const v = localStorage.getItem("todoLists"); data.lists = v ? JSON.parse(v) : []; } catch { data.lists = []; }
  try { const v = localStorage.getItem("goals"); data.goals = v ? JSON.parse(v) : []; } catch { data.goals = []; }
  try { const v = localStorage.getItem("scheduleData"); data.schedule = v ? JSON.parse(v) : {}; } catch { data.schedule = {}; }
  try { const v = localStorage.getItem("dailyStreak"); data.streak = v ? JSON.parse(v) : {}; } catch { data.streak = {}; }
  await api.request("/api/sync", {
    method: "POST",
    body: JSON.stringify(data),
  });
  localStorage.setItem(SYNCED_KEY, "true");
}

export function hasLocalData() {
  try {
    const lists = localStorage.getItem("todoLists");
    return lists !== null && lists !== "[]";
  } catch { return false; }
}

export function isDataImported() {
  return localStorage.getItem(SYNCED_KEY) === "true";
}

export function clearImportedFlag() {
  localStorage.removeItem(SYNCED_KEY);
}

export async function fetchStats() {
  return api.request("/api/sync/stats");
}
