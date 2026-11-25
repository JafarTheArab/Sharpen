// Screens: home, game intro, playing, result, workout done.
import { store } from './store.js';
import { GAMES, GAME_IDS, RUNNERS } from './games/index.js';
import { todayPlan, recordResult, streak, workoutDone, MAX_LEVEL } from './plan.js';
import { knownCount } from './games/vocab.js';
import { ymd, h } from './util.js';
import { sayRow } from './speak.js';
import { makeScore, hit, multiplier, COMBO_WORDS } from './scoring.js';
import { sound, buzz, floatText, toast, confetti, toggles } from './fx.js';
import { award } from './badges.js';
import { progressScreen, pointsOn } from './progress.js';

export const VERSION = 'Stage 2.1 · 2026-11-25';
const app = document.getElementById('app');
let running = null; // AbortController of the game being played
let onHome = false;

const today = () => ymd();
function show(...nodes) {
  onHome = false;
  document.querySelectorAll('.float, .toast').forEach((e) => e.remove());
  app.replaceChildren(...nodes);
  window.scrollTo(0, 0);
}
const icon = (id, big) => h('div', { class: 'gicon' + (big ? ' big' : ''), style: { background: GAMES[id].color } }, GAMES[id].icon);

// ---------- Home ----------
function home() {
  const d = today(), data = store.data;
  const day = todayPlan(data, d);
  store.save();
  const done = workoutDone(data, d);
  const s = streak(data, d);
  const next = day.plan.find((id) => day.done[id] == null);
  const started = day.plan.some((id) => day.done[id] != null);

  const tiles = day.plan.map((id) => h('div', { class: 'wtile' + (day.done[id] != null ? ' done' : '') },
    icon(id),
    h('div', { class: 'wtext' }, h('div', { class: 'wname' }, GAMES[id].name), h('div', { class: 'muted small' }, GAMES[id].area)),
    h('div', { class: 'wstate' }, day.done[id] != null ? `✓ ${day.done[id]}%` : '')));

  const workout = h('section', { class: 'card workout' },
    h('div', { class: 'row between' },
      h('div', {}, h('div', { class: 'label' }, "Today's workout"),
        h('div', { class: 'muted small' }, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))),
      h('div', { class: 'streak' + (s ? ' on' : '') }, '🔥 ', h('b', {}, s), s === 1 ? ' day' : ' days')),
    h('div', { class: 'wlist' }, tiles),
    done
      ? h('div', { class: 'done-note' }, 'Done for today ✓ Come back tomorrow to keep your streak.')
      : h('button', { class: 'btn primary big wide', id: 'startWorkout', onclick: () => intro(next, 'workout') },
          started ? `Continue: ${GAMES[next].name}` : 'Start workout'),
    h('div', { class: 'muted small center' }, 'About 5 minutes · 3 games'));

  const skills = h('section', { class: 'card' },
    h('div', { class: 'label' }, 'Your skills'),
    h('div', { class: 'muted small' }, 'Tap one for extra practice.'),
    GAME_IDS.map((id) => {
      const g = store.game(id);
      const last = g.history.at(-1);
      const sub = id === 'vocab' ? `${knownCount(data.words)} words learned`
        : last ? `Last score ${last.pct}%` : 'Not played yet';
      return h('button', { class: 'skill', onclick: () => intro(id, 'free') },
        icon(id),
        h('div', { class: 'stext' },
          h('div', { class: 'row between' }, h('b', {}, GAMES[id].area), h('span', { class: 'muted small' }, `Level ${g.level}`)),
          h('div', { class: 'meter' }, h('div', { style: { width: (100 * g.level) / MAX_LEVEL + '%', background: GAMES[id].color } })),
          h('div', { class: 'muted small' }, sub)));
    }));

  const foot = h('footer', { class: 'foot muted small' },
    h('div', {}, 'Your progress is saved on this phone only. Nothing is sent anywhere.'),
    h('div', {}, toggles(home)),
    h('div', {}, VERSION, ' · ', h('button', { class: 'link', onclick: resetAll }, 'Start over')));

  const header = h('header', { class: 'top' }, h('div', { class: 'brand' }, 'Sharpen'), h('div', { style: { flex: 1 } }),
    h('button', { class: 'btn soft', id: 'progress', onclick: progress }, '📈 Progress'));
  show(header, workout, skills, foot);
  onHome = true;
}

