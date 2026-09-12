import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized on the client side');
  }
  if (!app) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
  }
  return app;
}

function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

// Lazy getter for auth - only initializes when accessed
export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    const instance = getAuthInstance();
    return (instance as any)[prop];
  },
});

// Export Firebase Auth functions for use in components
export const firebaseCreateUser = (email: string, password: string) => 
  createUserWithEmailAndPassword(getAuthInstance(), email, password);

export const firebaseSignIn = (email: string, password: string) => 
  signInWithEmailAndPassword(getAuthInstance(), email, password);

export const firebaseSignOut = () => 
  signOut(getAuthInstance());

export const firebaseOnAuthStateChanged = (callback: (user: any) => void) => 
  onAuthStateChanged(getAuthInstance(), callback);

export const firebaseUpdateProfile = (user: any, data: { displayName?: string; photoURL?: string }) => 
  updateProfile(user, data);

export { firebaseConfig };
export default app;