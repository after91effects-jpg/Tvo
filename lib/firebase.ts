import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Firestore,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile as fbUpdateProfile,
  User,
  Auth,
  ActionCodeSettings
} from 'firebase/auth';
import firebaseConfigData from '../firebase-applet-config.json';

// Initialize Firebase App
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfigData);
} else {
  app = getApp();
}

// Initialize Firestore with the provisioned database ID if present
export const db: Firestore = (firebaseConfigData as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfigData as any).firestoreDatabaseId)
  : getFirestore(app);

export const auth: Auth = getAuth(app);

// Firestore Collection Names
export const COLLECTIONS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  MEDIA_ASSETS: 'mediaAssets',
  PROMO_CODES: 'promoCodes',
  SUBSCRIBERS: 'subscribers',
  INQUIRIES: 'inquiries',
  AUDIT_LOGS: 'auditLogs',
  IMPORT_JOBS: 'importJobs',
  SETTINGS: 'settings',
  ADMIN_USERS: 'adminUsers',
  SEARCH_HISTORY: 'searchHistory',
  CUSTOMER_PROFILES: 'customerProfiles',
  CUSTOMER_ADDRESSES: 'customerAddresses',
} as const;

export {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut,
  onAuthStateChanged,
  fbUpdateProfile as updateProfile
};
export type { User, ActionCodeSettings };
