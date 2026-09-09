import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, openGraph} from './browser-harness.mjs';

// Group prefixes are per-bead selectors: normalize15, paths16, hero17,
// framing18, statistics23. Production keeps no test API; harness injects it.
test('normalize: legacy Sequence metadata and relation identity', async t => {
  const graph=await fixture();
  delete graph.meta.contextDepth;
  for (const n of graph.nodes) { delete n.sequenceMember; delete n.contextDistance; }
  for (const e of graph.edges) { delete e.kind; delete e.key; }
  const {page,errors}=await openGraph(t,graph);
  assert.deepEqual(errors,[]);
  const state=await page.evaluate(()=>({members:__graph.nodes.map(n=>n.sequenceMember),
    kinds:__graph.links.map(e=>e.kind),keys:__graph.links.map(e=>e.key),
    endpointIds:__graph.links.every(e=>typeof e.source.id==='string'&&typeof e.target.id==='string')}));
  assert.ok(state.members.every(x=>x===true));
  assert.ok(state.kinds.every(x=>x==='hierarchy'));
  assert.ok(state.keys.every(x=>typeof x==='string'));
  assert.equal(new Set(state.keys).size,graph.edges.length);
  assert.equal(state.endpointIds,true);
});

test('normalize: null edges and collections render without errors', async t => {
  const graph=await fixture('sequence-singleton'); graph.edges=null;
  const {page,errors}=await openGraph(t,graph);
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>__graph.node.size()),1);
  assert.equal(await page.evaluate(()=>__graph.link.size()),0);
});

test('normalize: empty legacy graph accepts null collections', async t => {
  const {page,errors}=await openGraph(t,{meta:{type:'Community',directed:true,parameters:['']},nodes:null,edges:null});
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>__graph.node.size()),0);
  assert.equal(await page.evaluate(()=>__graph.link.size()),0);
});

test('normalize: Keywords stay undirected with arbitrary safe IDs', async t => {
  const graph={meta:{type:'Keywords',directed:false,parameters:1},
    nodes:[{id:'a/b"?',name:'a/b"?',degree:1,x:350,y:300},{id:'<x>',name:'<x>',degree:1,x:500,y:300}],
    edges:[{source:'a/b"?',target:'<x>',weight:3}]};
  const {page,errors}=await openGraph(t,graph);
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>__graph.nodes.some(n=>n.sequenceMember)),false);
  assert.equal(await page.evaluate(()=>__graph.link.nodes().some(e=>e.getAttribute('marker-end'))),false);
  assert.equal(await page.evaluate(()=>__graph.nodes.map(n=>n.id).join('|')),'a/b"?|<x>');
});

test('paths: typed overlap reciprocal and self relations stay distinct', async t => {
  const {page,errors}=await openGraph(t,await fixture());
  assert.deepEqual(errors,[]);
  const paths=await page.evaluate(()=>__graph.link.nodes().map(el=>({
    name:el.localName,d:el.getAttribute('d'),key:el.__data__.key,
    marker:el.getAttribute('marker-end')})));
  assert.equal(paths.length,10);
  assert.ok(paths.every(p=>p.name==='path'&&p.d&&!/NaN|Infinity/.test(p.d)));
  assert.equal(new Set(paths.map(p=>p.d)).size,10);
  assert.equal(new Set(paths.map(p=>p.key)).size,10);
  assert.ok(paths.every(p=>p.marker));
  const before=paths.map(p=>p.d);
  await page.evaluate(()=>__graph.tick());
  assert.deepEqual(await page.evaluate(()=>__graph.link.nodes().map(e=>e.getAttribute('d'))),before);
});

