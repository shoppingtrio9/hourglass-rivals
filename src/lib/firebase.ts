import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// The Firebase web API key is publishable by design (security is enforced by
// Realtime Database rules, not by hiding the key). It is injected at build
// time via the VITE_GOOGLE_API_KEY environment variable.
const firebaseConfig = {
  apiKey: import.meta.env["VITE_GOOGLE_API_KEY"] ?? "",
  authDomain: "hourglass-duel.firebaseapp.com",
  databaseURL: "https://hourglass-duel-default-rtdb.firebaseio.com",
  projectId: "hourglass-duel",
  storageBucket: "hourglass-duel.firebasestorage.app",
  messagingSenderId: "89684445604",
  appId: "1:89684445604:web:9b805eead19a4673d25931",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
