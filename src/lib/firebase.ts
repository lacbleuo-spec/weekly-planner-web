import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);
