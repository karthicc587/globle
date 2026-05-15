// multiplayer-mode.js — Async turn-based multiplayer using Supabase.

const MULTIPLAYER_STORAGE_KEY = "globle_multiplayer_session";
const MULTIPLAYER_DEFAULT_NAME = "Player";

let mpClient = null;
let mpChannel = null;
let mpRoom = null;
let mpPlayer = null;
let mpPlayers = [];
let mpResults = [];
let mpGuesses = [];
let mpGuessedSet = new Set();
let mpTargetIso3 = "";
let mpPathStartIso3 = "";
let mpPathChain = [];
let mpRoundStartMs = 0;
let mpRoundWon = false;
let mpUiEventsBound = false;
let mpGameMode = "globle";
let mpIsCollaborative = false;
let mpCurrentTurnId = null;
let mpHasSuggestedThisTurn = false; 
let mpMySelectedIso3 = null;
let mpPartnerSelectedIso3 = null;

function getSupabaseConfig() {
  return {
    url: window.SUPABASE_URL || "",
    anonKey: window.SUPABASE_ANON_KEY || ""
  };
}

function hasSupabaseConfig() {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

function setMultiplayerStatus(message, isError = false) {
  const el = document.getElementById("mp-status");
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#fca5a5" : "#bfdbfe";
}

function setErrorMessage(message) {
  const err = document.getElementById("error-msg");
  if (!err) return;
  err.textContent = message;
  if (!message) return;
  setTimeout(() => {
    if (err.textContent === message) err.textContent = "";
  }, 3200);
}

function getDisplayName() {
  const el = document.getElementById("mp-display-name");
  const value = (el?.value || "").trim();
  return value || MULTIPLAYER_DEFAULT_NAME;
}

function updateRoomMeta() {
  const el = document.getElementById("mp-room-meta");
  if (!el) return;
  if (!mpRoom) {
    el.textContent = "";
    return;
  }
  const status = mpRoom.status || "waiting";
  const mode = (mpRoom.mode || mpGameMode || "globle").toUpperCase();
  const p1 = mpPlayers[0]?.display_name || "Open Slot";
  const p2 = mpPlayers[1]?.display_name || "Open Slot";
  el.textContent = `Room ${mpRoom.id} | ${mode} | ${status.toUpperCase()} | ${p1} vs ${p2}`;
}

function saveMultiplayerSession() {
  const payload = {
    roomId: mpRoom?.id || null,
    displayName: getDisplayName()
  };
  localStorage.setItem(MULTIPLAYER_STORAGE_KEY, JSON.stringify(payload));
}

function clearMultiplayerSession() {
  localStorage.removeItem(MULTIPLAYER_STORAGE_KEY);
}

function getSavedMultiplayerSession() {
  try {
    return JSON.parse(localStorage.getItem(MULTIPLAYER_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function buildRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function clearMapColors() {
  if (!gSel) return;
  gSel.selectAll(".country")
    .classed("guessed", false)
    .classed("target", false)
    .style("fill", null)
    .style("opacity", "1");
}

function getMultiplayerModeLabel() {
  return mpGameMode === "path" ? "Path" : "Classic";
}

function getPathModePair() {
  const keys = Object.keys(NEIGHBOR_DATA).filter(k => (NEIGHBOR_DATA[k] || []).length > 0);
  let start = "";
  let target = "";
  let shortestPath = [];
  let guard = 0;

  do {
    start = keys[Math.floor(Math.random() * keys.length)];
    target = keys[Math.floor(Math.random() * keys.length)];
    shortestPath = getPathBFS(start, target);
    guard += 1;
  } while (
    guard < 500 &&
    (start === target || shortestPath.length === 0 || shortestPath.length < 5)
  );

  return { start, target, shortestPath };
}

function renderPathMultiplayerMap(optimalPath = []) {
  if (!gSel) return;
  
  // 1. Reset map layers.
  gSel.selectAll(".country")
    .classed("guessed", false)
    .classed("target", false)
    .classed("optimal-path", false)
    .style("fill", null)
    .style("opacity", "1");

  // 2. Render Optimal Path (Faint Red + Dashed Border).
  optimalPath.forEach(iso3 => {
    if (iso3 !== mpPathStartIso3 && iso3 !== mpTargetIso3) {
      const el = gSel.selectAll(".country").filter(d => d.iso3 === iso3);
      el.classed("optimal-path", true); // Uses the dashed red border from CSS.
      
      // Only fill if it's not already part of the user's taken path.
      if (!mpPathChain.includes(iso3)) {
        el.style("fill", "rgba(248, 113, 113, 0.2)"); 
      }
    }
  });

  // 3. Render Taken Path (Solid Blue).
  mpPathChain.forEach((iso3) => {
    if (iso3 !== mpPathStartIso3 && iso3 !== mpTargetIso3) {
      gSel.selectAll(".country").filter(d => d.iso3 === iso3)
        .classed("guessed", true)
        .style("fill", "#3b82f6");
    }
  });

  // 4. Highlight the start and end points.
  if (mpPathStartIso3) {
    gSel.selectAll(".country").filter(d => d.iso3 === mpPathStartIso3)
      .style("fill", "#10b981"); // Green
  }
  if (mpTargetIso3) {
    gSel.selectAll(".country").filter(d => d.iso3 === mpTargetIso3)
      .style("fill", "#fbbf24"); // Amber
  }
}

function renderMultiplayerGuesses() {
  const list = document.getElementById("guess-list");
  if (!list) return;
  if (mpGameMode === "path") {
    renderMultiplayerPathState();
    return;
  }
  const showCompass = document.getElementById("compass-toggle")?.checked;
  list.innerHTML = "";

  const header = document.createElement("div");
  header.className = "guess-item";
  header.innerHTML = `
    <span>Room</span>
    <span>${mpRoom?.id || "-"}</span>
    <span>${mpRoundWon ? "Complete" : "In Progress"}</span>
    <span class="g-swatch" style="background:#2563eb"></span>
  `;
  list.appendChild(header);

  [...mpGuesses]
    .sort((a, b) => a.dist - b.dist)
    .forEach((g, i) => {
    const item = document.createElement("div");
    item.className = "guess-item";
    const arrowHtml = (showCompass && g.dist !== 0) ? `<span style="margin-right:8px">${g.arrow}</span>` : "";
    item.innerHTML = `
      <span>#${i + 1}</span>
      <span>${g.name}</span>
      <span>${arrowHtml}${Math.round(g.dist / 10) * 10} km</span>
      <span class="g-swatch" style="background:${g.color}"></span>
    `;
      list.appendChild(item);
    });
}

function renderOpponentGuess(guess) {
  const list = document.getElementById("opponent-guess-list");
  const item = document.createElement("div");
  item.className = "guess-item opponent-guess";
  
  // We hide the name but show the distance/color
  const color = distToColor(guess.distance_km);
  
  item.innerHTML = `
    <span>#${guess.guess_index}</span>
    <span>[Hidden]</span>
    <span>${Math.round(guess.distance_km / 10) * 10} km</span>
    <span class="g-swatch" style="background:${color}"></span>
  `;
  list.appendChild(item);

  // Optional: Visual feedback on the globe
  // Show a faint "ping" or marker where they guessed
  // Note: This requires the guess object to include the lat/lng 
  // or for you to look up the ISO3 color locally.
  gSel.selectAll(".country").filter(d => d.iso3 === guess.iso3)
    .style("outline", `2px solid ${color}`)
    .style("outline-offset", "2px");
}

async function revealOpponentGuesses() {
  if (!mpClient || !mpRoom) return;

  // Fetch all guesses for this room from Supabase
  const { data: allGuesses, error } = await mpClient
    .from("room_guesses")
    .select("*")
    .eq("room_id", mpRoom.id)
    .order("guess_index", { ascending: true });

  if (error) {
    console.error("Error revealing guesses:", error);
    return;
  }

  const list = document.getElementById("opponent-guess-list");
  if (!list) return;
  list.innerHTML = ""; // Clear the [Hidden] rows

  const myId = getMyPlayerId();
  
  allGuesses.forEach(g => {
    // Only render guesses that belong to the opponent
    if (g.player_id !== myId) {
      const item = document.createElement("div");
      item.className = "guess-item opponent-revealed";
      
      const countryName = COUNTRY_DATA[g.iso3]?.name || g.iso3;
      const color = distToColor(g.distance_km);
      
      item.innerHTML = `
        <span>#${g.guess_index}</span>
        <span>${countryName}</span>
        <span>${Math.round(g.distance_km / 10) * 10} km</span>
        <span class="g-swatch" style="background:${color}"></span>
      `;
      list.appendChild(item);
    }
  });
}

function renderMultiplayerPathState() {
  const list = document.getElementById("guess-list");
  if (!list) return;
  list.innerHTML = "";
  const startName = COUNTRY_DATA[mpPathStartIso3]?.name || "-";
  const targetName = COUNTRY_DATA[mpTargetIso3]?.name || "-";
  const modeItem = document.createElement("div");
  modeItem.className = "guess-item";
  modeItem.innerHTML = `
    <span>Room</span>
    <span>${mpRoom?.id || "-"}</span>
    <span>${getMultiplayerModeLabel()}</span>
    <span class="g-swatch" style="background:#2563eb"></span>
  `;
  list.appendChild(modeItem);

  const goal = document.createElement("div");
  goal.className = "guess-item";
  goal.innerHTML = `
    <span>Goal</span>
    <span>${startName}</span>
    <span>to ${targetName}</span>
    <span class="g-swatch" style="background:#10b981"></span>
  `;
  list.appendChild(goal);

  mpPathChain.forEach((iso3, idx) => {
    const item = document.createElement("div");
    item.className = "guess-item";
    item.innerHTML = `
      <span>${idx === 0 ? "🚩" : "➡️"}</span>
      <span>${COUNTRY_DATA[iso3]?.name || iso3}</span>
      <span>${idx}</span>
      <span class="g-swatch" style="background:${idx === 0 ? "#10b981" : "#3b82f6"}"></span>
    `;
    list.appendChild(item);
  });
}

function updateRaceProgress(playerId, distance) {
  const maxDist = 15000; 
  const progress = Math.max(0, Math.min(100, 100 - (distance / maxDist) * 100));
  
  const elementId = playerId === getMyPlayerId() ? "player-progress" : "opponent-progress";
  const el = document.getElementById(elementId);
  
  if (el) {
    // Ensure the percentage unit is attached
    el.style.left = `${progress}%`; 
  }
}

function bindMultiplayerUiEvents() {
  if (mpUiEventsBound) return;
  mpUiEventsBound = true;

  // Enable map-click guessing in multiplayer mode.
  window.addEventListener("mapCountryClick", (e) => {
  if (!mpRoom || mpRoom.status !== "active" || mpRoundWon) return;
  const clickedIso3 = e?.detail?.iso3;
  if (!clickedIso3 || !COUNTRY_DATA[clickedIso3]) return;

  if (mpIsCollaborative) {
    selectCountryCollaborative(clickedIso3);
  } else {
    // Competitive behavior
    const input = document.getElementById("country-input");
    input.value = COUNTRY_DATA[clickedIso3].name;
    submitMultiplayerGuess();
  }
});

  // ─── COLLABORATIVE SEARCH BAR INTERCEPTION ───
  // In collaborative mode, the guess button and Enter key should "highlight"
  // the country as a suggestion (same as clicking the map), not submit directly.
  const guessBtn = document.getElementById("guess-btn");
  const countryInput = document.getElementById("country-input");

  if (guessBtn) {
    guessBtn.addEventListener("click", (e) => {
      if (!mpIsCollaborative || !mpRoom || mpRoom.status !== "active" || mpRoundWon) return;
      e.stopImmediatePropagation(); // Prevent main.js handler from firing
      const iso3 = resolveCountry((countryInput?.value || "").trim());
      if (iso3 && COUNTRY_DATA[iso3]) selectCountryCollaborative(iso3);
      if (countryInput) countryInput.value = "";
    }, true); // useCapture=true so this fires before the main.js listener
  }

  if (countryInput) {
    countryInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (!mpIsCollaborative || !mpRoom || mpRoom.status !== "active" || mpRoundWon) return;
      e.stopImmediatePropagation();
      const iso3 = resolveCountry((countryInput.value || "").trim());
      if (iso3 && COUNTRY_DATA[iso3]) selectCountryCollaborative(iso3);
      countryInput.value = "";
    }, true); // useCapture=true so this fires before the main.js listener
  }
  // ─────────────────────────────────────────────

  // Make compass toggle immediately refresh current multiplayer guess rows.
  const compassToggle = document.getElementById("compass-toggle");
  if (compassToggle) {
    compassToggle.addEventListener("change", () => {
      renderMultiplayerGuesses();
    });
  }

  // Make hover-name toggle immediately hide tooltip when turned off.
  const tooltipToggle = document.getElementById("tooltip-toggle");
  if (tooltipToggle) {
    tooltipToggle.addEventListener("change", () => {
      if (!tooltipToggle.checked) {
        const tooltip = document.getElementById("tooltip");
        if (tooltip) tooltip.classList.remove("visible");
      }
    });
  }
}

function setLobbyButtonsState() {
  const readyBtn = document.getElementById("mp-ready-btn");
  const leaveBtn = document.getElementById("mp-leave-btn");
  const createBtn = document.getElementById("mp-create-room-btn");
  const joinBtn = document.getElementById("mp-join-room-btn");
  if (!readyBtn || !leaveBtn || !createBtn || !joinBtn) return;

  const inRoom = Boolean(mpRoom?.id);
  readyBtn.disabled = !inRoom || mpRoom?.status !== "waiting";
  leaveBtn.disabled = !inRoom;
  createBtn.disabled = inRoom;
  joinBtn.disabled = inRoom;
}

async function initMultiplayerClient() {
  if (mpClient) return mpClient;
  if (!hasSupabaseConfig()) return null;

  const cfg = getSupabaseConfig();
  mpClient = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  const { data } = await mpClient.auth.getSession();
  if (!data.session) {
    await mpClient.auth.signInAnonymously();
  }
  return mpClient;
}

async function loadRoomSnapshot(roomId) {
  if (!mpClient) return;
  const roomRes = await mpClient.from("rooms").select("*").eq("id", roomId).single();
  if (roomRes.error) throw roomRes.error;
  mpRoom = roomRes.data;

  const playersRes = await mpClient.from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (playersRes.error) throw playersRes.error;
  mpPlayers = playersRes.data || [];

  const resultsRes = await mpClient.from("room_results")
    .select("*")
    .eq("room_id", roomId);
  if (resultsRes.error) throw resultsRes.error;
  mpResults = resultsRes.data || [];

  updateRoomMeta();
  setLobbyButtonsState();
}

/**
 * Rewritten subscribeRoom to support "Quick Play" (Rematch) auto-joining.
 * Listens for the 'next_room_id' update to chain game sessions.
 */
async function subscribeRoom(roomId) {
  if (!mpClient) return;

  // Cleanup existing channel if it exists
  if (mpChannel) {
    await mpClient.removeChannel(mpChannel);
    mpChannel = null;
  }

  mpChannel = mpClient.channel(`room:${roomId}`)

// listen for sync selection
.on("broadcast", { event: "sync_selection" }, (payload) => {
    const { iso3, player_id } = payload.payload;
    if (player_id !== getMyPlayerId()) {
        mpPartnerSelectedIso3 = iso3;
        renderCollaborativeOutlines();
        checkConsensus(iso3);
    }
})
    //0. Listen for opponent guesses

    .on("postgres_changes", { 
      event: "INSERT", 
      schema: "public", 
      table: "room_guesses", 
      filter: `room_id=eq.${roomId}` 
    }, (payload) => {
      const newGuess = payload.new;
      if (mpIsCollaborative) {
          mpMySelectedIso3 = null;
          mpPartnerSelectedIso3 = null;
          if (svgSel) svgSel.selectAll(".collab-ping").remove();
          if (gSel) {
            gSel.selectAll(".country")
            .style("stroke", null)
            .style("stroke-width", null)
            .style("stroke-dasharray", null);
           }
          const iso3 = newGuess.iso3;
    
    // ─── PATH MODE SYNC ───
    if (mpGameMode === "path") {
      // If the guess isn't already in our local chain (i.e., it was made by the partner)
      if (!mpPathChain.includes(iso3)) {
        mpPathChain.push(iso3);
        mpGuessedSet.add(iso3); // Prevent duplicate error logic
        
        // Update visuals for the non-active player
        renderPathMultiplayerMap();
        renderMultiplayerGuesses(); 
        rotateToCountry(iso3);
      }
    } else {
      // ─── GLOBLE MODE SYNC ───
      if (!mpGuessedSet.has(iso3)) {
        const dist = newGuess.distance_km;
        const country = COUNTRY_DATA[iso3];
        mpGuesses.push({ 
          iso3, 
          name: country.name, 
          dist, 
          color: distToColor(dist), 
          arrow: getBearingArrow(country.lat, country.lng, COUNTRY_DATA[mpTargetIso3].lat, COUNTRY_DATA[mpTargetIso3].lng) 
        });
        mpGuessedSet.add(iso3);
        
        gSel.selectAll(".country").filter(d => d.iso3 === iso3)
          .classed("guessed", true)
          .transition().duration(500)
          .style("fill", distToColor(dist));
          
        renderMultiplayerGuesses();
        rotateToCountry(iso3);
      }
    }
    
    // Clear purple suggestions regardless of mode
    gSel.selectAll(".country")
      .filter(function() { return d3.select(this).style("fill") === "rgb(139, 92, 246)"; })
      .style("fill", null);

  } else {

      updateRaceProgress(newGuess.player_id, newGuess.distance_km);

      if (newGuess.player_id !== getMyPlayerId()) {
        SoundManager.playOpponentMove();
        updateOpponentMap(newGuess.iso3, distToColor(newGuess.distance_km));
      }
    }
    })

    // 1. Listen for room updates (specifically checking for Rematch/Quick Play)
    .on("postgres_changes", { 
      event: "UPDATE", 
      schema: "public", 
      table: "rooms", 
      filter: `id=eq.${roomId}` 
    }, async (payload) => {
      const updatedRoom = payload.new;
      
      mpIsCollaborative = updatedRoom.is_collaborative;
      mpCurrentTurnId = updatedRoom.current_turn_player_id;
      updateCollabUI();

      // If a next_room_id is present, move both players to the new room automatically
      if (updatedRoom.next_room_id && updatedRoom.next_room_id !== mpRoom?.id) {
        setMultiplayerStatus("Joining next round...");
        await joinRoomInternal(updatedRoom.next_room_id, true);
        return;
      }

      await loadRoomSnapshot(roomId);
      await handleRoomState();
    })
    // 2. Listen for other room events (initial join/activation)
    .on("postgres_changes", { 
      event: "INSERT", 
      schema: "public", 
      table: "rooms", 
      filter: `id=eq.${roomId}` 
    }, async () => {
      await loadRoomSnapshot(roomId);
      await handleRoomState();
    })
    // 3. Listen for player status changes (Ready/Leave)
    .on("postgres_changes", { 
      event: "*", 
      schema: "public", 
      table: "room_players", 
      filter: `room_id=eq.${roomId}` 
    }, async () => {
      await loadRoomSnapshot(roomId);
      await handleRoomState();
    })
    // 4. Listen for game completion results
    .on("postgres_changes", { 
      event: "*", 
      schema: "public", 
      table: "room_results", 
      filter: `room_id=eq.${roomId}` 
    }, async () => {
      await loadRoomSnapshot(roomId);
      if (mpRoom.status === "finished") {
            maybeShowMultiplayerResults();
        } else {
            // If room is still active, but I've finished, ensure pending is shown
            const myRes = mpResults.find(r => r.player_id === getMyPlayerId());
            if (myRes) showMultiplayerPendingResult(myRes.won, myRes.gave_up);
  }

    })
    // 5. Listen for rematch request

    .on("postgres_changes", { 
    event: "UPDATE", 
    schema: "public", 
    table: "rooms", 
    filter: `id=eq.${roomId}` 
  }, async (payload) => {
    const updatedRoom = payload.new;
    
    if (updatedRoom.next_room_id && updatedRoom.next_room_id !== mpRoom?.id) {
      // SYNCED HIDE: This clears the win message for the player who DIDN'T click the button
      const winMsg = document.getElementById("win-message");
      if (winMsg) winMsg.style.display = "none";
      
      setMultiplayerStatus("Opponent requested rematch... joining!");
      await joinRoomInternal(updatedRoom.next_room_id, true);
      return;
    }

      await loadRoomSnapshot(roomId);
      await handleRoomState();
    })

    .subscribe();

    
}

function getMyPlayerId() {
  return mpPlayer?.id || "";
}

async function createRoom() {
  try {
    if (!mpClient) throw new Error("Missing backend connection.");
    const roomId = buildRoomCode();
    const playerId = getMyPlayerId();
    const displayName = getDisplayName();
    if (!playerId) throw new Error("Missing authenticated user.");

    const roomRes = await mpClient.from("rooms").insert({
      id: roomId,
      created_by: playerId,
      status: "waiting",
      mode: mpGameMode
    }).select("*").single();
    if (roomRes.error) throw roomRes.error;

    const playerRes = await mpClient.from("room_players").insert({
      room_id: roomId,
      player_id: playerId,
      display_name: displayName,
      is_ready: false
    });
    if (playerRes.error) throw playerRes.error;

    await joinRoomInternal(roomId, false);
    setMultiplayerStatus("Room created. Share code with your friend.");
  } catch (error) {
    setMultiplayerStatus(`Create failed: ${error.message}`, true);
  }
}

async function joinRoom() {
  const code = (document.getElementById("mp-room-code-input")?.value || "").trim().toUpperCase();
  if (!code) {
    setErrorMessage("Enter a room code.");
    return;
  }
  try {
    await joinRoomInternal(code, true);
  } catch (error) {
    setMultiplayerStatus(`Join failed: ${error.message}`, true);
  }
}

async function joinRoomInternal(roomId, insertPlayerIfMissing) {
  if (!mpClient) throw new Error("Missing backend connection.");
  const playerId = getMyPlayerId();
  const displayName = getDisplayName();
  mpTargetIso3 = "";
  mpRoundWon = false;
  mpGuesses = [];
  mpGuessedSet.clear();

  const roomCheck = await mpClient.from("rooms").select("*").eq("id", roomId).single();
  if (roomCheck.error || !roomCheck.data) throw new Error("Room not found.");
  const room = roomCheck.data;
  if ((room.mode || "globle") !== mpGameMode) {
    throw new Error(`Room is ${room.mode || "globle"} mode. Switch mode before joining.`);
  }
  if (room.status === "expired") throw new Error("Room has expired.");
  if (room.expires_at && new Date(room.expires_at).getTime() < Date.now()) {
    throw new Error("Room expired.");
  }

  const playersRes = await mpClient.from("room_players").select("*").eq("room_id", roomId);
  if (playersRes.error) throw playersRes.error;
  const players = playersRes.data || [];
  const existing = players.find(p => p.player_id === playerId);

  if (!existing && insertPlayerIfMissing) {
    if (players.length >= 2) throw new Error("Room is full.");
    const insertRes = await mpClient.from("room_players").insert({
      room_id: roomId,
      player_id: playerId,
      display_name: displayName,
      is_ready: false
    });
    if (insertRes.error) throw insertRes.error;
  }

  await subscribeRoom(roomId);
  await loadRoomSnapshot(roomId);
  saveMultiplayerSession();
  setMultiplayerStatus(`Joined room ${roomId}.`);
}

async function maybeStartRound() {
  if (!mpClient || !mpRoom) return;
  const roomId = mpRoom.id;
  const roomRes = await mpClient.from("rooms").select("*").eq("id", roomId).single();
  if (roomRes.error || !roomRes.data) return;
  const liveRoom = roomRes.data;
  if (liveRoom.status !== "waiting") return;

  const playersRes = await mpClient.from("room_players").select("*").eq("room_id", roomId);
  if (playersRes.error) return;
  const livePlayers = playersRes.data || [];
  const everyoneReady = livePlayers.length === 2 && livePlayers.every(p => p.is_ready);
  if (!everyoneReady) return;

  // Any client can attempt this; the WHERE guard ensures only one succeeds.
  const startPayload = {
      status: "active",
      started_at: new Date().toISOString(),
      is_collaborative: document.getElementById("collab-toggle").checked,
      current_turn_player_id: livePlayers[0].player_id // First player starts
  };
  if ((liveRoom.mode || "globle") === "path") {
    const pair = getPathModePair();
    startPayload.path_start_iso3 = pair.start;
    startPayload.target_iso3 = pair.target;
  } else {
    startPayload.target_iso3 = getRandomCountry();
  }

  const startRes = await mpClient.from("rooms")
    .update(startPayload)
    .eq("id", roomId)
    .eq("status", "waiting")
    .is("target_iso3", null);
  if (startRes.error) throw startRes.error;
}

async function setReady() {
  if (!mpClient || !mpRoom) return;
  try {
    const playerId = getMyPlayerId();
    const updateRes = await mpClient.from("room_players")
      .update({ is_ready: true, display_name: getDisplayName() })
      .eq("room_id", mpRoom.id)
      .eq("player_id", playerId);
    if (updateRes.error) throw updateRes.error;

    await loadRoomSnapshot(mpRoom.id);
    await maybeStartRound();
    setMultiplayerStatus("Ready set. Waiting for opponent.");
  } catch (error) {
    setMultiplayerStatus(`Ready failed: ${error.message}`, true);
  }
}

async function leaveRoom() {
  if (!mpClient || !mpRoom) return;
  try {
    const roomId = mpRoom.id;
    const playerId = getMyPlayerId();
    await mpClient.from("room_players").delete().eq("room_id", roomId).eq("player_id", playerId);
    if (mpChannel) {
      await mpClient.removeChannel(mpChannel);
      mpChannel = null;
    }
    mpRoom = null;
    mpPlayers = [];
    mpResults = [];
    mpGuesses = [];
    mpGuessedSet.clear();
    mpPathStartIso3 = "";
    mpPathChain = [];
    mpRoundWon = false;
    clearMapColors();
    clearMultiplayerSession();
    setLobbyButtonsState();
    updateRoomMeta();
    renderMultiplayerGuesses();
    setMultiplayerStatus("Left room.");
  } catch (error) {
    setMultiplayerStatus(`Leave failed: ${error.message}`, true);
  }
}

function activateRound() {
  mpGameMode = mpRoom?.mode || mpGameMode;
  mpTargetIso3 = mpRoom?.target_iso3 || "";
  mpPathStartIso3 = mpRoom?.path_start_iso3 || "";
  mpRoundStartMs = mpRoom?.started_at ? new Date(mpRoom.started_at).getTime() : Date.now();
  mpRoundWon = false;
  mpGuesses = [];
  mpGuessedSet.clear();
  mpPathChain = mpGameMode === "path" && mpPathStartIso3 ? [mpPathStartIso3] : [];
  mpGuessedSet.clear();
  if (mpPathStartIso3) mpGuessedSet.add(mpPathStartIso3);

  const oppList = document.getElementById("opponent-guess-list");
  if (oppList) oppList.innerHTML = "";
  
  // ─── RESET VISUALS FOR REMATCH ───
  // 1. Reset Progress Bar positions to 0%
  const pProg = document.getElementById("player-progress");
  const oProg = document.getElementById("opponent-progress");
  if (pProg) pProg.style.left = "0%";
  if (oProg) oProg.style.left = "0%";

  // 2. Reset Opponent Mini-Map (Clears colors and recenters)
  if (oppSvg) {
    oppSvg.selectAll(".opp-country")
      .transition().duration(500)
      .style("fill", "#334155")
      .style("stroke", "#0f172a")
      .style("stroke-width", "0.2");
  }
  // ────────────────────────────────

  clearMapColors();
  rotateToCountry(mpGameMode === "path" && mpPathStartIso3 ? mpPathStartIso3 : mpTargetIso3);
  
  // ... rest of the function remains the same ...
  document.getElementById("country-input").disabled = false;
  document.getElementById("guess-btn").disabled = false;
  document.getElementById("give-up-btn").disabled = false;
  document.getElementById("win-message").style.display = "none";
  if (mpGameMode === "path") {
    renderPathMultiplayerMap();
  }
  renderMultiplayerGuesses();
  setMultiplayerStatus(mpGameMode === "path" ? "Round active. Build a border path." : "Round active. Submit guesses.");
}

async function handleRoomState() {
  if (!mpRoom) return;
  
  // 1. Handle Expiration
  if (mpRoom.expires_at && new Date(mpRoom.expires_at).getTime() < Date.now()) {
    setMultiplayerStatus("Room expired. Create a new room.", true);
    await leaveRoom();
    return;
  }

  // 2. Handle Active Game State
  if (mpRoom.status === "active" && mpRoom.target_iso3) {
    const roomMode = mpRoom.mode || "globle";
    const pathStartChanged = roomMode === "path" && mpPathStartIso3 !== (mpRoom.path_start_iso3 || "");
    
    // Check if we need to initialize/reset the round visuals
    if (mpTargetIso3 !== mpRoom.target_iso3 || pathStartChanged || mpGameMode !== roomMode) {
      activateRound();
    }

    // NEW: Check if I have already finished while the room is still active
    const myId = getMyPlayerId();
    const myResult = mpResults.find(r => r.player_id === myId);
    if (myResult) {
      // Show the pending message so the UI doesn't look glitched
      showMultiplayerPendingResult(myResult.won, myResult.gave_up);
    }

  // 3. Handle Lobby/Waiting State
  } else if (mpRoom.status === "waiting") {
    const myId = getMyPlayerId();
    const me = mpPlayers.find(p => p.player_id === myId);
    const opponent = mpPlayers.find(p => p.player_id !== myId);
    const meReady = Boolean(me?.is_ready);
    const oppReady = Boolean(opponent?.is_ready);

    if (mpPlayers.length < 2) {
      setMultiplayerStatus("Waiting for opponent to join.");
    } else if (meReady && !oppReady) {
      setMultiplayerStatus("Ready set. Waiting for opponent to ready up.");
    } else if (!meReady && oppReady) {
      setMultiplayerStatus("Opponent is ready. Click Ready to start.");
    } else if (meReady && oppReady) {
      setMultiplayerStatus("Both ready. Starting round...");
    } else {
      setMultiplayerStatus("Waiting for both players to be ready.");
    }

  // 4. Handle Final Results State
  } else if (mpRoom.status === "finished") {
    const winMsg = document.getElementById("win-message");
    if (winMsg) winMsg.style.display = "none"; 
    await maybeShowMultiplayerResults();
  } 
}

async function submitMultiplayerGuess(consensusIso3 = null) {
  if (!mpClient || !mpRoom || mpRoom.status !== "active" || mpRoundWon) return;
  
  const input = document.getElementById("country-input");
  // Resolve the country from the parameter or the input field
  const iso3 = consensusIso3 || resolveCountry((input?.value || "").trim());

  if (!iso3 || !COUNTRY_DATA[iso3]) return;

  // ─── COLLABORATIVE HIGHLIGHT LOGIC ───
  // If we are in collab mode and this is NOT a forced consensus guess,
  // just "highlight" it as a suggestion.
  if (mpIsCollaborative && !consensusIso3) {
    selectCountryCollaborative(iso3);
    // Keep the input text visible for a moment so the user sees what they typed,
    // or clear it if you prefer.
    input.value = ""; 
    return; // Exit here; do not record an official guess yet.
  }

  // ─── OFFICIAL GUESS LOGIC ───
  if (mpGuessedSet.has(iso3)) {
    setErrorMessage(`Already guessed ${COUNTRY_DATA[iso3].name}.`);
    SoundManager.playError();
    return;
  }

  // ... rest of the logic to insert into Supabase ...
  // Ensure you use 'iso3' for calculations below
  const guessIndex = mpGameMode === "path" ? mpPathChain.length : mpGuesses.length + 1;
  let dist = 0;
  let arrow = "➡️";

  try {
    if (mpGameMode !== "path") {
      const target = COUNTRY_DATA[mpTargetIso3];
      dist = haversine(COUNTRY_DATA[iso3].lat, COUNTRY_DATA[iso3].lng, target.lat, target.lng);
      arrow = getBearingArrow(COUNTRY_DATA[iso3].lat, COUNTRY_DATA[iso3].lng, target.lat, target.lng);
    }

    const insertRes = await mpClient.from("room_guesses").insert({
      room_id: mpRoom.id,
      player_id: getMyPlayerId(),
      guess_index: guessIndex,
      iso3: iso3,
      distance_km: dist
    });
    if (insertRes.error) throw insertRes.error;

    // Record locally
    mpGuessedSet.add(iso3);
    if (mpGameMode === "path") {
      mpPathChain.push(iso3);
      renderPathMultiplayerMap();
    } else {
      mpGuesses.push({ iso3, name: COUNTRY_DATA[iso3].name, dist, color: distToColor(dist), arrow });
      gSel.selectAll(".country").filter(d => d.iso3 === iso3)
        .classed("guessed", true)
        .style("fill", distToColor(dist));
    }
    
    renderMultiplayerGuesses();
    rotateToCountry(iso3);

    if (iso3 === mpTargetIso3) {
      SoundManager.playSuccess();
      await finishMultiplayerRound(true, false);
    }
  } catch (err) { console.error(err); }
}

async function finishMultiplayerRound(won, gave_up) {
  if (!mpClient || !mpRoom || mpRoundWon) return;

  if (gave_up) SoundManager.playGiveUp();
  mpRoundWon = true;

  const durationMs = Math.max(Date.now() - mpRoundStartMs, 0);
  const guessCount = mpGameMode === "path" ? Math.max(mpPathChain.length - 1, 0) : mpGuesses.length;

  try {
    // 1. Record MY result first
    await mpClient.from("room_results").upsert({
        room_id: mpRoom.id,
        player_id: getMyPlayerId(),
        guess_count: guessCount,
        duration_ms: durationMs,
        won,
        gave_up: gave_up,
        completed_at: new Date().toISOString()
    });

    // 2. Load latest results to see if the round is over
    const { data: currentResults } = await mpClient
        .from("room_results")
        .select("player_id")
        .eq("room_id", mpRoom.id);

    // 3. ONLY mark the room as finished if everyone is done (or it's collaborative)
    if (mpIsCollaborative || currentResults.length >= 2) {
        await mpClient.from("rooms")
          .update({ 
            status: "finished", 
            finished_at: new Date().toISOString() 
          })
          .eq("id", mpRoom.id);
    } else {
        // Just show the "Pending" screen for the person who finished first
        showMultiplayerPendingResult(won, gaveUp);
    }

    // 4. Global UI Cleanup
    document.getElementById("country-input").disabled = true;
    document.getElementById("guess-btn").disabled = true;
    document.getElementById("give-up-btn").disabled = true;

    if (gaveUp || won) {
      rotateToCountry(mpTargetIso3);
      if (mpGameMode === "path") {
        renderPathOnMap(getPathBFS(mpPathStartIso3, mpTargetIso3));
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function handleMultiplayerGiveUp() {
  if (!mpRoom || mpRoom.status !== "active") return;

  if (mpIsCollaborative) {
    if (confirm("Give up on this round for both players?")) {
      await finishMultiplayerRound(false, true);
    }
  } else {
    // Standard competitive behavior
    await finishMultiplayerRound(false, true);
  }
}

function showMultiplayerPendingResult(won, gaveUp) {
  const winMsg = document.getElementById("win-message");
  const winText = document.getElementById("win-text");
  if (!winMsg || !winText) return;
  winMsg.style.display = "block";
  const attemptWord = mpGameMode === "path" ? "steps" : "guesses";
  const attemptCount = mpGameMode === "path" ? Math.max(mpPathChain.length - 1, 0) : mpGuesses.length;
  const optimalPath = mpGameMode === "path" ? getPathBFS(mpPathStartIso3, mpTargetIso3) : [];
  const optimalLine = mpGameMode === "path" && optimalPath.length > 0
    ? `<small>(Shortest possible was ${Math.max(optimalPath.length - 1, 0)} steps)</small><br>`
    : "";
  winText.innerHTML = `
    <strong>${won ? "Solved!" : (gaveUp ? "Given up" : "Round submitted")}</strong><br>
    You finished in ${attemptCount} ${attemptWord}.<br>
    ${optimalLine}
    <small>Waiting for opponent to finish...</small>
  `;
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function computeWinner(results) {
  if (results.length < 2) return null;
  const [a, b] = [...results].sort((r1, r2) => {
    if (r1.won !== r2.won) return r1.won ? -1 : 1;
    if (r1.guess_count !== r2.guess_count) return r1.guess_count - r2.guess_count;
    if (r1.duration_ms !== r2.duration_ms) return r1.duration_ms - r2.duration_ms;
    return 0;
  });
  const tie = a.won === b.won && a.guess_count === b.guess_count && a.duration_ms === b.duration_ms;
  return tie ? null : a.player_id;
}

async function maybeShowMultiplayerResults() {
  // Collaborative needs at least 1 result, Competitive needs 2.
  const requiredResults = mpIsCollaborative ? 1 : 2;
  
  // RE-FETCH: Ensure we have the absolute latest results from the DB before checking
  if (mpClient && mpRoom) {
    const { data: latestResults } = await mpClient
      .from("room_results")
      .select("*")
      .eq("room_id", mpRoom.id);
    if (latestResults) mpResults = latestResults;
  }

  if (!mpRoom || mpResults.length < requiredResults) {
    console.log("Waiting for all results to be recorded...");
    return;
  }

  // ─── VISUAL REVEAL ───
  revealOpponentGuesses();

  const isPathMode = (mpRoom.mode || mpGameMode) === "path";
  const unit = isPathMode ? "steps" : "guesses";
  
  const optimalPath = isPathMode ? getPathBFS(mpPathStartIso3, mpTargetIso3) : [];
  const optimalLine = isPathMode && optimalPath.length > 0
    ? `<small>(Shortest possible was ${Math.max(optimalPath.length - 1, 0)} steps)</small><br>`
    : "";

  if (isPathMode) {
    renderPathMultiplayerMap(optimalPath);
    rotateToCountry(mpTargetIso3);
  } else {
    // Reveal target for Globle Mode
    const winningRed = distToColor(0);
    gSel.selectAll(".country").filter(d => d.iso3 === mpTargetIso3)
      .classed("guessed", true)
      .transition().duration(500)
      .style("fill", winningRed);
    rotateToCountry(mpTargetIso3);
  }

  const winMsg = document.getElementById("win-message");
  const winText = document.getElementById("win-text");
  const rematchBtn = document.getElementById("mp-rematch-btn");

  if (!winMsg || !winText) return;
  winMsg.style.display = "block";

  if (rematchBtn) {
    rematchBtn.style.display = "block";
    rematchBtn.onclick = requestRematch;
  }

  if (mpIsCollaborative) {
    const res = mpResults[0]; 
    const status = res.won ? "🎉 Team Victory!" : "😢 Team Gave Up";
    winText.innerHTML = `
      <strong>${status}</strong><br>
      Finished in ${res.guess_count} ${unit}.<br>
      Time: ${formatDuration(res.duration_ms)}<br>
      ${optimalLine}
    `;
  } else {
    const winner = computeWinner(mpResults);
    const myId = getMyPlayerId();
    // Sort so results are consistent for both players
    const sortedRes = [...mpResults].sort((a,b) => a.player_id.localeCompare(b.player_id));
    const [a, b] = sortedRes;
    
    const findName = (id) => mpPlayers.find(p => p.player_id === id)?.display_name || "Player";
    const verdict = winner ? (winner === myId ? "You win!" : "You lose.") : "Tie game.";

    winText.innerHTML = `
      <strong>${verdict}</strong><br>
      ${findName(a.player_id)}: ${a.won ? "Solved" : "Gave up"} in ${a.guess_count} ${unit} (${formatDuration(a.duration_ms)})<br>
      ${findName(b.player_id)}: ${b.won ? "Solved" : "Gave up"} in ${b.guess_count} ${unit} (${formatDuration(b.duration_ms)})<br>
      ${optimalLine}
    `;
  }
  setMultiplayerStatus("Round Finished!");
}

async function shareMultiplayerResults() {
  if (!mpRoom || mpResults.length < 2) return;
  
  const isPathMode = (mpRoom.mode || mpGameMode) === "path";
  const winner = computeWinner(mpResults);
  const myId = getMyPlayerId();
  
  let header = "";
  let context = "";
  let visualData = "";

  if (isPathMode) {
    header = "🗺️ Globle (Path Mode)";
    const startName = COUNTRY_DATA[mpPathStartIso3]?.name || "Unknown";
    const targetName = COUNTRY_DATA[mpTargetIso3]?.name || "Unknown";
    context = `From: ${startName}\nTo: ${targetName}`;
    
    // Follows main.js convention for Path: Steps + ➡️ Chain
    const steps = Math.max(mpPathChain.length - 1, 0);
    const chainNames = mpPathChain.map(iso => COUNTRY_DATA[iso]?.name || iso).join(" ➡️ ");
    visualData = `Steps: ${steps}\nChain: ${chainNames}`;
  } else {
    header = "🌍 Globle";
    const targetName = COUNTRY_DATA[mpTargetIso3]?.name || "Unknown";
    context = `Target: ${targetName}`;
    
    // Follows main.js convention for Globle: Guesses + Emoji Grid
    const emojiGrid = mpGuesses.map(g => getEmojiFromDistance(g.dist)).join("");
    visualData = `Guesses: ${mpGuesses.length}\n${emojiGrid}`;
  }

  const verdict = winner ? (winner === myId ? "Result: I won!" : "Result: I lost.") : "Result: Tie game.";
  const unit = isPathMode ? "steps" : "guesses";

  const text = [
    `${header} - Multiplayer`,
    `Room: ${mpRoom.id}`,
    context,
    verdict,
    "",
    visualData,
    "",
    ...mpResults.map(r => {
      const pName = mpPlayers.find(p => p.player_id === r.player_id)?.display_name || "Player";
      const status = r.won ? "Solved" : "Gave up";
      return `${pName}: ${status} in ${r.guess_count} ${unit} (${formatDuration(r.duration_ms)})`;
    })
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    setMultiplayerStatus("Results copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy: ", err);
    setErrorMessage("Clipboard unavailable.");
  }
}

async function handleMultiplayerPlayAgain() {
  // In multiplayer, "Play Again" should cleanly leave the current room first.
  if (mpRoom) {
    await leaveRoom();
  }
  const winMsg = document.getElementById("win-message");
  if (winMsg) winMsg.style.display = "none";
  location.reload();
}


function selectCountryCollaborative(iso3) {
  if (!mpIsCollaborative || mpRoundWon) return;

  // 1. Logic Validation (Prevent suggesting something already guessed)
  if (mpGuessedSet.has(iso3)) {
    setErrorMessage(`Already guessed ${COUNTRY_DATA[iso3].name}.`);
    SoundManager.playError();
    return;
  }

  // 2. Path Mode Neighbor Validation
  if (mpGameMode === "path") {
    const lastCountry = mpPathChain[mpPathChain.length - 1];
    const neighbors = NEIGHBOR_DATA[lastCountry] || [];
    if (iso3 !== lastCountry && !neighbors.includes(iso3)) {
      setErrorMessage(`Selection must border ${COUNTRY_DATA[lastCountry].name}`);
      SoundManager.playError();
      return;
    }
  }

  // 3. Update Local State
  mpMySelectedIso3 = iso3;
  renderCollaborativeOutlines();

  // 4. Broadcast to Partner
  if (mpChannel) {
    mpChannel.send({
      type: 'broadcast',
      event: 'sync_selection',
      payload: { iso3, player_id: getMyPlayerId() }
    });
  }

  // 5. Check for Consensus
  checkConsensus(iso3);
}

function renderCollaborativeOutlines() {
  if (!svgSel) return;

  // 1. Remove existing pings to redraw fresh ones
  svgSel.selectAll(".collab-ping").remove();

  const createPing = (iso3, color, className) => {
    const country = COUNTRY_DATA[iso3];
    if (!country) return;

    svgSel.append("circle")
      .datum({ lng: country.lng, lat: country.lat }) // Store geo-data on the element
      .attr("class", `collab-ping ${className}`)
      .attr("r", 7)
      .style("fill", color)
      .style("stroke", "white")
      .style("stroke-width", 2)
      .style("pointer-events", "none");
  };

  if (mpPartnerSelectedIso3) createPing(mpPartnerSelectedIso3, "#8b5cf6", "partner-ping");
  if (mpMySelectedIso3) createPing(mpMySelectedIso3, "#10b981", "my-ping");

  // Initial update of position
  updatePingPositions();
}

function updatePingPositions() {
  if (!svgSel || !projection) return;

  svgSel.selectAll(".collab-ping").each(function(d) {
    const geoPoint = [d.lng, d.lat];
    
    // Check if the coordinate is on the visible hemisphere
    // d3.geoDistance calculates radians between the center of the view and the point
    const rotation = projection.rotate();
    const center = [-rotation[0], -rotation[1]];
    const distance = d3.geoDistance(center, geoPoint);

    if (distance > Math.PI / 2) {
      // Hide if on the back side
      d3.select(this).style("display", "none");
    } else {
      // Position and show
      const coords = projection(geoPoint);
      d3.select(this)
        .style("display", "block")
        .attr("cx", coords[0])
        .attr("cy", coords[1]);
    }
  });
}

async function checkConsensus(iso3) {
  // If both players have now suggested the same country
  if (mpMySelectedIso3 === mpPartnerSelectedIso3 && mpMySelectedIso3 !== null) {
    const finalIso3 = mpMySelectedIso3;
    
    // 1. Clear the suggestion state immediately
    mpMySelectedIso3 = null;
    mpPartnerSelectedIso3 = null;
    renderCollaborativeOutlines();

    // 2. Clear the UI
    const input = document.getElementById("country-input");
    if (input) input.value = "";

    // 3. Trigger the official guess
    await submitMultiplayerGuess(finalIso3);
  }
}

function updateCollabUI() {
  const raceTrack = document.getElementById("race-track");
  const opponentPip = document.getElementById("opponent-pip");

  if (mpIsCollaborative) {
    // 1. Hide competitive UI
    if (raceTrack) raceTrack.style.display = "none";
    if (opponentPip) opponentPip.style.display = "none";

    // 2. Clear status text so it doesn't show turn info
    setMultiplayerStatus(""); 
  } else {
    // Restore UI if mode switches back to competitive
    if (raceTrack) raceTrack.style.display = "block";
    if (opponentPip) opponentPip.style.display = "block";
  }
}

async function requestRematch() {
  if (!mpRoom || !mpClient) return;

  document.getElementById("win-message").style.display = "none";
  setMultiplayerStatus("Creating next round...");

  try {
    const newRoomId = buildRoomCode();
    const playerId = getMyPlayerId();

    // 1. Create the new room (inheriting current mode)
    await mpClient.from("rooms").insert({
      id: newRoomId,
      created_by: playerId,
      status: "waiting",
      mode: mpGameMode
    });

    // 2. Join the new room ourselves
    await mpClient.from("room_players").insert({
      room_id: newRoomId,
      player_id: playerId,
      display_name: getDisplayName(),
      is_ready: false
    });

    // 3. Update OLD room with the new ID so opponent can see it
    await mpClient.from("rooms")
      .update({ next_room_id: newRoomId })
      .eq("id", mpRoom.id);

    // 4. Switch our local client to the new room
    await joinRoomInternal(newRoomId, false);
    
  } catch (error) {
    setMultiplayerStatus("Rematch failed: " + error.message, true);
  }
}

async function initMultiplayerMode(mode = "globle") {
  mpGameMode = mode === "path" ? "path" : "globle";
  const input = document.getElementById("country-input");
  const guessBtn = document.getElementById("guess-btn");
  const saved = getSavedMultiplayerSession();
  if (saved.displayName && document.getElementById("mp-display-name")) {
    document.getElementById("mp-display-name").value = saved.displayName;
  }

  clearMapColors();
  mpGuesses = [];
  mpGuessedSet.clear();
  mpResults = [];
  mpTargetIso3 = "";
  mpPathStartIso3 = "";
  mpPathChain = [];
  mpRoundWon = false;
  renderMultiplayerGuesses();
  bindMultiplayerUiEvents();

  if (input) input.disabled = true;
  if (guessBtn) guessBtn.disabled = true;

  if (!hasSupabaseConfig()) {
    setMultiplayerStatus("Set SUPABASE_URL and SUPABASE_ANON_KEY on window to enable multiplayer.", true);
    return;
  }

  try {
    await initMultiplayerClient();
    const authRes = await mpClient.auth.getUser();
    mpPlayer = authRes.data.user;
    if (!mpPlayer) throw new Error("Unable to load user session.");

    document.getElementById("mp-create-room-btn").onclick = createRoom;
    document.getElementById("mp-join-room-btn").onclick = joinRoom;
    document.getElementById("mp-ready-btn").onclick = setReady;
    document.getElementById("mp-leave-btn").onclick = leaveRoom;

    setLobbyButtonsState();
    setMultiplayerStatus("Signed in. Create or join a room.");

    if (saved.roomId) {
      await joinRoomInternal(saved.roomId, true);
      await handleRoomState();
    }
  } catch (error) {
    setMultiplayerStatus(`Multiplayer init failed: ${error.message}`, true);
  }
}