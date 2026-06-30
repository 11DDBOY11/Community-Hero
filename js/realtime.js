// ============================================================
// COMMUNITY HERO — REAL-TIME FIRESTORE LISTENERS
// js/realtime.js
//
// Manages onSnapshot subscriptions that keep the UI in sync
// with Firestore data changes in real time.
// Falls back to local demo data when Firebase is not configured.
// ============================================================

const RT = (() => {

  // Active unsubscribe handles (call to stop listening)
  const _unsubs = {};

  // ═══════════════════════════════════════════
  // ISSUES FEED — live updates
  // ═══════════════════════════════════════════

  /**
   * Subscribe to the issues collection.
   * Callback receives array of issue objects sorted newest-first.
   * Returns unsubscribe function.
   */
  function subscribeToIssues(callback, { category, status } = {}) {
    if (!window.db) {
      // Demo mode — call once with local data
      const data = [...(window.AppData?.ISSUES_DATA || [])];
      callback(data);
      return () => {};
    }

    _unsubs.issues?.(); // cancel previous listener

    let q = window.db.collection('issues').orderBy('createdAt', 'desc').limit(200);
    if (category && category !== 'all') q = q.where('category', '==', category);
    if (status   && status   !== 'all') q = q.where('status',   '==', status);

    _unsubs.issues = q.onSnapshot(
      snap => {
        const issues = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          _ts: d.data().createdAt?.toDate?.() || new Date(),
        }));
        callback(issues);
      },
      err => {
        console.error('Issues listener error:', err);
        callback(window.AppData?.ISSUES_DATA || []);
      }
    );

    return _unsubs.issues;
  }

  // ═══════════════════════════════════════════
  // DASHBOARD STATS — live aggregated counters
  // ═══════════════════════════════════════════

  /**
   * Subscribe to the global stats document.
   * Callback receives the stats object.
   */
  function subscribeToStats(callback) {
    if (!window.db) {
      callback(window.AppData?.DASHBOARD_STATS || {});
      return () => {};
    }

    _unsubs.stats?.();
    _unsubs.stats = window.db.collection('stats').doc('global').onSnapshot(
      snap => {
        if (snap.exists) {
          callback(snap.data());
        } else {
          callback({});
        }
      },
      err => {
        console.error('Stats listener error:', err);
        callback(window.AppData?.DASHBOARD_STATS || {});
      }
    );

    return _unsubs.stats;
  }

  // ═══════════════════════════════════════════
  // ACTIVITY FEED — latest 15 entries
  // ═══════════════════════════════════════════

  function subscribeToActivity(callback) {
    if (!window.db) {
      callback(window.AppData?.ACTIVITY_FEED || []);
      return () => {};
    }

    _unsubs.activity?.();
    _unsubs.activity = window.db.collection('activity')
      .orderBy('createdAt', 'desc')
      .limit(15)
      .onSnapshot(
        snap => {
          const feed = snap.docs.map(d => ({
            ...d.data(),
            time: _timeAgo(d.data().createdAt?.toDate?.()),
          }));
          callback(feed);
        },
        err => {
          console.error('Activity listener error:', err);
          callback(window.AppData?.ACTIVITY_FEED || []);
        }
      );

    return _unsubs.activity;
  }

  // ═══════════════════════════════════════════
  // SINGLE ISSUE — for detail modal refresh
  // ═══════════════════════════════════════════

  function subscribeToIssue(issueId, callback) {
    if (!window.db) return () => {};
    _unsubs[`issue_${issueId}`]?.();
    _unsubs[`issue_${issueId}`] = window.db
      .collection('issues').doc(issueId)
      .onSnapshot(snap => {
        if (snap.exists) callback({ id: snap.id, ...snap.data() });
      });
    return _unsubs[`issue_${issueId}`];
  }

  // ═══════════════════════════════════════════
  // USER PROFILE — keeps profile card live
  // ═══════════════════════════════════════════

  function subscribeToUser(uid, callback) {
    if (!window.db || !uid) return () => {};
    _unsubs.user?.();
    _unsubs.user = window.db.collection('users').doc(uid).onSnapshot(
      snap => { if (snap.exists) callback({ id: uid, ...snap.data() }); },
      err  => console.error('User listener error:', err)
    );
    return _unsubs.user;
  }

  // ═══════════════════════════════════════════
  // LEADERBOARD — top 10 users by XP
  // ═══════════════════════════════════════════

  function subscribeToLeaderboard(callback) {
    if (!window.db) {
      callback(window.AppData?.USERS_DATA || []);
      return () => {};
    }

    _unsubs.leaderboard?.();
    _unsubs.leaderboard = window.db
      .collection('users')
      .orderBy('xp', 'desc')
      .limit(10)
      .onSnapshot(
        snap => {
          const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          callback(users);
        },
        err => {
          console.error('Leaderboard listener error:', err);
          callback(window.AppData?.USERS_DATA || []);
        }
      );

    return _unsubs.leaderboard;
  }

  // ═══════════════════════════════════════════
  // COMMENTS — for issue detail modal
  // ═══════════════════════════════════════════

  function subscribeToComments(issueId, callback) {
    if (!window.db) {
      const issue = window.AppData?.ISSUES_DATA?.find(i => i.id === issueId);
      callback(issue?.comments || []);
      return () => {};
    }

    const key = `comments_${issueId}`;
    _unsubs[key]?.();
    _unsubs[key] = window.db
      .collection('issues').doc(issueId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snap => {
          const comments = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            time: _timeAgo(d.data().createdAt?.toDate?.()),
          }));
          callback(comments);
        },
        err => console.error('Comments listener error:', err)
      );

    return _unsubs[key];
  }

  // ═══════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════

  function unsubscribeAll() {
    Object.values(_unsubs).forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
  }

  // ═══════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════

  function _timeAgo(date) {
    if (!date) return 'Just now';
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  return {
    subscribeToIssues,
    subscribeToStats,
    subscribeToActivity,
    subscribeToIssue,
    subscribeToUser,
    subscribeToLeaderboard,
    subscribeToComments,
    unsubscribeAll,
  };
})();

window.RT = RT;
