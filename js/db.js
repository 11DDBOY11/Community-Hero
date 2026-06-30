// ============================================================
// COMMUNITY HERO — FIRESTORE DATABASE LAYER
// js/db.js
//
// Provides a clean async API over Firebase Firestore.
// All functions gracefully fall back to local state when
// Firebase is not configured (demo mode).
// ============================================================

const DB = (() => {

  // ─── Collection refs (lazy) ───
  const col = name => window.db?.collection(name);

  // ═══════════════════════════════════════════
  // ISSUES
  // ═══════════════════════════════════════════

  /**
   * Create a new issue document.
   * Also increments the global stats counters and logs activity.
   */
  async function createIssue(data) {
    if (!window.db) return { id: 'local_' + Date.now(), ...data };
    const ref = col('issues').doc();
    const id  = ref.id;

    const doc = {
      ...data,
      id,
      upvotes:       0,
      verifications: 0,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:     firebase.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(doc);

    // Increment global stats
    await _incrementStats(data.category, data.status);

    // Monthly trend counter
    await _incrementMonthly(data.status);

    // Log activity
    await logActivity({
      icon:  window.AppData?.CATEGORIES?.[data.category]?.icon || '📌',
      color: window.AppData?.CATEGORIES?.[data.category]?.color || '#6c63ff',
      text:  `<strong>${data.reporterName || 'A citizen'}</strong> reported a new ${data.category} issue`,
      type:  'report',
    });

    return { id, ...doc };
  }

  /**
   * Get all issues with optional Firestore filters.
   * Returns an array; for live updates use RT.subscribeToIssues().
   */
  async function getIssues({ category, status, limit: lim = 100 } = {}) {
    if (!window.db) return [...(window.AppData?.ISSUES_DATA || [])];

    let q = col('issues').orderBy('createdAt', 'desc');
    if (category && category !== 'all') q = q.where('category', '==', category);
    if (status   && status   !== 'all') q = q.where('status',   '==', status);
    q = q.limit(lim);

    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data(), _ts: d.data().createdAt?.toDate?.() || new Date() }));
  }

  /**
   * Update specific fields on an issue.
   */
  async function updateIssue(issueId, patch) {
    if (!window.db) return;
    await col('issues').doc(issueId).update({
      ...patch,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get a single issue document.
   */
  async function getIssue(issueId) {
    if (!window.db) return window.AppData?.ISSUES_DATA?.find(i => i.id === issueId);
    const snap = await col('issues').doc(issueId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  // ═══════════════════════════════════════════
  // VOTES (upvote + verify)
  // ═══════════════════════════════════════════

  /**
   * Toggle a vote (upvote or verify) on an issue.
   * Returns { voted: bool, newCount: number }
   */
  async function toggleVote(uid, issueId, type = 'upvote') {
    if (!window.db || !uid) return { voted: true, newCount: 0 };

    const voteId  = `${uid}_${issueId}_${type}`;
    const voteRef = col('votes').doc(voteId);
    const issRef  = col('issues').doc(issueId);
    const field   = type === 'upvote' ? 'upvotes' : 'verifications';

    const voteSnap = await voteRef.get();
    const alreadyVoted = voteSnap.exists;

    const batch = window.db.batch();
    if (alreadyVoted) {
      batch.delete(voteRef);
      batch.update(issRef, { [field]: firebase.firestore.FieldValue.increment(-1) });
    } else {
      batch.set(voteRef, { uid, issueId, type, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      batch.update(issRef, { [field]: firebase.firestore.FieldValue.increment(1) });
    }
    await batch.commit();

    // Read new count
    const updatedSnap = await issRef.get();
    return { voted: !alreadyVoted, newCount: updatedSnap.data()?.[field] || 0 };
  }

  /**
   * Check which issues a user has voted on.
   * Returns Set of `issueId_type` strings.
   */
  async function getUserVotes(uid) {
    if (!window.db || !uid) return new Set();
    const snap = await col('votes').where('uid', '==', uid).get();
    return new Set(snap.docs.map(d => `${d.data().issueId}_${d.data().type}`));
  }

  // ═══════════════════════════════════════════
  // COMMENTS
  // ═══════════════════════════════════════════

  async function addComment(issueId, { text, authorName, authorUid, authorAvatar }) {
    if (!window.db) return;
    const ref = col('issues').doc(issueId).collection('comments').doc();
    await ref.set({
      text,
      authorName,
      authorUid,
      authorAvatar,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async function getComments(issueId) {
    if (!window.db) return [];
    const snap = await col('issues').doc(issueId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ═══════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════

  /**
   * Get or create a user profile in Firestore.
   */
  async function getOrCreateUser(uid) {
    if (!window.db) return window.AppData?.CURRENT_USER || {};
    const ref  = col('users').doc(uid);
    const snap = await ref.get();

    if (snap.exists) {
      // Update last seen
      ref.update({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
      return { id: uid, ...snap.data() };
    }

    // Create new profile
    const newUser = {
      name:            'Community Hero',
      level:           1,
      xp:              0,
      badges:          [],
      issuesReported:  0,
      issuesVerified:  0,
      issuesResolved:  0,
      isAnonymous:     true,
      createdAt:       firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen:        firebase.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(newUser);
    return { id: uid, ...newUser };
  }

  /**
   * Update user XP and recalculate level.
   */
  async function updateUserXP(uid, xpToAdd) {
    if (!window.db || !uid) return;
    const LEVEL_THRESHOLDS = [0,200,500,900,1400,2000,2700,3500,4400,5400,6500,7700,9000,10500,12000];

    const snap = await col('users').doc(uid).get();
    if (!snap.exists) return;
    const u = snap.data();
    const newXP = (u.xp || 0) + xpToAdd;
    let newLevel = u.level || 1;
    while (newLevel < LEVEL_THRESHOLDS.length - 1 && newXP >= LEVEL_THRESHOLDS[newLevel + 1]) {
      newLevel++;
    }
    await col('users').doc(uid).update({ xp: newXP, level: newLevel });
    return { xp: newXP, level: newLevel, leveled: newLevel > (u.level || 1) };
  }

  /**
   * Add a badge to a user (idempotent — uses arrayUnion).
   */
  async function addBadge(uid, badgeId) {
    if (!window.db || !uid) return;
    await col('users').doc(uid).update({
      badges: firebase.firestore.FieldValue.arrayUnion(badgeId),
    });
  }

  /**
   * Increment a user counter (issuesReported, issuesVerified, etc.)
   */
  async function incrementUserStat(uid, field, amount = 1) {
    if (!window.db || !uid) return;
    await col('users').doc(uid).update({
      [field]: firebase.firestore.FieldValue.increment(amount),
    });
  }

  /**
   * Get top users ordered by XP (for leaderboard).
   */
  async function getLeaderboard(lim = 10) {
    if (!window.db) return window.AppData?.USERS_DATA || [];
    const snap = await col('users').orderBy('xp', 'desc').limit(lim).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ═══════════════════════════════════════════
  // GLOBAL STATS
  // ═══════════════════════════════════════════

  async function _incrementStats(category, status = 'reported') {
    if (!window.db) return;
    const patch = {
      totalIssues: firebase.firestore.FieldValue.increment(1),
      [`byCategory.${category}`]: firebase.firestore.FieldValue.increment(1),
      [`byStatus.${status}`]:     firebase.firestore.FieldValue.increment(1),
    };
    await col('stats').doc('global').set(patch, { merge: true });
  }

  async function _incrementMonthly(status = 'reported') {
    if (!window.db) return;
    const now  = new Date();
    const key  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    await col('monthlyStats').doc(key).set({
      reported: firebase.firestore.FieldValue.increment(status === 'reported' ? 1 : 0),
      resolved: firebase.firestore.FieldValue.increment(status === 'resolved' ? 1 : 0),
      month: key,
    }, { merge: true });
  }

  async function updateIssueStatus(issueId, oldStatus, newStatus) {
    if (!window.db) return;
    const batch = window.db.batch();
    batch.update(col('issues').doc(issueId), {
      status:    newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Update stats counters
    batch.set(col('stats').doc('global'), {
      [`byStatus.${oldStatus}`]: firebase.firestore.FieldValue.increment(-1),
      [`byStatus.${newStatus}`]: firebase.firestore.FieldValue.increment(1),
      ...(newStatus === 'resolved' ? {
        resolved: firebase.firestore.FieldValue.increment(1),
      } : {}),
    }, { merge: true });
    await batch.commit();
    if (newStatus === 'resolved') await _incrementMonthly('resolved');
  }

  async function getGlobalStats() {
    if (!window.db) {
      return window.AppData?.DASHBOARD_STATS || {};
    }
    const snap = await col('stats').doc('global').get();
    return snap.exists ? snap.data() : {};
  }

  async function getMonthlyStats(months = 6) {
    if (!window.db) return window.AppData?.MONTHLY_TRENDS || { labels:[], reported:[], resolved:[] };
    const now    = new Date();
    const result = { labels: [], reported: [], resolved: [] };

    for (let i = months - 1; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const lbl = d.toLocaleString('default', { month: 'short' });
      const snap = await col('monthlyStats').doc(key).get();
      const data = snap.exists ? snap.data() : { reported: 0, resolved: 0 };
      result.labels.push(lbl);
      result.reported.push(data.reported || 0);
      result.resolved.push(data.resolved || 0);
    }
    return result;
  }

  // ═══════════════════════════════════════════
  // ACTIVITY LOG
  // ═══════════════════════════════════════════

  async function logActivity({ icon, color, text, type }) {
    if (!window.db) return;
    await col('activity').add({
      icon, color, text, type,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async function getRecentActivity(lim = 15) {
    if (!window.db) return window.AppData?.ACTIVITY_FEED || [];
    const snap = await col('activity').orderBy('createdAt', 'desc').limit(lim).get();
    return snap.docs.map(d => ({
      ...d.data(),
      time: _timeAgo(d.data().createdAt?.toDate?.()),
    }));
  }

  // ═══════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════

  function _timeAgo(date) {
    if (!date) return 'Just now';
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400)return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  return {
    createIssue, getIssues, updateIssue, getIssue, updateIssueStatus,
    toggleVote, getUserVotes,
    addComment, getComments,
    getOrCreateUser, updateUserXP, addBadge, incrementUserStat, getLeaderboard,
    getGlobalStats, getMonthlyStats, logActivity, getRecentActivity,
  };
})();

window.DB = DB;
