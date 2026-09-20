// Volleyball Scoreboard - best of 3 sets
// Standard rules: sets 1-2 play to 25 (win by 2), deciding 3rd set plays to 15 (win by 2)

const state = {
  score: { A: 0, B: 0 },
  setsWon: { A: 0, B: 0 },
  setNumber: 1,
  history: [], // { set, A, B }
  matchOver: false,
};

const el = {
  scoreA: document.getElementById('scoreA'),
  scoreB: document.getElementById('scoreB'),
  setsA: document.getElementById('setsA'),
  setsB: document.getElementById('setsB'),
  setIndicator: document.getElementById('setIndicator'),
  setHistory: document.getElementById('setHistory'),
  winnerBanner: document.getElementById('winnerBanner'),
  nameA: document.getElementById('nameA'),
  nameB: document.getElementById('nameB'),
  resetBtn: document.getElementById('resetBtn'),
};

function pointsToWin() {
  // Burbank Parks & Rec youth volleyball: sets 1-2 play to 21, deciding 3rd set plays to 15
  const isDecidingSet = state.setsWon.A === 1 && state.setsWon.B === 1;
  return isDecidingSet ? 15 : 21;
}

function teamName(team) {
  return team === 'A' ? el.nameA.value.trim() || 'Team A' : el.nameB.value.trim() || 'Team B';
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
  el.scoreA.textContent = state.score.A;
  el.scoreB.textContent = state.score.B;
  el.setsA.textContent = `Sets: ${state.setsWon.A}`;
  el.setsB.textContent = `Sets: ${state.setsWon.B}`;
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
    btn.disabled = state.matchOver;
  });

  const setInProgress = !state.matchOver && (state.score.A > 0 || state.score.B > 0);
  el.resetBtn.textContent = setInProgress ? 'Reset Set' : 'Reset Match';
}

function nextSet(winner) {
  state.setsWon[winner]++;
  state.history.push({ set: state.setNumber, A: state.score.A, B: state.score.B, winner });

  if (state.setsWon[winner] === 2) {
    state.matchOver = true;
    el.winnerBanner.textContent = `🏆 ${teamName(winner)} wins the match!`;
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

document.querySelectorAll('.btn[data-team]').forEach(btn => {
  btn.addEventListener('click', () => {
    const team = btn.dataset.team;
    const delta = btn.dataset.action === 'inc' ? 1 : -1;
    changeScore(team, delta);
  });
});

function resetMatch() {
  state.score = { A: 0, B: 0 };
  state.setsWon = { A: 0, B: 0 };
  state.setNumber = 1;
  state.history = [];
  state.matchOver = false;
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

render();
