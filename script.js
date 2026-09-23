// Synergy V-Board - best of 3 sets
// Burbank Parks & Rec youth volleyball rules: sets 1-2 play to 21, deciding 3rd set plays to 15 (win by 2)

const state = {
  mode: 'practice', // 'practice' | 'tournament'
  slotOrder: ['A', 'B'], // which logical team (A/B) is shown in [left, right]
  names: {
    practice: { A: 'Team A', B: 'Team B' },
    tournament: { A: 'Synergy', B: 'Opponent' },
  },
  score: { A: 0, B: 0 },
  setsWon: { A: 0, B: 0 },
  setNumber: 1,
  history: [], // { set, A, B }
  matchOver: false,
  tournamentGame: null, // currently selected schedule entry
  historySaved: false, // guards against double-saving a completed match
};

let schedule = null; // loaded from schedule.json

const el = {
  scoreSlots: [document.getElementById('scoreA'), document.getElementById('scoreB')],
  setsSlots: [document.getElementById('setsA'), document.getElementById('setsB')],
  nameSlots: [document.getElementById('nameA'), document.getElementById('nameB')],
  setIndicator: document.getElementById('setIndicator'),
  setHistory: document.getElementById('setHistory'),
  winnerBanner: document.getElementById('winnerBanner'),
  resetBtn: document.getElementById('resetBtn'),
  swapBtn: document.getElementById('swapBtn'),
  tabs: document.querySelectorAll('.tab-btn'),
  tournamentPanel: document.getElementById('tournamentPanel'),
  weekSelect: document.getElementById('weekSelect'),
  matchMeta: document.getElementById('matchMeta'),
  historyPanel: document.getElementById('historyPanel'),
  matchHistoryList: document.getElementById('matchHistoryList'),
};

function pointsToWin() {
  // Burbank Parks & Rec youth volleyball: sets 1-2 play to 21, deciding 3rd set plays to 15
  const isDecidingSet = state.setsWon.A === 1 && state.setsWon.B === 1;
  return isDecidingSet ? 15 : 21;
}

function teamName(team) {
  return state.names[state.mode][team];
}

function setTeamName(team, value) {
  state.names[state.mode][team] = value;
}

function checkSetWinner() {
  const target = pointsToWin();
  const { A, B } = state.score;
  const leader = A > B ? 'A' : B > A ? 'B' : null;
  if (!leader) return null;
  const leaderScore = Math.max(A, B);
  const otherScore = Math.min(A, B);
  if (leaderScore >= target && leaderScore - otherScore >= 2) {
    return leader;
  }
  return null;
}

function render() {
  for (let slot = 0; slot < 2; slot++) {
    const team = state.slotOrder[slot];
    el.scoreSlots[slot].textContent = state.score[team];
    el.setsSlots[slot].textContent = `Sets: ${state.setsWon[team]}`;
    const nameInput = el.nameSlots[slot];
    if (document.activeElement !== nameInput) {
      nameInput.value = teamName(team);
    }
    nameInput.disabled = state.mode === 'tournament';
  }

  el.setIndicator.textContent = state.matchOver ? 'Match Over' : `Set ${state.setNumber} (to ${pointsToWin()})`;

  const totalSets = 3;
  const rows = [];
  for (let s = 1; s <= totalSets; s++) {
    const completed = state.history.find(h => h.set === s);
    if (completed) {
      rows.push(`<div class="set-row done"><span>Set ${s}</span><span>${completed.A} - ${completed.B}</span><span class="set-winner">${teamName(completed.winner)} won</span></div>`);
    } else if (s === state.setNumber && !state.matchOver) {
      rows.push(`<div class="set-row current"><span>Set ${s}</span><span>${state.score.A} - ${state.score.B}</span><span class="set-winner">in progress</span></div>`);
    } else if (s < state.setNumber || state.matchOver) {
      rows.push(`<div class="set-row"><span>Set ${s}</span><span>&mdash;</span><span></span></div>`);
    } else {
      rows.push(`<div class="set-row pending"><span>Set ${s}</span><span>&mdash;</span><span></span></div>`);
    }
  }
  el.setHistory.innerHTML = rows.join('');

  document.querySelectorAll('.btn.plus, .btn.minus').forEach(btn => {
    btn.disabled = state.matchOver || (state.mode === 'tournament' && state.tournamentGame && state.tournamentGame.bye);
  });

  const setInProgress = !state.matchOver && (state.score.A > 0 || state.score.B > 0);
  el.resetBtn.textContent = setInProgress ? 'Reset Set' : 'Reset Match';

  renderMatchHistory();
}

