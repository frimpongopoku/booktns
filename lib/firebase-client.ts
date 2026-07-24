"use client";

import { getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";

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

export const googleProvider = new GoogleAuthProvider();
