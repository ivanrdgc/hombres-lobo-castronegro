// Inicialización de Firebase (Firestore) — SDK modular vía npm.
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, runTransaction, query, orderBy, writeBatch,
} from 'firebase/firestore';

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
  onSnapshot, runTransaction, query, orderBy, writeBatch,
};
