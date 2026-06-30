// ============================================
// COMMUNITY HERO — AI CATEGORIZATION ENGINE
// ai.js
// ============================================

const AIEngine = (() => {

  const { AI_KEYWORDS, CATEGORIES } = window.AppData;

  // ─── Categorize text input ───
  function categorizeText(text) {
    if (!text || !text.trim()) return null;
    const lower = text.toLowerCase();
    const scores = {};
    
    for (const [cat, keywords] of Object.entries(AI_KEYWORDS)) {
      if (cat === 'other') continue;
      scores[cat] = keywords.reduce((score, kw) => {
        if (lower.includes(kw)) score += kw.length > 5 ? 2 : 1;
        return score;
      }, 0);
    }

    const sorted = Object.entries(scores)
      .filter(([,s]) => s > 0)
      .sort((a,b) => b[1] - a[1]);

    if (!sorted.length) {
      return { category: 'other', confidence: 0.52, alternatives: [] };
    }

    const [topCat, topScore] = sorted[0];
    const totalScore = Object.values(scores).reduce((a,b) => a+b, 0) || 1;
    const confidence = Math.min(0.98, 0.6 + (topScore / totalScore) * 0.4 + Math.random() * 0.05);

    const alternatives = sorted.slice(1, 3).map(([cat]) => ({
      category: cat,
      label: CATEGORIES[cat].label,
      icon: CATEGORIES[cat].icon,
    }));

    return { category: topCat, confidence: parseFloat(confidence.toFixed(2)), alternatives };
  }

  // ─── Utility: File to Base64 helper for Gemini API ───
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // ─── Image analysis (Gemini AI or fallback Mock) ───
  async function analyzeImage(file) {
    // If real Gemini API Key is configured, run actual computer vision
    if (window.GEMINI_API_KEY && window.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY") {
      try {
        const base64Data = await fileToBase64(file);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Analyze this image showing a community infrastructure issue. " +
                        "Classify it into exactly one of these categories: 'pothole', 'water', 'light', 'waste', 'road', 'other'. " +
                        "Select 'pothole' for road holes/cracks, 'water' for leakages/flooding, 'light' for broken lamps/electrical, 'waste' for garbage/trash, 'road' for blocked road/construction hazards, 'other' for everything else. " +
                        "Respond ONLY with a JSON object in this format (no markdown code blocks, no other text): " +
                        "{\"category\": \"pothole\", \"confidence\": 0.95, \"suggestedPriority\": \"high\", \"tags\": [\"asphalt\", \"cracked\"]}"
                },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Data
                  }
                }
              ]
            }]
          })
        });

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Clean markdown wrapper response blocks if any
        const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanedText);

        return {
          category: result.category || 'other',
          confidence: parseFloat((result.confidence || 0.85).toFixed(2)),
          source: 'Gemini Vision AI',
          tags: result.tags || [],
          alternatives: getAlternatives(result.category || 'other'),
          autoSuggestedPriority: result.suggestedPriority || 'medium'
        };
      } catch (err) {
        console.warn('Gemini Vision AI failed, falling back to mock rules:', err);
      }
    }

    // Mock fallback processing time
    await sleep(1500);

    const filename = (file?.name || '').toLowerCase();
    let category = 'other';

    if (filename.includes('road') || filename.includes('pothole') || filename.includes('hole') || filename.includes('street') || filename.includes('asphalt') || filename.includes('crack') || filename.includes('pavement') || filename.includes('tarmac') || filename.includes('hump') || filename.includes('lane')) {
      category = 'pothole';
    } else if (filename.includes('water') || filename.includes('flood') || filename.includes('leak') || filename.includes('pipe') || filename.includes('sewage') || filename.includes('drain') || filename.includes('wet') || filename.includes('burst') || filename.includes('spill')) {
      category = 'water';
    } else if (filename.includes('light') || filename.includes('lamp') || filename.includes('bulb') || filename.includes('dark') || filename.includes('pole') || filename.includes('wire') || filename.includes('electric')) {
      category = 'light';
    } else if (filename.includes('trash') || filename.includes('waste') || filename.includes('garbage') || filename.includes('dump') || filename.includes('bin') || filename.includes('rubbish') || filename.includes('litter')) {
      category = 'waste';
    } else if (filename.includes('barrier') || filename.includes('sign') || filename.includes('cone') || filename.includes('construction') || filename.includes('hazard') || filename.includes('obstruction') || filename.includes('block')) {
      category = 'road';
    } else {
      // Default fallback
      category = 'pothole';
    }

    const confidence = 0.72 + Math.random() * 0.22;
    return {
      category,
      confidence: parseFloat(confidence.toFixed(2)),
      source: 'local rules',
      tags: generateImageTags(category),
      alternatives: getAlternatives(category),
    };
  }

  // ─── Combined analysis (text + image) ───
  async function analyzeReport({ text, file, location }) {
    const results = [];

    if (text) {
      const textResult = categorizeText(text);
      if (textResult) results.push({ ...textResult, weight: 0.4, source: 'text' });
    }

    if (file) {
      const imgResult = await analyzeImage(file);
      results.push({ ...imgResult, weight: 0.6, source: 'image' });
    }

    if (!results.length) return null;

    // Weighted merge
    const categoryScores = {};
    for (const r of results) {
      categoryScores[r.category] = (categoryScores[r.category] || 0) + r.confidence * r.weight;
    }

    const sorted = Object.entries(categoryScores).sort((a,b) => b[1]-a[1]);
    const [topCat, topScore] = sorted[0];
    const confidence = Math.min(0.98, topScore / results.reduce((a,r) => a+r.weight,0));

    return {
      category: topCat,
      confidence: parseFloat(confidence.toFixed(2)),
      confidencePct: Math.round(confidence * 100),
      source: results.length > 1 ? 'multimodal' : results[0].source,
      tags: generateImageTags(topCat),
      alternatives: getAlternatives(topCat),
      autoSuggestedPriority: suggestPriority(topCat, text),
    };
  }

  // ─── Suggest priority based on category + keywords ───
  function suggestPriority(category, text='') {
    const lower = text.toLowerCase();
    const urgentWords = ['emergency','dangerous','urgent','critical','accident','injury','child','fire','electric','live wire'];
    const isUrgent = urgentWords.some(w => lower.includes(w));

    if (isUrgent) return 'critical';
    if (category === 'road' || category === 'water') return 'high';
    if (category === 'pothole' || category === 'light') return 'medium';
    return 'low';
  }

  // ─── Generate plausible image tags ───
  function generateImageTags(category) {
    const tagMap = {
      pothole:  ['road damage','infrastructure','hazard','asphalt','cavity'],
      water:    ['flooding','pipe','moisture','leakage','infrastructure'],
      light:    ['electrical','night safety','public space','infrastructure'],
      waste:    ['garbage','environmental','health hazard','sanitation'],
      road:     ['infrastructure','public safety','traffic hazard','construction'],
      other:    ['community issue','public infrastructure'],
    };
    const allTags = tagMap[category] || tagMap.other;
    return allTags.slice(0, 3);
  }

  // ─── Get alternative categories ───
  function getAlternatives(topCat) {
    const all = Object.keys(CATEGORIES).filter(c => c !== topCat && c !== 'other');
    return all.slice(0, 2).map(c => ({
      category: c,
      label: CATEGORIES[c].label,
      icon: CATEGORIES[c].icon,
    }));
  }

  // ─── Predictive Insights ───
  function generatePredictiveInsights() {
    return [
      {
        type: 'trend',
        icon: '📈',
        title: 'Pothole surge expected',
        message: 'Based on monsoon season patterns, pothole reports are projected to increase 45% in the next 30 days in Central & North Delhi zones.',
        confidence: 0.87,
        category: 'pothole',
      },
      {
        type: 'hotspot',
        icon: '🔥',
        title: 'Ring Road — recurring issues',
        message: 'Ring Road Junction 7 has been flagged 8 times in 6 months. Predictive analysis suggests a systemic infrastructure failure.',
        confidence: 0.92,
        category: 'road',
      },
      {
        type: 'resolution',
        icon: '⚡',
        title: 'Faster resolution window',
        message: 'Issues reported Monday–Wednesday are resolved 2.3 days faster than weekend reports. Optimize reporting timing for faster action.',
        confidence: 0.79,
        category: 'other',
      },
      {
        type: 'prevention',
        icon: '🛡️',
        title: 'Pre-monsoon drainage check',
        message: 'Sectors 5, 12, and 18 had flooding last year. Community proactive reporting of blocked drains now could prevent 60% of expected issues.',
        confidence: 0.83,
        category: 'water',
      },
    ];
  }

  // ─── Cluster issues by proximity ───
  function clusterIssues(issues, radiusKm=0.5) {
    const clusters = [];
    const used = new Set();

    issues.forEach((issue, i) => {
      if (used.has(i)) return;
      const cluster = [issue];
      used.add(i);

      issues.forEach((other, j) => {
        if (used.has(j)) return;
        const dist = haversineKm(issue.location, other.location);
        if (dist < radiusKm) {
          cluster.push(other);
          used.add(j);
        }
      });

      clusters.push(cluster);
    });

    return clusters;
  }

  // ─── Haversine distance (km) ───
  function haversineKm(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lng - a.lng) * Math.PI / 180;
    const sin2 = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1-sin2));
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { categorizeText, analyzeImage, analyzeReport, generatePredictiveInsights, clusterIssues };
})();

window.AIEngine = AIEngine;
