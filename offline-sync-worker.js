// Legacy V1 offline writes are retired. Keep queued edits for explicit recovery.
import {auth} from './auth.js';
import {pendingOfflineOperations} from './offline-controller.js';

export async function synchronizeOfflineWorkouts(){
 const account=auth.currentUser?.uid;
 if(!account||!navigator.onLine)return {status:'offline',synced:0,conflicts:[]};
 const queued=await pendingOfflineOperations(account);
 if(!queued.length)return {status:'complete',synced:0,conflicts:[]};
 return {status:'needs-review',synced:0,conflicts:[...new Set(queued.map(op=>op.sessionId))].map(sessionId=>({sessionId,reason:'legacy-v1-writes-retired'}))};
}
