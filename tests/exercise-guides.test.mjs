import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exerciseGuide} from '../exercise-guides.js';
test('all 48 default prescription entries have complete technique guidance',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const days=JSON.parse(html.match(/const days=(\[.*\]);/)[1]);
 const names=days.flatMap(day=>day[2].map(item=>item.split('|')[1]));
 assert.equal(names.length,48);
 for(const name of names){const guide=exerciseGuide(name);assert.ok(guide,name);for(const key of ['muscles','execution','tip'])assert.ok(guide[key].trim().length>0,`${name}: ${key}`);}
});
test('custom names never reuse unrelated exercise instructions',()=>{
 assert.equal(exerciseGuide('Meu exercício novo'),null);
 assert.equal(exerciseGuide('Supino reto com barra personalizado'),null);
 assert.deepEqual(exerciseGuide('  STIFF COM HALTERES '),exerciseGuide('Stiff com halteres'));
});

