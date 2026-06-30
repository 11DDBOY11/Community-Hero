// ============================================================
// COMMUNITY HERO — DASHBOARD (Real Firestore Data)
// js/dashboard.js
//
// All charts and stats are now driven by live Firestore data.
// Falls back to demo data when Firebase is not configured.
// ============================================================

const Dashboard = (() => {

  let charts  = {};
  let _unsub  = null;

  // ═══════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════

  function init() {
    renderStatsSkeleton();

    // Live stats from Firestore stats/global doc
    _unsub = RT.subscribeToStats(statsData => {
      renderStats(statsData);
    });

    // Charts from one-time queries (re-computed on section visit)
    loadAndRenderCharts();
    renderPredictions();

    setTimeout(() => {
      document.querySelectorAll('#section-dashboard .reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 80);
      });
    }, 200);
  }

  function destroy() {
    if (_unsub) { _unsub(); _unsub = null; }
    Object.values(charts).forEach(c => c?.destroy?.());
    charts = {};
  }

  // ═══════════════════════════════════════════
  // STAT CARDS
  // ═══════════════════════════════════════════

  function renderStatsSkeleton() {
    const c = document.getElementById('dashboard-stats');
    if (!c) return;
    c.innerHTML = Array(8).fill(0).map(() => `
      <div class="stat-card">
        <div class="shimmer" style="width:44px;height:44px;border-radius:10px;margin-bottom:16px"></div>
        <div class="shimmer" style="height:36px;width:70%;margin-bottom:8px"></div>
        <div class="shimmer" style="height:14px;width:80%"></div>
      </div>`).join('');
  }

  function renderStats(raw = {}) {
    const container = document.getElementById('dashboard-stats');
    if (!container) return;

    // Compute from real data
    const byStatus  = raw.byStatus   || {};
    const total     = raw.totalIssues || 0;
    const resolved  = byStatus.resolved || 0;
    const inProg    = byStatus['in-progress'] || 0;
    const resRate   = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';
    const byCategory = raw.byCategory || {};
    const catTotal  = Object.values(byCategory).reduce((a, b) => a + b, 0);

    const stats = [
      { icon:'📣', label:'Total Issues Reported',   value: total,             cls:'',       delta:'+live' },
      { icon:'✅', label:'Issues Resolved',          value: resolved,          cls:'success', delta:`${resRate}% rate` },
      { icon:'🔧', label:'In Progress',              value: inProg,            cls:'warn',   delta:'Active repairs' },
      { icon:'📣', label:'Newly Reported',           value: byStatus.reported || 0, cls:'',  delta:'Awaiting action' },
      { icon:'📊', label:'Verified by Community',   value: byStatus.verified || 0, cls:'accent', delta:'Community checked' },
      { icon:'📈', label:'Resolution Rate',          value: resRate + '%',     cls:'success', delta:'Of all reports' },
      { icon:'🕳️', label:'Potholes Reported',       value: byCategory.pothole || 0, cls:'warn', delta:'Top category' },
      { icon:'💧', label:'Water Issues',             value: byCategory.water   || 0, cls:'accent', delta:'Infrastructure' },
    ];

    container.innerHTML = stats.map(s => `
      <div class="stat-card ${s.cls} reveal">
        <div class="stat-card-icon"><span style="font-size:1.25rem">${s.icon}</span></div>
        <div class="stat-card-value odometer">${s.value}</div>
        <div class="stat-card-label">${s.label}</div>
        <div class="stat-card-delta up">↑ ${s.delta}</div>
      </div>`).join('');
  }

  // ═══════════════════════════════════════════
  // CHARTS (powered by real Firestore data)
  // ═══════════════════════════════════════════

  async function loadAndRenderCharts() {
    const [monthly, issues] = await Promise.all([
      DB.getMonthlyStats(6),
      DB.getIssues({ limit: 500 }),
    ]);

    renderTrendChart(monthly);
    renderCategoryChart(issues);
    renderResolutionChart(issues);
    renderHeatmap(issues);
  }

  // ─── Monthly Trend ───
  function renderTrendChart(monthly) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;
    charts.trend?.destroy();

    charts.trend = new Chart(canvas, {
      type: 'line',
      data: {
        labels: monthly.labels || [],
        datasets: [
          {
            label: 'Reported',
            data: monthly.reported || [],
            borderColor: '#6c63ff',
            backgroundColor: 'rgba(108,99,255,0.08)',
            borderWidth: 2.5, tension: 0.4, fill: true,
            pointBackgroundColor: '#6c63ff', pointRadius: 5, pointHoverRadius: 8,
          },
          {
            label: 'Resolved',
            data: monthly.resolved || [],
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0,212,170,0.06)',
            borderWidth: 2.5, tension: 0.4, fill: true,
            pointBackgroundColor: '#00d4aa', pointRadius: 5, pointHoverRadius: 8,
          },
        ],
      },
      options: _chartOpts({
        plugins: {
          legend: { display: true, labels: { color:'#a0aec0', usePointStyle:true, pointStyleWidth:8 } },
        },
        scales: {
          x: { ticks:{ color:'#5a6a7e' }, grid:{ color:'rgba(255,255,255,0.05)' } },
          y: { ticks:{ color:'#5a6a7e' }, grid:{ color:'rgba(255,255,255,0.05)' }, beginAtZero:true },
        },
      }),
    });
  }

  // ─── Category Doughnut (computed from real issues) ───
  function renderCategoryChart(issues) {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;
    charts.category?.destroy();

    const catColors = window.AppData?.CATEGORY_DIST?.colors
      || ['#ff6b6b','#4dabf7','#ffd43b','#51cf66','#ff922b','#cc5de8'];
    const CATS = ['pothole','water','light','waste','road','other'];

    let counts;
    if (issues && issues.length > 0) {
      counts = CATS.map(c => issues.filter(i => i.category === c).length);
    } else {
      counts = window.AppData?.CATEGORY_DIST?.data || [0,0,0,0,0,0];
    }

    charts.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Pothole','Water','Streetlight','Waste','Road','Other'],
        datasets: [{
          data: counts,
          backgroundColor: catColors,
          borderColor: 'rgba(0,0,0,0.3)',
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: {
          legend: { position:'bottom', labels:{ color:'#a0aec0', padding:16, usePointStyle:true, pointStyleWidth:8 } },
          tooltip: _tooltipStyle(),
        },
      },
    });
  }

  // ─── Resolution Time by Category ───
  function renderResolutionChart(issues) {
    const canvas = document.getElementById('resolution-chart');
    if (!canvas) return;
    charts.resolution?.destroy();

    const CATS  = ['pothole','water','light','waste','road','other'];
    const catColors = ['rgba(255,107,107,0.7)','rgba(77,171,247,0.7)','rgba(255,212,59,0.7)',
                       'rgba(81,207,102,0.7)','rgba(255,146,43,0.7)','rgba(204,93,232,0.7)'];
    const borders   = ['#ff6b6b','#4dabf7','#ffd43b','#51cf66','#ff922b','#cc5de8'];

    let data;
    if (issues && issues.length > 0) {
      // Compute avg days from createdAt → updatedAt for resolved issues
      data = CATS.map(cat => {
        const resolved = issues.filter(i => i.category === cat && i.status === 'resolved');
        if (!resolved.length) return 0;
        const avg = resolved.reduce((sum, i) => {
          const created = i.createdAt?.toDate?.() || i._ts || new Date();
          const updated = i.updatedAt?.toDate?.() || new Date();
          return sum + (updated - created) / 86400000;
        }, 0) / resolved.length;
        return parseFloat(avg.toFixed(1)) || 0;
      });
    } else {
      data = window.AppData?.RESOLUTION_TIME?.data || [0,0,0,0,0,0];
    }

    charts.resolution = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Pothole','Water','Streetlight','Waste','Road','Other'],
        datasets: [{
          label: 'Avg Days to Resolve',
          data, backgroundColor: catColors, borderColor: borders,
          borderWidth:1, borderRadius:8, borderSkipped:false,
        }],
      },
      options: _chartOpts({
        scales: {
          x: { ticks:{ color:'#5a6a7e' }, grid:{ color:'rgba(255,255,255,0.04)' } },
          y: { ticks:{ color:'#5a6a7e', callback: v => v+'d' }, grid:{ color:'rgba(255,255,255,0.04)' }, beginAtZero:true },
        },
      }),
    });
  }

  // ─── Activity Heatmap (reports by day-of-week × hour) ───
  function renderHeatmap(issues) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const hours = ['6am','9am','12pm','3pm','6pm','9pm'];
    const slots = [6,9,12,15,18,21];

    // Build grid from real issue timestamps
    const data = days.map(() => slots.map(() => 0));
    if (issues && issues.length > 0) {
      issues.forEach(i => {
        const ts = i.createdAt?.toDate?.() || i._ts;
        if (!ts) return;
        const dow  = (ts.getDay() + 6) % 7; // Mon=0
        const hr   = ts.getHours();
        const slot = slots.findIndex((s, idx) => hr >= s && (slots[idx+1] === undefined || hr < slots[idx+1]));
        if (slot >= 0 && dow < 7) data[dow][slot]++;
      });
    } else {
      // Demo random data
      days.forEach((_, di) => slots.forEach((_, si) => { data[di][si] = Math.floor(Math.random()*50+5); }));
    }

    const maxVal = Math.max(...data.flat(), 1);
    container.innerHTML = `
      <div style="overflow-x:auto">
        <div style="display:grid;grid-template-columns:40px repeat(${hours.length},1fr);gap:4px;min-width:360px">
          <div></div>
          ${hours.map(h => `<div style="text-align:center;font-size:0.72rem;color:var(--txt-muted);padding-bottom:4px">${h}</div>`).join('')}
          ${days.map((day,di) => `
            <div style="display:flex;align-items:center;font-size:0.75rem;color:var(--txt-muted)">${day}</div>
            ${data[di].map(v => {
              const a = (0.08 + (v/maxVal)*0.82).toFixed(2);
              return `<div title="${v} issues" style="height:30px;border-radius:5px;background:rgba(108,99,255,${a});cursor:pointer;transition:all 0.2s"
                onmouseover="this.style.outline='2px solid rgba(108,99,255,0.8)'"
                onmouseout="this.style.outline='none'"></div>`;
            }).join('')}
          `).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:0.75rem;color:var(--txt-muted)">
          <span>Low</span>
          <div style="display:flex;gap:3px">${[0.1,0.3,0.5,0.7,0.9].map(a=>`<div style="width:18px;height:12px;border-radius:3px;background:rgba(108,99,255,${a})"></div>`).join('')}</div>
          <span>High</span>
          ${issues?.length ? `<span style="margin-left:auto;color:var(--clr-accent)">Based on ${issues.length} real reports</span>` : ''}
        </div>
      </div>`;
  }

  // ─── AI Predictions ───
  function renderPredictions() {
    const container = document.getElementById('predictions-list');
    if (!container) return;
    const insights  = window.AIEngine?.generatePredictiveInsights?.() || [];
    const CATS      = window.AppData?.CATEGORIES || {};

    container.innerHTML = insights.map(ins => `
      <div class="prediction-item">
        <div class="prediction-dot" style="background:${CATS[ins.category]?.color||'var(--clr-primary)'}"></div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:1rem">${ins.icon}</span>
            <span style="font-size:0.9rem;font-weight:700;color:var(--txt-primary)">${ins.title}</span>
            <span class="badge badge-verified" style="margin-left:auto">${Math.round(ins.confidence*100)}% conf.</span>
          </div>
          <p style="font-size:0.82rem;color:var(--txt-secondary);margin:0">${ins.message}</p>
        </div>
      </div>`).join('');
  }

  // ─── Chart shared options ───
  function _chartOpts(overrides = {}) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend:{ display:false }, tooltip: _tooltipStyle(), ...overrides.plugins },
      ...overrides,
    };
  }

  function _tooltipStyle() {
    return {
      backgroundColor: 'rgba(10,14,32,0.95)',
      titleColor: '#f1f3f9', bodyColor: '#a0aec0',
      borderColor: 'rgba(108,99,255,0.3)', borderWidth:1,
      cornerRadius: 10, padding: 12,
    };
  }

  return { init, destroy, renderPredictions };
})();

window.Dashboard = Dashboard;
