// firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB-Yj_5VFcf5DJC7MFuOpyMkek7Cgb9cGY',
  authDomain: 'weeklyplanner-e1abb.firebaseapp.com',
  projectId: 'weeklyplanner-e1abb',
  storageBucket: 'weeklyplanner-e1abb.firebasestorage.app',
  messagingSenderId: '984739262639',
  appId: '1:984739262639:web:b28dc4244b45776ab4245a',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Persists Firestore's listener cache across reloads so onSnapshot only
// pulls deltas on reattach instead of re-reading every document.
// IndexedDB isn't available during SSR, so fall back to the default
// memory-cache client there (module code runs once server-side for the
// initial render of this 'use client' component, but no I/O happens).
export const db =
  typeof window === 'undefined'
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
