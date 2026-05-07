// main.js — Global Orchestrator

// ─── Configuration & Mode Selection ────────────────────────────────────────

/**
 * Detects which game mode to run. 
 * You can expand this to check URL params, e.g., ?mode=path
 */
function getActiveMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'globle';
  if (mode === "multiplayer") return "globle";
  return mode;
}

function getMultiplayerEnabled() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("mp") === "1") return true;
  if (urlParams.get("mp") === "0") return false;
  return localStorage.getItem("globle_mp_enabled") === "1";
}

// ─── Lifecycle Initialization ───────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  initializeStats();
  await initGlobe("map-wrapper", "map");
  setupSharedUIEvents();

  const mode = getActiveMode();
  const multiplayerEnabled = getMultiplayerEnabled();

  if (multiplayerEnabled) {
    initMultiplayerMode(mode);
    document.getElementById("guess-btn").onclick = submitMultiplayerGuess;
  } else if (mode === 'path') {
    initPathMode();
    document.getElementById("guess-btn").onclick = submitPathGuess;
  } else {
    initGlobleMode();
    document.getElementById("guess-btn").onclick = submitGlobleGuess;
  }

  applyModeUI(mode, multiplayerEnabled);
});

// ─── Shared UI Logic ───────────────────────────────────────────────────────

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
    const multiplayerEnabled = getMultiplayerEnabled();
    if (multiplayerEnabled) {
      handleMultiplayerGiveUp();
      return;
    }
    if (mode === 'globle') {
      giveUp(); 
    } else if (mode === 'path') {
      handlePathGiveUp();
    }
  };

  document.getElementById("play-again-btn").onclick = async () => {
    if (getMultiplayerEnabled()) {
      await handleMultiplayerPlayAgain();
      return;
    }
    location.reload();
  };
  document.getElementById("share-btn").onclick = () => {
    if (getMultiplayerEnabled()) {
      shareMultiplayerResults(); // Handled in multiplayer-mode.js
      return;
    }
    
    const mode = getActiveMode();
    if (mode === "path") {
      sharePathResults(); 
    } else {
      shareGlobleResults();
    }
  };
  
  document.getElementById("reset-stats-btn").onclick = clearStats;

  const multiplayerToggle = document.getElementById("multiplayer-toggle");
  if (multiplayerToggle) {
    multiplayerToggle.checked = getMultiplayerEnabled();
    multiplayerToggle.addEventListener("change", () => {
      const enabled = multiplayerToggle.checked;
      localStorage.setItem("globle_mp_enabled", enabled ? "1" : "0");
      const params = new URLSearchParams(window.location.search);
      params.set("mode", getActiveMode());
      params.set("mp", enabled ? "1" : "0");
      window.location.search = params.toString();
    });
  }

  // Add this inside setupSharedUIEvents() in main.js
document.getElementById("borders-toggle").addEventListener("change", (e) => {
  // If checked, remove the 'hide-borders' class; if unchecked, add it.
  d3.select("#map").classed("hide-borders", !e.target.checked);
});
  
}

function applyModeUI(mode, multiplayerEnabled) {
  const modeLink = document.getElementById("mode-links");
  if (modeLink) {
    modeLink.style.display = "block";
    const base = `?mp=${multiplayerEnabled ? "1" : "0"}`;
    const links = modeLink.querySelectorAll("a");
    links.forEach((a) => {
      const isPath = a.textContent?.toLowerCase().includes("path");
      a.href = `${base}&mode=${isPath ? "path" : "globle"}`;
    });
  }

  const multiplayerPanel = document.getElementById("multiplayer-panel");
  if (multiplayerPanel) multiplayerPanel.style.display = multiplayerEnabled ? "block" : "none";

  const guessSectionTitle = document.getElementById("guess-section-title");
  if (guessSectionTitle) {
    if (multiplayerEnabled && mode === "path") guessSectionTitle.textContent = "Path";
    else if (multiplayerEnabled) guessSectionTitle.textContent = "Round";
    else guessSectionTitle.textContent = "Guesses";
  }
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

/**
 * Generic clipboard helper
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    // You can trigger a small UI notification here
    alert("Results copied to clipboard!"); 
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
}

/**
 * Share logic for Classic Globle Mode
 */
function shareGlobleResults() {
  // 'guesses' and 'TARGET_ISO3' are global in globle-mode.js
  const countryName = COUNTRY_DATA[TARGET_ISO3].name;
  const emojiGrid = guesses.map(g => getEmojiFromDistance(g.dist)).join("");
  
  const text = `🌍 Globle 
Target: ${countryName}
Guesses: ${guesses.length}
${emojiGrid}`;

  copyToClipboard(text);
}

/**
 * Share logic for Path Mode
 */
function sharePathResults() {
  // 'currentChain', 'PATH_START_ISO3', and 'PATH_TARGET_ISO3' are global in path-mode.js
  const start = COUNTRY_DATA[PATH_START_ISO3].name;
  const target = COUNTRY_DATA[PATH_TARGET_ISO3].name;
  const steps = currentChain.length - 1;
  
  const text = `🗺️ Globle (Path Mode)
From: ${start}
To: ${target}
Steps: ${steps}
Chain: ${currentChain.map(iso => COUNTRY_DATA[iso].name).join(" ➡️ ")}`;

  copyToClipboard(text);
}