// What each game is called and how it's explained. Kept free of game code so plan.js can use it in tests.
export const GAMES = {
  vocab: {
    area: 'Vocabulary', name: 'Word Power', icon: '📖', color: 'var(--c-vocab)',
    how: 'Pick the right meaning, or the word that fits the sentence. Words you miss come back until you know them.',
  },
  math: {
    area: 'Quick Math', name: 'Mental Math', icon: '➗', color: 'var(--c-math)',
    how: 'Answer as many as you can in 60 seconds. Tips, percentages and everyday math.',
  },
  memory: {
    area: 'Memory', name: 'List Recall', icon: '🧠', color: 'var(--c-memory)',
    how: 'Study a short list of words. Then tap every word that was on it. Lists grow as you get them right.',
  },
  writing: {
    area: 'Writing', name: 'Clear Writing', icon: '✍️', color: 'var(--c-writing)',
    how: 'Two sentences, one is written correctly. Pick it, and see the quick rule behind it.',
  },
};
export const GAME_IDS = Object.keys(GAMES);