function nextSet(winner) {
  state.setsWon[winner]++;
  state.history.push({ set: state.setNumber, A: state.score.A, B: state.score.B, winner });

  if (state.setsWon[winner] === 2) {
    state.matchOver = true;
    el.winnerBanner.textContent = `🏆 ${teamName(winner)} wins the match!`;
    saveTournamentResultIfNeeded();
  } else {
    el.winnerBanner.textContent = `${teamName(winner)} wins Set ${state.setNumber}!`;
    setTimeout(() => {
      if (!state.matchOver) el.winnerBanner.textContent = '';
    }, 2500);
    state.setNumber++;
    state.score.A = 0;
    state.score.B = 0;
  }
  render();
}

function changeScore(team, delta) {
  if (state.matchOver) return;
  state.score[team] = Math.max(0, state.score[team] + delta);
  render();

  if (delta > 0) {
    const winner = checkSetWinner();
    if (winner) nextSet(winner);
  }
}

document.querySelectorAll('.btn[data-slot]').forEach(btn => {
  btn.addEventListener('click', () => {
    requestWakeLock();
    const slot = Number(btn.dataset.slot);
    const team = state.slotOrder[slot];
    const delta = btn.dataset.action === 'inc' ? 1 : -1;
    changeScore(team, delta);
  });
});

el.nameSlots.forEach((input, slot) => {
  input.addEventListener('input', () => {
    const team = state.slotOrder[slot];
    setTeamName(team, input.value);
  });
});

function resetMatch() {
  state.score = { A: 0, B: 0 };
  state.setsWon = { A: 0, B: 0 };
  state.setNumber = 1;
  state.history = [];
  state.matchOver = false;
  state.historySaved = false;
  el.winnerBanner.textContent = '';
  render();
}

el.resetBtn.addEventListener('click', () => {
  const setInProgress = !state.matchOver && (state.score.A > 0 || state.score.B > 0);
  if (setInProgress) {
    // First press: just clear the current set's score
    state.score = { A: 0, B: 0 };
    render();
  } else {
    // Set already at 0-0 (or match over): reset the whole match
    resetMatch();
  }
});

// ---- Swap sides ----
el.swapBtn.addEventListener('click', () => {
  state.slotOrder.reverse();
  render();
});

// ---- Share / QR modal ----
const shareLink = document.getElementById('shareLink');
const qrModal = document.getElementById('qrModal');
const qrCloseBtn = document.getElementById('qrCloseBtn');

shareLink.addEventListener('click', (e) => {
  e.preventDefault();
  qrModal.classList.add('open');
});

qrCloseBtn.addEventListener('click', () => {
  qrModal.classList.remove('open');
});

qrModal.addEventListener('click', (e) => {
  if (e.target === qrModal) qrModal.classList.remove('open');
});

// ---- Tabs ----
el.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === state.mode) return;
    el.tabs.forEach(b => b.classList.toggle('active', b === btn));
    state.mode = tab;
    el.tournamentPanel.classList.toggle('hidden', tab !== 'tournament');
    el.historyPanel.classList.toggle('hidden', tab !== 'tournament');
    resetMatch();
    if (tab === 'tournament') {
      populateWeekSelect();
      autoSelectUpcomingWeek();
    }
    render();
  });
});

// ---- Tournament schedule ----
function loadSchedule() {
  return fetch('schedule.json')
    .then(res => res.ok ? res.json() : null)
    .catch(() => null)
    .then(data => {
      schedule = data;
      return data;
    });
}

function populateWeekSelect() {
  if (!schedule) {
    el.weekSelect.innerHTML = '<option>Schedule unavailable</option>';
    return;
  }
  el.weekSelect.innerHTML = schedule.games.map(g => {
    const label = g.bye
      ? `Week ${g.week} — Bye`
      : `Week ${g.week} — ${formatDate(g.date)} vs ${g.opponent}`;
    return `<option value="${g.week}">${label}</option>`;
  }).join('');
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
}

function autoSelectUpcomingWeek() {
  if (!schedule) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let pick = schedule.games.find(g => new Date(g.date + 'T00:00:00') >= today && !g.bye);
  if (!pick) pick = schedule.games.find(g => new Date(g.date + 'T00:00:00') >= today);
  if (!pick) pick = schedule.games[schedule.games.length - 1];
  el.weekSelect.value = String(pick.week);
  applyWeek(pick.week);
}

function applyWeek(weekNum) {
  if (!schedule) return;
  const game = schedule.games.find(g => g.week === Number(weekNum));
  if (!game) return;
  state.tournamentGame = game;
  resetMatch();

  if (game.bye) {
    state.names.tournament.A = 'Synergy';
    state.names.tournament.B = '—';
    el.matchMeta.textContent = 'Bye week — no game scheduled.';
  } else {
    state.names.tournament.A = 'Synergy';
    state.names.tournament.B = game.opponent;
    // Home team always shown on the left slot for context.
    state.slotOrder = game.synergyHome ? ['A', 'B'] : ['B', 'A'];
    const homeAway = game.synergyHome ? 'Home' : 'Away';
    el.matchMeta.textContent = `${formatDate(game.date)} · ${game.time} · ${game.location} · Synergy ${homeAway}`;
  }

  // If this game already has a saved/completed result, preload the set history read-only view.
  if (game.completed && game.result) {
    loadCompletedResultIntoView(game);
  }

  render();
}

