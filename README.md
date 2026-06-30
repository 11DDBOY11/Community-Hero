# 🦸 Community Hero — Hyperlocal Problem Solver

> **AI-powered civic platform** that enables citizens to report, verify, track, and resolve local infrastructure issues through collaboration, real-time data, and intelligent automation.

---

## 📌 Project Overview

Community Hero is a **fully functional single-page web application** built with pure HTML, CSS, and JavaScript — no frameworks, no build tools. It connects to **Firebase (Firestore + Storage + Auth)** as a real backend, meaning every report, vote, comment, and badge is saved permanently and syncs live across all users.

---

## ✅ What Has Been Built

### 🗂️ Complete File Structure

```
E_box/
│
├── index.html              ← Main app shell (6 sections + 2 modals)
├── seed.html               ← One-click Firestore data seeder
├── SETUP.md                ← Firebase setup guide (step-by-step)
├── README.md               ← This file
│
├── css/
│   ├── main.css            ← Design system, dark theme, typography, layout
│   ├── components.css      ← All UI components (cards, buttons, modals, badges)
│   └── animations.css      ← Micro-animations, shimmer, confetti, orbs
│
└── js/
    ├── firebase-config.js  ← Firebase credentials + initialization ✅ CONFIGURED
    ├── db.js               ← Firestore CRUD layer (issues, users, votes, comments)
    ├── storage.js          ← Firebase Storage upload (images + videos)
    ├── realtime.js         ← Firestore onSnapshot real-time listeners
    ├── data.js             ← Demo/seed data store + fallback data
    ├── ai.js               ← AI categorization + predictive insights engine
    ├── gamification.js     ← XP, levels, badges, leaderboard (Firebase-backed)
    ├── dashboard.js        ← Chart.js analytics from real Firestore data
    ├── map.js              ← Leaflet.js interactive map with custom markers
    ├── camera.js           ← Camera capture + drag-drop file upload
    └── app.js              ← Main controller (auth, navigation, wizard, feed)
```

---

### 🌟 Features Implemented

#### 🏠 Home Page
- [x] Animated hero with live counter animation
- [x] "How it works" 4-step process cards
- [x] Live issues preview (top 3 from Firestore)
- [x] Feature showcase grid
- [x] Floating action button (FAB) with pulse animation

#### 📋 Issue Feed
- [x] Real-time grid from Firestore `onSnapshot`
- [x] Search bar (title, description, location)
- [x] 3 dropdown filters: category / status / priority
- [x] Community upvote & verify buttons (Firebase-backed, +XP)
- [x] Real photos from Firebase Storage shown on cards
- [x] Animated card entrance on load/filter
- [x] Empty state with "Report First Issue" CTA

#### 🗺️ Interactive Map
- [x] Leaflet.js dark CartoDB tiles
- [x] Custom SVG markers per category (colour-coded)
- [x] Click marker → popup with issue preview + "View →"
- [x] Category filter buttons (All / Pothole / Water / Light / Waste / Road)
- [x] Click map to drop pin for report wizard
- [x] Issue count overlay (from Firestore)
- [x] Legend panel

#### 📸 3-Step Report Wizard
- [x] Step 1 — Capture + Describe
  - Drag-and-drop file upload (images + videos, max 50 MB)
  - Live camera capture (front/back camera switch)
  - AI auto-categorization (text + image analysis)
  - AI confidence bar + suggested tags
  - Auto-fills category and priority dropdowns
- [x] Step 2 — Location
  - Address text input
  - GPS "Detect My Location" button
  - Mini Leaflet map — click to drop pin
  - Lat/Lng auto-filled from GPS or map click
- [x] Step 3 — Review + Submit
  - Summary card (title, category, priority, location)
  - Upload progress bar (Firebase Storage)
  - XP preview (+100 report, +30 photo, +20 location)
  - Confetti explosion on submit 🎉

#### 📊 Impact Dashboard
- [x] 8 animated stat cards (from Firestore `stats/global` doc)
  - Total Issues, Resolved, In Progress, Reported, Verified, Resolution Rate, Potholes, Water Issues
