import test from 'node:test';
import assert from 'node:assert/strict';
import {resumeV2OfflineSync} from '../offline-v2-resume.js';
test('V2 resume pauses when signed out',async()=>{
 const result=await resumeV2OfflineSync({uid:'user',isCurrentAccount:()=>false,isOnline:()=>true});
 assert.deepEqual(result,{status:'paused',processed:0});
});
test('V2 resume pauses when offline',async()=>{
 const result=await resumeV2OfflineSync({uid:'user',isCurrentAccount:()=>true,isOnline:()=>false});
 assert.deepEqual(result,{status:'paused',processed:0});
});
