import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import config from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId || undefined,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const dbId = (config as any).firestoreDatabaseId;
export const db = dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);
export const DB_ROOT = "plp2026";
export const projectId = config.projectId;
export const firestoreConsoleUrl = `https://console.firebase.google.com/project/${config.projectId}/firestore`;
