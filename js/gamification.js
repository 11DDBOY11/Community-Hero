// ============================================================
// COMMUNITY HERO — GAMIFICATION (Firebase-backed)
// js/gamification.js
//
// XP, levels, and badges are now persisted in Firestore.
// User identity comes from Firebase Anonymous Auth.
// ============================================================

const Gamification = (() => {

  const XP_REWARDS = {
    reportIssue:   100,
    uploadPhoto:    30,
    addLocation:    20,
    verifyIssue:    25,
    commentIssue:   10,
    issueResolved: 200,
    upvoteGiven:     5,
    streakBonus:    50,
    firstReport:   150,
  };

  const LEVEL_THRESHOLDS = [0,200,500,900,1400,2000,2700,3500,4400,5400,6500,7700,9000,10500,12000];

  // ─── In-memory mirror of Firestore user doc ───
  let _user = {
    id:              null,
    name:            'Community Hero',
    level:           1,
    xp:              0,
    badges:          [],
    issuesReported:  0,
    issuesVerified:  0,
    issuesResolved:  0,
  };

  // ─── Set user data from auth / Firestore ───
  function setUser(userData) {
    _user = { ..._user, ...userData };
    updateCurrentUserDisplay();
  }

  function getUser() { return { ..._user }; }

  // ─── Award XP ───
  async function awardXP(action, multiplier = 1) {
    const points   = (XP_REWARDS[action] || 10) * multiplier;
    const oldLevel = _user.level;

    _user.xp += points;

    // Recalculate level locally for instant UI response
    while (_user.level < LEVEL_THRESHOLDS.length - 1 &&
           _user.xp   >= LEVEL_THRESHOLDS[_user.level + 1]) {
      _user.level++;
    }

    const leveled = _user.level > oldLevel;
    updateCurrentUserDisplay();
    if (leveled) showLevelUpNotif(_user.level);

    // Persist to Firestore
    if (_user.id) {
      const result = await DB.updateUserXP(_user.id, points);
      if (result?.leveled) showLevelUpNotif(result.level);
    }

    await checkBadgeTriggers(action);
    return { points, leveled, newLevel: _user.level };
  }

  // ─── Badge trigger checks ───
  async function checkBadgeTriggers(action) {
    const toUnlock = [];

    if (action === 'reportIssue') {
      _user.issuesReported = (_user.issuesReported || 0) + 1;
      if (_user.issuesReported >= 1  && !_user.badges.includes('pioneer'))  toUnlock.push('pioneer');
      if (_user.issuesReported >= 25 && !_user.badges.includes('guardian')) toUnlock.push('guardian');
      if (_user.id) await DB.incrementUserStat(_user.id, 'issuesReported');
    }

    if (action === 'verifyIssue') {
      _user.issuesVerified = (_user.issuesVerified || 0) + 1;
      if (_user.issuesVerified >= 10 && !_user.badges.includes('watchdog')) toUnlock.push('watchdog');
      if (_user.id) await DB.incrementUserStat(_user.id, 'issuesVerified');
    }

    if (action === 'issueResolved') {
      _user.issuesResolved = (_user.issuesResolved || 0) + 1;
      if (_user.issuesResolved >= 5 && !_user.badges.includes('fixer')) toUnlock.push('fixer');
      if (_user.id) await DB.incrementUserStat(_user.id, 'issuesResolved');
    }

    if (_user.level >= 20 && !_user.badges.includes('champion')) toUnlock.push('champion');

    for (const badgeId of toUnlock) {
      _user.badges.push(badgeId);
      if (_user.id) await DB.addBadge(_user.id, badgeId);
      showBadgeUnlock(badgeId);
    }

    if (toUnlock.length) renderBadges();
  }

  // ─── XP helpers ───
  function xpToNextLevel() {
    const next = LEVEL_THRESHOLDS[Math.min(_user.level + 1, LEVEL_THRESHOLDS.length - 1)];
    return Math.max(0, next - _user.xp);
  }

  function xpProgress() {
    const curr = LEVEL_THRESHOLDS[_user.level]      || 0;
    const next = LEVEL_THRESHOLDS[Math.min(_user.level + 1, LEVEL_THRESHOLDS.length - 1)];
    return Math.min(100, (((_user.xp - curr) / (next - curr)) * 100)).toFixed(1);
  }

  // ─── Render Leaderboard (live from Firestore) ───
  function renderLeaderboard(users) {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    // Accept pre-fetched users array or fall back
    const list = Array.isArray(users) ? users : (window.AppData?.USERS_DATA || []);
    const sorted = [...list].sort((a, b) => (b.xp || b.points || 0) - (a.xp || a.points || 0));

    container.innerHTML = sorted.map((user, i) => {
      const rank      = i + 1;
      const rankCls   = rank <= 3 ? `rank-${rank}` : '';
      const rankIcon  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      const isYou     = user.id === _user.id || user.isCurrentUser;
      const pts       = user.xp || user.points || 0;
      const initials  = (user.name || 'U').slice(0, 2).toUpperCase();

      return `
        <div class="leaderboard-item ${isYou ? 'glow-border' : ''}"
             style="${isYou ? 'border-color:var(--clr-primary);background:rgba(108,99,255,0.07);' : ''}">
          <div class="leaderboard-rank ${rankCls}">${rankIcon}</div>
          <div class="avatar" style="background:${getAvatarColor(initials)}">
            ${isYou ? '⭐' : initials}
          </div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">
              ${user.name || 'Anonymous'} 
              ${isYou ? '<span style="color:var(--clr-accent);font-size:0.72rem">← You</span>' : ''}
            </div>
            <div class="leaderboard-sub">
              Level ${user.level || 1} · ${user.issuesReported || user.issues || 0} reports
            </div>
          </div>
          <div class="leaderboard-pts">${pts.toLocaleString()} pts</div>
        </div>
      `;
    }).join('');
  }

  // ─── Render Badges ───
  function renderBadges() {
    const container = document.getElementById('badges-grid');
    if (!container) return;
    const BADGES = window.AppData?.BADGES_DATA || [];
    const userBadges = _user.badges || [];

    container.innerHTML = BADGES.map(badge => {
      const unlocked = userBadges.includes(badge.id);
      return `
        <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}" title="${badge.desc}">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-desc">${badge.desc}</div>
          ${unlocked
            ? '<span class="badge badge-resolved" style="margin-top:4px">Unlocked ✓</span>'
            : '<span class="badge badge-closed" style="margin-top:4px">Locked 🔒</span>'}
        </div>
      `;
    }).join('');
  }

  // ─── Render Challenges ───
  function renderChallenges() {
    const container = document.getElementById('challenges-list');
    if (!container) return;
    const CHALLENGES = window.AppData?.WEEKLY_CHALLENGES || [];

    // Use real user stats for progress where applicable
    const updatedChallenges = CHALLENGES.map(ch => ({
      ...ch,
      progress: ch.id === 'report' ? Math.min(_user.issuesReported, ch.total)
               : ch.id === 'verify' ? Math.min(_user.issuesVerified, ch.total)
               : ch.progress,
    }));

    container.innerHTML = updatedChallenges.map(ch => {
      const pct = Math.round((ch.progress / ch.total) * 100);
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="flex items-center justify-between" style="margin-bottom:12px">
            <div class="flex items-center gap-3">
              <span style="font-size:1.5rem">${ch.icon}</span>
              <div>
                <div style="font-weight:700;font-size:0.95rem">${ch.title}</div>
                <div style="font-size:0.8rem;color:var(--txt-muted)">${ch.desc}</div>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:0.85rem;font-weight:700;color:var(--clr-primary-light)">${ch.progress}/${ch.total}</div>
              <div style="font-size:0.75rem;color:var(--clr-amber)">+${ch.xp} XP</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── Render Profile Card ───
  function renderProfileCard() {
    const container = document.getElementById('profile-card');
    if (!container) return;
    const pct = xpProgress();
    const nextThresh = LEVEL_THRESHOLDS[Math.min(_user.level + 1, LEVEL_THRESHOLDS.length - 1)];

    container.innerHTML = `
      <div class="card glass" style="background:linear-gradient(135deg,rgba(108,99,255,0.12),rgba(0,212,170,0.08));border-color:rgba(108,99,255,0.25);text-align:center;padding:32px;">
        <div class="pulse-ring" style="display:inline-flex;margin-bottom:16px;">
          <div class="avatar avatar-xl" style="background:linear-gradient(135deg,var(--clr-primary),var(--clr-accent));font-size:2.5rem;box-shadow:var(--shadow-primary);">⭐</div>
        </div>
        <h3 style="margin-bottom:4px">${_user.name}</h3>
        <p style="font-size:0.85rem;margin-bottom:16px">Level ${_user.level} Community Hero</p>
        ${window.FIREBASE_CONFIGURED
          ? `<div style="font-size:0.72rem;color:var(--clr-accent);margin-bottom:16px;padding:4px 12px;background:rgba(0,212,170,0.1);border-radius:20px;display:inline-block">🔥 Real-time Sync Active</div>`
          : `<div style="font-size:0.72rem;color:var(--clr-amber);margin-bottom:16px;padding:4px 12px;background:rgba(255,212,59,0.1);border-radius:20px;display:inline-block">⚠️ Demo Mode — Configure Firebase to save data</div>`
        }
        <div style="display:flex;justify-content:center;gap:24px;margin-bottom:20px;">
          <div><div style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;color:var(--clr-primary-light)">${_user.issuesReported || 0}</div><div style="font-size:0.75rem;color:var(--txt-muted)">Reports</div></div>
          <div><div style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;color:var(--clr-accent)">${_user.issuesVerified || 0}</div><div style="font-size:0.75rem;color:var(--txt-muted)">Verified</div></div>
          <div><div style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;color:var(--clr-success)">${_user.issuesResolved || 0}</div><div style="font-size:0.75rem;color:var(--txt-muted)">Resolved</div></div>
        </div>
        <div style="margin-bottom:8px;display:flex;justify-content:space-between;font-size:0.8rem;">
          <span style="color:var(--txt-muted)">XP Progress</span>
          <span style="color:var(--clr-primary-light);font-weight:600">${_user.xp.toLocaleString()} / ${nextThresh.toLocaleString()} XP</span>
        </div>
        <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div>
        <p style="font-size:0.75rem;color:var(--txt-muted);margin-top:8px">${xpToNextLevel().toLocaleString()} XP to Level ${_user.level + 1}</p>
      </div>
    `;
  }

  // ─── Update nav XP display ───
  function updateCurrentUserDisplay() {
    const navXp  = document.getElementById('nav-xp');
    const navLvl = document.getElementById('nav-level');
    if (navXp)  navXp.textContent  = _user.xp.toLocaleString();
    if (navLvl) navLvl.textContent = `Lvl ${_user.level}`;
  }

  // ─── Level up notification ───
  function showLevelUpNotif(level) {
    showGlobalToast(`🎉 Level Up! You're now Level ${level}!`, 'success', 4000);
    triggerConfetti();
  }

  // ─── Badge unlock toast ───
  function showBadgeUnlock(badgeId) {
    const BADGES = window.AppData?.BADGES_DATA || [];
    const badge  = BADGES.find(b => b.id === badgeId);
    if (!badge) return;
    showGlobalToast(`${badge.icon} Badge Unlocked: <strong>${badge.name}</strong>`, 'info', 5000);
  }

  // ─── Confetti ───
  function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors  = ['#6c63ff','#00d4aa','#ffd43b','#ff6b6b','#51cf66','#ff922b'];
    const particles = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 8 + 3,
      d: Math.random() * 2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltSpeed: Math.random() * 0.1 + 0.05,
    }));
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
        p.tiltAngle += p.tiltSpeed;
        p.y  += Math.cos(frame / 20) + p.d;
        p.x  += Math.sin(frame / 30) * 2;
        p.tilt = Math.sin(p.tiltAngle) * 12;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      });
      frame++;
      if (frame < 220) requestAnimationFrame(draw);
      else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display = 'none'; }
    }
    draw();
  }

  // ─── Avatar colour helper ───
  function getAvatarColor(initials) {
    const palette = [
      'linear-gradient(135deg,#6c63ff,#4f46e5)',
      'linear-gradient(135deg,#00d4aa,#00a882)',
      'linear-gradient(135deg,#ff6b6b,#e03131)',
      'linear-gradient(135deg,#ffd43b,#f59f00)',
      'linear-gradient(135deg,#cc5de8,#9c36b5)',
      'linear-gradient(135deg,#ff922b,#e67700)',
    ];
    return palette[(initials.charCodeAt(0) || 0) % palette.length];
  }

  // ─── Expose ───
  return {
    setUser, getUser, awardXP,
    renderLeaderboard, renderBadges, renderChallenges, renderProfileCard,
    updateCurrentUserDisplay, triggerConfetti, getAvatarColor,
    get state() { return _user; },
  };
})();

window.Gamification = Gamification;
