// ============================================================
// COMMUNITY HERO — CAMERA & UPLOAD MODULE (Firebase Storage)
// js/camera.js
//
// Handles live camera capture and file drag-drop.
// Files are validated before upload; actual Firebase Storage
// upload is handled by Storage.uploadAll() in app.js.
// ============================================================

const CameraModule = (() => {

  let capturedFiles = [];
  let stream        = null;
  let videoEl       = null;

  // ─── Setup drag-drop upload zone ───
  function setupUploadZone(zoneId, previewId, onFilesSelected) {
    const zone    = document.getElementById(zoneId);
    const preview = document.getElementById(previewId);
    if (!zone) return;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const files = [...e.dataTransfer.files].filter(f =>
        f.type.startsWith('image/') || f.type.startsWith('video/'));
      _handleFiles(files, preview, onFilesSelected);
    });

    const input = zone.querySelector('input[type="file"]');
    if (input) {
      input.addEventListener('change', e => {
        _handleFiles([...e.target.files], preview, onFilesSelected);
        input.value = '';
      });
    }
  }

  // ─── Handle selected files ───
  function _handleFiles(files, preview, callback) {
    if (!files.length) return;

    const valid = [];
    files.forEach(file => {
      const check = Storage.validateFile(file, 50);
      if (!check.valid) {
        showGlobalToast(`❌ ${file.name}: ${check.error}`, 'warn', 4000);
        return;
      }
      valid.push(file);
      capturedFiles.push(file);
      const reader = new FileReader();
      reader.onload = e => _addPreviewThumb(e.target.result, file.type, preview, file.name);
      reader.readAsDataURL(file);
    });

    if (valid.length && callback) callback(capturedFiles);
  }

  // ─── Add thumbnail preview ───
  function _addPreviewThumb(src, type, container, name = '') {
    if (!container) return;
    container.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:80px;height:80px;border-radius:10px;overflow:hidden;border:2px solid rgba(108,99,255,0.4);flex-shrink:0;';
    wrap.title = name;

    if (type.startsWith('video/')) {
      const v = document.createElement('video');
      v.src = src;
      v.style.cssText = 'width:100%;height:100%;object-fit:cover';
      v.muted = true; v.loop = true; v.autoplay = true;
      wrap.appendChild(v);
      const lbl = document.createElement('div');
      lbl.style.cssText = 'position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:9px;color:#fff;background:rgba(0,0,0,0.5)';
      lbl.textContent = '▶ Video';
      wrap.appendChild(lbl);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = name;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      wrap.appendChild(img);
    }

    // Remove button
    const rm = document.createElement('button');
    rm.innerHTML = '✕';
    rm.style.cssText = 'position:absolute;top:2px;right:2px;width:18px;height:18px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;font-size:10px;cursor:pointer;line-height:1';
    rm.onclick = () => {
      wrap.remove();
      capturedFiles = capturedFiles.filter((_, i) => i !== Array.from(container.children).indexOf(wrap));
    };
    wrap.appendChild(rm);
    container.appendChild(wrap);
  }

  // ─── Open Camera (MediaDevices API) ───
  async function openCamera(videoContainerId) {
    const container = document.getElementById(videoContainerId);
    if (!container) return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'environment', width:{ ideal:1280 }, height:{ ideal:720 } },
      });

      container.innerHTML = `
        <div style="position:relative;border-radius:12px;overflow:hidden;background:#000;margin-bottom:12px">
          <video id="camera-video" autoplay playsinline muted
            style="width:100%;max-height:280px;object-fit:cover;display:block"></video>
          <div class="scan-overlay"></div>
          <div style="position:absolute;bottom:12px;left:0;right:0;display:flex;justify-content:center;gap:12px">
            <button id="capture-btn" class="btn btn-primary btn-sm">📸 Capture</button>
            <button id="switch-camera-btn" class="btn btn-outline btn-sm">🔄 Switch</button>
            <button id="stop-camera-btn" class="btn btn-outline btn-sm">✕ Close</button>
          </div>
        </div>
        <canvas id="capture-canvas" style="display:none"></canvas>`;

      videoEl = document.getElementById('camera-video');
      videoEl.srcObject = stream;

      document.getElementById('capture-btn').onclick    = _captureSnapshot;
      document.getElementById('stop-camera-btn').onclick = stopCamera;
      document.getElementById('switch-camera-btn').onclick = _switchCamera;

      showGlobalToast('📸 Camera active — point at the issue', 'info', 3000);
    } catch (err) {
      container.innerHTML = `
        <div style="padding:16px;text-align:center;color:var(--clr-warn);background:rgba(255,107,107,0.08);border-radius:10px;border:1px solid rgba(255,107,107,0.2)">
          ❌ Camera access denied.<br>
          <small style="color:var(--txt-muted)">Please allow camera permission or use the file upload above.</small>
        </div>`;
    }
  }

  // ─── Capture snapshot ───
  function _captureSnapshot() {
    if (!videoEl) return;
    const canvas = document.getElementById('capture-canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    ctx.drawImage(videoEl, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return;
      const file    = new File([blob], `capture_${Date.now()}.jpg`, { type:'image/jpeg' });
      capturedFiles.push(file);
      const preview = document.getElementById('upload-previews');
      _addPreviewThumb(canvas.toDataURL('image/jpeg'), 'image/jpeg', preview, file.name);
      showGlobalToast('✅ Photo captured!', 'success', 2000);

      // Trigger AI analysis
      if (window.AppModule?.onFilesReady) window.AppModule.onFilesReady(capturedFiles);
    }, 'image/jpeg', 0.9);
  }

  // ─── Switch front/back camera ───
  let _facingMode = 'environment';
  async function _switchCamera() {
    stopCamera();
    _facingMode = _facingMode === 'environment' ? 'user' : 'environment';
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:_facingMode, width:{ ideal:1280 }, height:{ ideal:720 } },
      });
      if (videoEl) videoEl.srcObject = stream;
    } catch (err) {
      showGlobalToast('⚠️ Could not switch camera', 'warn');
    }
  }

  // ─── Stop camera ───
  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    const c = document.getElementById('camera-container');
    if (c) c.innerHTML = '';
    videoEl = null;
  }

  function getFiles()   { return capturedFiles; }
  function hasFiles()   { return capturedFiles.length > 0; }
  function clearFiles() { capturedFiles = []; stopCamera(); }

  return { setupUploadZone, openCamera, stopCamera, getFiles, hasFiles, clearFiles };
})();

window.CameraModule = CameraModule;
