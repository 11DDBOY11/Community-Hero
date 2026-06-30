// ============================================
// COMMUNITY HERO — MOCK DATA STORE
// data.js
// ============================================

const CATEGORIES = {
  pothole:  { label: 'Pothole',         icon: '🕳️', color: '#ff6b6b', badge: 'badge-pothole' },
  water:    { label: 'Water Leakage',   icon: '💧', color: '#4dabf7', badge: 'badge-water'   },
  light:    { label: 'Streetlight',     icon: '💡', color: '#ffd43b', badge: 'badge-light'   },
  waste:    { label: 'Waste / Garbage', icon: '🗑️', color: '#51cf66', badge: 'badge-waste'   },
  road:     { label: 'Road Damage',     icon: '🚧', color: '#ff922b', badge: 'badge-road'    },
  other:    { label: 'Other',           icon: '📌', color: '#cc5de8', badge: 'badge-other'   },
};

const STATUSES = {
  reported:    { label: 'Reported',    badge: 'badge-reported',    icon: '📣' },
  verified:    { label: 'Verified',    badge: 'badge-verified',    icon: '✅' },
  'in-progress':{ label: 'In Progress', badge: 'badge-in-progress', icon: '🔧' },
  resolved:    { label: 'Resolved',    badge: 'badge-resolved',    icon: '🎉' },
};

const PRIORITIES = {
  critical: { label: 'Critical', badge: 'badge-critical' },
  high:     { label: 'High',     badge: 'badge-high'     },
  medium:   { label: 'Medium',   badge: 'badge-medium'   },
  low:      { label: 'Low',      badge: 'badge-low'      },
};

