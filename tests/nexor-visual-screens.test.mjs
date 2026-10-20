import test from 'node:test';
import assert from 'node:assert/strict';
import {nexorVisualScreens,getNexorVisualScreen} from '../nexor-visual-screens.js';
test('design review registry covers exactly twelve unique numbered screens',()=>{
 assert.equal(nexorVisualScreens.length,12);
 assert.deepEqual(nexorVisualScreens.map(s=>s.number),Array.from({length:12},(_,i)=>i+1));
 assert.equal(new Set(nexorVisualScreens.map(s=>s.id)).size,12);
 assert.equal(new Set(nexorVisualScreens.map(s=>s.file)).size,12);
});
test('preview paths are local and isolated from app entrypoint',()=>{
 for(const screen of nexorVisualScreens){assert.match(screen.file,/^visual-[a-z-]+-v2\.html$/);assert.notEqual(screen.file,'index.html');assert.equal(getNexorVisualScreen(screen.id),screen)}
 assert.equal(getNexorVisualScreen('unknown'),null);
});
