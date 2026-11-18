import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDukeGameStats, selectDukeEvent } from '../apps/web/src/lib/duke-game-stats.ts';

const team = (id, score) => ({ team: { id, displayName: id === '150' ? 'Duke' : 'Opponent', abbreviation: id === '150' ? 'DUKE' : 'OPP' }, score });
const event = (id, state, teams = [team('150', '12'), team('42', '9')]) => ({ id, competitions: [{ competitors: teams, status: { type: { state } } }] });
const summary = () => ({
  header: { id: 'game', competitions: [{ date: '2026-11-17T23:00:00Z', competitors: [team('42', '9'), team('150', '12')], status: { type: { state: 'in', shortDetail: '1:23 - 1st Half' } } }] },
  boxscore: {
    teams: [
      { team: { id: '42' }, statistics: [{ name: 'rebounds', displayValue: '8' }] },
      { team: { id: '150' }, statistics: [{ name: 'rebounds', label: 'Rebounds', displayValue: '10' }, { name: 'assists', label: 'Assists', displayValue: '4' }] },
    ],
    players: [{ team: { id: '150' }, statistics: [{ labels: ['PTS', 'REB'], athletes: [
      { athlete: { id: 'p1', displayName: 'Duke player' }, stats: ['6', '3'] },
      { athlete: { id: 'p2', displayName: 'Did not play' }, didNotPlay: true, stats: [] },
    ] }] }],
  },
});

test('selects Duke live event ahead of pregame/final; rejects unrelated games', () => {
  assert.equal(selectDukeEvent({ events: [event('other', 'in', [team('1', '0'), team('2', '0')]), event('final', 'post'), event('next', 'pre'), event('live', 'in')] }), 'live');
  assert.equal(selectDukeEvent({ events: [event('old', 'post'), event('next', 'pre')] }), 'next');
  assert.equal(selectDukeEvent({ events: [event('final', 'post')] }), 'final');
  assert.equal(selectDukeEvent({ events: [event('other', 'in', [team('1', '0')])] }), null);
  assert.equal(selectDukeEvent({}), null);
});
test('matches teams and stats by identity, not feed order; missing values stay unknown', () => {
  const game = parseDukeGameStats(summary(), 'game');
  assert.equal(game.dukeScore, '12');
  assert.equal(game.opponentScore, '9');
  assert.deepEqual(game.comparisons.map(stat => [stat.duke, stat.opponent]), [['10', '8'], ['4', '—']]);
  assert.deepEqual(game.playerGroups[0].players.map(player => player.name), ['Duke player']);
  assert.deepEqual(game.playerGroups[0].columns, ['PTS', 'REB']);
});
test('accepts score object and numeric zero without inventing stats', () => {
  const data = summary();
  data.header.competitions[0].competitors[1].score = { displayValue: '0' };
  data.header.competitions[0].status.type.state = 'post';
  data.boxscore = {};
  const game = parseDukeGameStats(data, 'game');
  assert.equal(game.dukeScore, '0');
  assert.equal(game.state, 'post');
  assert.deepEqual(game.comparisons, []);
  assert.deepEqual(game.playerGroups, []);
});
test('rejects mismatched event, non-Duke summary, invalid state and malformed data', () => {
  assert.equal(parseDukeGameStats(summary(), 'different-event'), null);
  const data = summary();
  data.header.competitions[0].competitors = [team('1', '0'), team('2', '0')];
  assert.equal(parseDukeGameStats(data, 'game'), null);
  data.header.competitions[0].competitors = [team('150', '0'), team('2', '0')];
  data.header.competitions[0].status.type.state = 'unknown';
  assert.equal(parseDukeGameStats(data, 'game'), null);
  assert.equal(parseDukeGameStats(null, 'game'), null);
});