// ─── Mock Issues ───
const ISSUES_DATA = [
  {
    id: 'I001',
    title: 'Large pothole causing accidents near school',
    description: 'A massive pothole has formed on MG Road near the primary school. Several bikes have been damaged and it poses a serious safety risk to children.',
    category: 'pothole',
    status: 'in-progress',
    priority: 'critical',
    location: { lat: 28.6139, lng: 77.2090, address: 'MG Road, Near Primary School, New Delhi' },
    images: [],
    emoji: '🕳️',
    upvotes: 147,
    verifications: 38,
    comments: [
      { author: 'Priya M.', avatar: 'PM', text: 'This has been here for 3 months! My scooter got damaged last week.', time: '2 hours ago' },
      { author: 'Raj K.',   avatar: 'RK', text: 'Municipality said they will fix it by Friday. Lets keep the pressure on.', time: '1 hour ago' },
      { author: 'Anita S.', avatar: 'AS', text: 'Shared this on local Facebook group. 200+ people aware now.', time: '30 mins ago' },
    ],
    reporter: { name: 'Rahul Sharma', avatar: 'RS', level: 12 },
    timeline: [
      { status: 'Reported', time: 'Jun 15, 2026 09:30', done: true },
      { status: 'Community Verified (38 citizens)', time: 'Jun 15, 2026 14:00', done: true },
      { status: 'Escalated to PWD Department', time: 'Jun 16, 2026 10:00', done: true },
      { status: 'Repair Team Assigned', time: 'Jun 18, 2026 08:00', active: true },
      { status: 'Resolved', time: 'Expected Jun 25, 2026', done: false },
    ],
    reportedAt: '2026-06-15',
    area: 'Central Delhi',
  },
  {
    id: 'I002',
    title: 'Broken water main flooding residential street',
    description: 'Water is gushing from a broken underground pipe on Nehru Street. The road has been flooded for 2 days causing water wastage and traffic issues.',
    category: 'water',
    status: 'verified',
    priority: 'high',
    location: { lat: 28.6200, lng: 77.2150, address: 'Nehru Street, Block B, Delhi' },
    images: [],
    emoji: '💧',
    upvotes: 89,
    verifications: 22,
    comments: [
      { author: 'Suresh P.', avatar: 'SP', text: 'The flooding has reached 3 houses. Kids cannot go to school safely.', time: '3 hours ago' },
    ],
    reporter: { name: 'Meera Nair', avatar: 'MN', level: 8 },
    timeline: [
      { status: 'Reported', time: 'Jun 20, 2026 07:00', done: true },
      { status: 'Community Verified', time: 'Jun 20, 2026 12:00', done: true },
      { status: 'Water Board Notified', time: 'Jun 21, 2026 09:00', active: true },
      { status: 'Repair Scheduled', time: 'Pending', done: false },
    ],
    reportedAt: '2026-06-20',
    area: 'North Delhi',
  },
  {
    id: 'I003',
    title: 'Multiple streetlights out in park area — safety concern',
    description: 'At least 8 streetlights in Central Park have not been functioning for over a week. Women report feeling unsafe walking there after dark.',
    category: 'light',
    status: 'reported',
    priority: 'high',
    location: { lat: 28.6070, lng: 77.2130, address: 'Central Park, South Extension, Delhi' },
    images: [],
    emoji: '💡',
    upvotes: 63,
    verifications: 15,
    comments: [
      { author: 'Kavya R.', avatar: 'KR', text: 'Very unsafe! Reported a chain snatching incident here last week.', time: '5 hours ago' },
      { author: 'Deepak L.', avatar: 'DL', text: 'Raised this with the local councilor too. No response yet.', time: '2 hours ago' },
    ],
    reporter: { name: 'Kavya Reddy', avatar: 'KR', level: 5 },
    timeline: [
      { status: 'Reported', time: 'Jun 22, 2026 19:00', done: true },
      { status: 'Awaiting Verification', time: 'Ongoing', active: true },
      { status: 'Municipality Alert', time: 'Pending', done: false },
    ],
    reportedAt: '2026-06-22',
    area: 'South Delhi',
  },
  {
    id: 'I004',
    title: 'Illegal dumping site near children\'s playground',
    description: 'A large illegal garbage dump has formed next to the children\'s playground in Sector 12. It is attracting mosquitoes and rodents, a public health hazard.',
    category: 'waste',
    status: 'resolved',
    priority: 'critical',
    location: { lat: 28.6250, lng: 77.2300, address: 'Sector 12 Playground, East Delhi' },
    images: [],
    emoji: '🗑️',
    upvotes: 201,
    verifications: 67,
    comments: [
      { author: 'Dr. Asha T.', avatar: 'AT', text: 'Great job community! This is how citizen action works.', time: '1 day ago' },
    ],
    reporter: { name: 'Vikram Singh', avatar: 'VS', level: 18 },
    timeline: [
      { status: 'Reported', time: 'Jun 05, 2026', done: true },
      { status: 'Community Verified (67 citizens)', time: 'Jun 06, 2026', done: true },
      { status: 'Sanitation Dept Notified', time: 'Jun 07, 2026', done: true },
      { status: 'Cleanup Completed ✅', time: 'Jun 10, 2026', done: true },
    ],
    reportedAt: '2026-06-05',
    area: 'East Delhi',
  },
  {
    id: 'I005',
    title: 'Road cave-in blocking main artery road',
    description: 'A dangerous cave-in has appeared on the main road, blocking one lane completely. Heavy vehicles are attempting workarounds which is causing chaos.',
    category: 'road',
    status: 'in-progress',
    priority: 'critical',
    location: { lat: 28.6020, lng: 77.2050, address: 'Ring Road, Junction 7, Delhi' },
    images: [],
    emoji: '🚧',
    upvotes: 312,
    verifications: 89,
    comments: [
      { author: 'Traffic Dept.', avatar: 'TD', text: 'Emergency repair crew deployed. Expect delays till Jun 28.', time: '6 hours ago' },
    ],
    reporter: { name: 'Arun Kumar', avatar: 'AK', level: 24 },
    timeline: [
      { status: 'Reported', time: 'Jun 23, 2026 06:00', done: true },
      { status: 'Verified by Traffic Police', time: 'Jun 23, 2026 07:30', done: true },
      { status: 'Emergency Team Deployed', time: 'Jun 23, 2026 09:00', done: true },
      { status: 'Repair In Progress', time: 'Since Jun 23, 2026', active: true },
    ],
    reportedAt: '2026-06-23',
    area: 'West Delhi',
  },
  {
    id: 'I006',
    title: 'Exposed live electrical wires near bus stop',
    description: 'Exposed live electrical wires hanging near the main bus stop after recent storm damage. Extremely dangerous, especially in wet conditions.',
    category: 'other',
    status: 'verified',
    priority: 'critical',
    location: { lat: 28.6180, lng: 77.2250, address: 'Bus Stop 42, ITO, Delhi' },
    images: [],
    emoji: '⚡',
    upvotes: 178,
    verifications: 52,
    comments: [
      { author: 'Electricity Board', avatar: 'EB', text: 'Team dispatched. Please maintain distance from the area.', time: '1 hour ago' },
    ],
    reporter: { name: 'Sunita Devi', avatar: 'SD', level: 3 },
    timeline: [
      { status: 'Reported', time: 'Jun 28, 2026 08:00', done: true },
      { status: 'Emergency Alert Raised', time: 'Jun 28, 2026 08:15', done: true },
      { status: 'Electricity Board Notified', time: 'Jun 28, 2026 09:00', active: true },
    ],
    reportedAt: '2026-06-28',
    area: 'Central Delhi',
  },
];

