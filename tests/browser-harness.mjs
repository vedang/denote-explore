import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(here, '.deps/browsers');
const {chromium} = await import('playwright');
export async function fixture(name = 'sequence-small') {
  return JSON.parse(await readFile(path.join(here, 'fixtures', `${name}.json`), 'utf8'));
}

// Instrumentation only: production logic is always read from the real template.
function instrumentation(stop) {
  return `<script>
    window.__simulationState = { restarts: 0 };
    const originalForceSimulation = d3.forceSimulation;
    d3.forceSimulation = function(...args) {
      const sim = originalForceSimulation(...args);
      sim.randomSource(d3.randomLcg(0.42));
      const restart = sim.restart;
      sim.restart = function(...values) {
        window.__simulationState.restarts++;
        return restart.apply(sim, values);
      };
      ${stop ? 'sim.stop();' : ''}
      return sim;
    };
  </script>`;
}

const probe = `<script>
window.__graph = {
  get nodes() { return nodes; }, get links() { return links; },
  get node() { return node; }, get link() { return link; },
  get svg() { return svg; }, get group() { return svgGroup; },
  get simulation() { return simulation; }, get zoom() { return zoom; },
  tick(n = 0) { simulation.tick(n); ticked(); },
  selected() { return typeof selectedNodeId === 'undefined' ? null : selectedNodeId; },
  element(id) { return node.filter(d => d.id === id).node(); },
  transform() { const z = d3.zoomTransform(svg.node()); return {x:z.x,y:z.y,k:z.k}; },
  setTransform(k, x=0, y=0) { svg.call(zoom.transform,d3.zoomIdentity.translate(x,y).scale(k)); },
  coordinates() { return nodes.map(d=>({id:d.id,x:d.x,y:d.y,fx:d.fx,fy:d.fy,
    hasFx:Object.hasOwn(d,'fx'),hasFy:Object.hasOwn(d,'fy')})); },
  position(id) { const d=nodes.find(d=>d.id===id);
    const p=new DOMPoint(d.x,d.y).matrixTransform(svgGroup.node().getScreenCTM());
    return {x:p.x,y:p.y}; },
  svgBounds() { const r=svg.node().getBoundingClientRect();
    const side=document.getElementById('sidebar');
    const s=side?.getBoundingClientRect();
    const right=s && s.left>r.left && s.left<r.right && getComputedStyle(side).display!=='none'
      ? s.left : r.right;
    return {x:r.x,y:r.y,width:right-r.left,height:r.height}; }
};
ticked();
</script>`;

export async function openGraph(t, graph, options = {}) {
  const [template, d3] = await Promise.all([
    readFile(path.join(root, 'denote-explore-network.html'), 'utf8'),
    readFile(path.join(here, 'node_modules/d3/dist/d3.min.js')),
  ]);
  const rendered = options.html ?? template
    .replaceAll('{{graph-type}}', graph.meta.type)
    .replaceAll('{{d3-js}}', '/d3.js')
    .replaceAll('{{json-content}}', JSON.stringify(graph))
    .replaceAll('{{d3-colourscheme}}', 'schemeCategory10');
  const html = rendered
    .replace('<script src="/d3.js"></script>', `<script src="/d3.js"></script>${instrumentation(options.stop !== false)}`)
    .replace('</body>', `${probe}</body>`);
  const server = createServer((request, response) => {
    if (request.url === '/d3.js') {
      response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(d3);
    } else if (request.url.startsWith('/notes/') || /\.(org|md|txt)(\?|$)/.test(request.url)) {
      response.writeHead(200, {'Content-Type': 'text/plain'}); response.end('Synthetic note preview');
    } else {
      response.writeHead(200, {'Content-Type': 'text/html'}); response.end(html);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({viewport: {width:1280,height:800},
    deviceScaleFactor: 1, reducedMotion: options.reducedMotion || 'reduce'});
  const page = await context.newPage();
  const errors = [], navigation = [], popups = [];
  let loaded = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('popup', popup => { popups.push(popup.url()); void popup.close(); });
  page.on('framenavigated', frame => {
    if (loaded && frame === page.mainFrame()) navigation.push(frame.url());
  });
  await page.addInitScript(() => {
    window.__openCalls = [];
    window.open = (...args) => { window.__openCalls.push(args); return null; };
  });
  await page.route('**/*', route => {
    const request = route.request();
    if (loaded && request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      navigation.push(request.url()); return route.abort();
    }
    return request.url().startsWith(origin + '/') ? route.continue() : route.abort();
  });
  t.after(async () => {
    const output = process.env.DENOTE_EXPLORE_TEST_ARTIFACTS;
    if (output) {
      await mkdir(output, {recursive: true});
      await page.screenshot({path: path.join(output, t.name.replace(/[^a-z0-9-]/gi, '_') + '.png')}).catch(() => {});
    }
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });
  await page.goto(origin, {waitUntil: 'load'});
  loaded = true;
  return {page, errors, navigation, popups, origin};
}

export async function activate(page, id, extras = {}) {
  await page.evaluate(({id, extras}) => {
    __graph.element(id).dispatchEvent(new MouseEvent('click', {bubbles:true,...extras}));
  }, {id, extras});
}

export async function noNavigation(view) {
  assert.deepEqual(await view.page.evaluate(() => window.__openCalls), []);
  assert.deepEqual(view.navigation, []);
  assert.deepEqual(view.popups, []);
  assert.deepEqual(view.errors, []);
}

export async function centerError(page, id) {
  return page.evaluate(id => {
    const p=__graph.position(id), r=__graph.svgBounds();
    return {x:Math.abs(p.x-(r.x+r.width/2)), y:Math.abs(p.y-(r.y+r.height/2))};
  }, id);
}
