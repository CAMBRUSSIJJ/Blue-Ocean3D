#!/usr/bin/env node
/**
 * Build static Vercel output from the canonical, browser-first Blue Ocean 3D app.
 * Preserve both / and historical /app/ routes and the sibling /vendor/ assets.
 */
import {cp,readFile,rm,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(project,'dist');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await cp(join(project,'app'),join(out,'app'),{recursive:true});
await cp(join(project,'vendor'),join(out,'vendor'),{recursive:true});
const canonical=await readFile(join(project,'app','index.html'),'utf8');
if(!canonical.includes('<head>')||!canonical.includes('src="./app.mjs"')){
 throw new Error('A entrada do aplicativo mudou; revise o empacotamento.');
}
const rootHtml=canonical.replace('<head>','<head>\n<base href="/app/">');
await writeFile(join(out,'index.html'),rootHtml);
console.log('Blue Ocean 3D: dist/index.html + app/ + vendor/ prontos.');
