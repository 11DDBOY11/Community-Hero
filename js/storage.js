// ============================================================
// COMMUNITY HERO — FIREBASE STORAGE LAYER
// js/storage.js
//
// Handles image + video uploads to Firebase Storage.
// Returns real CDN download URLs stored in Firestore.
// Falls back gracefully to base64 data URLs in demo mode.
// ============================================================

const Storage = (() => {

  /**
   * Upload a single file to Firebase Storage.
   *
   * @param {string}   issueId   — Firestore issue ID (used as folder)
   * @param {File}     file      — Browser File object (image or video)
   * @param {Function} onProgress — called with (percent 0-100)
   * @returns {Promise<string>}  — public download URL
   */
  async function uploadMedia(issueId, file, onProgress) {
    if (!window.storage) {
      // Demo mode: return a local object URL (session-only)
      return URL.createObjectURL(file);
    }

    const ext      = file.name.split('.').pop() || 'bin';
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path     = `issues/${issueId}/${filename}`;
    const ref      = window.storage.ref(path);

    return new Promise((resolve, reject) => {
      const task = ref.put(file, {
        contentType: file.type,
        customMetadata: {
          issueId,
          originalName: file.name,
          uploadedAt:   new Date().toISOString(),
        },
      });

      task.on(
        'state_changed',
        snapshot => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(pct);
        },
        err => {
          console.error('Storage upload error:', err);
          // Fallback: return object URL so UI doesn't break
          resolve(URL.createObjectURL(file));
        },
        async () => {
          const url = await task.snapshot.ref.getDownloadURL();
          resolve(url);
        }
      );
    });
  }

  /**
   * Upload multiple files in parallel with aggregate progress.
   *
   * @param {string}   issueId
   * @param {File[]}   files
   * @param {Function} onProgress  — called with (totalPercent)
   * @returns {Promise<string[]>}  — array of download URLs
   */
  async function uploadAll(issueId, files, onProgress) {
    if (!files || !files.length) return [];

    const progresses = new Array(files.length).fill(0);
    const updateTotal = () => {
      if (onProgress) {
        const avg = progresses.reduce((a, b) => a + b, 0) / files.length;
        onProgress(Math.round(avg));
      }
    };

    const urls = await Promise.all(
      files.map((file, i) =>
        uploadMedia(issueId, file, pct => {
          progresses[i] = pct;
          updateTotal();
        })
      )
    );

    return urls;
  }

  /**
   * Delete all media files for a given issue.
   * (Called when an issue is deleted.)
   */
  async function deleteIssueMedia(issueId) {
    if (!window.storage) return;
    try {
      const folderRef = window.storage.ref(`issues/${issueId}`);
      const list      = await folderRef.listAll();
      await Promise.all(list.items.map(item => item.delete()));
    } catch (err) {
      console.warn('Could not delete media:', err);
    }
  }

  /**
   * Get the storage size estimate for an issue folder.
   */
  async function getIssueMediaMeta(issueId) {
    if (!window.storage) return [];
    const folderRef = window.storage.ref(`issues/${issueId}`);
    const list      = await folderRef.listAll();
    return Promise.all(list.items.map(async item => {
      const meta = await item.getMetadata();
      return { name: meta.name, size: meta.size, type: meta.contentType, url: await item.getDownloadURL() };
    }));
  }

  /**
   * Validate file before upload: type + size.
   * Returns { valid: bool, error: string }
   */
  function validateFile(file, maxMB = 50) {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'];
    if (!allowed.includes(file.type)) {
      return { valid: false, error: `File type "${file.type}" not supported. Use JPG, PNG, MP4, WebM.` };
    }
    if (file.size > maxMB * 1024 * 1024) {
      return { valid: false, error: `File too large (${(file.size/1024/1024).toFixed(1)} MB). Max ${maxMB} MB.` };
    }
    return { valid: true };
  }

  return { uploadMedia, uploadAll, deleteIssueMedia, getIssueMediaMeta, validateFile };
})();

window.Storage = Storage;
