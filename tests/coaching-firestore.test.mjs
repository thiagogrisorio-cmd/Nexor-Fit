import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {generateProgram} from '../coaching-engine.js';import {saveCoachingProgram,createCoachedSession,editCoachedSession,decodeCoachedSession} from '../coaching-repository.js';
let env;before(async()=>{env=await initializeTestEnvironment({projectId:'demo-nexor-coaching-tests',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});await env.clearFirestore();});after(async()=>env?.cleanup());
const deps={doc,runTransaction,serverTimestamp},program=generateProgram({level:'basic',goal:'muscle',focus:'balanced',days:3,minutes:30,equipment:[],adult:true});
test('profile and programme are owner-only, bounded, and reject stale or malformed updates',async()=>{
 const uid='coach-owner',db=env.authenticatedContext(uid).firestore(),ref=doc(db,'users',uid,'coaching','current');
 await saveCoachingProgram({db,uid,program,expectedRevision:0,...deps});await assertSucceeds(getDoc(ref));
 await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(),'users',uid,'coaching','current')));await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users',uid,'coaching','current')));
 await assert.rejects(()=>saveCoachingProgram({db,uid,program,expectedRevision:0,...deps}),/mudou/);
 const original=(await getDoc(ref)).data();
 await assertFails(updateDoc(ref,{profile:{...program.profile,equipment:['unknown']},revision:2,updatedAt:serverTimestamp(),reviewedAt:serverTimestamp()}));
 const bad=structuredClone(program.days);bad[2].exercises[0].sets=100;
 await assertFails(updateDoc(ref,{days:bad,revision:2,updatedAt:serverTimestamp(),reviewedAt:serverTimestamp()}));
 await saveCoachingProgram({db,uid,program,expectedRevision:1,keep:true,...deps});assert.deepEqual((await getDoc(ref)).data().createdAt,original.createdAt);
});
test('coached sessions start, preserve immutable prescription, edit with revision checks and release lock on finish',async()=>{
 const uid='coach-session',db=env.authenticatedContext(uid).firestore();await saveCoachingProgram({db,uid,program,expectedRevision:0,...deps});
 const id=await createCoachedSession({db,uid,dayIndex:0,restOverride:0,id:'session-a',...deps});const ref=doc(db,'users',uid,'coachSessions',id);
 const initial=decodeCoachedSession((await getDoc(ref)).data());assert.equal(initial.prescription.exercises[0].restSeconds,0);
 await assertFails(updateDoc(ref,{prescription:{...initial.prescription,name:'Changed'},revision:2,updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(),'users',uid,'coachSessions',id)));
 await assert.rejects(()=>createCoachedSession({db,uid,dayIndex:1,id:'session-b',...deps}),/andamento/);
 await editCoachedSession({db,uid,id,expectedRevision:1,exerciseIndex:0,setIndex:0,weightKg:10,...deps});
 await assert.rejects(()=>editCoachedSession({db,uid,id,expectedRevision:1,exerciseIndex:0,setIndex:1,weightKg:10,...deps}),/mudou/);
 assert.equal(decodeCoachedSession((await getDoc(ref)).data()).sets[0].items[0].done,true);
 await editCoachedSession({db,uid,id,expectedRevision:2,finish:true,...deps});assert.equal((await getDoc(ref)).data().status,'completed');assert.equal((await getDoc(doc(db,'users',uid,'coachControl','active'))).data().sessionId,'');
 await createCoachedSession({db,uid,dayIndex:1,id:'session-b',...deps});
});
test('legacy active workout blocks a second coached session',async()=>{
 const uid='coach-legacy',db=env.authenticatedContext(uid).firestore();await saveCoachingProgram({db,uid,program,expectedRevision:0,...deps});await setDoc(doc(db,'users',uid,'sessionControl','active'),{sessionId:'legacy-active',updatedAt:serverTimestamp()});await assert.rejects(()=>createCoachedSession({db,uid,dayIndex:0,id:'blocked',...deps}),/andamento/);
});
test('largest supported profile and session fit Firestore rule evaluation limits',async()=>{
 const uid='coach-max',db=env.authenticatedContext(uid).firestore();
 const {EQUIPMENT}=await import('../coaching-catalog.js');
 const maximum=generateProgram({...program.profile,level:'advanced',minutes:75,days:6,equipment:Object.keys(EQUIPMENT)});
 await saveCoachingProgram({db,uid,program:maximum,expectedRevision:0,...deps});
 await createCoachedSession({db,uid,dayIndex:0,id:'max-session',...deps});
 await editCoachedSession({db,uid,id:'max-session',expectedRevision:1,exerciseIndex:0,setIndex:0,weightKg:2000,...deps});
 await editCoachedSession({db,uid,id:'max-session',expectedRevision:2,finish:true,...deps});
});
test('session-only and persistent replacements preserve performed sets and future scope',async()=>{
 const {swapCoachedExercise}=await import('../coaching-repository.js');const {compatibleExercises}=await import('../coaching-catalog.js');
 const uid='coach-swap',db=env.authenticatedContext(uid).firestore();await saveCoachingProgram({db,uid,program,expectedRevision:0,...deps});
 const id=await createCoachedSession({db,uid,dayIndex:0,id:'swap-session',...deps}),ref=doc(db,'users',uid,'coachSessions',id);
 let current=decodeCoachedSession((await getDoc(ref)).data());const index=current.prescription.exercises.findIndex(e=>compatibleExercises(e.id,program.profile,current.exerciseIds).length>0),option=compatibleExercises(current.exerciseIds[index],program.profile,current.exerciseIds)[0];
 await swapCoachedExercise({db,uid,id,exerciseIndex:index,newId:option.id,scope:'session',expectedRevision:1,expectedPlanRevision:1,...deps});current=decodeCoachedSession((await getDoc(ref)).data());assert.equal(current.exerciseIds[index],option.id);assert.equal((await getDoc(doc(db,'users',uid,'coaching','current'))).data().revision,1);
 await editCoachedSession({db,uid,id,expectedRevision:2,exerciseIndex:index,setIndex:0,weightKg:null,...deps});
 const back=program.days[0].exercises[index].id;
 await assert.rejects(()=>swapCoachedExercise({db,uid,id,exerciseIndex:index,newId:back,scope:'session',expectedRevision:3,expectedPlanRevision:1,...deps}),/registros/);
 await assertFails(updateDoc(ref,{exerciseIds:program.days[0].exercises.map(e=>e.id),revision:4,updatedAt:serverTimestamp()}));
});
test('persistent replacement updates the plan and never reassigns a performed set',async()=>{
 const {swapCoachedExercise}=await import('../coaching-repository.js');const {compatibleExercises}=await import('../coaching-catalog.js');const {decodeProgramDays}=await import('../coaching-engine.js');
 const uid='coach-persistent',db=env.authenticatedContext(uid).firestore();await saveCoachingProgram({db,uid,program,expectedRevision:0,...deps});const id=await createCoachedSession({db,uid,dayIndex:0,id:'persistent-session',...deps}),ref=doc(db,'users',uid,'coachSessions',id),pRef=doc(db,'users',uid,'coaching','current');
 let session=decodeCoachedSession((await getDoc(ref)).data());const index=session.prescription.exercises.findIndex(e=>compatibleExercises(e.id,program.profile,session.exerciseIds).length>0),original=session.exerciseIds[index],candidate=compatibleExercises(original,program.profile,session.exerciseIds)[0];
 await swapCoachedExercise({db,uid,id,exerciseIndex:index,newId:candidate.id,scope:'future',expectedRevision:1,expectedPlanRevision:1,...deps});
 assert.equal(decodeProgramDays((await getDoc(pRef)).data().days)[0].exercises[index].id,candidate.id);
 await editCoachedSession({db,uid,id,expectedRevision:2,exerciseIndex:index,setIndex:0,weightKg:12,...deps});
 await swapCoachedExercise({db,uid,id,exerciseIndex:index,newId:original,scope:'future',expectedRevision:3,expectedPlanRevision:2,...deps});
 session=decodeCoachedSession((await getDoc(ref)).data());assert.equal(session.exerciseIds[index],candidate.id);assert.equal(session.sets[index].items[0].weightKg,12);assert.equal(decodeProgramDays((await getDoc(pRef)).data().days)[0].exercises[index].id,original);
});
test('environment profiles persist and cardio logs stay private, bounded and separate',async()=>{
 const uid='cardio-owner',db=env.authenticatedContext(uid).firestore();
 const p=generateProgram({...program.profile,days:6,minutes:75,level:'advanced',environment:'gym',gymDays:6,cardioLevel:'moderate',cardioMinutes:20});
 await saveCoachingProgram({db,uid,program:p,expectedRevision:0,...deps});
 const ref=doc(db,'users',uid,'cardioLogs','cardio-test'),value={mode:'stairs',environment:'gym',level:'moderate',minutes:8,dayIndex:3,performedAt:serverTimestamp()};
 await assertSucceeds(setDoc(ref,value));await assertFails(getDoc(doc(env.authenticatedContext('cardio-other').firestore(),'users',uid,'cardioLogs','cardio-test')));await assertFails(updateDoc(ref,{minutes:30}));
 await assertFails(setDoc(doc(db,'users',uid,'cardioLogs','bad-minutes'),{...value,minutes:121}));await assertFails(setDoc(doc(db,'users',uid,'cardioLogs','bad-home'),{...value,environment:'home'}));
 await assertFails(updateDoc(doc(db,'users',uid,'coaching','current'),{profile:{...p.profile,environment:'hybrid',gymDays:6},revision:2,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
});
