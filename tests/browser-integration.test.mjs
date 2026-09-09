import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {lispExport} from './lisp-export.mjs';
import {openGraph,activate,noNavigation,centerError} from './browser-harness.mjs';

test('integration: actual Lisp notes JSON HTML and focus',async t=>{
  const packet=lispExport();
  assert.equal(packet.graph.nodes.length,6);assert.equal(packet.graph.edges.length,11);
  assert.equal(packet.extractorCalls,1);
  assert.doesNotMatch(packet.html,/{{[a-z-]+}}/);
  for(const match of packet.html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
    new Script(match[1]); // Parse the actual substituted application source.
  const view=await openGraph(t,packet.graph,{html:packet.html});
  const {page}=view;
  assert.deepEqual(view.errors,[]);
  const before=await page.evaluate(()=>__graph.coordinates());
  await activate(page,'20260101T000004');
  assert.equal(await page.evaluate(()=>__graph.selected()),'20260101T000004');
  const error=await centerError(page,'20260101T000004');assert.ok(error.x<=2&&error.y<=2);
  assert.deepEqual(await page.evaluate(()=>__graph.coordinates()),before);
  assert.equal(await page.locator('.sequence-halo').count(),3);
  await noNavigation(view);
  await page.locator('#info-button').click();
  const text=await page.locator('.info-tooltip').innerText();
  assert.match(text,/context depth\s*:?\s*2/i);
  assert.match(text,/3\s+sequence/i);assert.match(text,/3\s+context/i);
  assert.match(text,/N\/A\s*\(mixed relationships\)/i);
});