function progress() {
  show(...progressScreen(store.data, today(), { back: home }));
}

function resetAll() {
  if (!confirm('Erase all your progress (levels, words learned, streak) and start over?')) return;
  store.reset();
  home();
}

// ---------- Intro ----------
function intro(id, mode) {
  const g = GAMES[id], lvl = store.game(id).level;
  show(
    h('header', { class: 'top' }, h('button', { class: 'btn ghost', onclick: home }, '‹ Home')),
    h('section', { class: 'card intro' },
      icon(id, true),
      h('div', { class: 'muted' }, g.area),
      h('h1', {}, g.name),
      h('p', {}, g.how),
      h('div', { class: 'pill' }, `Level ${lvl} of ${MAX_LEVEL}`),
      store.game(id).best ? h('div', { class: 'muted small' }, `Your best: ⭐ ${store.game(id).best.toLocaleString()} points`) : null,
      h('div', { class: 'muted small' }, 'Answer fast for bonus points. Get 3 in a row for a combo.')),
    h('button', { class: 'btn primary big wide dock', id: 'go', onclick: () => play(id, mode) }, 'Start'));
}

// ---------- Play ----------
async function play(id, mode) {
  running?.abort();
  const ac = new AbortController();
  running = ac;
  const status = h('div', { class: 'status' });
  const body = h('main', { class: 'play' });
  const quit = () => {
    if (!confirm("Quit this game? It won't count.")) return;
    ac.abort();
    home();
  };
  const ptsEl = h('div', { class: 'hud-pts' }, '⭐ 0'), comboEl = h('div', { class: 'hud-combo' });
  show(h('header', { class: 'top play-top' },
    h('button', { class: 'btn ghost close', 'aria-label': 'Quit', onclick: quit }, '✕'),
    h('div', { class: 'ptitle' }, GAMES[id].name), status),
  h('div', { class: 'hud' }, ptsEl, comboEl), body);

  const sc = makeScore();
  const hud = () => {
    ptsEl.textContent = '⭐ ' + sc.points.toLocaleString();
    comboEl.textContent = sc.combo >= 2 ? `🔥 ${sc.combo} in a row${multiplier(sc.combo) > 1 ? ' · x' + multiplier(sc.combo) : ''}` : '';
    ptsEl.classList.remove('bump'); void ptsEl.offsetWidth; ptsEl.classList.add('bump');
  };
  const onHit = (ok, speed = 0, el = null, base = 100) => {
    const gained = hit(sc, ok, speed, base);
    if (ok) {
      sound('right', sc.combo);
      floatText('+' + gained, el, 'good');
      if (COMBO_WORDS[sc.combo]) { toast(`${COMBO_WORDS[sc.combo]} x${multiplier(sc.combo)}`); buzz(); }
    } else { sound('wrong'); buzz(); }
    hud();
  };
  const onAdd = (n) => { if (!n) return; sc.points += n; floatText('+' + n, null, 'good'); hud(); };

  const d = today();
  let res;
  try {
    res = await RUNNERS[id].run(body, {
      level: store.game(id).level, data: store.data, day: d, signal: ac.signal,
      status: (t) => (status.textContent = t), hit: onHit, add: onAdd,
    });
  } catch (e) {
    if (e.name === 'AbortError') return;
    throw e;
  }
  if (ac.signal.aborted) return;
  running = null;
  const wasDone = workoutDone(store.data, d);
  res.points = sc.points; res.bestCombo = sc.bestCombo;
  const change = recordResult(store.data, id, res.pct, d, sc.points);
  change.badges = award(store.data, d, { id, pct: res.pct, points: sc.points, bestCombo: sc.bestCombo, right: res.right, longest: res.longest });
  store.save();
  result(id, mode, res, change, !wasDone && workoutDone(store.data, d));
}

