/* =====================================================
   PORTFOLIO CONTENT
   Plain classic script (no modules, matches js/main.js's ES5 style).
   Loaded before js/main.js, which reads the PROJECTS global at call time.

   To add a new project: push a new object to PROJECTS.
   Required keys: id, color, title, subtitle, org, period, tags, icon, bullets
   Optional keys: links [ {label, url} ], subItems [ {id, title, content[]} ]

   Trust boundary: `bullets` entries are raw HTML and are NOT escaped by
   buildCard() in js/main.js (single-owner authored content, not user input).
   `tags`/`title`/`subtitle`/`org`/`period` ARE escaped via escapeHtml() in
   buildCard() before being inserted into the DOM.
   ───────────────────────────────────────────────────── */

/* Pixel-art SVG icons (white shapes on the card's colour background) */
var ICON_SALIENT = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* input-layer nodes */
  + '<rect x="1" y="2"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="1" y="7"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="1" y="12" width="2" height="2" fill="white" opacity="0.70"/>'
  /* hidden-layer nodes */
  + '<rect x="10" y="1"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="10" y="5"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="10" y="9"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="10" y="13" width="2" height="2" fill="white" opacity="0.70"/>'
  /* output-layer nodes */
  + '<rect x="21" y="4"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="21" y="10" width="2" height="2" fill="white" opacity="0.90"/>'
  /* connections layer 1 → 2 */
  + '<line x1="3" y1="3"  x2="10" y2="2"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="3"  x2="10" y2="6"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="8"  x2="10" y2="2"  stroke="white" stroke-width="0.5" opacity="0.20"/>'
  + '<line x1="3" y1="8"  x2="10" y2="6"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="8"  x2="10" y2="10" stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="13" x2="10" y2="10" stroke="white" stroke-width="0.5" opacity="0.25"/>'
  + '<line x1="3" y1="13" x2="10" y2="14" stroke="white" stroke-width="0.5" opacity="0.35"/>'
  /* connections layer 2 → 3 */
  + '<line x1="12" y1="2"  x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="12" y1="6"  x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="12" y1="10" x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.20"/>'
  + '<line x1="12" y1="10" x2="21" y2="11" stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="12" y1="14" x2="21" y2="11" stroke="white" stroke-width="0.5" opacity="0.25"/>'
  + '</svg>';

var ICON_CAR = '<svg viewBox="0 0 24 14" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* rear wing */
  + '<rect x="18" y="1" width="6"  height="1" fill="white" opacity="0.90"/>'
  + '<rect x="21" y="2" width="1"  height="3" fill="white" opacity="0.60"/>'
  /* cockpit hump */
  + '<rect x="8"  y="2" width="6"  height="2" fill="white" opacity="0.95"/>'
  + '<rect x="9"  y="2" width="4"  height="1" fill="black" opacity="0.50"/>'
  /* main body */
  + '<rect x="2"  y="4" width="20" height="2" fill="white" opacity="0.95"/>'
  /* nose */
  + '<rect x="0"  y="5" width="3"  height="1" fill="white" opacity="0.75"/>'
  /* side pods / underfloor cut */
  + '<rect x="3"  y="6" width="4"  height="1" fill="white" opacity="0.55"/>'
  + '<rect x="15" y="6" width="4"  height="1" fill="white" opacity="0.55"/>'
  /* front wing */
  + '<rect x="0"  y="7" width="5"  height="1" fill="white" opacity="0.75"/>'
  /* wheels */
  + '<rect x="3"  y="7" width="4"  height="4" fill="#0d0d0d"/>'
  + '<rect x="15" y="7" width="4"  height="4" fill="#0d0d0d"/>'
  /* tyre shine */
  + '<rect x="4"  y="8" width="2"  height="2" fill="#2e2e2e"/>'
  + '<rect x="16" y="8" width="2"  height="2" fill="#2e2e2e"/>'
  + '</svg>';