// ─── Mock Users / Leaderboard ───
const USERS_DATA = [
  { id: 'U001', name: 'Arun Kumar',    avatar: 'AK', points: 4820, level: 24, issues: 48, resolved: 31, badges: ['pioneer','watchdog','fixer','guardian','champion'] },
  { id: 'U002', name: 'Priya Mehta',   avatar: 'PM', points: 3690, level: 18, issues: 37, resolved: 22, badges: ['pioneer','watchdog','fixer'] },
  { id: 'U003', name: 'Vikram Singh',  avatar: 'VS', points: 3210, level: 16, issues: 32, resolved: 18, badges: ['pioneer','watchdog','guardian'] },
  { id: 'U004', name: 'Meera Nair',    avatar: 'MN', points: 2840, level: 14, issues: 28, resolved: 15, badges: ['pioneer','fixer'] },
  { id: 'U005', name: 'Rahul Sharma',  avatar: 'RS', points: 2450, level: 12, issues: 24, resolved: 12, badges: ['pioneer','watchdog'] },
  { id: 'U006', name: 'Kavya Reddy',   avatar: 'KR', points: 1820, level:  9, issues: 18, resolved:  8, badges: ['pioneer'] },
  { id: 'U007', name: 'Deepak Lal',    avatar: 'DL', points: 1340, level:  7, issues: 13, resolved:  5, badges: ['pioneer'] },
  { id: 'U008', name: 'Anita Sharma',  avatar: 'AS', points:  980, level:  5, issues:  9, resolved:  3, badges: [] },
  { id: 'YOU',  name: 'You',           avatar: '😊', points:  520, level:  3, issues:  5, resolved:  2, badges: ['pioneer'], isCurrentUser: true },
];

// Current user state
const CURRENT_USER = {
  id: 'YOU',
  name: 'Community Hero',
  avatar: '⭐',
  level: 3,
  xp: 520,
  xpToNext: 750,
  issues: 5,
  verified: 12,
  resolved: 2,
  badges: ['pioneer'],
  notifs: 3,
};

// ─── Mock Badges ───
const BADGES_DATA = [
  { id: 'pioneer',  name: 'Pioneer',      icon: '🚀', desc: 'Report your first issue',          unlocked: true  },
  { id: 'watchdog', name: 'Watchdog',     icon: '👁️', desc: 'Verify 10 community issues',       unlocked: true  },
  { id: 'fixer',    name: 'Fixer',        icon: '🔧', desc: 'Have 5 issues resolved',            unlocked: false },
  { id: 'guardian', name: 'Guardian',     icon: '🛡️', desc: 'Report 25 critical issues',         unlocked: false },
  { id: 'champion', name: 'Champion',     icon: '🏆', desc: 'Reach level 20',                    unlocked: false },
  { id: 'mapper',   name: 'Mapper',       icon: '🗺️', desc: 'Add location to 15 issues',         unlocked: false },
  { id: 'voice',    name: 'Voice',        icon: '📢', desc: 'Get 100 upvotes on your reports',   unlocked: false },
  { id: 'streak',   name: 'On a Streak',  icon: '🔥', desc: 'Report issues 7 days in a row',     unlocked: false },
  { id: 'detective',name: 'Detective',    icon: '🔍', desc: 'Spot 3 duplicate reports',          unlocked: false },
  { id: 'media',    name: 'Journalist',   icon: '📸', desc: 'Submit 20 photo reports',           unlocked: false },
  { id: 'night',    name: 'Night Owl',    icon: '🦉', desc: 'Report 5 issues after dark',        unlocked: false },
  { id: 'civic',    name: 'Civic Leader', icon: '👑', desc: 'Help resolve 50 community issues',  unlocked: false },
];

