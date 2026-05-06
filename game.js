// game.js — Complete 3D Rotating Globe logic with Zoom, Drag, and Click-to-Select

// ─── Configuration ────────────────────────────────────────────────────────

// Function to pick a random country key from the COUNTRY_DATA object
function getRandomCountry() {
  const keys = Object.keys(COUNTRY_DATA);
  return keys[Math.floor(Math.random() * keys.length)];
}

const TARGET_ISO3 = getRandomCountry(); 

// TopoJSON world atlas URL
const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const NUMERIC_TO_ISO3 = {
  4:"AFG",8:"ALB",12:"DZA",20:"AND",24:"AGO",32:"ARG",51:"ARM",
  36:"AUS",40:"AUT",31:"AZE",44:"BHS",48:"BHR",50:"BGD",112:"BLR",
  56:"BEL",84:"BLZ",204:"BEN",64:"BTN",68:"BOL",70:"BIH",72:"BWA",
  76:"BRA",96:"BRN",100:"BGR",854:"BFA",108:"BDI",132:"CPV",116:"KHM",
  120:"CMR",124:"CAN",140:"CAF",148:"TCD",152:"CHL",156:"CHN",170:"COL",
  174:"COM",180:"COD",178:"COG",188:"CRI",384:"CIV",191:"HRV",192:"CUB",
  196:"CYP",203:"CZE",208:"DNK",262:"DJI",214:"DOM",218:"ECU",818:"EGY",
  222:"SLV",226:"GNQ",232:"ERI",233:"EST",748:"SWZ",231:"ETH",242:"FJI",
  246:"FIN",250:"FRA",266:"GAB",270:"GMB",268:"GEO",276:"DEU",288:"GHA",
  300:"GRC",320:"GTM",324:"GIN",624:"GNB",328:"GUY",332:"HTI",340:"HND",
  348:"HUN",352:"ISL",356:"IND",360:"IDN",364:"IRN",368:"IRQ",372:"IRL",
  376:"ISR",380:"ITA",388:"JAM",392:"JPN",400:"JOR",398:"KAZ",404:"KEN",
  408:"PRK",410:"KOR",414:"KWT",417:"KGZ",418:"LAO",428:"LVA",422:"LBN",
  426:"LSO",430:"LBR",434:"LBY",438:"LIE",440:"LTU",442:"LUX",450:"MDG",
  454:"MWI",458:"MYS",462:"MDV",466:"MLI",470:"MLT",478:"MRT",480:"MUS",
  484:"MEX",498:"MDA",492:"MCO",496:"MNG",499:"MNE",504:"MAR",508:"MOZ",
  104:"MMR",516:"NAM",524:"NPL",528:"NLD",554:"NZL",558:"NIC",562:"NER",
  566:"NGA",807:"MKD",578:"NOR",512:"OMN",586:"PAK",591:"PAN",598:"PNG",
  600:"PRY",604:"PER",608:"PHL",616:"POL",620:"PRT",634:"QAT",642:"ROU",
  643:"RUS",646:"RWA",682:"SAU",686:"SEN",688:"SRB",694:"SLE",702:"SGP",
  703:"SVK",705:"SVN",706:"SOM",710:"ZAF",728:"SSD",724:"ESP",144:"LKA",
  729:"SDN",740:"SUR",752:"SWE",756:"CHE",760:"SYR",158:"TWN",762:"TJK",
  834:"TZA",764:"THA",626:"TLS",768:"TGO",780:"TTO",788:"TUN",792:"TUR",
  795:"TKM",800:"UGA",804:"UKR",784:"ARE",826:"GBR",840:"USA",858:"URY",
  860:"UZB",862:"VEN",704:"VNM",887:"YEM",894:"ZMB",716:"ZWE"
};

// ─── State ────────────────────────────────────────────────────────────────
let guesses = [];      
let guessedSet = new Set();
let won = false;
let geoFeatures = [];  
let projection;
let pathFn;            
let svgSel, gSel;      
let activeAutoIdx = -1;

let rotationActive = true;
let resumeTimer = null;
const ROTATION_RESUME_DELAY = 5000; // 5 seconds inactivity before spinning
const INITIAL_SCALE_FACTOR = 2.2;

// ─── Utility Functions ────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
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
    { p: 1.00, r: 20,  g: 25,  b: 50  }, 
  ];
  let lo = stops[0], hi = stops[stops.length-1];
  for (let i=0; i<stops.length-1; i++) {
    if (t >= stops[i].p && t <= stops[i+1].p) { lo = stops[i]; hi = stops[i+1]; break; }
  }
  const f = lo.p === hi.p ? 0 : (t - lo.p) / (hi.p - lo.p);
  const lerp = (a,b) => Math.round(a + (b-a)*f);
  return `rgb(${lerp(lo.r,hi.r)},${lerp(lo.g,hi.g)},${lerp(lo.b,hi.b)})`;
}

function stopRotationWithResume() {
  rotationActive = false;
  clearTimeout(resumeTimer);
  if (!won) {
    resumeTimer = setTimeout(() => {
      rotationActive = true;
    }, ROTATION_RESUME_DELAY);
  }
}

function refreshMap() {
  gSel.selectAll(".country").attr("d", pathFn);
  svgSel.select(".graticule").attr("d", pathFn);
  svgSel.select(".sphere").attr("d", pathFn);
}

