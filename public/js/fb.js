// Inicialización de Firebase (Firestore) — SDK modular desde CDN.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, runTransaction, serverTimestamp, query, orderBy, deleteField, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  projectId: 'castronegro-zui5sg',
  appId: '1:1040947126436:web:1d70bcf90b200af4074631',
  storageBucket: 'castronegro-zui5sg.firebasestorage.app',
  apiKey: 'AIzaSyAkEFvtXRwNvyARDm3ym2Tusjdo8wm1GV8',
  messagingSenderId: '1040947126436',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, runTransaction, serverTimestamp, query, orderBy, deleteField, writeBatch,
};
