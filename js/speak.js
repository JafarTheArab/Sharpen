// Says a word out loud with the phone's built-in voice (Web Speech, part of Safari; no download, nothing sent).
import { h } from './util.js';
import { SPEAK_AS } from './content/pronounce.js';

export const canSpeak = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang?.replace('_', '-').startsWith('en-US'));
  voice = vs.find((v) => /enhanced|premium/i.test(v.name)) || vs.find((v) => v.localService) || vs[0] || null;
}

export function speak(word) {
  if (!canSpeak()) return;
  if (!voice) pickVoice();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(SPEAK_AS[word] || word);
  u.lang = 'en-US';
  u.rate = 0.85;
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

if (canSpeak()) speechSynthesis.addEventListener?.('voiceschanged', pickVoice);

// 🔊 button + "say it" guide, e.g.  🔊 uh-BUN-dunt
export function sayRow(word, say, small = false) {
  return h('div', { class: 'say' + (small ? ' small' : '') },
    canSpeak() ? h('button', { class: 'speak', 'aria-label': `Hear "${word}"`, onclick: (e) => { e.stopPropagation(); speak(word); } }, '🔊') : null,
    say ? h('span', { class: 'respell' }, say) : null);
}
