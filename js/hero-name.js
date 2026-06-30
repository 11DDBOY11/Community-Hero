// ============================================================
// COMMUNITY HERO — HERO NAME ONBOARDING
// js/hero-name.js
//
// Shows a one-time username modal on first visit.
// Saves the chosen name to:
//   • localStorage (instant fallback)
//   • Firestore /users/{uid}.name (persistent across devices
//     if the user clears cache but keeps the same browser UID)
//
// Integrates with Gamification.setUser() + DB.getOrCreateUser()
// but does NOT modify those modules.
// ============================================================

const HeroName = (() => {

  const STORAGE_KEY = 'ch_hero_name';
  const NAME_RE     = /^[a-zA-Z0-9_]{3,24}$/;

  // ─── Public: called by bootstrapAuth() after user profile loads ───
  // uid   : Firebase anonymous UID (or 'demo_user')
  // profile: object from DB.getOrCreateUser()
  function maybeShowModal(uid, profile) {
    // Already has a real name saved — nothing to do
    const savedName = localStorage.getItem(STORAGE_KEY);
    if (savedName) {
      _applyName(uid, savedName);
      return;
    }

    // Profile already has a real name in Firestore (not default)
    if (profile?.name && profile.name !== 'Community Hero') {
      localStorage.setItem(STORAGE_KEY, profile.name);
      return; // Gamification.setUser(profile) was already called by bootstrapAuth
    }

    // First visit — show the modal after a short delay so the
    // Firebase "connected" toast appears first
    setTimeout(() => _openModal(uid), 1800);
  }

  // ─── Validate input and toggle the submit button ───
  function validate() {
    const input  = document.getElementById('username-input');
    const hint   = document.getElementById('username-hint');
    const btn    = document.getElementById('username-submit-btn');
    if (!input || !hint || !btn) return;

    const val = input.value.trim();

    if (val.length === 0) {
      hint.textContent  = '3–24 characters, letters, numbers, underscores only.';
      hint.style.color  = 'var(--txt-muted)';
      btn.disabled      = true;
      return;
    }

    if (!NAME_RE.test(val)) {
      hint.textContent  = '⚠️ Only letters, numbers and underscores are allowed.';
      hint.style.color  = 'var(--clr-danger, #ff6b6b)';
      btn.disabled      = true;
      return;
    }

    // Valid
    hint.textContent = `✅ Looking good, ${val}!`;
    hint.style.color = 'var(--clr-accent)';
    btn.disabled     = false;
  }

  // ─── User clicks "Join as Hero" ───
  async function submit() {
    const input = document.getElementById('username-input');
    const val   = input?.value.trim();
    if (!val || !NAME_RE.test(val)) return;

    const btn = document.getElementById('username-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⚡ Saving…'; }

    const uid = window._heroNameUid || 'demo_user';
    await _applyName(uid, val);

    _closeModal();
    window.showGlobalToast?.(`🦸 Welcome, ${val}! You're on the leaderboard now.`, 'success', 4000);
  }

  // ─── User clicks "Skip" ───
  function skip() {
    // Mark as skipped so we don't bother them again this session
    sessionStorage.setItem('ch_name_skipped', '1');
    _closeModal();
  }

  // ─── Private helpers ───

  function _openModal(uid) {
    // Don't show if skipped this session
    if (sessionStorage.getItem('ch_name_skipped')) return;

    window._heroNameUid = uid; // store for submit()
    const modal = document.getElementById('username-modal');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('username-input')?.focus(), 200);
  }

  function _closeModal() {
    const modal = document.getElementById('username-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function _applyName(uid, name) {
    // 1. Persist to localStorage so subsequent page loads skip the modal
    localStorage.setItem(STORAGE_KEY, name);

    // 2. Update Gamification in-memory state immediately
    if (window.Gamification) {
      Gamification.setUser({ name });
    }

    // 3. Persist to Firestore if available (non-blocking)
    if (window.db && uid && uid !== 'demo_user') {
      try {
        await window.db.collection('users').doc(uid).update({ name });
      } catch (e) {
        // Firestore might not have the doc yet (race condition on very first visit)
        // set with merge so it doesn't overwrite XP etc.
        try {
          await window.db.collection('users').doc(uid).set({ name }, { merge: true });
        } catch (_) { /* silent — name is in localStorage anyway */ }
      }
    }
  }

  return { maybeShowModal, validate, submit, skip };
})();

window.HeroName = HeroName;