// ---------- Result ----------
function result(id, mode, res, { before, after, newBest, badges = [] }, justFinished) {
  const d = today(), day = store.data.days[d];
  const next = day.plan.find((x) => day.done[x] == null);
  const levelLine = after - before >= 2 ? `Perfect! Jumped up to level ${after}.`
    : after > before ? `Level up! You're now on level ${after}.`
    : after < before ? `Eased back to level ${after}. It adjusts as you go.`
    : `Staying on level ${after}.`;
  let btn;
  if (justFinished) btn = h('button', { class: 'btn primary big wide dock', id: 'next', onclick: finished }, 'Finish workout');
  else if (mode === 'workout' && next) btn = h('button', { class: 'btn primary big wide dock', id: 'next', onclick: () => intro(next, 'workout') }, `Next: ${GAMES[next].name}`);
  else btn = h('button', { class: 'btn primary big wide dock', id: 'next', onclick: home }, 'Back home');

  const items = res.review || [];
  show(
    h('section', { class: 'card result' },
      icon(id, true),
      h('div', { class: 'muted' }, GAMES[id].name),
      h('div', { class: 'score', style: { color: GAMES[id].color } }, res.pct + '%'),
      h('div', { class: 'summary' }, res.summary),
      res.extra ? h('div', { class: 'muted' }, res.extra) : null,
      h('div', { class: 'pts-row' },
        h('div', {}, h('div', { class: 'pts-v' }, '⭐ ' + res.points.toLocaleString()), h('div', { class: 'muted small' }, 'points')),
        h('div', {}, h('div', { class: 'pts-v' }, '🔥 ' + res.bestCombo), h('div', { class: 'muted small' }, 'best combo'))),
      newBest ? h('div', { class: 'pill best' }, '🏆 New personal best!') : null,
      h('div', { class: 'pill' + (after > before ? ' up' : '') }, levelLine)),
    badges.length ? h('section', { class: 'card new-badges' },
      h('div', { class: 'label' }, badges.length > 1 ? 'New badges!' : 'New badge!'),
      badges.map((b) => h('div', { class: 'row' }, h('div', { class: 'bicon big' }, b.icon), h('div', {}, h('b', {}, b.name), h('div', { class: 'muted small' }, b.how))))) : null,
    items.length || res.reviewNote ? h('section', { class: 'card' },
      h('div', { class: 'label' }, 'Review'),
      res.reviewNote ? h('div', { class: 'muted small' }, res.reviewNote) : null,
      items.map((r) => h('div', { class: 'rev ' + (r.ok ? 'ok' : 'bad') },
        h('span', { class: 'mark' }, r.ok ? '✓' : '✗'),
        h('div', {}, h('b', {}, r.title), r.word ? sayRow(r.word, r.say, true) : null, h('div', { class: 'muted small' }, r.detail))))) : null,
    btn);
  if (after > before || newBest) { confetti(); sound('level'); buzz(); }
  if (badges.length) setTimeout(() => sound('badge'), after > before || newBest ? 500 : 0);
}

function finished() {
  const d = today(), data = store.data, day = data.days[d], s = streak(data, d);
  show(h('section', { class: 'card result done-card' },
    h('div', { class: 'confetti' }, '🎉'),
    h('h1', {}, 'Workout complete!'),
    h('div', { class: 'streak on huge' }, '🔥 ', h('b', {}, s), s === 1 ? ' day streak' : ' days in a row'),
    h('div', { class: 'summary' }, `⭐ ${pointsOn(data, d).toLocaleString()} points today`),
    h('div', { class: 'wlist' }, day.plan.map((id) => h('div', { class: 'wtile done' }, icon(id),
      h('div', { class: 'wtext' }, h('div', { class: 'wname' }, GAMES[id].name)), h('div', { class: 'wstate' }, `${day.done[id]}%`))))),
    h('button', { class: 'btn primary big wide dock', id: 'home', onclick: home }, 'Back home'));
  confetti(140); sound('level');
}

// A new day while the app sits open on Home: refresh the plan.
document.addEventListener('visibilitychange', () => { if (!document.hidden && onHome) home(); });

home();
