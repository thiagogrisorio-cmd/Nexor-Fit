import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';
import {connectAuthEmulator} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,connectFirestoreEmulator} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
// Explicit local-only smoke-test mode; never connect production domains to emulators.
import {shouldUseLocalEmulators,emulatorFirebaseConfig} from './local-emulator-policy.js';
export const usingLocalEmulators=shouldUseLocalEmulators({hostname:location.hostname,search:location.search});
export const app = initializeApp(usingLocalEmulators?emulatorFirebaseConfig(firebaseConfig):firebaseConfig);
export const auth = getAuth(app);
if(usingLocalEmulators){
 connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 connectFirestoreEmulator(getFirestore(app),'127.0.0.1',8080);
}
auth.languageCode = 'pt-BR';
const el = id => document.getElementById(id);
const errors = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já tem uma conta. Entre ou recupere sua senha.',
  'auth/weak-password': 'Escolha uma senha com pelo menos 6 caracteres.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/popup-blocked': 'Permita pop-ups para entrar com Google.',
  'auth/popup-closed-by-user': 'O login foi cancelado.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet e tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/unauthorized-domain': 'Este endereço ainda não está autorizado para login.',
  'auth/operation-not-allowed': 'Este método de login ainda não está habilitado.'
};
export function status(message) { el('syncStatus').textContent = message; }
export function errorMessage(error) { return errors[error.code] || 'Não foi possível concluir. Tente novamente.'; }
let pending = false;
async function perform(action, success) {
  if (pending) return;
  pending = true;
  const buttons = [...el('accountPanel').querySelectorAll('button')];
  buttons.forEach(button => button.disabled = true);
  try { await action(); el('password').value = ''; if (success) status(success); }
  catch (error) { status(errorMessage(error)); }
  finally { pending = false; buttons.forEach(button => button.disabled = false); }
}
export function connectAccount(onUser) {
  el('googleLogin').onclick = () => perform(() => signInWithPopup(auth, new GoogleAuthProvider()));
  el('loginForm').onsubmit = event => {
    event.preventDefault();
    perform(() => signInWithEmailAndPassword(auth, el('email').value.trim(), el('password').value));
  };
  el('createAccount').onclick = () => {
    if (el('loginForm').reportValidity()) perform(() => createUserWithEmailAndPassword(auth, el('email').value.trim(), el('password').value));
  };
  el('resetPassword').onclick = () => {
    if (!el('email').reportValidity() || !el('email').value) return;
    perform(() => sendPasswordResetEmail(auth, el('email').value.trim()), 'Se houver uma conta com este e-mail, você receberá instruções para recuperar a senha.');
  };
  el('logout').onclick = () => perform(() => signOut(auth));
  return onAuthStateChanged(auth, user => {
    el('signedOut').classList.toggle('hidden', !!user);
    el('signedIn').classList.toggle('hidden', !user);
    el('accountName').textContent = user?.displayName || user?.email || '';
    el('password').value = '';
    onUser(user);
  }, error => status(errorMessage(error)));
}
