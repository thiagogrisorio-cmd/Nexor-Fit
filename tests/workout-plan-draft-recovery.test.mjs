import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWorkoutDraftRecovery} from '../workout-plan-draft-recovery.js';
const manifest={planId:'p1',revision:3,status:'draft',name:'Treino',origin:'manual',exerciseIds:['a','b']};
const child=(id,order,revision=3)=>({id,order,revision,name:'Remada',muscleGroup:'Costas',sets:3,reps:'10',restSeconds:90});
const assess=changes=>assessWorkoutDraftRecovery({
 planId:'p1',revision:3,manifest,exerciseDocuments:[child('a',0)],publishedRevision:2,...changes
});
test('interrupted draft identifies only missing children and preserves published pointer',()=>{
 assert.deepEqual(assess({}),{action:'resume-draft',missingExerciseIds:['b'],publishedRevision:2});
 assert.equal(manifest.status,'draft');
});
test('complete draft can proceed only to review, not automatic publication',()=>{
 assert.deepEqual(assess({exerciseDocuments:[child('a',0),child('b',1)]}),{
  action:'ready-for-publication-review',publishedRevision:2,revision:3
 });
});
test('rejects inconsistent pointers, extra children and mismatched revisions',()=>{
 assert.equal(assess({publishedRevision:3}).action,'manual-review');
 assert.equal(assess({manifest:{...manifest,status:'published'}}).action,'manual-review');
 assert.equal(assess({exerciseDocuments:[child('a',0),child('x',1)]}).action,'manual-review');
 assert.equal(assess({exerciseDocuments:[child('a',0,2)]}).action,'manual-review');
 assert.equal(assess({exerciseDocuments:[child('a',0),child('a',1)]}).action,'manual-review');
});
test('invalid completed draft never becomes publication-ready',()=>{
 assert.equal(assess({exerciseDocuments:[child('a',1),child('b',0)]}).action,'manual-review');
 assert.equal(assess({exerciseDocuments:[child('a',0),{...child('b',1),sets:13}]}).action,'manual-review');
});
