import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, openGraph} from './browser-harness.mjs';

test('smoke: real template, local D3, deterministic nodes', async t => {
  const graph = await fixture();
  const view = await openGraph(t, graph);
  assert.deepEqual(view.errors, []);
  const result = await view.page.evaluate(() => ({
    version:d3.version, count:__graph.node.size(),
    coordinates:__graph.coordinates(), transform:__graph.transform()
  }));
  assert.equal(result.version, '7.9.0');
  assert.equal(result.count, 5);
  assert.deepEqual(result.coordinates.map(({id,x,y})=>({id,x,y})),
    graph.nodes.map(({id,x,y})=>({id,x,y})));
  assert.equal(result.transform.k, 1);
  assert.deepEqual(view.navigation, []);
});