function loadCompletedResultIntoView(game) {
  const synergySets = game.result.synergySets;
  const opponentSets = game.result.opponentSets;
  for (let i = 0; i < synergySets.length; i++) {
    const synScore = synergySets[i];
    const oppScore = opponentSets[i];
    const winner = synScore > oppScore ? 'A' : 'B';
    state.history.push({ set: i + 1, A: synScore, B: oppScore, winner });
    state.setsWon[winner]++;
  }
  state.matchOver = true;
  state.historySaved = true;
  state.setNumber = synergySets.length;
  el.winnerBanner.textContent = `🏆 ${game.result.winner} wins the match!`;
}

el.weekSelect.addEventListener('change', () => {
  applyWeek(el.weekSelect.value);
});

// ---- Match history (localStorage) ----
const HISTORY_KEY = 'synergyMatchHistory';

function getSavedHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTournamentResultIfNeeded() {
  if (state.mode !== 'tournament' || !state.tournamentGame || state.tournamentGame.bye) return;
  if (state.historySaved) return;
  state.historySaved = true;

  const game = state.tournamentGame;
  // A is always logical Synergy in tournament mode (set when the week was applied).
  const synergySets = state.history.map(h => h.A);
  const opponentSets = state.history.map(h => h.B);
  const winnerTeam = state.setsWon.A >= state.setsWon.B ? 'Synergy' : teamName('B');

  const entry = {
    week: game.week,
    date: game.date,
    opponent: game.opponent,
    synergyHome: game.synergyHome,
    synergySets,
    opponentSets,
    synergySetsWon: state.setsWon.A,
    opponentSetsWon: state.setsWon.B,
    winner: winnerTeam,
    savedAt: new Date().toISOString(),
  };

  const list = getSavedHistory().filter(e => e.week !== game.week);
  list.push(entry);
  list.sort((a, b) => a.week - b.week);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));

  // Reflect into in-memory schedule so switching weeks shows the saved result.
  game.completed = true;
  game.result = {
    synergySets,
    opponentSets,
    synergySetsWon: state.setsWon.A,
    opponentSetsWon: state.setsWon.B,
    winner: winnerTeam,
  };
}

function combinedMatchHistory() {
  const saved = getSavedHistory();
  const savedWeeks = new Set(saved.map(e => e.week));
  const seeded = (schedule ? schedule.games : [])
    .filter(g => g.completed && g.result && !g.bye && !savedWeeks.has(g.week))
    .map(g => ({
      week: g.week,
      date: g.date,
      opponent: g.opponent,
      synergyHome: g.synergyHome,
      synergySets: g.result.synergySets,
      opponentSets: g.result.opponentSets,
      synergySetsWon: g.result.synergySetsWon,
      opponentSetsWon: g.result.opponentSetsWon,
      winner: g.result.winner,
    }));
  return [...saved, ...seeded].sort((a, b) => a.week - b.week);
}

function renderMatchHistory() {
  if (state.mode !== 'tournament') return;
  const list = combinedMatchHistory();
  if (list.length === 0) {
    el.matchHistoryList.innerHTML = '<div class="match-history-empty">No completed games saved yet.</div>';
    return;
  }
  el.matchHistoryList.innerHTML = list.map(e => {
    const setsStr = e.synergySets.map((s, i) => `${s}-${e.opponentSets[i]}`).join(', ');
    const outcome = e.winner === 'Synergy' ? 'won' : 'lost';
    const homeAway = e.synergyHome ? 'Home' : 'Away';
    return `<div class="match-history-row">
      <span class="mh-week">Wk ${e.week}</span>
      <span class="mh-opponent">vs ${e.opponent} (${homeAway})</span>
      <span class="mh-result ${outcome}">Synergy ${outcome} ${e.synergySetsWon}-${e.opponentSetsWon}</span>
      <span class="mh-sets">${setsStr}</span>
    </div>`;
  }).join('');
}

// ---- Init ----
loadSchedule().then(() => {
  if (state.mode === 'tournament') {
    populateWeekSelect();
    autoSelectUpcomingWeek();
  }
  render();
});

render();

// ---- Keep screen awake while the app is open ----
// iOS Safari 16.4+ and Android Chrome support the Screen Wake Lock API.
// The lock is released automatically when the tab/app is backgrounded, so
// we re-request it whenever the page becomes visible again.
let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch {
    // Wake lock request can fail (e.g. low battery mode) - fail silently.
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

requestWakeLock();
