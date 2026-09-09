// Real GraphViz engine, test-local WASM build; not a replacement production CLI.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {instance} from '@viz-js/viz';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const viz=await instance();
for(const singleton of [true,false]){
  const expression=`(princ (denote-explore-test-encode #'denote-explore-network-encode-graphviz (denote-explore-test-export-graph ${singleton?'t':'nil'})))`;
  const dot=execFileSync(process.env.EMACS||'emacs',['--batch','-Q','-l','tests/bootstrap.el','--eval',expression],{cwd:root,encoding:'utf8'});
  const svg=viz.renderString(dot,{format:'svg',engine:'dot'});
  assert.match(svg,/<svg\s/);
  assert.doesNotMatch(svg,/NaN|Infinity/);
  const edgeCount=[...svg.matchAll(/class="edge"/g)].length;
  assert.equal(edgeCount,singleton?0:4,'typed parallel/reverse/self records retained');
  assert.match(svg,/root\.org/,'GraphViz hyperlink retained');
  const artifacts=process.env.DENOTE_EXPLORE_TEST_ARTIFACTS;
  if(artifacts){await mkdir(artifacts,{recursive:true});const name=singleton?'singleton':'multigraph';
    await writeFile(path.join(artifacts,name+'.dot'),dot);await writeFile(path.join(artifacts,name+'.svg'),svg);}
  console.log(`PASS GraphViz ${viz.graphvizVersion}: ${singleton?'singleton':'multigraph'}, ${edgeCount} rendered edges`);
}
