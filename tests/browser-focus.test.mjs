import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,openGraph,activate,noNavigation,centerError} from './browser-harness.mjs';

async function graphOfType(type) {
  const graph=await fixture();
  if(type==='Sequence') return graph;
  graph.meta={type,directed:type!=='Keywords',parameters:type==='Keywords'?1:['',1]};
  for(const n of graph.nodes){delete n.sequenceMember;delete n.contextDistance;
    if(type==='Keywords'){delete n.filename;delete n.type;delete n.signature;delete n.keywords;}}
  for(const e of graph.edges){delete e.kind;delete e.key;}
  return graph;
}

for(const type of ['Sequence','Community','Neighbourhood','Keywords']) {
  test(`focus: ${type} selects without node navigation`,async t=>{
    const view=await openGraph(t,await graphOfType(type));
    await activate(view.page,'A');
    await noNavigation(view);
    assert.equal(await view.page.evaluate(()=>__graph.selected()),'A');
  });
}

test('focus: both incident directions highlight while sequence identity persists',async t=>{
  const {page}=await openGraph(t,await fixture());
  await activate(page,'A');
  assert.equal(await page.evaluate(()=>__graph.selected()),'A');
  const state=await page.evaluate(()=>({
    nodes:Object.fromEntries(__graph.node.nodes().map(el=>[el.__data__.id,+getComputedStyle(el).opacity])),
    links:__graph.link.nodes().map(el=>({incident:[el.__data__.source.id,el.__data__.target.id].includes('A'),opacity:+getComputedStyle(el).strokeOpacity}))
  }));
  assert.ok(state.nodes.C<state.nodes.B);assert.ok(state.nodes.Y<state.nodes.X);
  assert.equal(state.links.filter(e=>e.incident).length,4);
  assert.ok(Math.min(...state.links.filter(e=>e.incident).map(e=>e.opacity))>
    Math.max(...state.links.filter(e=>!e.incident).map(e=>e.opacity)));
  await activate(page,'X');
  assert.deepEqual(await page.locator('.sequence-halo').evaluateAll(els=>els.map(e=>e.__data__.id).sort()),['A','B','C']);
  const arrows=await page.evaluate(()=>__graph.link.nodes().map(el=>{
    const marker=document.querySelector(el.getAttribute('marker-end').slice(4,-1));
    return [getComputedStyle(el).stroke,getComputedStyle(marker.querySelector('path')).fill];
  }));
  for(const [stroke,fill] of arrows) assert.equal(fill,stroke);
});

test('focus: modifier activation remains navigation-free',async t=>{
  const view=await openGraph(t,await fixture());
  for(const extras of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true}]){
    await activate(view.page,'X',extras);await noNavigation(view);
    assert.equal(await view.page.evaluate(()=>__graph.selected()),'X');
  }
});

test('camera: preserve zoom coordinates pins and simulation across sidebar scales',async t=>{
  const view=await openGraph(t,await fixture(),{reducedMotion:'no-preference'});
  const {page}=view;
  for(const width of [250,400]) for(const k of [0.5,1,2]){
    await page.evaluate(({width,k})=>{
      document.getElementById('sidebar').style.width=width+'px';
      __graph.svg.style('max-width',`calc(100% - ${width}px)`);
      __graph.setTransform(k,40,60);
    },{width,k});
    const before=await page.evaluate(()=>({coords:__graph.coordinates(),alpha:__graph.simulation.alpha(),restarts:__simulationState.restarts}));
    await activate(page,'X');
    assert.equal(await page.evaluate(()=>__graph.selected()),'X');
    await page.waitForFunction(()=>{const p=__graph.position('X'),r=__graph.svgBounds();
      return Math.abs(p.x-r.x-r.width/2)<=2&&Math.abs(p.y-r.y-r.height/2)<=2;},null,{timeout:1500});
    const after=await page.evaluate(()=>({coords:__graph.coordinates(),alpha:__graph.simulation.alpha(),restarts:__simulationState.restarts}));
    assert.deepEqual(after,before);
    assert.equal(await page.evaluate(()=>__graph.transform().k),k);
    const error=await centerError(page,'X');assert.ok(error.x<=2&&error.y<=2);
    await page.evaluate(()=>__graph.setTransform(0.75,80,90));
    const transform=await page.evaluate(()=>__graph.transform());
    await page.evaluate(()=>__graph.tick());
    assert.deepEqual(await page.evaluate(()=>__graph.transform()),transform,'no camera-lock on ticks');
  }
  await noNavigation(view);
});

