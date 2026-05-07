// main.js — Global Orchestrator

// ─── Configuration & Mode Selection ────────────────────────────────────────

/**
 * Detects which game mode to run. 
 * You can expand this to check URL params, e.g., ?mode=path
 */
function getActiveMode() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('mode') || 'globle';
}

// ─── Lifecycle Initialization ───────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  initializeStats();
  await initGlobe("map-wrapper", "map");
  setupSharedUIEvents();

  const mode = getActiveMode();
  if (mode === 'path') {
    initPathMode();
    document.getElementById("guess-btn").onclick = submitPathGuess;
  } else {
    initGlobleMode();
    document.getElementById("guess-btn").onclick = submitGlobleGuess;
  }
});

// ─── Shared UI Logic ────────────────────────────────────────────────────────

function setupSharedUIEvents() {
  const input = document.getElementById("country-input");
  const listEl = document.getElementById("autocomplete-list");

  input.addEventListener("input", () => {
    const suggestions = autocompleteSuggestions(input.value.trim(), 8);
    listEl.innerHTML = "";
    suggestions.forEach(s => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = s.name;
      div.onmousedown = (e) => {
        e.preventDefault();
        input.value = s.name;
        document.getElementById("guess-btn").click();
      };
      listEl.appendChild(div);
    });
    listEl.classList.toggle("open", suggestions.length > 0);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("guess-btn").click();
  });

  // FIXED: Logic for Give Up now checks mode correctly on click
  document.getElementById("give-up-btn").onclick = () => {
    const mode = getActiveMode();
    if (mode === 'globle') {
      giveUp(); 
    } else if (mode === 'path') {
      handlePathGiveUp();
    }
  };

  document.getElementById("play-again-btn").onclick = () => location.reload();
  document.getElementById("share-btn").onclick = () => {
    if (getActiveMode() === 'globle') shareResults();
  };
  
  document.getElementById("reset-stats-btn").onclick = clearStats;
}


// ─── Global Stats Persistence ──────────────────────────────────────────────

const STORAGE_KEY = "globle_stats";

function initializeStats() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      totalGames: 0,
      wins: 0,
      losses: 0,
      currentStreak: 0,
      maxStreak: 0,
      totalWinGuesses: 0,
      bestGuessCount: Infinity,
      lastPlayDate: null,
      gameHistory: []
    }));
  }
}

function getStats() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function recordGameResult(targetCountry, guessCount, isWin) {
  const stats = getStats();
  const today = new Date().toISOString().split('T')[0];
  
  stats.totalGames++;
  if (isWin) {
    stats.wins++;
    stats.totalWinGuesses += guessCount;
    stats.currentStreak++;
    stats.maxStreak = Math.max(stats.currentStreak, stats.maxStreak);
    stats.bestGuessCount = Math.min(guessCount, stats.bestGuessCount);
  } else {
    stats.losses++;
    stats.currentStreak = 0;
  }
  
  stats.lastPlayDate = today;
  saveStats(stats);
  updateStatsDisplay();
}

function updateStatsDisplay() {
  const stats = getStats();
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  const avgGuesses = stats.wins > 0 ? (stats.totalWinGuesses / stats.wins).toFixed(1) : 0;
  
  const display = document.getElementById("stats-display");
  if (!display) return;

  // Use simple text or inject a row
  let row = display.querySelector(".stats-row");
  if (!row) {
    row = document.createElement("div");
    row.className = "stats-row";
    display.prepend(row);
  }

  row.innerHTML = `
    <div class="stat-item"><span>Games:</span> ${stats.totalGames}</div>
    <div class="stat-item"><span>Win %:</span> ${winRate}</div>
    <div class="stat-item"><span>Streak:</span> ${stats.currentStreak}</div>
    <div class="stat-item"><span>Avg:</span> ${avgGuesses}</div>
  `;
}

function clearStats() {
  if (confirm("Reset all progress?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}