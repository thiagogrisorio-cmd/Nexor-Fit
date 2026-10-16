import {initializeApp,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {createV2SummaryTriggerHandler} from '../session-v2-summary-trigger.js';
if(!getApps().length)initializeApp();
const store=getFirestore();
const handle=createV2SummaryTriggerHandler({store});
/** Trigger restricted to V2 workout completion transitions; do not deploy until CI is green. */
export const onV2WorkoutCompleted=onDocumentUpdated({document:'users/{uid}/sessions/{sessionId}',region:'southamerica-east1',retry:false},handle);
