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
  rotation: {
    system: '5-1', // '5-1' | '6-2'
    // Each player owns their name, starting court position (1-6, or null if on the bench), and role.
    players: ['Sr', 'Mi', 'Ti', 'Zo', 'An', 'Ma', 'Lu', 'Em', 'So', 'Ma'].map(name => ({ name, position: null, role: null })),
  },
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
  board: document.querySelector('.board'),
  matchFooter: document.querySelector('.match-footer'),
  tournamentPanel: document.getElementById('tournamentPanel'),
  weekSelect: document.getElementById('weekSelect'),
  matchMeta: document.getElementById('matchMeta'),
  historyPanel: document.getElementById('historyPanel'),
  matchHistoryList: document.getElementById('matchHistoryList'),
  rotationPanel: document.getElementById('rotationPanel'),
  rotationSystemToggle: document.getElementById('rotationSystemToggle'),
  rosterGrid: document.getElementById('rosterGrid'),
  lineupWarning: document.getElementById('lineupWarning'),
  rotationsGrid: document.getElementById('rotationsGrid'),
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

// ---- Rotation cheat sheet modal ----
const cheatBtn51 = document.getElementById('cheatBtn51');
const cheatBtn62 = document.getElementById('cheatBtn62');
const cheatModal = document.getElementById('cheatModal');
const cheatModalImg = document.getElementById('cheatModalImg');
const cheatCloseBtn = document.getElementById('cheatCloseBtn');

function openCheatSheet(system) {
  cheatModalImg.src = system === '5-1' ? 'assets/cheatsheet-5-1.png' : 'assets/cheatsheet-6-2.png';
  cheatModalImg.alt = `${system} serve receive formations cheat sheet`;
  cheatModal.classList.add('open');
}

cheatBtn51.addEventListener('click', () => openCheatSheet('5-1'));
cheatBtn62.addEventListener('click', () => openCheatSheet('6-2'));

cheatCloseBtn.addEventListener('click', () => {
  cheatModal.classList.remove('open');
});

cheatModal.addEventListener('click', (e) => {
  if (e.target === cheatModal) cheatModal.classList.remove('open');
});

// ---- Export schedule.json update ----
const exportModal = document.getElementById('exportModal');
const exportContent = document.getElementById('exportContent');
const exportCopyBtn = document.getElementById('exportCopyBtn');
const exportCloseBtn = document.getElementById('exportCloseBtn');

function buildScheduleSnippet(game) {
  const r = game.result;
  return [
    '{',
    `  "week": ${game.week}, "date": "${game.date}", "time": "${game.time}", "location": "${game.location}",`,
    `  "opponent": "${game.opponent}", "synergyHome": ${game.synergyHome}, "bye": ${game.bye},`,
    `  "completed": true,`,
    `  "result": { "synergySets": [${r.synergySets.join(', ')}], "opponentSets": [${r.opponentSets.join(', ')}], "synergySetsWon": ${r.synergySetsWon}, "opponentSetsWon": ${r.opponentSetsWon}, "winner": "${r.winner}" }`,
    '}',
  ].join('\n');
}

function openExportModalForWeek(week) {
  const game = schedule ? schedule.games.find(g => g.week === week) : null;
  const entry = combinedMatchHistory().find(e => e.week === week);
  if (!entry) return;
  const merged = {
    week: entry.week,
    date: entry.date,
    time: game ? game.time : '',
    location: game ? game.location : '',
    opponent: entry.opponent,
    synergyHome: entry.synergyHome,
    bye: false,
    result: {
      synergySets: entry.synergySets,
      opponentSets: entry.opponentSets,
      synergySetsWon: entry.synergySetsWon,
      opponentSetsWon: entry.opponentSetsWon,
      winner: entry.winner,
    },
  };
  exportContent.textContent = buildScheduleSnippet(merged);
  exportModal.classList.add('open');
}

el.matchHistoryList.addEventListener('click', (e) => {
  const btn = e.target.closest('.mh-export-btn');
  if (!btn) return;
  openExportModalForWeek(Number(btn.dataset.week));
});

exportCopyBtn.addEventListener('click', async () => {
  const text = exportContent.textContent;
  try {
    await navigator.clipboard.writeText(text);
    exportCopyBtn.textContent = 'Copied!';
  } catch {
    // Clipboard API unavailable — fall back to selecting the text for manual copy.
    const range = document.createRange();
    range.selectNodeContents(exportContent);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    exportCopyBtn.textContent = 'Selected — copy manually';
  }
  setTimeout(() => { exportCopyBtn.textContent = 'Copy'; }, 2000);
});

