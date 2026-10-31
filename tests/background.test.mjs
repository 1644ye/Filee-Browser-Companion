import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const handlers={},downloads=[],badges=[],menus=[];
let response, failDownload=false;
const chrome={
  runtime:{onInstalled:{addListener:fn=>handlers.install=fn}},
  contextMenus:{removeAll:async()=>{},create:item=>menus.push(item),onClicked:{addListener:fn=>handlers.menu=fn}},
  action:{onClicked:{addListener:fn=>handlers.action=fn},setBadgeText:async x=>badges.push(x),setTitle:async()=>{}},
  scripting:{executeScript:async()=>{}},
  tabs:{sendMessage:async()=>response},
  downloads:{download:async options=>{if(failDownload)throw Error('User cancelled');downloads.push(options);return downloads.length;}}
};
vm.runInNewContext(await readFile(new URL('../extension/background.js',import.meta.url),'utf8'),{chrome});
await handlers.install(); assert.equal(menus[0].id,'filee-save-original');
const click=()=>handlers.menu({menuItemId:'filee-save-original',frameId:0},{id:1});
response={url:'https://example.test/new.mp4?signature=a&b=2'};await click();
assert.equal(downloads[0].url,response.url);assert.equal(downloads[0].saveAs,true);assert.equal(downloads[0].conflictAction,'uniquify');assert.equal(downloads[0].filename,undefined);
response={url:'data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E',filename:'image.svg'};await click();assert.equal(downloads[1].filename,'image.svg');
for(const url of ['file:///C:/private.txt','javascript:alert(1)','data:text/html,<h1>invalid</h1>']){response={url};await click();assert.equal(downloads.length,2);assert.equal(badges.at(-1).text,'!');}
response={error:'Video source removed'};await click();assert.equal(downloads.length,2);
response={url:'https://example.test/new.mp4'};failDownload=true;await click();assert.equal(downloads.length,2);assert.equal(badges.at(-1).text,'!');
console.log('Background checks passed: menu, signed URL, save-as, numbering, SVG filename, invalid URLs, source error, cancel.');
