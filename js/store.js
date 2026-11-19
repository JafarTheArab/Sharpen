// Everything is saved on this phone only (localStorage). Nothing is sent anywhere.
const KEY = 'sharpen.v1';

function fresh() {
  return { v: 1, games: {}, words: {}, seen: {}, days: {} };
}

function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return Object.assign(fresh(), JSON.parse(s));
  } catch { /* private mode or broken data: start fresh */ }
  return fresh();
}

let data = load();

export const store = {
  get data() { return data; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ } },
  game(id) { return (data.games[id] ||= { level: 1, history: [], last: null }); },
  reset() { data = fresh(); this.save(); },
  // for tests
  _replace(d) { data = Object.assign(fresh(), d); },
};
