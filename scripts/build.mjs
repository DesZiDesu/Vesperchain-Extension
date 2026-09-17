import { readFile, readdir, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { VERSION } from '../src/version.js';
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url)));
if(pkg.version!==VERSION || manifest.version!==VERSION)throw Error('Release versions disagree.');
const prefix=`dist/${VERSION}/`;
if(manifest.js!==prefix+'index.js' || manifest.css!==prefix+'vesperchain.css')throw Error('Manifest must use version-specific asset paths.');
const root=new URL('../',import.meta.url),out=new URL(prefix,root);
await mkdir(out,{recursive:true});
for(const name of await readdir(new URL('src/',root)))if(name.endsWith('.js'))await copyFile(new URL('src/'+name,root),new URL(name,out));
await copyFile(new URL('styles/vesperchain.css',root),new URL('vesperchain.css',out));
// Keep integration fixtures pointed at the exact files loaded by the host.
for(const name of ['host.html','tracking-host.html']) {
 const file=new URL('tests/'+name,root);let text=await readFile(file,'utf8');
 text=text.replace(/(?:\/styles\/|\/dist\/[^/]+\/)vesperchain\.css/g,'/'+manifest.css).replace(/(?:\/src\/|\/dist\/[^/]+\/)index\.js/g,'/'+manifest.js);
 await writeFile(file,text);
}
console.log(`Built ${VERSION}: isolated JS module graph and CSS`);