- [x] Line chart — Monthly Reported vs Resolved (from `monthlyStats` collection)
- [x] Doughnut chart — Issues by Category (computed from real issues)
- [x] Bar chart — Avg Resolution Time per Category (computed from real timestamps)
- [x] Heatmap — Activity by Day × Hour (computed from real issue timestamps)
- [x] AI Predictive Insights panel (4 insight cards with confidence scores)
- [x] All charts live-update when new data arrives

#### 🏆 Gamification Hub
- [x] Personal profile card (name, level, XP bar, stats)
- [x] XP awards: Report (+100), Photo (+30), Location (+20), Verify (+25), Comment (+10), Upvote (+5), Resolved (+200)
- [x] Level system (15 levels, thresholds from 0–12,000 XP)
- [x] 12 achievement badges (unlocked by real actions, stored in Firestore)
- [x] Weekly challenges with progress bars (real user stats)
- [x] Leaderboard — live Firestore query `orderBy('xp', 'desc').limit(10)`
- [x] Level-up notification + confetti animation
- [x] Badge unlock toast notifications

#### 🌍 Community Feed
- [x] Real-time activity log (Firestore `onSnapshot`)
- [x] Community impact stats (resolution rate, total reports, resolved, in progress)
- [x] Call-to-action report card

#### 📋 Issue Detail Modal
- [x] Real photo gallery (Firebase Storage CDN URLs)
- [x] Category/status/priority badges
- [x] Full description + geo-coordinates
- [x] Status timeline (Reported → Verified → In Progress → Resolved)
- [x] Live comments (Firestore subcollection `onSnapshot`)
- [x] Add comment form (+10 XP)
- [x] Upvote / Verify buttons (toggle, Firestore-backed)
- [x] "View on Map" — flies to map section
- [x] Share link button

---

### 🔥 Backend (Firebase)

| Service | What It Stores |
|---|---|
| **Firestore** | Issues, users, votes, comments, stats, activity, monthly trends |
| **Firebase Storage** | Real photos and videos (CDN URLs stored in issue docs) |
| **Anonymous Auth** | Persistent user identity per browser (no login needed) |

#### Firestore Collections
```
/issues/{id}          ← all issue data + mediaUrls array
/issues/{id}/comments ← subcollection of comments
/users/{uid}          ← XP, level, badges, stats per user
/votes/{uid_id_type}  ← upvote & verify records
/stats/global         ← running totals (totalIssues, byCategory, byStatus)
/monthlyStats/{YYYY-MM} ← monthly reported/resolved counts for trend chart
/activity/{id}        ← live activity log entries
```

#### CDN Dependencies
| Library | Version | Purpose |
|---|---|---|
| Firebase SDK (compat) | 10.12.0 | Firestore + Storage + Auth |
| Leaflet.js | 1.9.4 | Interactive maps |
| Chart.js | 4.4.0 | Data visualizations |
| Google Fonts | — | Inter + Space Grotesk |
| CartoDB | — | Dark map tiles |

---

## 🚀 How to Run

> **⚠️ Must use HTTP — not `file://`**. Firebase Auth is blocked on the `file://` protocol.

### Start the server (Python — already installed)
```powershell
# Open PowerShell in the E_box folder
cd "C:\Users\Student\Desktop\E_box"
python -m http.server 8080
```

### Then open in browser
| Page | URL |
|---|---|
| 🌱 Seed Demo Data (run ONCE first) | http://localhost:8080/seed.html |
| 🏠 Main App | http://localhost:8080/index.html |

### First-time seed
1. Open `http://localhost:8080/seed.html`
2. Click **"🌱 Seed All Demo Data"**
3. Wait for "✅ Seed complete!" in the log
4. Open `http://localhost:8080/index.html`

---

## 🔧 Firebase Project Details

| Setting | Value |
|---|---|
| Project ID | `community-hero-8f98f` |
| Auth Domain | `community-hero-8f98f.firebaseapp.com` |
| Storage Bucket | `community-hero-8f98f.firebasestorage.app` |
| Region | (default) |
| Auth Mode | Anonymous (no login required) |
| Firestore Mode | Test Mode (open read/write) |

---

## 🟡 What Still Needs to Be Done

### 🔴 Critical (App won't work fully without these)

