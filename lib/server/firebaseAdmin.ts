import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { logWarn, logError } from './logger';
import { TIMEOUTS, withTimeout } from './timeout';

if (typeof window !== 'undefined') {
  throw new Error('firebase-admin is server-only and cannot be imported in the browser.');
}

function getFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    logWarn('firebase_admin_config', 'Missing config', undefined, { projectId: !!projectId, clientEmail: !!clientEmail, privateKey: !!privateKey });
    return null;
  }

  // Strip surrounding quotes and trailing comma/newlines if present
  privateKey = privateKey.trim();
  // Remove leading quote
  if (privateKey.startsWith('"') || privateKey.startsWith("'")) {
    privateKey = privateKey.slice(1);
  }
  // Remove trailing quote and/or comma
  if (privateKey.endsWith('"') || privateKey.endsWith("'") || privateKey.endsWith(',')) {
    privateKey = privateKey.slice(0, -1);
  }
  // Remove any trailing newlines
  privateKey = privateKey.trimEnd();

  // Normalize escaped newline characters
  privateKey = privateKey.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey };
}

let adminAuth: ReturnType<typeof getAuth> | null = null;

export function getFirebaseAdminAuth() {
  if (adminAuth) return adminAuth;

  const config = getFirebaseAdminConfig();
  if (!config) {
    logWarn('firebase_admin_config', 'Admin SDK not configured - missing FIREBASE_ADMIN_* env vars');
    return null;
  }

  try {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp({
      credential: cert(config),
      projectId: config.projectId,
    });
    adminAuth = getAuth(app);
    return adminAuth;
  } catch (e: unknown) {
    logError('firebase_admin_init', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function verifyFirebaseIdToken(idToken: string) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return { success: false, error: 'Firebase Admin not configured' };
  }

  try {
    const decodedToken = await withTimeout(
      adminAuth.verifyIdToken(idToken, true),
      TIMEOUTS.firebaseAuth,
      'verifyFirebaseIdToken',
    );
    return { success: true, decodedToken };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Invalid ID token' };
  }
}

export async function getFirebaseUserByEmail(email: string) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return null;
  try {
    return await withTimeout(
      adminAuth.getUserByEmail(email),
      TIMEOUTS.firebaseUserLookup,
      'getFirebaseUserByEmail',
    );
  } catch {
    return null;
  }
}