// Bounded integration evidence, not a universal latency benchmark.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {lispExport} from './lisp-export.mjs';
import {fixture,openGraph,activate,noNavigation,centerError} from './browser-harness.mjs';

const count=Number(process.env.PERFORMANCE_NOTE_COUNT||1200);
assert.ok(Number.isInteger(count)&&count>=5&&count<=5000);
const results=[];
const cases=[{name:'large-real-sequence',packet:lispExport(count)},
  {name:'dense-hub',packet:{graph:await fixture('sequence-hub')}}];
for(const {name,packet} of cases){
  const cleanup=[];
  try{
    const start=performance.now();
    const view=await openGraph({name,after:fn=>cleanup.push(fn)},packet.graph,{html:packet.html,stop:false});
    const loadMs=performance.now()-start;
    // [ref:sequence_final_framing] Observe actual end; never freeze mid-layout.
    await view.page.waitForFunction(()=>__simulationState.ended,null,{timeout:60000});
    const settledMs=performance.now()-start;
    // [ref:network_labels_off] Hero evidence needs minimum nonzero density, not off.
    await view.page.locator('#density-slider').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});
    const shape=await view.page.evaluate(()=>({
      nodes:__graph.nodes.length,edges:__graph.links.length,
      radii:__graph.node.nodes().map(el=>({hero:el.__data__.sequenceMember,r:+el.getAttribute('r')})),
      finite:__graph.coordinates().every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)),
      visibleHeroes:document.querySelectorAll('.sequence-halo').length,
      heroIds:__graph.nodes.filter(n=>n.sequenceMember).map(n=>n.id).sort(),
      heroLabelIds:[...document.querySelectorAll('.labels-group text')]
        .filter(el=>el.__data__.sequenceMember).map(el=>el.__data__.id).sort()
    }));
    assert.equal(shape.finite,true);assert.equal(shape.visibleHeroes,3);
    assert.deepEqual(shape.heroLabelIds,shape.heroIds,'hero evidence requires every Sequence label');
    assert.ok(Math.max(...shape.radii.filter(n=>!n.hero).map(n=>n.r))<=Math.min(...shape.radii.filter(n=>n.hero).map(n=>n.r)));
    if(name==='large-real-sequence'){
      assert.equal(shape.nodes,count);assert.equal(shape.edges,2*count-4);assert.equal(packet.extractorCalls,1);
    }
    const artifacts=process.env.DENOTE_EXPLORE_TEST_ARTIFACTS;
    if(artifacts){await mkdir(artifacts,{recursive:true});
      await view.page.screenshot({path:path.join(artifacts,name+'-hero.png')});}
    const framing=await view.page.evaluate(()=>({bounds:__graph.svgBounds(),
      heroes:__graph.nodes.filter(n=>n.sequenceMember).map(n=>({id:n.id,...__graph.position(n.id)}))}));
    const r=framing.bounds;
    assert.ok(framing.heroes.every(n=>n.x>=r.x&&n.x<=r.x+r.width&&n.y>=r.y&&n.y<=r.y+r.height),
      `Initial framing lost sequence members: ${JSON.stringify(framing)}`);
    const id=name==='dense-hub'?'X':'20260101T000004';
    const before=await view.page.evaluate(()=>__graph.coordinates());
    const focusStart=performance.now();await activate(view.page,id);const focusMs=performance.now()-focusStart;
    assert.equal(await view.page.evaluate(()=>__graph.selected()),id);
    assert.deepEqual(await view.page.evaluate(()=>__graph.coordinates()),before);
    const error=await centerError(view.page,id);assert.ok(error.x<=2&&error.y<=2);
    await noNavigation(view);
    results.push({name,nodes:shape.nodes,edges:shape.edges,depth:packet.graph.meta.contextDepth,
      generationMs:packet.generationSeconds===undefined?null:packet.generationSeconds*1000,
      extractorCalls:packet.extractorCalls??null,loadMs,settledMs,focusMs,
      viewport:{width:1280,height:800,deviceScaleFactor:1},status:'passed'});
  }finally{for(const fn of cleanup) await fn();}
}
const report={platform:os.platform(),arch:os.arch(),cpus:os.cpus().length,node:process.version,
  note:'Graph generation excludes fixture file creation; timings are local evidence, not service-level guarantees.',results};
const output=process.env.DENOTE_EXPLORE_TEST_ARTIFACTS;
if(output) await writeFile(path.join(output,'performance.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