- [ ] **Verify Firestore is enabled** in Firebase console
  - Go to → Firebase Console → Build → Firestore Database → should show "Data" tab
  - If it says "Get Started", click it and enable Test Mode
- [ ] **Verify Storage is enabled**
  - Firebase Console → Build → Storage → should show a file browser
- [ ] **Verify Anonymous Auth is enabled**
  - Firebase Console → Build → Authentication → Anonymous → should be toggled ON
- [ ] **Run the seeder** at `http://localhost:8080/seed.html` to populate initial data

### 🟠 Recommended (Production-ready improvements)

- [ ] **Add Firestore Security Rules** (currently in Test Mode = anyone can read/write)
  - See `SETUP.md` for the production rules to copy-paste into Firebase console
- [ ] **Add Storage Security Rules**
  - Also in `SETUP.md`
- [ ] **Add real user names** — currently all users are "Community Hero" (anonymous)
  - Solution: Add a name input modal on first visit and save to Firestore `/users/{uid}.name`
- [ ] **Issue status updates by admin** — currently status only changes manually in Firestore
  - Solution: Add an admin panel section that lets trusted users update issue status

### 🟡 Nice-to-Have Enhancements

- [ ] **Push Notifications** — alert citizens when their issue status changes
  - Requires Firebase Cloud Messaging (FCM)
- [ ] **Real AI integration** — replace mock keyword scoring with Gemini API or Vision API
  - The `js/ai.js` module has the structure; just replace the `analyzeReport()` function body
- [ ] **User profile name input** — let users set a display name on first use
- [ ] **Issue comments live count** on the feed card (currently only visible inside modal)
- [ ] **Image zoom/lightbox** — click photo to see full-screen view
- [ ] **Export report as PDF** — for submitting to municipal authority
- [ ] **Social sharing with Open Graph** — rich preview when sharing issue URL
- [ ] **Deploy online** — Firebase Hosting (free)
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase init hosting
  firebase deploy
  ```
- [ ] **Make the server permanent** — use a batch file or Task Scheduler to auto-start the Python server

### 🟢 Quick Start Checklist

```
[✅] Firebase project created
[✅] Firebase config pasted into js/firebase-config.js
[✅] Python HTTP server: python -m http.server 8080
[✅] Firestore enabled (Test Mode)
[✅] Storage enabled (Test Mode)
[✅] Anonymous Auth enabled
[✅] seed.html seeded successfully
[✅] index.html opens with green "Firebase Connected" banner
[✅] First real issue reported (with photo)
[✅] Dashboard shows real data
```

---

## 📊 Evaluation Criteria — How We Address Each

| Criterion | Implementation |
|---|---|
| Image + video reporting | Firebase Storage upload with progress bar, camera capture |
| AI-powered categorization | Keyword scoring + image filename analysis, confidence bar |
| Geo-location + mapping | Leaflet.js dark map, GPS detection, clickable pin |
| Community verification | Firestore-backed upvote + verify toggle with XP |
| Real-time tracking | Firestore `onSnapshot` — live feed, dashboard, comments |
| Impact dashboards | 4 Chart.js charts + 8 stat cards from real Firestore data |
| Predictive insights | AI insight engine with 4 trend/hotspot predictions |
| Gamification | XP system, 12 badges, leaderboard, challenges — all Firestore-backed |
| Transparency | Timeline per issue, public comments, open activity feed |
| Accountability | All reports public with location + reporter info |

---

## 👨‍💻 Tech Stack Summary

```
Frontend:   Pure HTML5 + CSS3 + Vanilla JavaScript
Database:   Firebase Firestore (NoSQL, real-time)
Storage:    Firebase Storage (images + videos, CDN)
Auth:       Firebase Anonymous Authentication
Maps:       Leaflet.js + CartoDB Dark Tiles
Charts:     Chart.js 4.4
Server:     Python http.server (local development)
Fonts:      Google Fonts (Inter, Space Grotesk)
Design:     Glassmorphism, dark mode, Electric Violet + Cyber Teal palette
```

---

*Built for the Community Hero — Hyperlocal Problem Solver challenge.*
*Full stack: Firebase backend + AI engine + real-time sync + gamification.*
"# Community-Hero" 
