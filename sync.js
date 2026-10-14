import { getFirestore, collection, doc, onSnapshot, query, orderBy, runTransaction, Timestamp, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { app, auth, connectAccount, status } from './auth.js';
import { freshWorkout, changeWorkout, legacyWorkout } from './state.js';
const db = getFirestore(app);
const el = id => document.getElementById(id);
export function connectSync(adapter) {
  let user = null, generation = 0, ready = false, busy = false, failed = false;
  let unsubscribers = [], workouts = {}, history = [], received = new Set();
  function lock() { el('workoutApp').inert = !!user && (!ready || busy || failed || !navigator.onLine); el('workoutApp').setAttribute('aria-busy',String(!!user && (!ready || busy))); }
  function refreshStatus() {
    lock();
    if(!user) {status('Modo local: registros salvos apenas neste navegador.');return;}
    if(failed) {status('A sincronização falhou. Suas alterações não foram salvas. Recarregue a página para tentar novamente.');return;}
    status(!navigator.onLine ? 'Sem conexão. Reconecte para registrar alterações na conta.' : !ready ? 'Carregando seus registros…' : busy ? 'Salvando na sua conta…' : 'Sincronizado com sua conta.');
  }
  function emit() {
    const progress={}, sessionDone={};
    for(const [day,workout] of Object.entries(workouts)) {sessionDone[day]=workout.logged;workout.exercises.forEach((exercise,index)=>progress[day+'-'+index]=exercise);}
    adapter.load({progress,sessionDone,logs:history});
    ready=received.size===2;
    refreshStatus();
  }
  function fail(error) { console.error('Nexor Fit sync:',error.code); failed=true; refreshStatus(); }
  connectAccount(nextUser => {
    generation++; unsubscribers.forEach(unsubscribe=>unsubscribe());unsubscribers=[];
    user=nextUser; ready=false; busy=false; failed=false; received=new Set();workouts={};history=[];
    el('importLegacy').classList.toggle('hidden',!user || !adapter.hasLegacy());
    if(!user) {adapter.local();refreshStatus();return;}
    adapter.load({progress:{},sessionDone:{},logs:[]});refreshStatus();
    const token=generation;
    unsubscribers.push(onSnapshot(collection(db,'users',user.uid,'workouts'), {includeMetadataChanges:true}, snapshot=>{
      if(token!==generation)return;
      workouts=Object.fromEntries(snapshot.docs.map(item=>[item.id,item.data()]));
      if(!snapshot.metadata.fromCache)received.add('workouts');emit();
    },error=>{if(token===generation)fail(error)}));
    unsubscribers.push(onSnapshot(query(collection(db,'users',user.uid,'history'),orderBy('at')), {includeMetadataChanges:true}, snapshot=>{
      if(token!==generation)return;
      history=snapshot.docs.map(item=>({day:item.data().day,at:item.data({serverTimestamps:'estimate'}).at.toDate().toISOString()}));
      if(!snapshot.metadata.fromCache)received.add('history');emit();
    },error=>{if(token===generation)fail(error)}));
  });
  async function perform(action) {
    if(!user)return false;
    if(busy || !ready || failed || !navigator.onLine) {refreshStatus();return true;}
    const uid=user.uid, token=generation;
    busy=true;refreshStatus();let message='';
    try {await action(uid);}
    catch(error) {if(token===generation) {message='Não foi possível salvar. Verifique a conexão e tente novamente.';adapter.redraw();} }
    finally {if(token===generation){busy=false;lock();if(!failed)status(message || (navigator.onLine?'Sincronizado com sua conta.':'Sem conexão. Reconecte para continuar.'));}}
    return true;
  }
  const controller = {
    signedIn: () => !!user,
    change(day,index,field,value) {
      return perform(uid=>runTransaction(db,async transaction=>{
        const ref=doc(db,'users',uid,'workouts',String(day));
        const snapshot=await transaction.get(ref);
        const current=snapshot.exists()?snapshot.data():freshWorkout();
        const {next,completed}=changeWorkout(current,index,field,value);
        const historyRef=doc(db,'users',uid,'history',next.session);
        const existing=completed ? await transaction.get(historyRef) : null;
        transaction.set(ref,{...next,updatedAt:serverTimestamp()});
        if(completed && !existing.exists())transaction.set(historyRef,{day,at:serverTimestamp()});
      }));
    },
    reset(day) {
      return perform(uid=>runTransaction(db,async transaction=>{
        const ref=doc(db,'users',uid,'workouts',String(day));const snapshot=await transaction.get(ref);
        const next=freshWorkout();
        if(snapshot.exists())next.exercises=snapshot.data().exercises.map(exercise=>({...exercise,done:false}));
        transaction.set(ref,{...next,updatedAt:serverTimestamp()});
      }));
    }
  };
  el('importLegacy').onclick=async()=>{
    if(!confirm('Importar os registros antigos deste navegador para a conta conectada? O progresso atual da conta será preservado.'))return;
    await perform(async uid=>{
      const legacy=adapter.legacy();
      for(let day=0;day<4;day++)await runTransaction(db,async transaction=>{
        const ref=doc(db,'users',uid,'workouts',String(day));const snapshot=await transaction.get(ref);
        if(!snapshot.exists())transaction.set(ref,{...legacyWorkout(day,legacy.progress,legacy.sessionDone),updatedAt:serverTimestamp()});
      });
      const valid=legacy.logs.filter(log=>Number.isInteger(log.day)&&log.day>=0&&log.day<4&&Number.isFinite(Date.parse(log.at)));
      for(let start=0;start<valid.length;start+=400){
        const batch=writeBatch(db);
        for(const log of valid.slice(start,start+400)){
          const at=new Date(log.at).toISOString();
          const id='legacy-'+log.day+'-'+new Date(at).getTime();
          batch.set(doc(db,'users',uid,'history',id),{day:log.day,at:Timestamp.fromDate(new Date(at))});
        }
        await batch.commit();
      }
      el('importLegacy').classList.add('hidden');
    });
  };
  window.addEventListener('online',refreshStatus);window.addEventListener('offline',refreshStatus);
  return controller;
}