// ─── Mock Activity Feed ───
const ACTIVITY_FEED = [
  { icon: '🕳️', color: '#ff6b6b', text: '<strong>Rahul S.</strong> reported a new pothole on MG Road', time: '2 min ago' },
  { icon: '✅', color: '#51cf66', text: '<strong>38 citizens</strong> verified the pothole issue I001', time: '15 min ago' },
  { icon: '🔧', color: '#6c63ff', text: 'PWD Department updated status of <strong>I001</strong> to In Progress', time: '32 min ago' },
  { icon: '🎉', color: '#ffd43b', text: 'Issue <strong>I004</strong> (Garbage Dump) has been <strong>resolved</strong>!', time: '1 hr ago' },
  { icon: '🏆', color: '#ffd43b', text: '<strong>Arun Kumar</strong> earned the Champion badge!', time: '2 hr ago' },
  { icon: '💧', color: '#4dabf7', text: '<strong>Meera N.</strong> reported a water leakage on Nehru Street', time: '3 hr ago' },
  { icon: '⬆️', color: '#a0aec0', text: '<strong>89 upvotes</strong> on water leakage report I002', time: '3 hr ago' },
  { icon: '📸', color: '#cc5de8', text: '<strong>Kavya R.</strong> added photos to streetlight issue I003', time: '5 hr ago' },
  { icon: '🚀', color: '#6c63ff', text: '<strong>Sunita D.</strong> just joined Community Hero!', time: '6 hr ago' },
  { icon: '⚡', color: '#ff922b', text: 'Emergency alert for exposed wires at ITO — <strong>I006</strong>', time: '7 hr ago' },
];

// ─── Dashboard Stats ───
const DASHBOARD_STATS = {
  totalIssues: 2847,
  resolved: 2103,
  inProgress: 412,
  avgResolutionDays: 4.2,
  activeReporters: 8934,
  citiesConnected: 14,
  resolutionRate: 73.9,
  thisMonthReported: 284,
  thisMonthResolved: 197,
};

// Monthly trend data
const MONTHLY_TRENDS = {
  labels: ['Jan','Feb','Mar','Apr','May','Jun'],
  reported:  [180, 220, 195, 310, 245, 284],
  resolved:  [120, 175, 160, 240, 198, 197],
};

// Category distribution
const CATEGORY_DIST = {
  labels: ['Pothole','Water','Streetlight','Waste','Road','Other'],
  data:   [38, 22, 15, 12, 8, 5],
  colors: ['#ff6b6b','#4dabf7','#ffd43b','#51cf66','#ff922b','#cc5de8'],
};

// Resolution time by category
const RESOLUTION_TIME = {
  labels: ['Pothole','Water','Streetlight','Waste','Road','Other'],
  data:   [5.2, 2.1, 3.8, 1.9, 7.4, 4.0],
};

// ─── AI Categorizer Keywords ───
const AI_KEYWORDS = {
  pothole:  ['pothole','hole','crater','dip','pit','broken road','sunken','cracks','pavement'],
  water:    ['water','leak','pipe','flood','overflow','drainage','sewage','puddle','waterlog','burst'],
  light:    ['light','lamp','streetlight','dark','bulb','electricity','power','illuminat'],
  waste:    ['garbage','waste','trash','dump','litter','rubbish','plastic','dirty','filth','smell'],
  road:     ['road','street','highway','cave','collapse','damage','repair','pothole'],
  other:    [],
};

// ─── Challenges ───
const WEEKLY_CHALLENGES = [
  { icon: '📸', title: 'Photo Reporter', desc: 'Submit 3 photo reports this week', progress: 1, total: 3, xp: 150 },
  { icon: '✅', title: 'Verification Drive', desc: 'Verify 10 issues in your area', progress: 4, total: 10, xp: 200 },
  { icon: '💬', title: 'Community Voice', desc: 'Comment on 5 active issues', progress: 2, total: 5, xp: 100 },
  { icon: '🗺️', title: 'Mapper', desc: 'Add precise locations to 5 reports', progress: 0, total: 5, xp: 120 },
];

// Export all
window.AppData = {
  CATEGORIES, STATUSES, PRIORITIES,
  ISSUES_DATA, USERS_DATA, CURRENT_USER,
  BADGES_DATA, ACTIVITY_FEED,
  DASHBOARD_STATS, MONTHLY_TRENDS, CATEGORY_DIST, RESOLUTION_TIME,
  AI_KEYWORDS, WEEKLY_CHALLENGES,
};
