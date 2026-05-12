// useAuth

'use client';

import { useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

function authErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-email':
        return 'Invalid email or password.';

      case 'auth/email-already-in-use':
        return 'This email is already in use.';

      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';

      case 'auth/requires-recent-login':
        return 'Please log in again and try deleting your account.';

      default:
        return error instanceof Error ? error.message : 'Something went wrong.';
    }
  }

  return error instanceof Error ? error.message : 'Something went wrong.';
}

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
      setErrorMessage(authErrorMessage(error));
      throw error;
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
      setErrorMessage(authErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setErrorMessage(null);

    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
      throw error;
    }
  }

  async function reauthenticateAndDelete(password: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const currentUser = auth.currentUser;

      if (!currentUser || !currentUser.email) {
        throw new Error('No signed-in user found.');
      }

      if (!password.trim()) {
        throw new Error('Please enter your password.');
      }

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password,
      );

      await reauthenticateWithCredential(currentUser, credential);
      await deleteUser(currentUser);

      setUser(null);
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
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
    reauthenticateAndDelete,
  };
}
