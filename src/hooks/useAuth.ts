// useAuth

'use client';

import { useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function signUp(email: string, password: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to sign up.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to sign in.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setErrorMessage(null);

    try {
      await firebaseSignOut(auth);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to sign out.',
      );
    }
  }

  return {
    user,
    isLoading,
    errorMessage,
    setErrorMessage,
    isLoggedIn: user !== null,
    signUp,
    signIn,
    signOut,
  };
}