// ─── Map Rendering ────────────────────────────────────────────────────────
async function initMap() {
  const wrapper = document.getElementById("map-wrapper");
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  const initialScale = Math.min(w, h) / INITIAL_SCALE_FACTOR;

  projection = d3.geoOrthographic()
    .scale(initialScale)
    .translate([w / 2, h / 2])
    .clipAngle(90);

  pathFn = d3.geoPath().projection(projection);

  svgSel = d3.select("#map")
    .attr("width", w)
    .attr("height", h);

  // Ocean
  svgSel.append("path")
    .datum({type: "Sphere"})
    .attr("class", "sphere")
    .attr("d", pathFn);

  // Grid lines
  svgSel.append("path")
    .datum(d3.geoGraticule()())
    .attr("class", "graticule")
    .attr("d", pathFn);

  gSel = svgSel.append("g").attr("class", "countries-group");

  // Interaction: Drag to rotate
  const drag = d3.drag()
    .on("start", stopRotationWithResume)
    .on("drag", (event) => {
      const rotate = projection.rotate();
      const k = 75 / projection.scale();
      projection.rotate([
        rotate[0] + event.dx * k,
        rotate[1] - event.dy * k
      ]);
      refreshMap();
    });

  // Interaction: Scroll to zoom
  const zoom = d3.zoom()
    .scaleExtent([0.8, 5]) 
    .on("start", stopRotationWithResume)
    .on("zoom", (event) => {
      projection.scale(initialScale * event.transform.k);
      refreshMap();
    });

  svgSel.call(drag).call(zoom);

  // Auto-rotation timer
  d3.timer(() => {
    if (won || !rotationActive) return;
    const currRotate = projection.rotate();
    projection.rotate([currRotate[0] + 0.15, currRotate[1]]);
    refreshMap();
  });

  const world = await d3.json(WORLD_URL);
  const countries = topojson.feature(world, world.objects.countries);

  geoFeatures = countries.features.map(f => ({
    ...f,
    iso3: NUMERIC_TO_ISO3[+f.id] || null
  }));

  const tooltip = document.getElementById("tooltip");

  gSel.selectAll(".country")
    .data(geoFeatures)
    .join("path")
    .attr("class", "country")
    .attr("d", pathFn)
    .on("mousemove", (event, d) => {
      if (!d.iso3) return;
      const data = COUNTRY_DATA[d.iso3];
      const name = data ? data.name : d.iso3;
      const rect = wrapper.getBoundingClientRect();
      const g = guesses.find(item => item.iso3 === d.iso3);
      tooltip.textContent = g ? `${name} — ${Math.round(g.dist / 10) * 10} km` : name;
      tooltip.style.left = (event.clientX - rect.left + 12) + "px";
      tooltip.style.top  = (event.clientY - rect.top  - 30) + "px";
      tooltip.classList.add("visible");
    })
    .on("mouseleave", () => tooltip.classList.remove("visible"))
    .on("click", (event, d) => {
      if (!d.iso3 || won) return;
      const country = COUNTRY_DATA[d.iso3];
      if (country) {
        document.getElementById("country-input").value = country.name;
        submitGuess();
        stopRotationWithResume();
      }
    });
}

function colorCountry(iso3, color) {
  gSel.selectAll(".country")
    .filter(d => d.iso3 === iso3)
    .classed("guessed", true)
    .transition().duration(500)
    .style("fill", color);
}

// ─── UI and Events ────────────────────────────────────────────────────────
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

function submitGuess() {
  const input = document.getElementById("country-input");
  const errorEl = document.getElementById("error-msg");
  const raw = input.value.trim();
  errorEl.textContent = "";

  const iso3 = resolveCountry(raw);
  if (!iso3) {
    if (raw) errorEl.textContent = `"${raw}" not found.`;
    return;
  }

  if (guessedSet.has(iso3)) {
    errorEl.textContent = `Already guessed ${COUNTRY_DATA[iso3].name}!`;
    input.value = "";
    return;
  }

  const target = COUNTRY_DATA[TARGET_ISO3];
  const guessed = COUNTRY_DATA[iso3];
  const dist = haversine(guessed.lat, guessed.lng, target.lat, target.lng);
  const color = distToColor(dist);

  guessedSet.add(iso3);
  guesses.push({ iso3, name: guessed.name, dist, color });
  colorCountry(iso3, color);
  renderGuesses();
  input.value = "";
  document.getElementById("autocomplete-list").classList.remove("open");

  if (iso3 === TARGET_ISO3) {
    won = true;
    rotationActive = false;
    const winEl = document.getElementById("win-message");
    winEl.style.display = "block";
    winEl.innerHTML = `🎉 Correct! <br><strong>${target.name}</strong><br>in ${guesses.length} guesses!`;
    input.disabled = true;
    document.getElementById("guess-btn").disabled = true;
    
    // Smooth transition to target
    d3.transition().duration(1500).tween("rotate", () => {
      const r = d3.interpolate(projection.rotate(), [-target.lng, -target.lat]);
      return (t) => { 
        projection.rotate(r(t)); 
        refreshMap(); 
      };
    });
  }
}

function setupEvents() {
  const input = document.getElementById("country-input");
  const listEl = document.getElementById("autocomplete-list");

  input.addEventListener("input", () => {
    const suggestions = autocompleteSuggestions(input.value.trim(), 8);
    listEl.innerHTML = "";
    suggestions.forEach(item => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = item.name;
      div.onmousedown = (e) => { 
        e.preventDefault();
        input.value = item.name; 
        submitGuess(); 
      };
      listEl.appendChild(div);
    });
    listEl.classList.toggle("open", suggestions.length > 0);
  });

  input.addEventListener("keydown", (e) => { 
    if (e.key === "Enter") submitGuess(); 
    if (e.key === "Escape") listEl.classList.remove("open");
  });

  document.getElementById("guess-btn").onclick = submitGuess;

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".input-wrapper")) {
      listEl.classList.remove("open");
    }
  });
}

(async () => {
  await initMap();
  setupEvents();
  document.getElementById("country-input").focus();
})();