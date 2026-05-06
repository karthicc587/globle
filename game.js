// game.js — The Full Logic

let TARGET_ISO3 = ""; 
let guesses = [];      
let guessedSet = new Set();
let won = false;
let geoFeatures = [];  
let projection, pathFn, svgSel, gSel;      
let rotationActive = true;
let resumeTimer = null;

const ROTATION_RESUME_DELAY = 5000;
const INITIAL_SCALE_FACTOR = 2.2;

function getRandomCountry() {
  const keys = Object.keys(COUNTRY_DATA);
  return keys[Math.floor(Math.random() * keys.length)];
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLat/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function distToColor(dist) {
  if (dist === 0) return "#c0392b"; 
  const t = Math.min(dist / 20000, 1); 
  const stops = [
    { p: 0.00, r: 192, g: 57,  b: 43  }, 
    { p: 0.10, r: 232, g: 96,  b: 26  }, 
    { p: 0.25, r: 212, g: 160, b: 23  }, 
    { p: 0.45, r: 74,  g: 139, b: 111 }, 
    { p: 0.65, r: 27,  g: 94,  b: 138 }, 
    { p: 0.82, r: 25,  g: 55,  b: 95  }, 
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

function stopRotationWithResume() {
  rotationActive = false;
  clearTimeout(resumeTimer);
  if (!won) resumeTimer = setTimeout(() => { rotationActive = true; }, ROTATION_RESUME_DELAY);
}

function refreshMap() {
  gSel.selectAll(".country").attr("d", pathFn);
  svgSel.select(".graticule").attr("d", pathFn);
  svgSel.select(".sphere").attr("d", pathFn);
}

async function initMap() {
  const wrapper = document.getElementById("map-wrapper");
  const w = wrapper.clientWidth, h = wrapper.clientHeight;
  const initialScale = Math.min(w, h) / INITIAL_SCALE_FACTOR;

  projection = d3.geoOrthographic().scale(initialScale).translate([w / 2, h / 2]).clipAngle(90);
  pathFn = d3.geoPath().projection(projection);
  svgSel = d3.select("#map").attr("width", w).attr("height", h);

  svgSel.append("path").datum({type: "Sphere"}).attr("class", "sphere").attr("d", pathFn);
  svgSel.append("path").datum(d3.geoGraticule()()).attr("class", "graticule").attr("d", pathFn);
  gSel = svgSel.append("g").attr("class", "countries-group");

  const drag = d3.drag().on("start", stopRotationWithResume).on("drag", (event) => {
    const r = projection.rotate();
    const k = 75 / projection.scale();
    projection.rotate([r[0] + event.dx * k, r[1] - event.dy * k]);
    refreshMap();
  });

  const zoom = d3.zoom().scaleExtent([0.8, 5]).on("start", stopRotationWithResume).on("zoom", (event) => {
    projection.scale(initialScale * event.transform.k);
    refreshMap();
  });

  svgSel.call(drag).call(zoom).on("click", (event) => {
    if (event.target.tagName === "svg" || event.target.classList.contains("sphere")) {
      document.getElementById("country-input").focus();
    }
  });

  d3.timer(() => {
    if (won || !rotationActive) return;
    const r = projection.rotate();
    projection.rotate([r[0] + 0.15, r[1]]);
    refreshMap();
  });

  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  geoFeatures = topojson.feature(world, world.objects.countries).features.map(f => ({
    ...f, iso3: NUMERIC_TO_ISO3[+f.id] || null
  }));

  const tooltip = document.getElementById("tooltip");
  gSel.selectAll(".country").data(geoFeatures).join("path").attr("class", "country").attr("d", pathFn)
    .on("mousemove", (event, d) => {
      if (!d.iso3) return;
      const rect = wrapper.getBoundingClientRect();
      const g = guesses.find(item => item.iso3 === d.iso3);
      tooltip.textContent = g ? `${COUNTRY_DATA[d.iso3].name} — ${Math.round(g.dist/10)*10} km` : COUNTRY_DATA[d.iso3]?.name || d.iso3;
      tooltip.style.left = (event.clientX - rect.left + 12) + "px";
      tooltip.style.top = (event.clientY - rect.top - 30) + "px";
      tooltip.classList.add("visible");
    })
    .on("mouseleave", () => tooltip.classList.remove("visible"))
    .on("click", (event, d) => {
      if (!d.iso3 || won) return;
      document.getElementById("country-input").value = COUNTRY_DATA[d.iso3].name;
      submitGuess();
      document.getElementById("country-input").focus();
    });
}

function submitGuess() {
  const input = document.getElementById("country-input");
  const iso3 = resolveCountry(input.value.trim());
  if (!iso3 || guessedSet.has(iso3)) return;

  const target = COUNTRY_DATA[TARGET_ISO3];
  const guessed = COUNTRY_DATA[iso3];
  const dist = haversine(guessed.lat, guessed.lng, target.lat, target.lng);
  
  guessedSet.add(iso3);
  guesses.push({ iso3, name: guessed.name, dist, color: distToColor(dist) });
  
  gSel.selectAll(".country").filter(d => d.iso3 === iso3)
    .classed("guessed", true).transition().duration(500).style("fill", distToColor(dist));

  renderGuesses();
  input.value = "";
  document.getElementById("autocomplete-list").classList.remove("open");

  if (iso3 === TARGET_ISO3) {
    won = true; rotationActive = false;
    document.getElementById("win-message").style.display = "block";
    document.getElementById("win-text").innerHTML = `🎉 Correct! <br><strong>${target.name}</strong><br>in ${guesses.length} guesses!`;
    input.disabled = true;
    d3.transition().duration(1500).tween("rotate", () => {
      const r = d3.interpolate(projection.rotate(), [-target.lng, -target.lat]);
      return (t) => { projection.rotate(r(t)); refreshMap(); };
    });
  }
}

function renderGuesses() {
  const list = document.getElementById("guess-list");
  list.innerHTML = "";
  [...guesses].sort((a, b) => a.dist - b.dist).forEach((g, i) => {
    const item = document.createElement("div");
    item.className = "guess-item";
    item.innerHTML = `<span>#${i+1}</span><span>${g.name}</span><span>${Math.round(g.dist/10)*10} km</span><span class="g-swatch" style="background:${g.color}"></span>`;
    list.appendChild(item);
  });
}

function resetGame() {
  TARGET_ISO3 = getRandomCountry();
  guesses = []; guessedSet.clear(); won = false; rotationActive = true;
  document.getElementById("win-message").style.display = "none";
  document.getElementById("guess-list").innerHTML = "";
  const input = document.getElementById("country-input");
  input.disabled = false; input.value = "";
  document.getElementById("guess-btn").disabled = false;
  gSel.selectAll(".country").classed("guessed", false).classed("target", false).style("fill", null);
  refreshMap();
  input.focus();
}

function shareResults() {
  const target = COUNTRY_DATA[TARGET_ISO3].name;
  const text = `🌍 Globle Clone\nTarget: ${target}\nSolved in ${guesses.length} guesses!\n${window.location.href}`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("share-btn");
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy Results 📋"; }, 2000);
  });
}

function setupEvents() {
  const input = document.getElementById("country-input");
  const listEl = document.getElementById("autocomplete-list");
  input.addEventListener("input", () => {
    const suggestions = autocompleteSuggestions(input.value.trim(), 8);
    listEl.innerHTML = "";
    suggestions.forEach(s => {
      const div = document.createElement("div");
      div.className = "autocomplete-item"; div.textContent = s.name;
      div.onmousedown = () => { input.value = s.name; submitGuess(); };
      listEl.appendChild(div);
    });
    listEl.classList.toggle("open", suggestions.length > 0);
  });
  input.addEventListener("keydown", (e) => { if(e.key === "Enter") submitGuess(); });
  document.getElementById("guess-btn").onclick = submitGuess;
  document.getElementById("play-again-btn").onclick = resetGame;
  document.getElementById("share-btn").onclick = shareResults;
}

(async () => {
  TARGET_ISO3 = getRandomCountry();
  await initMap();
  setupEvents();
})();