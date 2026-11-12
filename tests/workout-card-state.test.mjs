import test from 'node:test';import assert from 'node:assert/strict';
import {projectWorkoutCard} from '../workout-card-state.js';
test('authenticated cards never display stale legacy zero after a finished V2 session',()=>{
 const card=projectWorkoutCard({authenticated:true,day:0,legacyCompleted:0,history:[{day:0,endedAt:'2026-11-12T12:00:00.000Z'}]});
 assert.equal(card.label,'Concluído');assert.equal(card.percent,null);
 assert.equal(projectWorkoutCard({authenticated:true,day:1}).label,'Iniciar');
});
test('active V2 exercise progress wins over historical completion',()=>{
 const card=projectWorkoutCard({authenticated:true,day:0,active:{day:0,completedExercises:3,totalExercises:12},history:[{day:0,endedAt:'2026-11-12T12:00:00.000Z'}]});
 assert.equal(card.percent,25);assert.equal(card.detail,'3 de 12 exercícios');
});
test('local mode retains its actual local exercise progress',()=>{
 assert.equal(projectWorkoutCard({authenticated:false,day:0,legacyCompleted:6}).percent,50);
});