var ICON_BMS = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* case fill */
  + '<rect x="1" y="3" width="19" height="10" fill="white" opacity="0.06"/>'
  /* case outline */
  + '<rect x="1" y="3"  width="19" height="1"  fill="white" opacity="0.85"/>'
  + '<rect x="1" y="12" width="19" height="1"  fill="white" opacity="0.85"/>'
  + '<rect x="1" y="3"  width="1"  height="10" fill="white" opacity="0.85"/>'
  + '<rect x="19" y="3" width="1"  height="10" fill="white" opacity="0.85"/>'
  /* positive terminal (+) */
  + '<rect x="20" y="6" width="3"  height="4"  fill="white" opacity="0.80"/>'
  + '<rect x="21" y="5" width="1"  height="6"  fill="white" opacity="0.80"/>'
  /* cell dividers */
  + '<rect x="5"  y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
  + '<rect x="9"  y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
  + '<rect x="13" y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
  /* cell fills (varying charge levels) */
  + '<rect x="2"  y="4" width="3"  height="8"  fill="white" opacity="0.80"/>'
  + '<rect x="6"  y="5" width="3"  height="7"  fill="white" opacity="0.75"/>'
  + '<rect x="10" y="4" width="3"  height="8"  fill="white" opacity="0.80"/>'
  + '<rect x="14" y="6" width="5"  height="6"  fill="white" opacity="0.60"/>'
  + '</svg>';

var ICON_DASH = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* screen fill */
  + '<rect x="1"  y="1"  width="22" height="14" fill="white" opacity="0.05"/>'
  /* screen border */
  + '<rect x="1"  y="1"  width="22" height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="1"  y="14" width="22" height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="1"  y="2"  width="1"  height="12" fill="white" opacity="0.80"/>'
  + '<rect x="22" y="2"  width="1"  height="12" fill="white" opacity="0.80"/>'
  /* vertical divider */
  + '<rect x="14" y="2"  width="1"  height="12" fill="white" opacity="0.22"/>'
  /* left panel — bar chart */
  + '<rect x="3"  y="11" width="2"  height="3"  fill="white" opacity="0.90"/>'
  + '<rect x="5"  y="9"  width="2"  height="5"  fill="white" opacity="0.90"/>'
  + '<rect x="7"  y="7"  width="2"  height="7"  fill="white" opacity="0.80"/>'
  + '<rect x="9"  y="10" width="2"  height="4"  fill="white" opacity="0.70"/>'
  + '<rect x="11" y="8"  width="2"  height="6"  fill="white" opacity="0.60"/>'
  /* right panel — data rows */
  + '<rect x="16" y="3"  width="5"  height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="16" y="5"  width="3"  height="1"  fill="white" opacity="0.70"/>'
  + '<rect x="16" y="7"  width="5"  height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="16" y="9"  width="4"  height="1"  fill="white" opacity="0.60"/>'
  + '<rect x="16" y="11" width="2"  height="1"  fill="white" opacity="0.40"/>'
  /* status indicator dots */
  + '<rect x="21" y="5"  width="1"  height="1"  fill="white" opacity="1.00"/>'
  + '<rect x="21" y="7"  width="1"  height="1"  fill="white" opacity="0.55"/>'
  + '</svg>';

/* ── Project data ─────────────────────────────────────
   To add a new project: push a new object to this array.
   Required keys: id, color, title, subtitle, org, period, tags, icon, bullets
   Optional keys: links [ {label, url} ], subItems [ {id, title, content[]} ]
   ───────────────────────────────────────────────────── */
