// ============================================================
// COMMUNITY HERO — FIREBASE CONFIGURATION
// js/firebase-config.js
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyCZGHzX978atWInnLRfCjgs3I5I-oHqIFk",
  authDomain:        "community-hero-8f98f.firebaseapp.com",
  projectId:         "community-hero-8f98f",
  storageBucket:     "community-hero-8f98f.firebasestorage.app",
  messagingSenderId: "1037299643810",
  appId:             "1:1037299643810:web:aeeb159b5afc1de2c46efb",
  measurementId:     "G-K1VSXWXBMZ"
};

// ─── Detect if Firebase is configured ───
const FIREBASE_CONFIGURED = (
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
);

// ─── Initialize ───
let firebaseApp, db, auth, storage;

if (FIREBASE_CONFIGURED) {
  try {
    // Prevent duplicate app init on multi-page load
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
      firebaseApp = firebase.app();
    }

    db      = firebase.firestore();
    auth    = firebase.auth();
    storage = firebase.storage();
    
    // Fail fast on CORS/network errors (3s max retry) so it falls back to local URLs instead of hanging
    storage.setMaxUploadRetryTime(3000);

    // Enable offline persistence
    db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });

    console.log('✅ Firebase initialized — community-hero-8f98f');
  } catch (err) {
    console.error('Firebase init error:', err);
  }
} else {
  console.warn('⚠️ Firebase not configured — running in DEMO mode.');
}

window.FIREBASE_CONFIGURED = FIREBASE_CONFIGURED;
window.db      = db;
window.auth    = auth;
window.storage = storage;

// Optional: Get a free key from https://aistudio.google.com to enable real AI computer vision
window.GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

