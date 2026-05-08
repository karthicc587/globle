// map.js — Core D3 Globe with Zoom & Snap Functionality

// ─── Data Mapping ─────────────────────────────────────────────────────────
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

// ─── State & Variables ──────────────────────────────────────────────────────
let projection, pathFn, svgSel, gSel;
let geoFeatures = [];
let rotationActive = true;
let resumeTimer = null;
let currentBaseScale = 0;

const ROTATION_RESUME_DELAY = 10000;
const INITIAL_SCALE_FACTOR = 2.2;

/**
 * Initializes the D3 Globe.
 */
async function initGlobe(wrapperId = "map-wrapper", svgId = "map") {
  const wrapper = document.getElementById(wrapperId);
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  currentBaseScale = Math.min(w, h) / INITIAL_SCALE_FACTOR;

  // 1. Setup Projection
  projection = d3.geoOrthographic()
    .scale(currentBaseScale)
    .translate([w / 2, h / 2])
    .clipAngle(90);

  pathFn = d3.geoPath().projection(projection);
  svgSel = d3.select(`#${svgId}`).attr("width", w).attr("height", h);

  // 2. Base Layers
  svgSel.append("path").datum({ type: "Sphere" }).attr("class", "sphere").attr("d", pathFn);
  svgSel.append("path").datum(d3.geoGraticule()()).attr("class", "graticule").attr("d", pathFn);
  gSel = svgSel.append("g").attr("class", "countries-group");

  // 3. Zoom Logic
  const zoom = d3.zoom()
    .scaleExtent([0.8, 12]) // Zoom range
    .on("start", stopRotationWithResume)
    .on("zoom", (event) => {
      projection.scale(currentBaseScale * event.transform.k);
      refreshMap();
    });

  // 4. Drag Logic
  const drag = d3.drag()
    .on("start", stopRotationWithResume)
    .on("drag", (event) => {
      const r = projection.rotate();
      const k = 75 / projection.scale();
      projection.rotate([r[0] + event.dx * k, r[1] - event.dy * k]);
      refreshMap();
    });

  svgSel.call(drag).call(zoom);

  // 5. Auto-rotation Timer
  d3.timer(() => {
    if (!rotationActive) return;
    const r = projection.rotate();
    projection.rotate([r[0] + 0.15, r[1]]);
    refreshMap();
  });

  // 6. Load Map Data
  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  geoFeatures = topojson.feature(world, world.objects.countries).features.map(f => ({
    ...f,
    iso3: NUMERIC_TO_ISO3[+f.id] || null
  }));

  renderCountries();
  applyBordersToggle();
}

/**
 * Redraws all SVG elements to match current projection state.
 */
function refreshMap() {
  if (!gSel) return;
  gSel.selectAll(".country").attr("d", pathFn);
  svgSel.selectAll(".sphere, .graticule").attr("d", pathFn);
}

/**
 * Snaps the globe to a country, zooming in and centering it.
 */
function rotateToCountry(iso3) {
  const country = COUNTRY_DATA[iso3];
  if (!country || !projection) return;

  rotationActive = false;
  
  // Transition to center the country and zoom in slightly
  d3.transition().duration(1500).tween("rotateAndZoom", () => {
    const r = d3.interpolate(projection.rotate(), [-country.lng, -country.lat]);
    const s = d3.interpolate(projection.scale(), currentBaseScale * 1.5); // Snap-zoom factor
    
    return (t) => {
      projection.rotate(r(t));
      projection.scale(s(t));
      refreshMap();
    };
  });
}

function stopRotationWithResume() {
  rotationActive = false;
  clearTimeout(resumeTimer);
  // Re-enable rotation after a delay if the game isn't won
  resumeTimer = setTimeout(() => { 
    if (typeof won !== 'undefined' && !won) rotationActive = true; 
  }, ROTATION_RESUME_DELAY);
}

function renderCountries() {
  const tooltip = document.getElementById("tooltip");
  const wrapper = document.getElementById("map-wrapper");

  gSel.selectAll(".country")
    .data(geoFeatures)
    .join("path")
    .attr("class", "country")
    .attr("d", pathFn)
    .on("mousemove", (event, d) => {
      if (!d.iso3) return;
      const toggle = document.getElementById("tooltip-toggle");
      if (toggle && !toggle.checked) {
        tooltip.classList.remove("visible");
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      tooltip.textContent = COUNTRY_DATA[d.iso3]?.name || d.iso3;
      tooltip.style.left = (event.clientX - rect.left + 12) + "px";
      tooltip.style.top = (event.clientY - rect.top - 30) + "px";
      tooltip.classList.add("visible");
    })
    .on("mouseleave", () => tooltip.classList.remove("visible"))
    .on("click", (event, d) => {
      if (!d.iso3) return;
      const mapClickEvent = new CustomEvent("mapCountryClick", { detail: { iso3: d.iso3 } });
      window.dispatchEvent(mapClickEvent);
    });
}

/**
 * Applies or removes the borders-visible class based on the checkbox state.
 */
function applyBordersToggle() {
  if (!gSel) return;
  const bordersToggle = document.getElementById("borders-toggle");
  const enabled = bordersToggle && bordersToggle.checked;
  
  gSel.selectAll(".country")
    .classed("borders-visible", enabled);
}

// Resizing Handler
window.addEventListener("resize", _.debounce(() => {
  const wrapper = document.getElementById("map-wrapper");
  if (!wrapper || !projection) return;
  const w = wrapper.clientWidth, h = wrapper.clientHeight;
  currentBaseScale = Math.min(w, h) / INITIAL_SCALE_FACTOR;
  
  svgSel.attr("width", w).attr("height", h);
  projection.translate([w / 2, h / 2]).scale(currentBaseScale);
  refreshMap();
}, 100));