test('camera: live selection does not restart or pin natural simulation',async t=>{
  const view=await openGraph(t,await fixture(),{stop:false});
  const {page}=view;
  const before=await page.evaluate(()=>({restarts:__simulationState.restarts,
    pins:__graph.nodes.map(n=>[Object.hasOwn(n,'fx'),n.fx??null,Object.hasOwn(n,'fy'),n.fy??null])}));
  await activate(page,'A');
  assert.equal(await page.evaluate(()=>__graph.selected()),'A');
  const after=await page.evaluate(()=>({restarts:__simulationState.restarts,
    pins:__graph.nodes.map(n=>[Object.hasOwn(n,'fx'),n.fx??null,Object.hasOwn(n,'fy'),n.fy??null])}));
  assert.deepEqual(after,before);
  const coords=await page.evaluate(()=>__graph.coordinates());
  await page.waitForTimeout(80);
  assert.notDeepEqual(await page.evaluate(()=>__graph.coordinates()),coords,'normal live drift remains');
  await page.evaluate(()=>__graph.simulation.stop());
  await noNavigation(view);
});

test('camera: user gesture interrupts animated focus pan',async t=>{
  const {page}=await openGraph(t,await fixture(),{reducedMotion:'no-preference'});
  await activate(page,'X');
  assert.equal(await page.evaluate(()=>__graph.selected()),'X');
  await page.evaluate(()=>{
    __graph.svg.node().dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:40,clientX:150,clientY:150}));
    __graph.setTransform(1.1,45,55);
  });
  const transform=await page.evaluate(()=>__graph.transform());
  await page.waitForTimeout(650);
  assert.deepEqual(await page.evaluate(()=>__graph.transform()),transform);
});

test('drag: releasing a dragged node does not activate it',async t=>{
  const view=await openGraph(t,await fixture());
  const {page}=view;const p=await page.evaluate(()=>__graph.position('A'));
  await page.mouse.move(p.x,p.y);await page.mouse.down();
  await page.mouse.move(p.x+45,p.y+25,{steps:5});await page.mouse.up();
  await page.evaluate(()=>__graph.simulation.stop());
  assert.equal(await page.evaluate(()=>__graph.selected()),null);
  await noNavigation(view);
  await activate(page,'A');
  assert.equal(await page.evaluate(()=>__graph.selected()),'A');
  await noNavigation(view);
});

test('labels: density keeps selected and hero labels without reheating',async t=>{
  const {page}=await openGraph(t,await fixture());
  await activate(page,'X');
  assert.equal(await page.evaluate(()=>__graph.selected()),'X');
  const before=await page.evaluate(()=>({coords:__graph.coordinates(),alpha:__graph.simulation.alpha(),restarts:__simulationState.restarts}));
  await page.locator('#density-slider').evaluate(el=>{el.value=el.min;el.dispatchEvent(new Event('input',{bubbles:true}));});
  const after=await page.evaluate(()=>({coords:__graph.coordinates(),alpha:__graph.simulation.alpha(),restarts:__simulationState.restarts}));
  assert.deepEqual(after,before);
  const labels=await page.locator('.labels-group text').evaluateAll(els=>els.map(e=>e.__data__.id));
  for(const id of ['A','B','C','X']) assert.ok(labels.includes(id));
  assert.equal(await page.evaluate(()=>__graph.selected()),'X');
});

