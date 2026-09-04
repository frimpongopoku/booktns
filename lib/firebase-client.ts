"use client";

import { getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let cachedAuth: Auth | null = null;

// Lazy on purpose: getAuth() validates the API key immediately, which breaks
// prerendering /login at build time when real Firebase env vars aren't set yet.
// Only ever call this from inside an event handler, never at module scope.
export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

// Firebase defaults to IndexedDB-backed persistence, which has a real SDK bug:
// a second tab (or any concurrent connection) can force-close the IndexedDB
// connection mid-write, rejecting the sign-in *after* Google's OAuth handshake
// has already succeeded. The user sees a generic failure immediately after a
// visibly successful Google popup, with nothing useful in the error.
//
// browserLocalPersistence (localStorage) has no such failure mode. This must
// be awaited BEFORE signInWithPopup — setting it afterwards is too late.
export async function getFirebaseAuthReady(): Promise<Auth> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}

export const googleProvider = new GoogleAuthProvider();
