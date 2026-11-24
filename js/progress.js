// Progress screen: headline numbers, this week, a chart per game, badges.
import { GAMES, GAME_IDS } from './games/meta.js';
import { streak } from './plan.js';
import { knownCount } from './games/vocab.js';
import { BADGES, workoutCount, longestStreak } from './badges.js';
import { lineChart, barChart } from './charts.js';
import { h, addDays } from './util.js';

const short = (day) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
const weekday = (day, len) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: len }); };

export function pointsOn(data, day) {
  let n = 0;
  for (const id of GAME_IDS) for (const r of data.games[id]?.history || []) if (r.d === day && r.pts) n += r.pts;
  return n;
}

export function progressScreen(data, day, { back }) {
  const tile = (value, label) => h('div', { class: 'stat' }, h('div', { class: 'stat-v' }, value), h('div', { class: 'muted small' }, label));
  const stats = h('section', { class: 'stats' },
    tile('🔥 ' + streak(data, day), 'Current streak'),
    tile(longestStreak(data), 'Best streak (days)'),
    tile(workoutCount(data), 'Workouts done'),
    tile(knownCount(data.words), 'Words learned'));

  const week = Array.from({ length: 7 }, (_, i) => addDays(day, i - 6));
  const bars = week.map((d) => ({ label: weekday(d, 'narrow'), sub: `${weekday(d, 'short')} ${short(d)}`, value: pointsOn(data, d) }));
  const total = bars.reduce((a, b) => a + b.value, 0);
  const weekCard = h('section', { class: 'card' },
    h('div', { class: 'row between' }, h('div', { class: 'label' }, 'Last 7 days'), h('b', {}, `⭐ ${total.toLocaleString()}`)),
    total ? barChart(bars, 'var(--accent)') : h('div', { class: 'muted small' }, 'Points you earn will show up here.'));

  const games = GAME_IDS.map((id) => {
    const g = data.games[id] || { level: 1, history: [] };
    const rounds = g.history.filter((r) => r.pts != null).slice(-20);
    return h('section', { class: 'card' },
      h('div', { class: 'row between' },
        h('div', { class: 'row' }, h('div', { class: 'gicon', style: { background: GAMES[id].color } }, GAMES[id].icon),
          h('div', {}, h('b', {}, GAMES[id].name), h('div', { class: 'muted small' }, `Level ${g.level}`))),
        h('div', { class: 'right-text' }, h('div', { class: 'muted small' }, 'Best'), h('b', {}, g.best ? g.best.toLocaleString() : '–'))),
      rounds.length >= 2
        ? lineChart(rounds.map((r) => ({ label: short(r.d), value: r.pts })), GAMES[id].color)
        : h('div', { class: 'muted small' }, 'Play a couple of rounds to see your chart.'));
  });

  const earned = data.badges || {};
  const badgeCard = h('section', { class: 'card' },
    h('div', { class: 'row between' }, h('div', { class: 'label' }, 'Badges'), h('span', { class: 'muted small' }, `${Object.keys(earned).length} of ${BADGES.length}`)),
    h('div', { class: 'badges' }, BADGES.map((b) => h('div', { class: 'badge' + (earned[b.id] ? ' on' : '') },
      h('div', { class: 'bicon' }, earned[b.id] ? b.icon : '🔒'),
      h('div', { class: 'bname' }, b.name),
      h('div', { class: 'muted tiny' }, earned[b.id] ? short(earned[b.id]) : b.how)))));

  return [
    h('header', { class: 'top' }, h('button', { class: 'btn ghost', onclick: back }, '‹ Home'), h('div', { class: 'ptitle' }, 'Progress')),
    stats, weekCard, ...games, badgeCard,
  ];
}
