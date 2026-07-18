'use strict';

/* Pixel-art SVG icons for portfolio cards (white shapes on the card's
   colour background). Referenced from content/portfolio.yaml by key,
   e.g. `icon: salient`. To add one, export a new key here and follow the
   crispEdges rect/line style of the existing icons. */

var salient = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
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

var car = '<svg viewBox="0 0 24 14" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
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

var bms = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
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

var dash = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
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

module.exports = { salient: salient, car: car, bms: bms, dash: dash };
