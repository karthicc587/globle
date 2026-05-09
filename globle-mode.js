// globle-mode.js — Distance-based guessing logic

// ─── Game State ─────────────────────────────────────────────────────────────
let TARGET_ISO3 = ""; 
let guesses = [];      
let guessedSet = new Set();
let won = false;

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Starts a new Globle game instance.
 */
async function initGlobleMode() {
  TARGET_ISO3 = getRandomCountry();
  guesses = []; 
  guessedSet.clear(); 
  won = false; 
  rotationActive = true;

  updateStatsDisplay();
  resetUI();
  
  // Listen for clicks on the globe from map.js
  window.addEventListener("mapCountryClick", (e) => {
    if (won) return;
    const countryName = COUNTRY_DATA[e.detail.iso3].name;
    document.getElementById("country-input").value = countryName;
    submitGlobleGuess();
  });
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

function submitGlobleGuess() {
  const input = document.getElementById("country-input");
  const iso3 = resolveCountry(input.value.trim());

  if (!iso3 || guessedSet.has(iso3) || won) {
    SoundManager.playError();
    return;
  }
  const target = COUNTRY_DATA[TARGET_ISO3];
  const guessed = COUNTRY_DATA[iso3];
  
  // Calculate distance and direction
  const dist = haversine(guessed.lat, guessed.lng, target.lat, target.lng);
  const arrow = getBearingArrow(guessed.lat, guessed.lng, target.lat, target.lng);

  guessedSet.add(iso3);
  guesses.push({ iso3, name: guessed.name, dist, color: distToColor(dist), arrow });

  // Update Map via map.js globals
  gSel.selectAll(".country").filter(d => d.iso3 === iso3)
    .classed("guessed", true)
    .transition()
    .duration(500)
    .style("fill", distToColor(dist));

  renderGlobleGuesses();
  input.value = "";
  rotateToCountry(iso3);
  if (iso3 === TARGET_ISO3) {
    SoundManager.playSuccess();
    handleGlobleWin();
  } else {
    SoundManager.playMove();
  }
}

function handleGlobleWin() {
  won = true;
  rotationActive = false;
  recordGameResult(COUNTRY_DATA[TARGET_ISO3].name, guesses.length, true);

  const emojiGrid = guesses.map(g => getEmojiFromDistance(g.dist)).join("");
  const winMsg = document.getElementById("win-message");
  winMsg.style.display = "block";

  document.getElementById("win-text").innerHTML = `
    🎉 Correct! <br>
    <strong>${COUNTRY_DATA[TARGET_ISO3].name}</strong><br>
    in ${guesses.length} guesses!<br>
    <div style="margin-top:10px; letter-spacing: 2px;">${emojiGrid}</div>
  `;

  rotateToCountry(TARGET_ISO3); // Call map.js API
}

function giveUp() {
  if (won) return;
  SoundManager.playGiveUp();
  won = true;
  rotationActive = false;
  
  const target = COUNTRY_DATA[TARGET_ISO3];
  recordGameResult(target.name, guesses.length, false);
  
  document.getElementById("win-message").style.display = "block";
  document.getElementById("win-text").innerHTML = `
    😢 Game Over<br>
    The target was <strong>${target.name}</strong>
  `;
  
  document.getElementById("country-input").disabled = true;
  document.getElementById("guess-btn").disabled = true;
  
  // Highlight target in Amber
  gSel.selectAll(".country").filter(d => d.iso3 === TARGET_ISO3)
    .classed("target", true)
    .transition().duration(500).style("fill", "#fbbf24");
    
  rotateToCountry(TARGET_ISO3);
}


// ─── UI Rendering ───────────────────────────────────────────────────────────

function renderGlobleGuesses() {
  const list = document.getElementById("guess-list");
  const showCompass = document.getElementById("compass-toggle").checked;
  
  list.innerHTML = "";
  [...guesses].sort((a, b) => a.dist - b.dist).forEach((g, i) => {
    const item = document.createElement("div");
    item.className = "guess-item";
    
    const arrowHtml = (showCompass && g.dist !== 0) ? `<span style="margin-right:8px">${g.arrow}</span>` : "";

    item.innerHTML = `
      <span>#${i+1}</span>
      <span>${g.name}</span>
      <span>${arrowHtml}${Math.round(g.dist/10)*10} km</span>
      <span class="g-swatch" style="background:${g.color}"></span>
    `;
    list.appendChild(item);
  });
}

function resetUI() {
  document.getElementById("win-message").style.display = "none";
  document.getElementById("guess-list").innerHTML = "";
  const input = document.getElementById("country-input");
  input.disabled = false;
  input.value = "";
  document.getElementById("guess-btn").disabled = false;
  document.getElementById("give-up-btn").disabled = false;
}

// ─── Utility ────────────────────────────────────────────────────────────────

function getRandomCountry() {
  const keys = Object.keys(COUNTRY_DATA);
  return keys[Math.floor(Math.random() * keys.length)];
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function distToColor(dist) {
  if (dist === 0) return "#c0392b";
  const t = Math.min(dist / 20000, 1);
  const stops = [
    { p: 0.00, r: 255, g: 0,   b: 0   }, 
    { p: 0.05, r: 255, g: 69,  b: 0   }, 
    { p: 0.12, r: 255, g: 140, b: 0   }, 
    { p: 0.25, r: 255, g: 215, b: 0   }, 
    { p: 0.45, r: 74,  g: 144, b: 226 }, 
    { p: 0.70, r: 27,  g: 94,  b: 138 }, 
    { p: 1.00, r: 20,  g: 25,  b: 50  }  
  ];

  let lo = stops[0], hi = stops[stops.length-1];
  for (let i=0; i<stops.length-1; i++) {
    if (t >= stops[i].p && t <= stops[i+1].p) { lo = stops[i]; hi = stops[i+1]; break; }
  }
  const f = (t - lo.p) / (hi.p - lo.p || 1);
  const lerp = (a,b) => Math.round(a + (b-a)*f);
  return `rgb(${lerp(lo.r,hi.r)},${lerp(lo.g,hi.g)},${lerp(lo.b,hi.b)})`;
}

function getEmojiFromDistance(dist) {
  if (dist === 0) return "🟥";
  if (dist < 1000) return "🔴";
  if (dist < 2400) return "🟧";
  if (dist < 5000) return "🟨";
  if (dist < 9000) return "🔵";
  if (dist < 14000) return "🟦";
  return "⬛";
}

function getBearingArrow(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  let θ = Math.atan2(y, x) * 180 / Math.PI;
  const bearing = (θ + 360) % 360;

  if (bearing >= 337.5 || bearing < 22.5) return "⬆️";
  if (bearing >= 22.5 && bearing < 67.5) return "↗️";
  if (bearing >= 67.5 && bearing < 112.5) return "➡️";
  if (bearing >= 112.5 && bearing < 157.5) return "↘️";
  if (bearing >= 157.5 && bearing < 202.5) return "⬇️";
  if (bearing >= 202.5 && bearing < 247.5) return "↙️";
  if (bearing >= 247.5 && bearing < 292.5) return "⬅️";
  if (bearing >= 292.5 && bearing < 337.5) return "↖️";
  return "➡️";
}