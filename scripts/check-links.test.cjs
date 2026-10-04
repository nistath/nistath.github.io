// Offline tests for the Google Maps result classifier in check-links.cjs.
// They feed it hand-built lookup bodies, so they never touch the network and
// pin down what counts as "the link lands on the right entry".
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyGooglePlaceResult } = require('./check-links.cjs');

function embed(data) {
  return `<script>initEmbed(${JSON.stringify(data)}); } function onApiLoad(){}</script>`;
}

function single(name) {
  const data = [];
  data[5] = [[[null, 'spotlit']]];
  data[21] = [];
  data[21][3] = [];
  data[21][3][0] = ['0x14a1bd23d377c019:0x899327ff064ff34a'];
  data[21][3][1] = name;
  data[21][3][27] = 'ChIJAAAAAAAAAAAAAAAAAAAAAAA';
  return embed(data);
}

function list(query) {
  const data = [];
  data[5] = [[[null, 'categorical-search-results-injection']]];
  data[5][3] = [[null, query, null, null, [[['1', '2']]], null, null, null, null, null, null, null, [null, 0.5]]];
  return embed(data);
}

test('a single place that carries the queried name passes', () => {
  assert.equal(classifyGooglePlaceResult(single('Cantina Social'), 'Cantina Social Leokoriou 8 Athens').found, true);
  assert.equal(classifyGooglePlaceResult(single('Windmills of Mykonos'), 'Mykonos Windmills').found, true);
  assert.equal(classifyGooglePlaceResult(single('ΚΛΑΚΑΖ'), 'ΚΛΑΚΑΖ Avramiotou 6 Athens').found, true);
});

test('a place that is only the island or city in the query is rejected', () => {
  const result = classifyGooglePlaceResult(single('Paros'), 'Parikia Paros');
  assert.equal(result.found, false);
  assert.match(result.reason, /resolves to "Paros"/);
  assert.equal(classifyGooglePlaceResult(single('Mykonos'), 'Mykonos Chora').found, false);
});

test('a bare locality query may resolve to the locality itself', () => {
  assert.equal(classifyGooglePlaceResult(single('Oia'), 'Oia Santorini').found, true);
  assert.equal(classifyGooglePlaceResult(single('Heraklion'), 'Heraklion Crete').found, true);
});

test('a place with an unrelated name is rejected', () => {
  assert.equal(classifyGooglePlaceResult(single('Peristeri Grill House'), 'Cantina Social Leokoriou 8 Athens').found, false);
});

test('a list of results is rejected unless the query was reviewed by hand', () => {
  const unreviewed = classifyGooglePlaceResult(list('Mykonos Chora'), 'Mykonos Chora');
  assert.equal(unreviewed.found, false);
  assert.match(unreviewed.reason, /list of results/);
  assert.equal(classifyGooglePlaceResult(list('Acropolis of Athens'), 'Acropolis of Athens').found, true);
});

test('an empty or unreadable lookup is rejected', () => {
  assert.equal(classifyGooglePlaceResult('<html></html>', 'Anything').found, false);
  assert.equal(classifyGooglePlaceResult('initEmbed([not json]); } function onApiLoad', 'Anything').found, false);
});
