// ============================================================
// COMMUNITY HERO — MAIN APP CONTROLLER (Firebase-backed)
// js/app.js
// ============================================================

// ─── Relative time utility ───
function getRelativeTime(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  if (isNaN(date)) return 'Unknown';
  const diffDays = Math.floor((Date.now() - date) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return `${diffDays} days ago`;
  if (diffDays < 30)  return `${Math.floor(diffDays/7)} weeks ago`;
  return `${Math.floor(diffDays/30)} months ago`;
}

const AppModule = (() => {

  const { CATEGORIES, STATUSES, PRIORITIES } = window.AppData;

  // ─── App State ───
  let state = {
    activeSection:      'home',
    currentUid:         null,
    issues:             [],           // live mirror from Firestore onSnapshot
    myVotes:            new Set(),    // `issueId_type` strings
    filters:            { category:'all', status:'all', priority:'all', search:'' },
    wizardStep:         1,
    wizardData:         {},
    aiResult:           null,
    mapInitialized:     false,
    dashboardInit:      false,
    activeDetailUnsub:  null,
    activeCommentsUnsub:null,
  };

  // ─── Global Toast ───
  window.showGlobalToast = function(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el  = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success:'✅', warn:'⚠️', info:'💡', error:'❌' };
    el.innerHTML = `<span style="font-size:1.1rem">${icons[type]||'💬'}</span><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 300);
    }, duration);
  };

  // ═══════════════════════════════════════════
  // AUTH BOOTSTRAP
  // ═══════════════════════════════════════════

  async function bootstrapAuth() {
    if (!window.auth) {
      // Demo mode — use a fake uid
      state.currentUid = 'demo_user';
      Gamification.setUser({ id: 'demo_user', ...window.AppData.CURRENT_USER });
      _initAfterAuth();
      return;
    }

    // Firebase Anonymous Auth
    const authResult = await window.auth.signInAnonymously().catch(err => {
      console.error('Auth error:', err);
      return null;
    });

    window.auth.onAuthStateChanged(async firebaseUser => {
      if (!firebaseUser) return;
      state.currentUid = firebaseUser.uid;

      // Load / create user profile
      const profile = await DB.getOrCreateUser(firebaseUser.uid);
      Gamification.setUser(profile);

      // Load user's votes
      const votes = await DB.getUserVotes(firebaseUser.uid);
      state.myVotes = votes;

      // Subscribe to live user profile updates
      RT.subscribeToUser(firebaseUser.uid, updatedProfile => {
        Gamification.setUser(updatedProfile);
      });

      _initAfterAuth();
    });
  }

  function _initAfterAuth() {
    // Subscribe to live issues
    RT.subscribeToIssues(issues => {
      state.issues = issues;
      if (state.activeSection === 'feed')  renderIssueGrid();
      if (state.activeSection === 'home')  renderHomePreview();
    });

    // Subscribe to live activity
    RT.subscribeToActivity(feed => {
      if (state.activeSection === 'community') renderActivityFeed(feed);
      window._latestFeed = feed;
    });

    // Subscribe to real-time leaderboard
    RT.subscribeToLeaderboard(users => {
      window._latestLeaderboard = users;
      if (state.activeSection === 'gamification') {
        Gamification.renderLeaderboard(users);
      }
    });

    renderIssueGrid();
    renderHomePreview();
    initHero();
    setupFeedFilters();
    setupMapFilters();
    initNavbarScroll();

    if (window.FIREBASE_CONFIGURED) {
      showGlobalToast('🔥 Connected to live database!', 'success', 3000);
    } else {
      showGlobalToast('⚠️ Demo mode — configure Firebase to save real data', 'warn', 5000);
    }
  }

  // ═══════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════

  function navigate(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-nav="${section}"]`)?.classList.add('active');

    state.activeSection = section;

    if (section === 'map' && !state.mapInitialized) {
      setTimeout(() => { MapModule.init(); state.mapInitialized = true; }, 100);
    }
    if (section === 'map' && state.mapInitialized) {
      MapModule.addIssueMarkers(state.issues);
    }
    if (section === 'dashboard') {
      if (state.dashboardInit) Dashboard.destroy();
      Dashboard.init();
      state.dashboardInit = true;
    }
    if (section === 'gamification') {
      Gamification.renderLeaderboard(window._latestLeaderboard);
      Gamification.renderBadges();
      Gamification.renderChallenges();
      Gamification.renderProfileCard();
    }
    if (section === 'community') {
      renderActivityFeed(window._latestFeed);
    }
    if (section === 'feed') {
      renderIssueGrid();
    }

    window.scrollTo({ top:0, behavior:'smooth' });
  }

  // ═══════════════════════════════════════════
  // ISSUE FEED
  // ═══════════════════════════════════════════

  function renderIssueGrid() {
    const container = document.getElementById('issues-grid');
    if (!container) return;

    const filtered = applyFilters();

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <h3>${state.issues.length === 0 ? 'No issues yet!' : 'No issues match your filters'}</h3>
          <p>${state.issues.length === 0
            ? 'Be the first to report an issue in your community.'
            : 'Try adjusting your filters or search term.'}</p>
          <button class="btn btn-primary" style="margin-top:16px" onclick="AppModule.openReportWizard()" id="empty-report-btn">
            + Report Issue
          </button>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(issue => _buildIssueCard(issue)).join('');
    container.querySelectorAll('.issue-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 60);
    });
  }

  function renderHomePreview() {
    const container = document.getElementById('home-issues-preview');
    if (!container) return;
    const top3 = [...state.issues].slice(0, 3);
    if (!top3.length) {
      const fallback = window.AppData?.ISSUES_DATA?.slice(0,3) || [];
      container.innerHTML = fallback.map(i => _buildIssueCard(i, true)).join('');
      return;
    }
    container.innerHTML = top3.map(i => _buildIssueCard(i, true)).join('');
  }

  function _buildIssueCard(issue, simple = false) {
    const cat   = CATEGORIES[issue.category] || CATEGORIES.other;
    const sts   = STATUSES[issue.status]     || STATUSES.reported;
    const pri   = PRIORITIES[issue.priority] || PRIORITIES.medium;
    const age   = getRelativeTime(issue.reportedAt || issue._ts?.toISOString?.() || '');
    const voted = state.myVotes.has(`${issue.id}_upvote`);
    const verifed = state.myVotes.has(`${issue.id}_verify`);

    // Use first real media URL if available, otherwise emoji placeholder
    const hasImage = issue.mediaUrls?.length > 0;

    return `
      <div class="issue-card" onclick="AppModule.showIssueDetail('${issue.id}')">
        <div class="issue-card-img-placeholder" style="background:linear-gradient(135deg,${cat.color}18,${cat.color}08);height:180px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
          ${hasImage
            ? `<img src="${issue.mediaUrls[0]}" alt="Issue" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" loading="lazy" onerror="this.style.display='none'">`
            : `<span style="font-size:3.5rem;filter:drop-shadow(0 4px 12px ${cat.color}88)">${issue.emoji || cat.icon}</span>`}
          <div style="position:absolute;top:10px;left:10px">
            <span class="badge ${cat.badge}">${cat.icon} ${cat.label}</span>
          </div>
          <div style="position:absolute;top:10px;right:10px">
            <span class="badge ${pri.badge}">${pri.label}</span>
          </div>
          <div style="position:absolute;bottom:10px;right:10px">
            <span class="badge ${sts.badge}">${sts.label}</span>
          </div>
          ${hasImage ? `<div style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.6);border-radius:20px;padding:2px 8px;font-size:0.72rem;color:#fff">📸 ${issue.mediaUrls.length} photo${issue.mediaUrls.length>1?'s':''}</div>` : ''}
        </div>
        <div class="issue-card-body">
          <div class="issue-card-title">${issue.title}</div>
          <div class="issue-card-desc">${issue.description}</div>
          <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--txt-muted);margin-bottom:12px">
            <span>📍</span><span>${(issue.location?.address||'Unknown location').substring(0,40)}${(issue.location?.address||'').length>40?'…':''}</span>
          </div>
          <div class="issue-card-footer">
            <div style="font-size:0.75rem;color:var(--txt-muted)">🕐 ${age}</div>
            ${!simple ? `
              <div class="issue-card-actions">
                <button class="vote-btn ${voted?'voted':''}" onclick="event.stopPropagation();AppModule.toggleUpvote('${issue.id}',this)">
                  👍 <span>${issue.upvotes || 0}</span>
                </button>
                <button class="vote-btn verified ${verifed?'voted':''}" onclick="event.stopPropagation();AppModule.toggleVerify('${issue.id}',this)">
                  ✅ <span>${issue.verifications || 0}</span>
                </button>
              </div>` : ''}
          </div>
        </div>
      </div>`;
  }

  // ─── Filters ───
  function applyFilters() {
    let filtered = [...state.issues];
    const f = state.filters;
    if (f.category !== 'all') filtered = filtered.filter(i => i.category === f.category);
    if (f.status   !== 'all') filtered = filtered.filter(i => i.status   === f.status);
    if (f.priority !== 'all') filtered = filtered.filter(i => i.priority === f.priority);
    if (f.search) {
      const q = f.search.toLowerCase();
      filtered = filtered.filter(i =>
        (i.title||'').toLowerCase().includes(q) ||
        (i.description||'').toLowerCase().includes(q) ||
        (i.location?.address||'').toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  function setupFeedFilters() {
    ['filter-cat','filter-status','filter-priority'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', function() {
        const key = { 'filter-cat':'category', 'filter-status':'status', 'filter-priority':'priority' }[id];
        state.filters[key] = this.value;
        renderIssueGrid();
      });
    });
    document.getElementById('feed-search')?.addEventListener('input', function() {
      state.filters.search = this.value;
      renderIssueGrid();
    });
  }

  // ═══════════════════════════════════════════
  // UPVOTE / VERIFY (Firestore-backed)
  // ═══════════════════════════════════════════

  async function toggleUpvote(issueId, btn) {
    if (!state.currentUid) return;
    btn.disabled = true;
    const { voted, newCount } = await DB.toggleVote(state.currentUid, issueId, 'upvote');
    const key = `${issueId}_upvote`;
    if (voted) { state.myVotes.add(key);    Gamification.awardXP('upvoteGiven'); showGlobalToast('👍 Upvoted! +5 XP','success',2000); }
    else        { state.myVotes.delete(key); }
    btn.querySelector('span').textContent = newCount;
    btn.classList.toggle('voted', voted);
    btn.disabled = false;
  }

  async function toggleVerify(issueId, btn) {
    if (!state.currentUid) return;
    btn.disabled = true;
    const { voted, newCount } = await DB.toggleVote(state.currentUid, issueId, 'verify');
    const key = `${issueId}_verify`;
    if (voted) { state.myVotes.add(key);    Gamification.awardXP('verifyIssue'); showGlobalToast('✅ Verified! +25 XP','success',2500); }
    else        { state.myVotes.delete(key); }
    btn.querySelector('span').textContent = newCount;
    btn.classList.toggle('voted', voted);
    btn.disabled = false;
  }

  // ═══════════════════════════════════════════
  // ISSUE DETAIL MODAL
  // ═══════════════════════════════════════════

  function showIssueDetail(issueId) {
    // Cancel previous listeners
    state.activeDetailUnsub?.();
    state.activeCommentsUnsub?.();

    // Find locally first for instant render
    const localIssue = state.issues.find(i => i.id === issueId)
      || window.AppData?.ISSUES_DATA?.find(i => i.id === issueId);

    if (localIssue) _renderDetailModal(localIssue);

    const modal = document.getElementById('issue-detail-modal');
    modal?.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Subscribe to live issue updates
    if (window.db) {
      state.activeDetailUnsub = RT.subscribeToIssue(issueId, updated => {
        _renderDetailModal(updated);
      });

      // Subscribe to live comments
      state.activeCommentsUnsub = RT.subscribeToComments(issueId, comments => {
        _renderComments(issueId, comments);
      });
    }
  }

  function _renderDetailModal(issue) {
    const body = document.getElementById('issue-detail-body');
    if (!body) return;
    const cat  = CATEGORIES[issue.category] || CATEGORIES.other;
    const sts  = STATUSES[issue.status]     || STATUSES.reported;
    const pri  = PRIORITIES[issue.priority] || PRIORITIES.medium;

    const voted   = state.myVotes.has(`${issue.id}_upvote`);
    const verified = state.myVotes.has(`${issue.id}_verify`);

    // Media gallery
    const mediaHtml = issue.mediaUrls?.length
      ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
          ${issue.mediaUrls.map(url => `
            <img src="${url}" alt="Issue media"
              style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin-bottom:4px"
              loading="lazy"
              onclick="window.open('${url}','_blank')">`
          ).join('')}
         </div>`
      : `<div class="issue-detail-img" style="background:linear-gradient(135deg,${cat.color}20,${cat.color}08);display:flex;align-items:center;justify-content:center;height:240px;border-radius:12px;margin-bottom:20px;font-size:6rem">
           ${issue.emoji || cat.icon}
         </div>`;

    body.innerHTML = `
      ${mediaHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="badge ${cat.badge}">${cat.icon} ${cat.label}</span>
        <span class="badge ${sts.badge}">${sts.label}</span>
        <span class="badge ${pri.badge}">${pri.label} Priority</span>
        <span class="badge badge-closed">ID: ${issue.id?.slice(0,8)||'—'}</span>
      </div>
      <h2 style="margin-bottom:8px;font-size:1.3rem">${issue.title}</h2>
      <p style="margin-bottom:16px;font-size:0.9rem">${issue.description}</p>

      <div style="display:flex;align-items:center;gap:8px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);border-radius:10px;margin-bottom:20px">
        <span style="font-size:1.2rem">📍</span>
        <div>
          <div style="font-size:0.85rem;font-weight:600">${issue.location?.address||'Location not set'}</div>
          <div style="font-size:0.75rem;color:var(--txt-muted)">
            ${issue.location?.lat ? `Lat: ${issue.location.lat.toFixed(4)}, Lng: ${issue.location.lng.toFixed(4)}` : ''}
          </div>
        </div>
        <button onclick="AppModule.flyToIssueOnMap('${issue.id}')" class="btn btn-outline btn-sm" style="margin-left:auto">🗺️ Map</button>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <button class="btn btn-outline ${voted?'glow-border':''}" id="detail-upvote-btn"
          onclick="AppModule.toggleUpvote('${issue.id}',this)">
          👍 ${issue.upvotes||0} Upvotes
        </button>
        <button class="btn btn-outline ${verified?'glow-border-accent':''}" id="detail-verify-btn"
          onclick="AppModule.toggleVerify('${issue.id}',this)">
          ✅ ${issue.verifications||0} Verified
        </button>
        <button class="btn btn-ghost" onclick="AppModule.shareIssue('${issue.id}')">🔗 Share</button>
      </div>

      <!-- Reporter -->
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:20px">
        <div class="avatar" style="background:${Gamification.getAvatarColor((issue.reporterName||'U').slice(0,2).toUpperCase())}">
          ${(issue.reporterName||'?').slice(0,2).toUpperCase()}
        </div>
        <div>
          <div style="font-size:0.85rem;font-weight:600">Reported by ${issue.reporterName||'Anonymous'}</div>
          <div style="font-size:0.75rem;color:var(--txt-muted)">${getRelativeTime(issue.reportedAt || issue._ts?.toISOString?.() || '')}</div>
        </div>
      </div>

      <!-- Timeline -->
      <h4 style="margin-bottom:16px">📋 Issue Timeline</h4>
      <div class="timeline" style="margin-bottom:24px">
        ${(issue.timeline||[]).map(t => `
          <div class="timeline-item">
            <div class="timeline-dot ${t.done?'done':t.active?'active':''}">
              ${t.done ? '✓' : t.active ? '⚙' : '○'}
            </div>
            <div class="timeline-content">
              <div class="timeline-title">${t.status}</div>
              <div class="timeline-time">${t.time}</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Comments — live-updated via Firestore -->
      <h4 style="margin-bottom:12px">💬 Community Comments</h4>
      <div id="comments-container-${issue.id}" style="margin-bottom:16px">
        <div style="color:var(--txt-muted);font-size:0.85rem">Loading comments…</div>
      </div>
      <!-- Add comment -->
      <div style="display:flex;gap:8px;align-items:center">
        <div class="avatar" style="width:32px;height:32px;font-size:0.9rem;flex-shrink:0">⭐</div>
        <input class="form-input" id="comment-input-${issue.id}" placeholder="Add a community comment…" style="border-radius:20px;flex:1">
        <button class="btn btn-primary btn-sm" id="comment-submit-btn" onclick="AppModule.addComment('${issue.id}')">Send</button>
      </div>`;
  }

  function _renderComments(issueId, comments) {
    const container = document.getElementById(`comments-container-${issueId}`);
    if (!container) return;
    if (!comments.length) {
      container.innerHTML = '<div style="color:var(--txt-muted);font-size:0.85rem;padding:8px 0">No comments yet. Be the first!</div>';
      return;
    }
    container.innerHTML = comments.map(c => `
      <div class="comment">
        <div class="avatar" style="width:32px;height:32px;font-size:0.75rem;background:${Gamification.getAvatarColor((c.authorName||'U').slice(0,2))}">
          ${(c.authorName||'?').slice(0,2).toUpperCase()}
        </div>
        <div class="comment-content">
          <div class="comment-author">${c.authorName||'Anonymous'}</div>
          <div class="comment-text">${c.text}</div>
          <div class="comment-time">${c.time||'Just now'}</div>
        </div>
      </div>`).join('');
  }

  function closeIssueDetail() {
    document.getElementById('issue-detail-modal')?.classList.remove('open');
    document.body.style.overflow = '';
    state.activeDetailUnsub?.();
    state.activeCommentsUnsub?.();
  }

  function flyToIssueOnMap(issueId) {
    const issue = state.issues.find(i => i.id === issueId) || window.AppData?.ISSUES_DATA?.find(i => i.id === issueId);
    closeIssueDetail();
    navigate('map');
    if (issue) setTimeout(() => MapModule.flyToIssue(issue), 500);
  }

  async function addComment(issueId) {
    const input = document.getElementById(`comment-input-${issueId}`);
    if (!input || !input.value.trim()) return;
    const btn = document.getElementById('comment-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    const user = Gamification.getUser();
    await DB.addComment(issueId, {
      text:         input.value.trim(),
      authorName:   user.name || 'Community Hero',
      authorUid:    state.currentUid,
      authorAvatar: (user.name||'U').slice(0,2).toUpperCase(),
    });

    Gamification.awardXP('commentIssue');
    showGlobalToast('💬 Comment added! +10 XP', 'success');
    input.value = '';
    if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
  }

  function shareIssue(issueId) {
    const url = `${window.location.href.split('#')[0]}#${issueId}`;
    if (navigator.share) {
      const issue = state.issues.find(i => i.id === issueId);
      navigator.share({ title: issue?.title, url });
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      showGlobalToast('🔗 Link copied!', 'success');
    }
  }

  // ═══════════════════════════════════════════
  // REPORT WIZARD
  // ═══════════════════════════════════════════

  function openReportWizard() {
    _resetWizard();
    document.getElementById('wizard-modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    CameraModule.clearFiles();
    setTimeout(() => {
      CameraModule.setupUploadZone('upload-zone', 'upload-previews', _onFilesReady);
    }, 150);
  }

  function closeReportWizard() {
    document.getElementById('wizard-modal')?.classList.remove('open');
    document.body.style.overflow = '';
    CameraModule.stopCamera();
    _resetWizard();
  }

  function _resetWizard() {
    state.wizardStep = 1;
    state.wizardData = {};
    state.aiResult   = null;
    _updateWizardUI();
    const box = document.getElementById('ai-result-box');
    if (box) box.innerHTML = '';
    const prev = document.getElementById('upload-previews');
    if (prev) prev.innerHTML = '';
  }

  function _updateWizardUI() {
    document.querySelectorAll('.wizard-step-item').forEach((item, i) => {
      item.classList.remove('active','done');
      if (i + 1 < state.wizardStep) item.classList.add('done');
      if (i + 1 === state.wizardStep) item.classList.add('active');
    });
    document.querySelectorAll('.wizard-pane').forEach((pane, i) => {
      pane.classList.toggle('active', i + 1 === state.wizardStep);
    });
    const prev = document.getElementById('wizard-prev');
    const next = document.getElementById('wizard-next');
    if (prev) prev.style.display = state.wizardStep > 1 ? 'flex' : 'none';
    if (next) next.textContent   = state.wizardStep === 3 ? '🚀 Submit Report' : 'Next →';
  }

  async function wizardNext() {
    if (state.wizardStep === 1 && !_validateStep1()) return;
    if (state.wizardStep === 2 && !_validateStep2()) return;
    if (state.wizardStep === 3) { await submitReport(); return; }
    state.wizardStep++;
    _updateWizardUI();
    if (state.wizardStep === 2) setTimeout(_initWizardMap, 200);
    if (state.wizardStep === 3) _populateReview();
  }

  function wizardPrev() {
    if (state.wizardStep > 1) { state.wizardStep--; _updateWizardUI(); }
  }

  function _validateStep1() {
    const title = document.getElementById('report-title')?.value.trim();
    if (!title || title.length < 10) {
      showGlobalToast('⚠️ Please enter a descriptive title (min 10 chars)', 'warn');
      document.getElementById('report-title')?.classList.add('shake');
      setTimeout(() => document.getElementById('report-title')?.classList.remove('shake'), 600);
      return false;
    }
    const desc = document.getElementById('report-desc')?.value || '';
    _runAIAnalysis(title + ' ' + desc);
    return true;
  }

  function _validateStep2() {
    const addr = document.getElementById('report-address')?.value.trim();
    if (!addr) { showGlobalToast('⚠️ Please enter or pin a location', 'warn'); return false; }
    state.wizardData.address = addr;
    state.wizardData.lat = parseFloat(document.getElementById('report-lat')?.value) || 0;
    state.wizardData.lng = parseFloat(document.getElementById('report-lng')?.value) || 0;
    return true;
  }

  function _populateReview() {
    const title = document.getElementById('report-title')?.value || '—';
    const cat   = document.getElementById('report-category')?.value || 'other';
    const pri   = document.getElementById('report-priority')?.value || 'medium';
    const addr  = document.getElementById('report-address')?.value  || 'Not set';
    const files = CameraModule.getFiles();

    document.getElementById('review-title').textContent = title;
    const rCat = document.getElementById('review-cat');
    if (rCat) rCat.innerHTML = CATEGORIES[cat]
      ? `<span class="badge ${CATEGORIES[cat].badge}">${CATEGORIES[cat].icon} ${CATEGORIES[cat].label}</span>` : cat;
    const rPri = document.getElementById('review-pri');
    if (rPri) rPri.innerHTML = PRIORITIES[pri]
      ? `<span class="badge ${PRIORITIES[pri].badge}">${PRIORITIES[pri].label}</span>` : pri;
    document.getElementById('review-loc').textContent = addr;

    // Show XP preview
    const xpEl = document.getElementById('review-xp');
    if (xpEl) {
      const total = 100 + (files.length > 0 ? 30 : 0) + 20;
      xpEl.textContent = `+${total} XP`;
    }
  }

  // ─── AI Analysis ───
  async function _runAIAnalysis(text) {
    const box = document.getElementById('ai-result-box');
    if (!box) return;
    box.innerHTML = `
      <div class="ai-result">
        <div class="ai-label">🤖 AI analyzing your report…</div>
        <div style="display:flex;gap:8px;align-items:center;color:var(--txt-muted);font-size:0.85rem">
          <div class="spinner"></div> Processing…
        </div>
      </div>`;

    const files  = CameraModule.getFiles();
    const result = await AIEngine.analyzeReport({ text, file: files[0] });
    state.aiResult = result;
    if (!result) return;

    const cat = CATEGORIES[result.category];
    document.getElementById('report-category')?.setAttribute('value', result.category);
    const catEl = document.getElementById('report-category');
    if (catEl) catEl.value = result.category;
    const priEl = document.getElementById('report-priority');
    if (priEl) priEl.value = result.autoSuggestedPriority;

    box.innerHTML = `
      <div class="ai-result">
        <div class="ai-label">🤖 AI Analysis Complete</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:1.8rem">${cat.icon}</span>
          <div>
            <div style="font-weight:700;color:var(--txt-primary)">${cat.label}</div>
            <div style="font-size:0.78rem;color:var(--txt-muted)">Source: ${result.source} analysis</div>
          </div>
          <span class="badge badge-verified" style="margin-left:auto">${result.confidencePct}% confident</span>
        </div>
        <div class="ai-confidence">
          <span style="font-size:0.75rem;color:var(--txt-muted);white-space:nowrap">Confidence</span>
          <div class="ai-confidence-bar"><div class="ai-confidence-fill" style="width:${result.confidencePct}%"></div></div>
          <span style="font-size:0.75rem;font-weight:600;color:var(--clr-accent)">${result.confidencePct}%</span>
        </div>
        ${result.tags?.length ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${result.tags.map(t=>`<span class="badge badge-closed">${t}</span>`).join('')}</div>` : ''}
      </div>`;

    showGlobalToast(`🤖 AI detected: ${cat.label} (${result.confidencePct}% confidence)`, 'info', 3000);
  }

  function _onFilesReady(files) {
    const title = document.getElementById('report-title')?.value || '';
    const desc  = document.getElementById('report-desc')?.value  || '';
    _runAIAnalysis(title + ' ' + desc);
  }

  // ─── Wizard mini-map ───
  let _wizardMap = null;
  function _initWizardMap() {
    const el = document.getElementById('wizard-map');
    if (!el) return;
    _wizardMap?.remove(); _wizardMap = null;
    _wizardMap = L.map('wizard-map', { center:[28.6139,77.2090], zoom:12, zoomControl:true, attributionControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(_wizardMap);
    let pin = null;
    _wizardMap.on('click', e => {
      if (pin) _wizardMap.removeLayer(pin);
      pin = L.marker(e.latlng).addTo(_wizardMap);
      document.getElementById('report-lat').value = e.latlng.lat.toFixed(5);
      document.getElementById('report-lng').value = e.latlng.lng.toFixed(5);
      if (!document.getElementById('report-address').value) {
        document.getElementById('report-address').value = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
      }
    });
  }

  async function detectLocation() {
    const btn = document.getElementById('detect-location-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Detecting…'; }
    try {
      const pos = await MapModule.getUserLocation();
      document.getElementById('report-lat').value = pos.lat.toFixed(5);
      document.getElementById('report-lng').value = pos.lng.toFixed(5);
      if (!document.getElementById('report-address').value) {
        document.getElementById('report-address').value = `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)} (Your location)`;
      }
      _wizardMap?.setView([pos.lat, pos.lng], 15);
      showGlobalToast('📍 Location detected!', 'success');
    } catch {
      showGlobalToast('⚠️ Could not detect location. Please enter manually.', 'warn');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '📍 Detect My Location'; }
    }
  }

  // ─── Submit Report (Firestore + Storage) ───
  async function submitReport() {
    const title    = document.getElementById('report-title')?.value.trim();
    const desc     = document.getElementById('report-desc')?.value.trim();
    const category = document.getElementById('report-category')?.value || 'other';
    const priority = document.getElementById('report-priority')?.value || 'medium';
    const address  = document.getElementById('report-address')?.value.trim();

    if (!title || !desc || !address) {
      showGlobalToast('⚠️ Please fill all required fields', 'warn');
      return;
    }

    const nextBtn = document.getElementById('wizard-next');
    if (nextBtn) { nextBtn.disabled = true; nextBtn.innerHTML = '<div class="spinner"></div> Uploading…'; }

    const user    = Gamification.getUser();
    const tempId  = 'tmp_' + Date.now(); // placeholder until Firestore assigns ID
    const files   = CameraModule.getFiles();

    // 1. Upload media files to Firebase Storage
    let mediaUrls = [];
    if (files.length > 0) {
      const uploadBox = document.getElementById('upload-progress-box');
      if (uploadBox) uploadBox.style.display = 'block';

      try {
        mediaUrls = await Storage.uploadAll(tempId, files, pct => {
          const bar = document.getElementById('upload-progress-fill');
          const txt = document.getElementById('upload-progress-text');
          if (bar) bar.style.width = pct + '%';
          if (txt) txt.textContent = `Uploading media… ${pct}%`;
        });
      } catch (err) {
        console.warn('Upload failed:', err);
        showGlobalToast('⚠️ Media upload failed — report saved without photos', 'warn');
      }
    }

    if (nextBtn) nextBtn.innerHTML = '<div class="spinner"></div> Saving…';

    // 2. Create Firestore issue doc
    const issueData = {
      title, description: desc, category, priority,
      status:    'reported',
      location: {
        lat:     parseFloat(document.getElementById('report-lat')?.value) || 28.6139 + (Math.random()-.5)*.05,
        lng:     parseFloat(document.getElementById('report-lng')?.value) || 77.2090 + (Math.random()-.5)*.05,
        address, area: address.split(',').pop()?.trim() || 'Unknown',
      },
      mediaUrls,
      emoji:        CATEGORIES[category]?.icon || '📌',
      reportedBy:   state.currentUid,
      reporterName: user.name || 'Community Hero',
      reporterLevel:user.level || 1,
      reportedAt:   new Date().toISOString(),
      timeline: [{ status:'Reported', time: new Date().toLocaleString(), done:true }],
    };

    const created = await DB.createIssue(issueData);

    // 3. Award XP
    await Gamification.awardXP('reportIssue');
    if (files.length > 0) await Gamification.awardXP('uploadPhoto');
    await Gamification.awardXP('addLocation');

    closeReportWizard();
    Gamification.triggerConfetti();
    const xpTotal = 100 + (files.length > 0 ? 30 : 0) + 20;
    showGlobalToast(`🎉 Issue reported! +${xpTotal} XP earned!`, 'success', 5000);

    // 4. Update map if open
    if (state.mapInitialized) MapModule.addIssueMarkers(state.issues);

    navigate('feed');
  }

  // ═══════════════════════════════════════════
  // ACTIVITY FEED
  // ═══════════════════════════════════════════

  function renderActivityFeed(feed) {
    const container = document.getElementById('activity-feed');
    if (!container) return;
    const items = feed || window.AppData?.ACTIVITY_FEED || [];
    container.innerHTML = items.map(act => `
      <div class="activity-item">
        <div class="activity-icon" style="background:${act.color}22;color:${act.color};font-size:1rem">${act.icon}</div>
        <div class="activity-info">
          <div class="activity-text">${act.text}</div>
          <div class="activity-time">${act.time}</div>
        </div>
      </div>`).join('');
  }

  // ═══════════════════════════════════════════
  // MAP FILTER BUTTONS
  // ═══════════════════════════════════════════

  function setupMapFilters() {
    document.querySelectorAll('[data-map-filter]').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('[data-map-filter]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const cat = this.getAttribute('data-map-filter');
        const filtered = cat === 'all' ? state.issues : state.issues.filter(i => i.category === cat);
        if (state.mapInitialized) MapModule.addIssueMarkers(filtered);
      });
    });
  }

  // ═══════════════════════════════════════════
  // HERO / MISC
  // ═══════════════════════════════════════════

  function initHero() {
    document.querySelectorAll('.count-up').forEach(el => {
      const target = parseInt(el.getAttribute('data-target') || el.textContent.replace(/[^0-9]/g,''));
      if (isNaN(target)) return;
      let cur = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        cur = Math.min(cur + step, target);
        el.textContent = cur.toLocaleString();
        if (cur >= target) clearInterval(timer);
      }, 16);
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }

  function initNavbarScroll() {
    window.addEventListener('scroll', () => {
      document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  function runLiveAIAnalysis() {
    const title = document.getElementById('report-title')?.value || '';
    const desc  = document.getElementById('report-desc')?.value  || '';
    _runAIAnalysis(title + ' ' + desc);
  }

  // ─── Expose ───
  return {
    navigate, bootstrapAuth,
    openReportWizard, closeReportWizard, wizardNext, wizardPrev,
    detectLocation, openCamera: () => CameraModule.openCamera('camera-container'),
    showIssueDetail, closeIssueDetail, flyToIssueOnMap,
    toggleUpvote, toggleVerify, addComment, shareIssue,
    renderIssueGrid, renderActivityFeed, setupMapFilters, setupFeedFilters,
    initHero, initNavbarScroll,
    runLiveAIAnalysis,
    get currentUid() { return state.currentUid; },
  };
})();

window.AppModule = AppModule;

// ─── Bootstrap ───
document.addEventListener('DOMContentLoaded', () => {
  AppModule.bootstrapAuth();
  AppModule.navigate('home');

  // Real-time AI categorization while typing
  const titleInput = document.getElementById('report-title');
  const descInput  = document.getElementById('report-desc');
  let aiTimeout    = null;

  const triggerLiveAI = () => {
    clearTimeout(aiTimeout);
    aiTimeout = setTimeout(() => {
      const titleLen = (titleInput?.value || '').trim().length;
      if (titleLen >= 3) {
        AppModule.runLiveAIAnalysis();
      }
    }, 400);
  };

  titleInput?.addEventListener('input', triggerLiveAI);
  descInput?.addEventListener('input', triggerLiveAI);

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        m.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  });
});