var PROJECTS = [
  {
    id:       'salient',
    color:    '#7c3aed',
    icon:     ICON_SALIENT,
    title:    'SALIENT',
    subtitle: 'Distributed multi-GPU graph neural network acceleration',
    org:      'MIT-IBM Watson AI Lab',
    period:   '2020 \u2013 2021',
    tags:     ['PyTorch', 'C++', 'CUDA', 'Distributed Systems', 'GNNs', 'MLSys 2022'],
    bullets: [
      'Led design and implementation of SALIENT, a distributed multi-GPU system for training and inference of graph neural networks (GNNs) on massive graphs.',
      'Achieves a drop-in <strong>3\u00d7 performance improvement</strong> over an optimized PyTorch Geometric baseline, with notable speedups over competing distributed systems.',
      'Optimized PyG\u2019s C++ neighborhood sampling code and designed a GIL-free thread-based parallelization strategy for non-blocking data loading.',
      'Co-authored <em>Accelerating Training and Inference of Graph Neural Networks with Fast Sampling and Pipelining</em>, presented at <strong>MLSys 2022</strong> and featured in MIT News.',
    ],
    links: [
      { label: 'MLSys 2022 Paper', url: 'https://proceedings.mlsys.org/paper_files/paper/2022/hash/35f4a8d465e6e1edc05f3d8ab658c551-Abstract.html' },
      { label: 'GitHub', url: 'https://github.com/MITIBMxGraph/SALIENT' },
      { label: 'MIT News', url: 'https://news.mit.edu/2022/accelerating-graph-neural-network-training-0519' },
    ],
  },
  {
    id:       'my18',
    color:    '#c0392b',
    icon:     ICON_CAR,
    title:    'MY18 Electric Race Car',
    subtitle: 'Software lead for MIT\u2019s Formula SAE championship entry',
    org:      'MIT Motorsports',
    period:   'Nov. 2017 \u2013 June 2018',
    tags:     ['C++', 'CAN Bus', 'Embedded', 'Team Lead', 'Formula SAE'],
    bullets: [
      'Led and coordinated 8 engineers across 9 software subsystems of MIT\u2019s electric race car.',
      'The car finished the 22\u202fkm Formula SAE Electric 2018 endurance race <strong>113 seconds ahead</strong> of the next fastest competitor.',
      'Built <em>CANlib</em> \u2014 a code-generated CAN bus serialization library \u2014 alongside Makefile improvements, automated toolchain installation, and Git-versioned binary flashing.',
      'Developed documentation, unit and integration tests, and verification procedures for the car\u2019s electrical systems.',
      'Held regular individual status reviews and all-hands architecture sessions.',
    ],
    links: [
      { label: 'MIT Motorsports', url: 'https://www.mitmotorsports.com/' },
    ],
  },
  {
    id:       'my19-bms',
    color:    '#0a7c5c',
    icon:     ICON_BMS,
    title:    'MY19 Battery Management System',
    subtitle: 'High-voltage BMS and data acquisition for an electric racer',
    org:      'MIT Motorsports',
    period:   '2017 \u2013 2020',
    tags:     ['C++', 'STM32F413', 'LTC6813', 'CAN Bus', 'DMA', 'Python', 'NumPy', 'MATLAB'],
    bullets: [
      'Implemented C++ drivers for a daisy chain of <strong>LTC6813</strong> multicell battery monitor ICs, enabling precise per-cell voltage and temperature monitoring.',
      'Designed a custom STM32F413-based data logger using <strong>DMA</strong> for simultaneous high-throughput SD card logging of internal messages and CAN bus traffic.',
      'Built a Python data pipeline for storing, tagging, and parsing logs into MATLAB or NumPy formats for post-race analysis.',
      'Created a modern CAN bus <strong>serialization specification language</strong> and accompanying Python code-generation framework used across the team.',
    ],
    links: [
      { label: 'MIT Motorsports', url: 'https://www.mitmotorsports.com/' },
    ],
  },
  {
    id:       'my19-dash',
    color:    '#1a56a0',
    icon:     ICON_DASH,
    title:    'MY19 Dashboard & Telemetry',
    subtitle: 'Real-time driver HUD and live pit-side telemetry system',
    org:      'MIT Motorsports',
    period:   '2017 \u2013 2020',
    tags:     ['kdb+', 'Q', 'Kx Dashboards', 'Python', 'CAN Bus', 'Real-time', 'Embedded'],
    bullets: [
      'Designed the driver-facing dashboard display surfacing battery state, motor metrics, system alerts, and lap data in a glanceable layout.',
      'Developed a kdb+/Q real-time telemetry pipeline ingesting live CAN bus data wirelessly to a pit-side system during competition.',
    ],
    links: [
      { label: 'MIT Motorsports', url: 'https://www.mitmotorsports.com/' },
    ],
    subItems: [
      {
        id:      'pit-telemetry',
        title:   'Pit Telemetry System',
        content: [
          'Built a real-time telemetry pipeline using kdb+/Q that ingests live CAN bus data wirelessly from the car to a pit-side laptop throughout dynamic events.',
          'Visualised vehicle state \u2014 motor temperatures, battery cell voltages, current draw, and fault codes \u2014 using Kx Dashboards, enabling engineers to monitor and diagnose the car live from the pits.',
        ],
      },
      {
        id:      'driver-display',
        title:   'Driver Dashboard Display',
        content: [
          'Designed and implemented the embedded dashboard display shown to the driver throughout competition.',
          'The display surfaces critical alerts, battery state of charge, lap timing, and key motor metrics within a clear layout optimised for high-vibration, high-G environments.',
        ],
      },
    ],
  },
];