exportCloseBtn.addEventListener('click', () => {
  exportModal.classList.remove('open');
});

exportModal.addEventListener('click', (e) => {
  if (e.target === exportModal) exportModal.classList.remove('open');
});

// ---- Tabs ----
let activeTab = 'practice';
el.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === activeTab) return;
    el.tabs.forEach(b => b.classList.toggle('active', b === btn));
    activeTab = tab;
    const isScoringTab = tab === 'practice' || tab === 'tournament';

    el.board.classList.toggle('hidden', !isScoringTab);
    el.winnerBanner.classList.toggle('hidden', !isScoringTab);
    el.matchFooter.classList.toggle('hidden', !isScoringTab);
    el.tournamentPanel.classList.toggle('hidden', tab !== 'tournament');
    el.historyPanel.classList.toggle('hidden', tab !== 'tournament');
    el.rotationPanel.classList.toggle('hidden', tab !== 'rotation');

    if (isScoringTab) {
      state.mode = tab;
      resetMatch();
      if (tab === 'tournament') {
        populateWeekSelect();
        autoSelectUpcomingWeek();
      }
      render();
    } else if (tab === 'rotation') {
      renderRotationTab();
    }
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
      <button class="mh-export-btn" data-week="${e.week}" title="Show schedule.json update">📝</button>
    </div>`;
  }).join('');
}

// ---- Rotation (5-1 / 6-2 lineup builder) ----
const ROTATION_KEY = 'synergyRotationConfig';
const COURT_DISPLAY_ORDER = [4, 3, 2, 5, 6, 1]; // front row (near net) then back row; 1 = server

const ROLE_SETS = {
  '5-1': [
    { code: 'OPP', label: 'OPP', full: 'Opposite (Right Side Hitter)' },
    { code: 'OH1', label: 'OH', full: 'Outside Hitter 1' },
    { code: 'OH2', label: 'OH', full: 'Outside Hitter 2' },
    { code: 'MB1', label: 'MB', full: 'Middle Blocker 1' },
    { code: 'MB2', label: 'MB', full: 'Middle Blocker 2' },
    { code: 'S', label: 'S', full: 'Setter' },
  ],
  '6-2': [
    { code: 'S1', label: 'S', full: 'Setter 1' },
    { code: 'S2', label: 'S', full: 'Setter 2' },
    { code: 'OH1', label: 'OH', full: 'Outside Hitter 1' },
    { code: 'OH2', label: 'OH', full: 'Outside Hitter 2' },
    { code: 'MB1', label: 'MB', full: 'Middle Blocker 1' },
    { code: 'MB2', label: 'MB', full: 'Middle Blocker 2' },
  ],
};

const ROLE_LABELS = {};
Object.values(ROLE_SETS).flat().forEach(r => { ROLE_LABELS[r.code] = r.full; });

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function loadRotationConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(ROTATION_KEY));
    if (!saved || !Array.isArray(saved.players) || saved.players.length !== state.rotation.players.length) return;
    state.rotation.system = saved.system === '6-2' ? '6-2' : '5-1';
    state.rotation.players = saved.players.map(p => ({
      name: typeof p.name === 'string' ? p.name : '',
      position: Number.isInteger(p.position) ? p.position : null,
      role: typeof p.role === 'string' ? p.role : null,
    }));
  } catch {
    // ignore malformed saved data
  }
}

function saveRotationConfig() {
  localStorage.setItem(ROTATION_KEY, JSON.stringify(state.rotation));
}

function getDuplicatePlayerIndexes(field) {
  const seenAt = {};
  const dupes = new Set();
  state.rotation.players.forEach((p, i) => {
    const value = p[field];
    if (value === null || value === undefined || value === '') return;
    if (seenAt[value] !== undefined) {
      dupes.add(i);
      dupes.add(seenAt[value]);
    } else {
      seenAt[value] = i;
    }
  });
  return dupes;
}

function renderRosterGrid() {
  const posDupes = getDuplicatePlayerIndexes('position');
  const roleDupes = getDuplicatePlayerIndexes('role');
  const roleOptions = ROLE_SETS[state.rotation.system];
  el.rosterGrid.innerHTML = state.rotation.players.map((p, i) => {
    const posOptions = [1, 2, 3, 4, 5, 6].map(pos =>
      `<option value="${pos}" ${p.position === pos ? 'selected' : ''}>Pos ${pos}${pos === 1 ? ' (Serve)' : ''}</option>`
    ).join('');
    const roleOptionsHtml = roleOptions.map(r =>
      `<option value="${r.code}" ${p.role === r.code ? 'selected' : ''}>${r.label}</option>`
    ).join('');
    return `<div class="rp-player-row">
        <input class="rp-player-input" data-idx="${i}" value="${escapeHtml(p.name)}" maxlength="12" placeholder="Player ${i + 1}" />
        <select class="rp-role-select${roleDupes.has(i) ? ' dup' : ''}" data-idx="${i}">
          <option value="">Role —</option>
          ${roleOptionsHtml}
        </select>
        <select class="rp-pos-select${posDupes.has(i) ? ' dup' : ''}" data-idx="${i}">
          <option value="">--</option>
          ${posOptions}
        </select>
      </div>`;
  }).join('');
  el.lineupWarning.classList.toggle('hidden', posDupes.size === 0 && roleDupes.size === 0);
}

function remapRolesForSystem(newSystem) {
  const validCodes = new Set(ROLE_SETS[newSystem].map(r => r.code));
  state.rotation.players.forEach(p => {
    if (p.role && !validCodes.has(p.role)) p.role = null;
  });
}

function computeRotations() {
  const starters = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  state.rotation.players.forEach((p, i) => {
    if (p.position) starters[p.position] = i;
  });
  const rotations = [];
  let current = starters;
  for (let r = 0; r < 6; r++) {
    rotations.push(current);
    const next = {};
    for (let pos = 1; pos <= 6; pos++) {
      const sourcePos = pos === 6 ? 1 : pos + 1;
      next[pos] = current[sourcePos];
    }
    current = next;
  }
  return rotations;
}

function renderRotations() {
  const rotations = computeRotations();
  el.rotationsGrid.innerHTML = rotations.map((posMap, i) => {
    const cells = COURT_DISPLAY_ORDER.map(pos => {
      const idx = posMap[pos];
      const hasPlayer = idx !== null && idx !== undefined;
      const player = hasPlayer ? state.rotation.players[idx] : null;
      const name = player ? escapeHtml(player.name) : '—';
      const role = player ? player.role : null;
      const roleLabel = role ? ROLE_LABELS[role] || role : '';
      const isServe = pos === 1;
      return `<div class="rotation-pos${isServe ? ' serve' : ''}">
          <span class="pos-num">${pos}</span>
          <div class="pos-player-row">
            <span class="pos-name">${name}</span>
            ${role ? `<span class="role-label" title="${escapeHtml(roleLabel)}">${escapeHtml(role)}</span>` : ''}
          </div>
          ${isServe ? '<span class="serve-badge" title="Serving position">🏐</span>' : ''}
        </div>`;
    }).join('');
    return `<div class="rotation-card">
        <div class="rotation-card-title">Rotation ${i + 1}</div>
        <div class="rotation-net-label">— Net —</div>
        <div class="rotation-court">${cells}</div>
      </div>`;
  }).join('');
}

function renderRotationTab() {
  el.rotationSystemToggle.querySelectorAll('.rp-sys-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.system === state.rotation.system);
  });
  renderRosterGrid();
  renderRotations();
}

el.rotationSystemToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.rp-sys-btn');
  if (!btn || btn.dataset.system === state.rotation.system) return;
  state.rotation.system = btn.dataset.system;
  remapRolesForSystem(state.rotation.system);
  el.rotationSystemToggle.querySelectorAll('.rp-sys-btn').forEach(b => b.classList.toggle('active', b === btn));
  saveRotationConfig();
  renderRosterGrid();
  renderRotations();
});

el.rosterGrid.addEventListener('input', (e) => {
  const input = e.target.closest('.rp-player-input');
  if (!input) return;
  const idx = Number(input.dataset.idx);
  state.rotation.players[idx].name = input.value.trim() || `Player ${idx + 1}`;
  saveRotationConfig();
  renderRotations();
});

el.rosterGrid.addEventListener('change', (e) => {
  const posSelect = e.target.closest('.rp-pos-select');
  if (posSelect) {
    const idx = Number(posSelect.dataset.idx);
    state.rotation.players[idx].position = posSelect.value === '' ? null : Number(posSelect.value);
    saveRotationConfig();
    renderRosterGrid();
    renderRotations();
    return;
  }
  const roleSelect = e.target.closest('.rp-role-select');
  if (roleSelect) {
    const idx = Number(roleSelect.dataset.idx);
    state.rotation.players[idx].role = roleSelect.value || null;
    saveRotationConfig();
    renderRosterGrid();
    renderRotations();
  }
});

loadRotationConfig();

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
