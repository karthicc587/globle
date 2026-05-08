// path-mode.js — "Global Link" Mode: Connecting Countries via Neighbors

// ─── Game State ─────────────────────────────────────────────────────────────
let PATH_START_ISO3 = "";
let PATH_TARGET_ISO3 = "";
let currentChain = []; 
let pathWon = false;

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Starts a new Path Mode game instance.
 */
async function initPathMode() {
  initializeStats();
  // 1. Find two countries with a valid land connection at least 4 steps apart
  const keys = Object.keys(NEIGHBOR_DATA).filter(k => (NEIGHBOR_DATA[k] || []).length > 0);
  
  do {
    PATH_START_ISO3 = keys[Math.floor(Math.random() * keys.length)];
    PATH_TARGET_ISO3 = keys[Math.floor(Math.random() * keys.length)];
  } while (
    PATH_START_ISO3 === PATH_TARGET_ISO3 || 
    getPathBFS(PATH_START_ISO3, PATH_TARGET_ISO3).length === 0 || // BFS now returns array
    getPathBFS(PATH_START_ISO3, PATH_TARGET_ISO3).length < 5 // Length 5 means 4 steps
  );

  currentChain = [PATH_START_ISO3];
  pathWon = false;
  rotationActive = false; // Disable auto-rotation for precise path tracking

  updatePathUI();
  renderPathOnMap();
  rotateToCountry(PATH_START_ISO3);

  // Listen for clicks on the globe from map.js
  window.addEventListener("mapCountryClick", (e) => {
    if (pathWon) return;
    document.getElementById("country-input").value = COUNTRY_DATA[e.detail.iso3].name;
    submitPathGuess();
  });
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

/**
 * Validates and processes a user guess.
 */
function submitPathGuess() {
  const input = document.getElementById("country-input");
  const iso3 = resolveCountry(input.value.trim());
  
  if (!iso3 || pathWon) return;

  const lastCountry = currentChain[currentChain.length - 1];
  const neighbors = NEIGHBOR_DATA[lastCountry] || [];

  if (iso3 === lastCountry) {
    showPathError("You are already here!");
  } else if (!neighbors.includes(iso3)) {
    showPathError(`${COUNTRY_DATA[iso3].name} does not border ${COUNTRY_DATA[lastCountry].name}`);
  } else if (currentChain.includes(iso3)) {
    showPathError("You've already visited this country in your path.");
  } else {
    // Valid Move
    currentChain.push(iso3);
    input.value = "";
    
    if (iso3 === PATH_TARGET_ISO3) {
      handlePathWin();
    } else {
      updatePathUI();
      renderPathOnMap();
      rotateToCountry(iso3);
    }
  }
}

/**
 * Handles win state and reveals the optimal path.
 */
function handlePathWin() {
  pathWon = true;
  const optimalPath = getPathBFS(PATH_START_ISO3, PATH_TARGET_ISO3);
  const userScore = currentChain.length - 1;
  recordGameResult(COUNTRY_DATA[PATH_TARGET_ISO3].name, userScore, true);
  const winMsg = document.getElementById("win-message");
  winMsg.style.display = "block";
  document.getElementById("win-text").innerHTML = `
    🎉 Goal Reached!<br>
    Path: ${userScore} steps<br>
    <small>(Shortest possible was ${optimalPath.length - 1})</small>
  `;

  updatePathUI();
  renderPathOnMap(optimalPath); // Pass optimal path for pale red highlighting
  rotateToCountry(PATH_TARGET_ISO3);
}

function handlePathGiveUp() {
  if (pathWon) return; // Don't trigger if they already won
  
  pathWon = true; // Stop further guesses
  const optimalPath = getPathBFS(PATH_START_ISO3, PATH_TARGET_ISO3);
  recordGameResult(COUNTRY_DATA[PATH_TARGET_ISO3].name, currentChain.length - 1, false);
  const winMsg = document.getElementById("win-message");
  winMsg.style.display = "block";
  winMsg.style.borderColor = "#ef4444"; // Red border for "Give Up"
  
  document.getElementById("win-text").innerHTML = `
    🏳️ Given Up<br>
    The target was <strong>${COUNTRY_DATA[PATH_TARGET_ISO3].name}</strong>.<br>
    <small>Optimal path was ${optimalPath.length - 1} steps.</small>
  `;

  // Disable inputs
  document.getElementById("country-input").disabled = true;
  document.getElementById("guess-btn").disabled = true;

  // Render map with the optimal path reveal
  renderPathOnMap(optimalPath);
  
  // Rotate to the target they couldn't reach
  rotateToCountry(PATH_TARGET_ISO3);
}

// ─── Map & UI Helpers ───────────────────────────────────────────────────────

/**
 * Updates the map layers with user and optimal paths.
 */
function renderPathOnMap(optimalPath = []) {
  // 1. Reset base map
  gSel.selectAll(".country")
    .classed("guessed", false)
    .classed("target", false)
    .classed("optimal-path", false)
    .style("fill", null)
    .style("opacity", "1");

  // 2. Color Optimal Path (Borders + Faint Fill)
  optimalPath.forEach(iso3 => {
    if (iso3 !== PATH_START_ISO3 && iso3 !== PATH_TARGET_ISO3) {
      const el = gSel.selectAll(".country").filter(d => d.iso3 === iso3);
      el.classed("optimal-path", true); // This triggers the dashed red border from CSS
      
      if (!currentChain.includes(iso3)) {
        el.style("fill", "rgba(248, 113, 113, 0.2)"); 
      }
    }
  });

  // 3. Color User Path (Solid Blue Fill)
  currentChain.forEach(iso3 => {
    if (iso3 !== PATH_START_ISO3 && iso3 !== PATH_TARGET_ISO3) {
      gSel.selectAll(".country").filter(d => d.iso3 === iso3)
        .classed("guessed", true)
        .style("fill", "#3b82f6");
    }
  });

  // 4. Highlight Ends
  gSel.selectAll(".country").filter(d => d.iso3 === PATH_START_ISO3).style("fill", "#10b981");
  gSel.selectAll(".country").filter(d => d.iso3 === PATH_TARGET_ISO3).style("fill", "#fbbf24");
}

/**
 * Updates the sidebar list showing the connection chain.
 */
function updatePathUI() {
  const list = document.getElementById("guess-list");
  list.innerHTML = `
    <div style="background: #334155; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
      <strong>Goal:</strong> Connect <strong>${COUNTRY_DATA[PATH_START_ISO3].name}</strong> 
      to <strong>${COUNTRY_DATA[PATH_TARGET_ISO3].name}</strong>
    </div>
  `;

  currentChain.forEach((iso3, idx) => {
    const item = document.createElement("div");
    item.className = "guess-item";
    item.innerHTML = `
      <span>${idx === 0 ? "🚩" : "➡️"}</span>
      <span>${COUNTRY_DATA[iso3].name}</span>
      <span class="g-swatch" style="background: ${idx === 0 ? '#10b981' : '#3b82f6'}"></span>
    `;
    list.appendChild(item);
  });
}

// ─── Pathfinding Logic (BFS) ────────────────────────────────────────────────

/**
 * Breadth-First Search to find the shortest connection between countries.
 * Returns an array of ISO3 codes representing the path.
 */
function getPathBFS(start, target) {
  if (start === target) return [start];
  let queue = [[start, [start]]];
  let visited = new Set([start]);

  while (queue.length > 0) {
    let [current, path] = queue.shift();
    let neighbors = NEIGHBOR_DATA[current] || [];

    for (let neighbor of neighbors) {
      if (neighbor === target) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, [...path, neighbor]]);
      }
    }
  }
  return []; // No connection found
}

function showPathError(msg) {
  const err = document.getElementById("error-msg");
  err.textContent = msg;
  setTimeout(() => { if(err.textContent === msg) err.textContent = ""; }, 3000);
}