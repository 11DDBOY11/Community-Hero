# Community Hero — Firebase Setup Guide

## One-Time Setup (≈ 5 minutes)

---

### Step 1 — Create Firebase Project

1. Open **[console.firebase.google.com](https://console.firebase.google.com)**
2. Click **"Add project"**
3. Name it: `community-hero`
4. Google Analytics: optional (can skip)
5. Click **Create project**

---

### Step 2 — Enable Firestore Database

1. In the left sidebar: **Build → Firestore Database**
2. Click **Create database**
3. Select **Start in Test Mode** (allows read/write without auth rules for now)
4. Location: **`asia-south1`** (India) or nearest region
5. Click **Enable**

---

### Step 3 — Enable Firebase Storage

1. In the left sidebar: **Build → Storage**
2. Click **Get Started**
3. Select **Start in Test Mode**
4. Click **Next → Done**

---

### Step 4 — Enable Anonymous Authentication

1. In the left sidebar: **Build → Authentication**
2. Click **Get Started**
3. Click **Anonymous** in the Sign-in providers list
4. Toggle **Enable** → Save

This gives each browser visitor a persistent anonymous identity (no login needed).

---

### Step 5 — Register Web App & Get Config

1. Click the **⚙️ gear icon** (Project Settings) at the top of the left sidebar
2. Scroll down to **"Your apps"**
3. Click **`</>`** (Web) to add a web app
4. App nickname: `community-hero-web`
5. Click **Register app**
6. You'll see a config block like:

```js
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXX",
  authDomain: "community-hero-12345.firebaseapp.com",
  projectId: "community-hero-12345",
  storageBucket: "community-hero-12345.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

7. **Copy this entire block**

---

### Step 6 — Paste Config into the App

1. Open `js/firebase-config.js` in this project
2. Replace the placeholder values:

```js
// BEFORE (placeholders):
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  ...
};

// AFTER (your real values):
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXX",
  authDomain: "community-hero-12345.firebaseapp.com",
  ...
};
```

3. Save the file

---

### Step 7 — Seed Demo Data (Optional but Recommended)

1. Open **`seed.html`** in your browser
2. Click **"Seed All Demo Data"**
3. Watch the log — it will populate Firestore with the 6 demo issues, monthly stats, and activity feed
4. This takes about 5 seconds

---

### Step 8 — Open the App

1. Open **`index.html`** in your browser
2. The yellow "Demo Mode" banner should now be **green "Firebase Connected"**
3. Report an issue — refresh — it persists! ✅

---

## Verifying It Works

### In the App
- Report an issue with a photo → refresh → issue still there ✅
- Open two browser tabs → report in one → see it in the other (real-time) ✅
- Upvote an issue → refresh → upvote count persists ✅

### In Firebase Console
- **Firestore** → check `issues` collection has your report
- **Storage** → check `issues/{id}/` has your photo
- **Authentication** → see anonymous user created for your browser

---

## Free Tier Limits (Spark Plan)

| Feature | Free Limit |
|---|---|
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Storage size | 5 GB |
| Storage downloads | 1 GB/day |
| Auth users | Unlimited |

More than sufficient for a community app with hundreds of users.

---

## Firestore Security Rules (Production)

After testing, update Firestore rules from "Test Mode" to secure rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read issues
    match /issues/{issueId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      
      // Comments subcollection
      match /comments/{commentId} {
        allow read: if true;
        allow create: if request.auth != null;
      }
    }
    
    // Users can only write their own profile
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    // Votes — users can only write their own votes
    match /votes/{voteId} {
      allow read: if true;
      allow write: if request.auth != null 
                   && voteId.matches(request.auth.uid + '_.*');
    }
    
    // Stats — readable by all, writable only by app (via functions ideally)
    match /stats/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /monthlyStats/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /activity/{doc} { allow read: if true; allow write: if request.auth != null; }
  }
}
```

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /issues/{issueId}/{filename} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 50 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*|video/.*');
    }
  }
}
```

---

## Support

- Firebase docs: https://firebase.google.com/docs
- Firestore: https://firebase.google.com/docs/firestore
- Storage: https://firebase.google.com/docs/storage

---

## 🔒 Storage CORS Configuration (For Local Uploads)

By default, Google Cloud Storage blocks direct file uploads from `localhost` due to the browser's **CORS (Cross-Origin Resource Sharing)** security policy. If you see CORS errors in your browser console:

We have added a **fail-fast fallback** that auto-resolves with local preview URLs if uploads are blocked, so your reports will still submit successfully to Firestore. However, to enable actual file uploads to your bucket, follow these simple steps to configure CORS:

### The Easy Way: Using Google Cloud Shell

1. Open **[console.cloud.google.com](https://console.cloud.google.com)** (log in with the same Google Account).
2. Select your project **`community-hero-8f98f`** from the project selector dropdown at the top.
3. Click the **Activate Cloud Shell** button `[>_]` in the top-right header bar.
4. Once the shell terminal opens, create a CORS config file by copy-pasting this command and pressing **Enter**:
   ```bash
   echo '[{"origin": ["*"], "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "responseHeader": ["*"], "maxAgeSeconds": 3600}]' > cors.json
   ```
5. Apply it to your storage bucket by copy-pasting this command (replace with your project ID if different):
   ```bash
   gsutil cors set cors.json gs://community-hero-8f98f.firebasestorage.app
   ```
   *(Note: If your bucket uses the older naming structure, it might end in `.appspot.com` instead. Check your Firebase Config to be sure).*
6. Press Enter. You should see `Setting CORS on gs://community-hero-8f98f.firebasestorage.app/...`.
7. Direct file uploads from `http://localhost:8080` will now work instantly!

