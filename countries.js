// countries.js — centroids (lat/lng) and name aliases for ~195 countries
// ISO 3166-1 alpha-3 codes used as primary keys (matching TopoJSON world-110m)

const COUNTRY_DATA = {
  AFG: { name: "Afghanistan",                lat: 33.93,  lng: 67.71,  aliases: ["afghanistan","afghan"] },
  ALB: { name: "Albania",                    lat: 41.15,  lng: 20.17,  aliases: ["albania","shqipëri"] },
  DZA: { name: "Algeria",                    lat: 28.03,  lng: 1.66,   aliases: ["algeria","algerie"] },
  AND: { name: "Andorra",                    lat: 42.55,  lng: 1.60,   aliases: ["andorra"] },
  AGO: { name: "Angola",                     lat: -11.20, lng: 17.87,  aliases: ["angola"] },
  ARG: { name: "Argentina",                  lat: -38.42, lng: -63.62, aliases: ["argentina"] },
  ARM: { name: "Armenia",                    lat: 40.07,  lng: 45.04,  aliases: ["armenia","hayastan"] },
  AUS: { name: "Australia",                  lat: -25.27, lng: 133.78, aliases: ["australia","oz","aussie"] },
  AUT: { name: "Austria",                    lat: 47.52,  lng: 14.55,  aliases: ["austria","österreich","osterreich"] },
  AZE: { name: "Azerbaijan",                 lat: 40.14,  lng: 47.58,  aliases: ["azerbaijan","azerbaycan"] },
  BHS: { name: "Bahamas",                    lat: 25.03,  lng: -77.40, aliases: ["bahamas","the bahamas"] },
  BHR: { name: "Bahrain",                    lat: 26.00,  lng: 50.55,  aliases: ["bahrain","bahrein"] },
  BGD: { name: "Bangladesh",                 lat: 23.68,  lng: 90.35,  aliases: ["bangladesh"] },
  BLR: { name: "Belarus",                    lat: 53.71,  lng: 28.05,  aliases: ["belarus","byelorussia"] },
  BEL: { name: "Belgium",                    lat: 50.50,  lng: 4.47,   aliases: ["belgium","belgique","belgie"] },
  BLZ: { name: "Belize",                     lat: 17.19,  lng: -88.50, aliases: ["belize"] },
  BEN: { name: "Benin",                      lat: 9.31,   lng: 2.32,   aliases: ["benin"] },
  BTN: { name: "Bhutan",                     lat: 27.51,  lng: 90.43,  aliases: ["bhutan","druk yul"] },
  BOL: { name: "Bolivia",                    lat: -16.29, lng: -63.59, aliases: ["bolivia","plurinational state of bolivia"] },
  BIH: { name: "Bosnia and Herzegovina",     lat: 43.92,  lng: 17.68,  aliases: ["bosnia","herzegovina","bih","bosnia and herzegovina","bosnia & herzegovina"] },
  BWA: { name: "Botswana",                   lat: -22.33, lng: 24.68,  aliases: ["botswana"] },
  BRA: { name: "Brazil",                     lat: -14.24, lng: -51.93, aliases: ["brazil","brasil"] },
  BRN: { name: "Brunei",                     lat: 4.54,   lng: 114.73, aliases: ["brunei","brunei darussalam"] },
  BGR: { name: "Bulgaria",                   lat: 42.73,  lng: 25.49,  aliases: ["bulgaria","balgaria"] },
  BFA: { name: "Burkina Faso",               lat: 12.36,  lng: -1.53,  aliases: ["burkina faso","burkina"] },
  BDI: { name: "Burundi",                    lat: -3.37,  lng: 29.92,  aliases: ["burundi"] },
  CPV: { name: "Cape Verde",                 lat: 16.00,  lng: -24.01, aliases: ["cape verde","cabo verde"] },
  KHM: { name: "Cambodia",                   lat: 12.57,  lng: 104.99, aliases: ["cambodia","kampuchea","khmer"] },
  CMR: { name: "Cameroon",                   lat: 3.85,   lng: 11.50,  aliases: ["cameroon","cameroun"] },
  CAN: { name: "Canada",                     lat: 56.13,  lng: -106.35,aliases: ["canada","canadian"] },
  CAF: { name: "Central African Republic",   lat: 6.61,   lng: 20.94,  aliases: ["central african republic","car","centrafrique"] },
  TCD: { name: "Chad",                       lat: 15.45,  lng: 18.73,  aliases: ["chad","tchad"] },
  CHL: { name: "Chile",                      lat: -35.68, lng: -71.54, aliases: ["chile","chilean"] },
  CHN: { name: "China",                      lat: 35.86,  lng: 104.20, aliases: ["china","prc","people's republic of china","peoples republic of china","zhongguo"] },
  COL: { name: "Colombia",                   lat: 4.57,   lng: -74.30, aliases: ["colombia"] },
  COM: { name: "Comoros",                    lat: -11.88, lng: 43.87,  aliases: ["comoros","comores"] },
  COD: { name: "DR Congo",                   lat: -4.04,  lng: 21.76,  aliases: ["dr congo","drc","democratic republic of the congo","democratic republic of congo","congo kinshasa","congo-kinshasa","zaire"] },
  COG: { name: "Republic of Congo",          lat: -0.23,  lng: 15.83,  aliases: ["republic of congo","congo brazzaville","congo-brazzaville","congo"] },
  CRI: { name: "Costa Rica",                 lat: 9.75,   lng: -83.75, aliases: ["costa rica"] },
  CIV: { name: "Côte d'Ivoire",              lat: 7.54,   lng: -5.55,  aliases: ["cote d'ivoire","cote divoire","ivory coast","côte d'ivoire"] },
  HRV: { name: "Croatia",                    lat: 45.10,  lng: 15.20,  aliases: ["croatia","hrvatska"] },
  CUB: { name: "Cuba",                       lat: 21.52,  lng: -79.28, aliases: ["cuba"] },
  CYP: { name: "Cyprus",                     lat: 35.13,  lng: 33.43,  aliases: ["cyprus","kypros"] },
  CZE: { name: "Czech Republic",             lat: 49.82,  lng: 15.47,  aliases: ["czech republic","czechia","czech","ceska republika"] },
  DNK: { name: "Denmark",                    lat: 56.26,  lng: 9.50,   aliases: ["denmark","danmark"] },
  DJI: { name: "Djibouti",                   lat: 11.83,  lng: 42.59,  aliases: ["djibouti"] },
  DOM: { name: "Dominican Republic",         lat: 18.74,  lng: -70.16, aliases: ["dominican republic","dominican"] },
  ECU: { name: "Ecuador",                    lat: -1.83,  lng: -78.18, aliases: ["ecuador"] },
  EGY: { name: "Egypt",                      lat: 26.82,  lng: 30.80,  aliases: ["egypt","masr","misr"] },
  SLV: { name: "El Salvador",                lat: 13.79,  lng: -88.90, aliases: ["el salvador","salvador"] },
  GNQ: { name: "Equatorial Guinea",          lat: 1.65,   lng: 10.27,  aliases: ["equatorial guinea","guinea ecuatorial"] },
  ERI: { name: "Eritrea",                    lat: 15.18,  lng: 39.78,  aliases: ["eritrea"] },
  EST: { name: "Estonia",                    lat: 58.60,  lng: 25.01,  aliases: ["estonia","eesti"] },
  SWZ: { name: "Eswatini",                   lat: -26.52, lng: 31.47,  aliases: ["eswatini","swaziland"] },
  ETH: { name: "Ethiopia",                   lat: 9.15,   lng: 40.49,  aliases: ["ethiopia","abyssinia"] },
  FJI: { name: "Fiji",                       lat: -17.71, lng: 178.07, aliases: ["fiji"] },
  FIN: { name: "Finland",                    lat: 61.92,  lng: 25.75,  aliases: ["finland","suomi"] },
  FRA: { name: "France",                     lat: 46.23,  lng: 2.21,   aliases: ["france","french"] },
  GAB: { name: "Gabon",                      lat: -0.80,  lng: 11.61,  aliases: ["gabon"] },
  GMB: { name: "Gambia",                     lat: 13.44,  lng: -15.31, aliases: ["gambia","the gambia"] },
  GEO: { name: "Georgia",                    lat: 42.31,  lng: 43.36,  aliases: ["georgia (country)","sakartvelo"] },
  DEU: { name: "Germany",                    lat: 51.17,  lng: 10.45,  aliases: ["germany","deutschland","german"] },
  GHA: { name: "Ghana",                      lat: 7.96,   lng: -1.02,  aliases: ["ghana","gold coast"] },
  GRC: { name: "Greece",                     lat: 39.07,  lng: 21.82,  aliases: ["greece","hellas","ellada"] },
  GTM: { name: "Guatemala",                  lat: 15.78,  lng: -90.23, aliases: ["guatemala"] },
  GIN: { name: "Guinea",                     lat: 9.95,   lng: -11.77, aliases: ["guinea"] },
  GNB: { name: "Guinea-Bissau",              lat: 11.80,  lng: -15.18, aliases: ["guinea-bissau","guinea bissau"] },
  GUY: { name: "Guyana",                     lat: 4.86,   lng: -58.93, aliases: ["guyana"] },
  HTI: { name: "Haiti",                      lat: 18.97,  lng: -72.29, aliases: ["haiti"] },
  HND: { name: "Honduras",                   lat: 15.20,  lng: -86.24, aliases: ["honduras"] },
  HUN: { name: "Hungary",                    lat: 47.16,  lng: 19.50,  aliases: ["hungary","magyarország","magyarorszag"] },
  ISL: { name: "Iceland",                    lat: 64.96,  lng: -19.02, aliases: ["iceland","ísland","island"] },
  IND: { name: "India",                      lat: 20.59,  lng: 78.96,  aliases: ["india","bharat","hindustan"] },
  IDN: { name: "Indonesia",                  lat: -0.79,  lng: 113.92, aliases: ["indonesia"] },
  IRN: { name: "Iran",                       lat: 32.43,  lng: 53.69,  aliases: ["iran","persia","islamic republic of iran"] },
  IRQ: { name: "Iraq",                       lat: 33.22,  lng: 43.68,  aliases: ["iraq"] },
  IRL: { name: "Ireland",                    lat: 53.41,  lng: -8.24,  aliases: ["ireland","eire","éire","republic of ireland"] },
  ISR: { name: "Israel",                     lat: 31.05,  lng: 34.85,  aliases: ["israel","yisrael"] },
  ITA: { name: "Italy",                      lat: 41.87,  lng: 12.57,  aliases: ["italy","italia","italian"] },
  JAM: { name: "Jamaica",                    lat: 18.11,  lng: -77.30, aliases: ["jamaica"] },
  JPN: { name: "Japan",                      lat: 36.20,  lng: 138.25, aliases: ["japan","nippon","nihon"] },
  JOR: { name: "Jordan",                     lat: 30.59,  lng: 36.24,  aliases: ["jordan","hashemite kingdom of jordan"] },
  KAZ: { name: "Kazakhstan",                 lat: 48.02,  lng: 66.92,  aliases: ["kazakhstan","kazakstan"] },
  KEN: { name: "Kenya",                      lat: -0.02,  lng: 37.91,  aliases: ["kenya"] },
  PRK: { name: "North Korea",                lat: 40.34,  lng: 127.51, aliases: ["north korea","dprk","democratic people's republic of korea"] },
  KOR: { name: "South Korea",                lat: 35.91,  lng: 127.77, aliases: ["south korea","republic of korea","korea"] },
  KWT: { name: "Kuwait",                     lat: 29.31,  lng: 47.48,  aliases: ["kuwait"] },
  KGZ: { name: "Kyrgyzstan",                 lat: 41.20,  lng: 74.77,  aliases: ["kyrgyzstan","kyrgyz republic","kirghizstan"] },
  LAO: { name: "Laos",                       lat: 19.86,  lng: 102.50, aliases: ["laos","lao","lao pdr"] },
  LVA: { name: "Latvia",                     lat: 56.88,  lng: 24.60,  aliases: ["latvia","latvija"] },
  LBN: { name: "Lebanon",                    lat: 33.85,  lng: 35.86,  aliases: ["lebanon","lubnan"] },
  LSO: { name: "Lesotho",                    lat: -29.61, lng: 28.23,  aliases: ["lesotho"] },
  LBR: { name: "Liberia",                    lat: 6.43,   lng: -9.43,  aliases: ["liberia"] },
  LBY: { name: "Libya",                      lat: 26.34,  lng: 17.23,  aliases: ["libya"] },
  LIE: { name: "Liechtenstein",              lat: 47.14,  lng: 9.55,   aliases: ["liechtenstein"] },
  LTU: { name: "Lithuania",                  lat: 55.17,  lng: 23.88,  aliases: ["lithuania","lietuva"] },
  LUX: { name: "Luxembourg",                 lat: 49.82,  lng: 6.13,   aliases: ["luxembourg","luxemburg"] },
  MDG: { name: "Madagascar",                 lat: -18.77, lng: 46.87,  aliases: ["madagascar"] },
  MWI: { name: "Malawi",                     lat: -13.25, lng: 34.30,  aliases: ["malawi","nyasaland"] },
  MYS: { name: "Malaysia",                   lat: 4.21,   lng: 108.10, aliases: ["malaysia"] },
  MDV: { name: "Maldives",                   lat: 3.20,   lng: 73.22,  aliases: ["maldives"] },
  MLI: { name: "Mali",                       lat: 17.57,  lng: -3.99,  aliases: ["mali"] },
  MLT: { name: "Malta",                      lat: 35.94,  lng: 14.38,  aliases: ["malta"] },
  MRT: { name: "Mauritania",                 lat: 21.01,  lng: -10.94, aliases: ["mauritania"] },
  MUS: { name: "Mauritius",                  lat: -20.35, lng: 57.55,  aliases: ["mauritius"] },
  MEX: { name: "Mexico",                     lat: 23.63,  lng: -102.55,aliases: ["mexico","méxico","mexican"] },
  MDA: { name: "Moldova",                    lat: 47.41,  lng: 28.37,  aliases: ["moldova","moldavia"] },
  MCO: { name: "Monaco",                     lat: 43.73,  lng: 7.40,   aliases: ["monaco"] },
  MNG: { name: "Mongolia",                   lat: 46.86,  lng: 103.85, aliases: ["mongolia"] },
  MNE: { name: "Montenegro",                 lat: 42.71,  lng: 19.37,  aliases: ["montenegro","crna gora"] },
  MAR: { name: "Morocco",                    lat: 31.79,  lng: -7.09,  aliases: ["morocco","maroc","maghreb"] },
  MOZ: { name: "Mozambique",                 lat: -18.67, lng: 35.53,  aliases: ["mozambique","moçambique"] },
  MMR: { name: "Myanmar",                    lat: 21.91,  lng: 95.96,  aliases: ["myanmar","burma"] },
  NAM: { name: "Namibia",                    lat: -22.96, lng: 18.49,  aliases: ["namibia","south west africa"] },
  NPL: { name: "Nepal",                      lat: 28.39,  lng: 84.12,  aliases: ["nepal"] },
  NLD: { name: "Netherlands",                lat: 52.13,  lng: 5.29,   aliases: ["netherlands","holland","nederland","dutch"] },
  NZL: { name: "New Zealand",                lat: -40.90, lng: 174.89, aliases: ["new zealand","nz","aotearoa"] },
  NIC: { name: "Nicaragua",                  lat: 12.87,  lng: -85.21, aliases: ["nicaragua"] },
  NER: { name: "Niger",                      lat: 17.61,  lng: 8.08,   aliases: ["niger"] },
  NGA: { name: "Nigeria",                    lat: 9.08,   lng: 8.68,   aliases: ["nigeria"] },
  MKD: { name: "North Macedonia",            lat: 41.61,  lng: 21.75,  aliases: ["north macedonia","macedonia","fyrom"] },
  NOR: { name: "Norway",                     lat: 60.47,  lng: 8.47,   aliases: ["norway","norge","noreg"] },
  OMN: { name: "Oman",                       lat: 21.51,  lng: 55.92,  aliases: ["oman","sultanate of oman"] },
  PAK: { name: "Pakistan",                   lat: 30.38,  lng: 69.35,  aliases: ["pakistan"] },
  PAN: { name: "Panama",                     lat: 8.54,   lng: -80.78, aliases: ["panama","panamá"] },
  PNG: { name: "Papua New Guinea",           lat: -6.31,  lng: 143.96, aliases: ["papua new guinea","png"] },
  PRY: { name: "Paraguay",                   lat: -23.44, lng: -58.44, aliases: ["paraguay"] },
  PER: { name: "Peru",                       lat: -9.19,  lng: -75.02, aliases: ["peru","perú"] },
  PHL: { name: "Philippines",                lat: 12.88,  lng: 121.77, aliases: ["philippines","pilipinas"] },
  POL: { name: "Poland",                     lat: 51.92,  lng: 19.15,  aliases: ["poland","polska"] },
  PRT: { name: "Portugal",                   lat: 39.40,  lng: -8.22,  aliases: ["portugal","portuguese"] },
  QAT: { name: "Qatar",                      lat: 25.35,  lng: 51.18,  aliases: ["qatar","katar"] },
  ROU: { name: "Romania",                    lat: 45.94,  lng: 24.97,  aliases: ["romania","românia","rumania","roumania"] },
  RUS: { name: "Russia",                     lat: 61.52,  lng: 105.32, aliases: ["russia","russian federation","rossiya"] },
  RWA: { name: "Rwanda",                     lat: -1.94,  lng: 29.87,  aliases: ["rwanda"] },
  SAU: { name: "Saudi Arabia",               lat: 23.89,  lng: 45.08,  aliases: ["saudi arabia","saudi","ksa","kingdom of saudi arabia"] },
  SEN: { name: "Senegal",                    lat: 14.50,  lng: -14.45, aliases: ["senegal"] },
  SRB: { name: "Serbia",                     lat: 44.02,  lng: 21.01,  aliases: ["serbia","srbija"] },
  SLE: { name: "Sierra Leone",               lat: 8.46,   lng: -11.78, aliases: ["sierra leone"] },
  SGP: { name: "Singapore",                  lat: 1.35,   lng: 103.82, aliases: ["singapore","singapura"] },
  SVK: { name: "Slovakia",                   lat: 48.67,  lng: 19.70,  aliases: ["slovakia","slovensko","slovak republic"] },
  SVN: { name: "Slovenia",                   lat: 46.15,  lng: 14.99,  aliases: ["slovenia","slovenija"] },
  SOM: { name: "Somalia",                    lat: 5.15,   lng: 46.20,  aliases: ["somalia"] },
  ZAF: { name: "South Africa",               lat: -30.56, lng: 22.94,  aliases: ["south africa","rsa","republic of south africa"] },
  SSD: { name: "South Sudan",                lat: 6.88,   lng: 31.31,  aliases: ["south sudan"] },
  ESP: { name: "Spain",                      lat: 40.46,  lng: -3.75,  aliases: ["spain","españa","espana","espagne"] },
  LKA: { name: "Sri Lanka",                  lat: 7.87,   lng: 80.77,  aliases: ["sri lanka","ceylon"] },
  SDN: { name: "Sudan",                      lat: 12.86,  lng: 30.22,  aliases: ["sudan"] },
  SUR: { name: "Suriname",                   lat: 3.92,   lng: -56.03, aliases: ["suriname","surinam"] },
  SWE: { name: "Sweden",                     lat: 60.13,  lng: 18.64,  aliases: ["sweden","sverige"] },
  CHE: { name: "Switzerland",                lat: 46.82,  lng: 8.23,   aliases: ["switzerland","schweiz","suisse","svizzera","helvetia"] },
  SYR: { name: "Syria",                      lat: 34.80,  lng: 38.99,  aliases: ["syria","syrian arab republic"] },
  TWN: { name: "Taiwan",                     lat: 23.70,  lng: 120.96, aliases: ["taiwan","chinese taipei","formosa"] },
  TJK: { name: "Tajikistan",                 lat: 38.86,  lng: 71.28,  aliases: ["tajikistan","tadzhikistan"] },
  TZA: { name: "Tanzania",                   lat: -6.37,  lng: 34.89,  aliases: ["tanzania","tanganyika"] },
  THA: { name: "Thailand",                   lat: 15.87,  lng: 100.99, aliases: ["thailand","siam","prathet thai"] },
  TLS: { name: "Timor-Leste",                lat: -8.87,  lng: 125.73, aliases: ["timor-leste","east timor","timor"] },
  TGO: { name: "Togo",                       lat: 8.62,   lng: 0.82,   aliases: ["togo"] },
  TTO: { name: "Trinidad and Tobago",        lat: 10.69,  lng: -61.22, aliases: ["trinidad and tobago","trinidad","tobago","trinidad & tobago"] },
  TUN: { name: "Tunisia",                    lat: 33.89,  lng: 9.54,   aliases: ["tunisia","tunisie"] },
  TUR: { name: "Turkey",                     lat: 38.96,  lng: 35.24,  aliases: ["turkey","türkiye","turkiye"] },
  TKM: { name: "Turkmenistan",               lat: 38.97,  lng: 59.56,  aliases: ["turkmenistan"] },
  UGA: { name: "Uganda",                     lat: 1.37,   lng: 32.29,  aliases: ["uganda"] },
  UKR: { name: "Ukraine",                    lat: 48.38,  lng: 31.17,  aliases: ["ukraine","ukraina"] },
  ARE: { name: "United Arab Emirates",       lat: 23.42,  lng: 53.85,  aliases: ["united arab emirates","uae","emirates"] },
  GBR: { name: "United Kingdom",             lat: 55.38,  lng: -3.44,  aliases: ["united kingdom","uk","great britain","britain","england","scotland","wales","gb"] },
  USA: { name: "United States",              lat: 37.09,  lng: -95.71, aliases: ["united states","usa","us","america","united states of america","u.s.a.","u.s."] },
  URY: { name: "Uruguay",                    lat: -32.52, lng: -55.77, aliases: ["uruguay"] },
  UZB: { name: "Uzbekistan",                 lat: 41.38,  lng: 64.59,  aliases: ["uzbekistan"] },
  VEN: { name: "Venezuela",                  lat: 6.42,   lng: -66.59, aliases: ["venezuela"] },
  VNM: { name: "Vietnam",                    lat: 14.06,  lng: 108.28, aliases: ["vietnam","viet nam"] },
  XKX: { name: "Kosovo",                     lat: 42.60, lng: 20.90, aliases: ["kosovo", "kosova", "republic of kosovo"] },
  YEM: { name: "Yemen",                      lat: 15.55,  lng: 48.52,  aliases: ["yemen"] },
  ZMB: { name: "Zambia",                     lat: -13.13, lng: 27.85,  aliases: ["zambia","northern rhodesia"] },
  ZWE: { name: "Zimbabwe",                   lat: -19.02, lng: 29.15,  aliases: ["zimbabwe","rhodesia"] },
};

