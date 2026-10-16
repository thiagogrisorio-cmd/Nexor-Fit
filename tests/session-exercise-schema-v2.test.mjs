import test from 'node:test';
import assert from 'node:assert/strict';
import {startSession} from '../workout-session.js';
import {splitSessionExercises,joinSessionExercises} from '../session-exercise-schema-v2.js';
test('schema v2 roundtrip',()=>{const session=startSession({id:'example',day:0,now:0});const {sets,...metadata}=session;assert.deepEqual(joinSessionExercises(metadata,splitSessionExercises(session)),session);});
