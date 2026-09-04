import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const globalForFirebaseAdmin = globalThis as unknown as { firebaseAdminApp?: App };

function getFirebaseAdminApp(): App {
  const existing = getApps()[0] ?? globalForFirebaseAdmin.firebaseAdminApp;
  if (existing) return existing;

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForFirebaseAdmin.firebaseAdminApp = app;
  }

  return app;
}

interface VerifiedFirebaseUser {
  email: string;
  emailVerified: boolean;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  try {
    const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
    if (!decoded.email) return null;
    return { email: decoded.email, emailVerified: decoded.email_verified ?? false };
  } catch {
    return null;
  }
}
