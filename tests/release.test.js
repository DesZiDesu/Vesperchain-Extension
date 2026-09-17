import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { VERSION } from '../src/version.js';
test('manifest and all shipped modules/styles share the release namespace and match source',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));
 const root=new URL('../',import.meta.url),prefix=`dist/${VERSION}/`;
 assert.equal(manifest.version,VERSION);assert.equal(manifest.js,prefix+'index.js');assert.equal(manifest.css,prefix+'vesperchain.css');
 for(const file of readdirSync(new URL('src/',root)).filter(n=>n.endsWith('.js')))assert.equal(readFileSync(new URL(prefix+file,root),'utf8'),readFileSync(new URL('src/'+file,root),'utf8'));
 assert.equal(readFileSync(new URL(manifest.css,root),'utf8'),readFileSync(new URL('styles/vesperchain.css',root),'utf8'));
});