test('paths: singleton finite geometry without edges', async t => {
  const {page,errors}=await openGraph(t,await fixture('sequence-singleton'));
  assert.deepEqual(errors,[]);
  const state=await page.evaluate(()=>({radius:+__graph.element('A').getAttribute('r'),
    coords:__graph.coordinates(),edges:__graph.link.size()}));
  assert.ok(Number.isFinite(state.radius)&&state.radius>0);
  assert.ok(state.coords.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
  assert.equal(state.edges,0);
});

test('paths: arrow endpoints clip once at target boundary', async t => {
  const {page}=await openGraph(t,await fixture());
  const measures=await page.evaluate(()=>__graph.link.nodes().map(el=>{
    if(el.localName!=='path') return {valid:false};
    const edge=el.__data__,end=el.getPointAtLength(el.getTotalLength());
    const r=+__graph.element(edge.target.id).getAttribute('r');
    const marker=document.querySelector(el.getAttribute('marker-end')?.slice(4,-1));
    return {valid:true,distance:Math.hypot(end.x-edge.target.x,end.y-edge.target.y),
      r,refX:+marker?.getAttribute('refX')};
  }));
  for(const m of measures){assert.equal(m.valid,true);assert.ok(m.distance>=m.r-1);
    assert.ok(m.distance<=m.r+12);assert.ok(m.refX>=0&&m.refX<=10);}
});

test('hero: bounded context sizes persistent halos labels and file colors', async t => {
  const graph=await fixture('sequence-hub');
  const {page,errors}=await openGraph(t,graph);
  assert.deepEqual(errors,[]);
  await page.locator('#density-slider').evaluate(el=>{el.value=el.min;el.dispatchEvent(new Event('input',{bubbles:true}));});
  const state=await page.evaluate(()=>({
    nodes:__graph.node.nodes().map(el=>({id:el.__data__.id,member:el.__data__.sequenceMember,
      r:+el.getAttribute('r'),fill:getComputedStyle(el).fill})),
    halos:[...document.querySelectorAll('.sequence-halo')].map(el=>el.__data__?.id),
    labels:[...document.querySelectorAll('.labels-group text')].map(el=>el.__data__.id)
  }));
  const hero=state.nodes.filter(n=>n.member),context=state.nodes.filter(n=>!n.member);
  assert.ok(state.nodes.every(n=>Number.isFinite(n.r)&&n.r>0));
  assert.ok(Math.max(...context.map(n=>n.r))<=Math.min(...hero.map(n=>n.r)));
  assert.deepEqual(state.halos.sort(),['A','B','C']);
  for(const id of ['A','B','C']) assert.ok(state.labels.includes(id));
  assert.equal(new Set(state.nodes.map(n=>n.fill)).size,1,'same file type retains same fill');
});

test('hero: relationship kind is distinguished beyond color', async t => {
  const {page}=await openGraph(t,await fixture());
  const styles=await page.evaluate(()=>__graph.link.nodes().map(el=>({kind:el.__data__.kind,
    dash:getComputedStyle(el).strokeDasharray,width:getComputedStyle(el).strokeWidth})));
  const h=styles.find(s=>s.kind==='hierarchy'),l=styles.find(s=>s.kind==='link');
  assert.ok(h.dash!==l.dash||h.width!==l.width);
});

test('framing: sequence-only bounds fit once not on later ticks', async t => {
  const {page}=await openGraph(t,await fixture('sequence-hub'));
  await page.evaluate(()=>{__graph.simulation.alpha(0.09);__graph.tick();});
  const error=await page.evaluate(()=>{
    const hero=__graph.nodes.filter(n=>n.sequenceMember);
    const xs=hero.flatMap(n=>{const r=+__graph.element(n.id).getAttribute('r');return[n.x-r,n.x+r];});
    const ys=hero.flatMap(n=>{const r=+__graph.element(n.id).getAttribute('r');return[n.y-r,n.y+r];});
    const p=new DOMPoint((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2)
      .matrixTransform(__graph.group.node().getScreenCTM());
    const r=__graph.svgBounds();return Math.hypot(p.x-r.x-r.width/2,p.y-r.y-r.height/2);
  });
  assert.ok(error<=2,`hero framing center error ${error}px`);
  await page.evaluate(()=>__graph.setTransform(1.25,25,35));
  const transform=await page.evaluate(()=>__graph.transform());
  await page.evaluate(()=>__graph.tick(10));
  assert.deepEqual(await page.evaluate(()=>__graph.transform()),transform);
});

test('framing: user input cancels delayed automatic fit', async t => {
  const {page}=await openGraph(t,await fixture('sequence-hub'));
  await page.evaluate(()=>{
    __graph.svg.node().dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:100,clientY:100}));
    __graph.setTransform(0.8,10,20);
  });
  const transform=await page.evaluate(()=>__graph.transform());
  await page.evaluate(()=>{__graph.simulation.alpha(0.09);__graph.tick(5);});
  assert.deepEqual(await page.evaluate(()=>__graph.transform()),transform);
});

test('statistics: typed counts depth and mixed-density label are honest', async t => {
  const {page,errors}=await openGraph(t,await fixture());
  await page.locator('#info-button').click();
  const text=await page.locator('.info-tooltip').innerText();
  assert.match(text,/context depth\s*:?\s*1/i);
  assert.match(text,/3\s+sequence/i); assert.match(text,/2\s+context/i);
  assert.match(text,/2\s+hierarchy/i); assert.match(text,/8\s+(actual[- ]?)?link/i);
  assert.match(text,/10\s+(link\s+)?occurrences/i);
  assert.match(text,/N\/A\s*\(mixed relationships\)/i);
  assert.doesNotMatch(text,/NaN|undefined/);
  assert.deepEqual(errors,[]);
});