test('isolation: hide clears selection labels tab stops but not legend circles',async t=>{
  const graph=await graphOfType('Community');
  graph.nodes.push({id:'I',name:'Isolated',degree:0,backlinks:0,type:'org',keywords:[],filename:'/notes/I.org',x:300,y:200});
  const {page,errors}=await openGraph(t,graph);
  await activate(page,'I');
  assert.equal(await page.evaluate(()=>__graph.selected()),'I');
  await page.locator('#info-button').click();
  await page.evaluate(()=>d3.select('.info-tooltip').append('svg').append('circle').datum({degree:0}).attr('id','legend-sentinel'));
  await page.locator('.info-tooltip button').filter({hasText:/hide isolated/i}).click();
  const state=await page.evaluate(()=>({selected:__graph.selected(),
    hidden:getComputedStyle(__graph.element('I')).display==='none',tab:__graph.element('I').getAttribute('tabindex'),
    visibleLabels:[...document.querySelectorAll('.labels-group text')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.__data__.id),
    legend:getComputedStyle(document.getElementById('legend-sentinel')).display}));
  assert.equal(state.selected,null);assert.equal(state.hidden,true);assert.notEqual(state.tab,'0');
  assert.ok(!state.visibleLabels.includes('I'));assert.notEqual(state.legend,'none');
  assert.deepEqual(errors,[]);
});

for(const type of ['Sequence','Community','Neighbourhood','Keywords']) {
  test(`keyboard: ${type} Enter Space Escape and clear focus`,async t=>{
    const view=await openGraph(t,await graphOfType(type));const {page}=view;
    const attrs=await page.evaluate(()=>{const el=__graph.element('A');return {role:el.getAttribute('role'),tab:el.getAttribute('tabindex'),name:el.getAttribute('aria-label')};});
    assert.equal(attrs.role,'button');assert.equal(attrs.tab,'0');assert.ok(attrs.name?.includes('A'));
    await page.evaluate(()=>__graph.element('A').focus());
    const visibleFocus=await page.evaluate(()=>{const el=__graph.element('A'),s=getComputedStyle(el);
      return document.activeElement===el&&(s.outlineStyle!=='none'||s.filter!=='none'||(+s.strokeWidth>0&&s.stroke!=='none'));});
    assert.equal(visibleFocus,true);
    await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>__graph.selected()),'A');
    await page.evaluate(()=>__graph.element('X').focus());
    const scroll=await page.evaluate(()=>window.scrollY);
    await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__graph.selected()),'X');
    assert.equal(await page.evaluate(()=>window.scrollY),scroll);
    assert.equal(await page.evaluate(()=>__graph.element('X').getAttribute('aria-pressed')),'true');
    assert.equal(await page.locator('[aria-live]').count(),1);
    const status=await page.locator('[aria-live]').innerText();assert.ok(status.includes('X'));
    await page.evaluate(()=>{const el=__graph.element('A');el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));el.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));});
    assert.equal(await page.locator('[aria-live]').innerText(),status);
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__graph.selected()),null);
    await activate(page,'A');
    assert.equal(await page.getByRole('button',{name:/clear focus/i}).count(),1);
    await page.getByRole('button',{name:/clear focus/i}).click();
    assert.equal(await page.evaluate(()=>__graph.selected()),null);
    await noNavigation(view);
  });
}

test('status: malicious-looking selected names remain inert text',async t=>{
  const graph=await fixture();const name='<img src=x onerror="window.__injected=1">';
  graph.nodes.find(n=>n.id==='X').name=name;
  const {page}=await openGraph(t,graph);await activate(page,'X');
  assert.equal(await page.evaluate(()=>__graph.selected()),'X');
  assert.equal(await page.locator('[aria-live]').count(),1);
  assert.ok((await page.locator('[aria-live]').innerText()).includes(name));
  assert.equal(await page.locator('[aria-live] img').count(),0);
  assert.equal(await page.evaluate(()=>window.__injected??null),null);
});

test('reduced-motion: focus pan has no animated transition',async t=>{
  const {page}=await openGraph(t,await fixture(),{reducedMotion:'reduce'});
  await activate(page,'X');assert.equal(await page.evaluate(()=>__graph.selected()),'X');
  const error=await centerError(page,'X');assert.ok(error.x<=2&&error.y<=2);
  assert.equal(await page.evaluate(()=>Boolean(__graph.svg.node().__transition)),false);
});
