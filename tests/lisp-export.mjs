import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function lispExport(count=0){
  if(!Number.isInteger(count)||count<0) throw new Error('Invalid synthetic note count');
  const packet=JSON.parse(execFileSync(process.env.EMACS||'emacs',[
    '--batch','-Q','-l','tests/bootstrap.el','-l','tests/integration-fixture.el',
    '--eval',`(denote-explore-test-export-integration ${count})`
  ],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']}));
  return {...packet,graph:JSON.parse(packet.json)};
}
