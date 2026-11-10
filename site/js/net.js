// Связь с Supabase: состояние, лента, кормление и счётчик «сейчас рядом».
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
let clockOffset = 0; // серверное время − локальное, чтобы голод считался одинаково у всех

export const serverNow = () => Date.now() + clockOffset;

async function get(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H, cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = r.headers.get("date");
  if (d) clockOffset = new Date(d).getTime() - Date.now() + 500;
  return r.json();
}

export async function fetchState() {
  const [s] = await get("bitik_state?id=eq.1&select=hunger,updated_at,feeds_total");
  return { hunger: s.hunger, updatedAt: new Date(s.updated_at).getTime(), feedsTotal: s.feeds_total };
}

export async function fetchEvents(limit = 8) {
  const rows = await get(`bitik_events?select=kind,at&order=at.desc&limit=${limit}`);
  return rows.map(e => ({ kind: e.kind, at: new Date(e.at).getTime() }));
}

export async function feed(clientId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bitik_feed`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId }),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

// Текущая сытость: значение в момент updatedAt минус 1% за каждую прошедшую минуту.
export const hungerNow = s => Math.max(0, s.hunger - (serverNow() - s.updatedAt) / 60000);

// «Сейчас рядом»: Supabase Realtime Presence. Если не получилось — просто не показываем счётчик.
export async function joinPresence(clientId, onCount) {
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { params: { eventsPerSecond: 2 } } });
    const ch = sb.channel("bitik-room", { config: { presence: { key: clientId } } });
    const update = () => onCount(Object.keys(ch.presenceState()).length);
    ch.on("presence", { event: "sync" }, update)
      .subscribe(async status => {
        if (status === "SUBSCRIBED") await ch.track({ t: Date.now() });
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onCount(null);
      });
  } catch {
    onCount(null);
  }
}