// ── Alias map: normalised string → ISO3 ────────────────────────────
const ALIAS_MAP = {};
for (const [iso3, data] of Object.entries(COUNTRY_DATA)) {
  // primary name
  ALIAS_MAP[data.name.toLowerCase()] = iso3;
  // all aliases
  for (const alias of data.aliases) {
    ALIAS_MAP[alias.toLowerCase()] = iso3;
  }
  // also store iso3 itself
  ALIAS_MAP[iso3.toLowerCase()] = iso3;
}

/**
 * Resolve a user-typed string to an ISO3 code.
 * Returns null if not found.
 */
function resolveCountry(input) {
  if (!input) return null;
  const key = input.trim().toLowerCase().replace(/[''`]/g, "'");
  return ALIAS_MAP[key] || null;
}

/**
 * Return autocomplete suggestions (up to `max`) for partial input.
 */
function autocompleteSuggestions(partial, max = 8) {
  if (!partial || partial.length < 1) return [];
  const key = partial.trim().toLowerCase();
  const seen = new Set();
  const results = [];

  for (const [iso3, data] of Object.entries(COUNTRY_DATA)) {
    if (data.name.toLowerCase().startsWith(key) && !seen.has(iso3)) {
      seen.add(iso3);
      results.push({ iso3, name: data.name });
    }
  }
  // also check aliases
  for (const [alias, iso3] of Object.entries(ALIAS_MAP)) {
    if (alias.startsWith(key) && !seen.has(iso3)) {
      seen.add(iso3);
      results.push({ iso3, name: COUNTRY_DATA[iso3].name });
    }
  }

  return results.slice(0, max);
}
