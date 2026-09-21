const SUPABASE_URL = 'https://jtiivqzaywpuqjyhvitg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QFB2OR4tYtX1wBkLS5JK7g_UPhpjZUs';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ASSETS = {
  edd: 'assets/edd.svg',
  scholar: 'assets/quest-scholar.svg',
  wanderer: 'assets/quest-wanderer.svg',
  artist: 'assets/quest-artist.svg'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const rewardByDifficulty = {
  micro: { xp: 35, coins: 2, focus: 1 },
  simple: { xp: 100, coins: 5, focus: 2 },
  medium: { xp: 250, coins: 12, focus: 4 },
  complex: { xp: 600, coins: 30, focus: 8 },
  epic: { xp: 1200, coins: 60, focus: 12 }
};
const difficultyLabels = { micro: 'Micro', simple: 'Simples', medium: 'Média', complex: 'Complexa', epic: 'Épica' };
const priorityLabels = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
const bonusByEnergy = { 1: 40, 2: 20, 3: 10, 4: 0, 5: 0 };
const moodOptions = [
  ['Feliz', '😊'], ['Tranquilo', '😌'], ['Normal', '🙂'], ['Ansioso', '😣'],
  ['Irritado', '😠'], ['Triste', '😞'], ['Inspirado', '✨']
];
const viewCopy = {
  today: ['HOJE', greeting(), 'Tudo num lugar só, com menos atrito e mais jogo.'],
  tasks: ['PLANNER', 'Tarefas', 'Visão completa para escolher o que atacar primeiro.'],
  inbox: ['CAPTURA', 'Inbox', 'Capture primeiro. Organize quando tiver espaço mental.'],
  quests: ['QUESTS', 'Quest da Semana', 'Bônus gostoso, sem transformar a semana em cobrança.'],
  character: ['FICHA', 'Edd', 'Seu perfil de personagem, sem níveis separados por área.'],
  shop: ['RECOMPENSAS', 'Loja', 'Moedas viram permissões reais para a vida offline.'],
  chronicle: ['CRÔNICA', 'Crônica', 'O histórico do que você fez, sentiu e priorizou.']
};

const state = {
  session: null,
  user: null,
  currentView: 'today',
  editingTaskId: null,
  checkinMood: null,
  checkinEnergy: 4,
  checkinNote: '',
  areas: [], projects: [], tasks: [], rewards: [], questTemplates: [], questOffers: [],
  achievements: [], userAchievements: [], checkins: [], xpEvents: [], coinTransactions: [], focusEvents: [],
  filters: {
    home: { search: '', timeframe: 'all', priority: 'all', difficulty: 'all', project: 'all', sort: 'date' },
    planner: { search: '', timeframe: 'all', priority: 'all', difficulty: 'all', project: 'all', status: 'open', sort: 'date' }
  },
  boundaryTimer: null
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia, Edd.';
  if (hour < 18) return 'Boa tarde, Edd.';
  return 'Boa noite, Edd.';
}
function isoDateLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date, days) { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; }
function mondayOf(date = new Date()) { const copy = new Date(date); const day = copy.getDay() || 7; copy.setDate(copy.getDate() - day + 1); copy.setHours(0,0,0,0); return copy; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function formatDate(value) { if (!value) return 'sem data'; const d = new Date(`${value}T12:00:00`); return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }); }
function formatDateTime(value) { if (!value) return ''; return new Date(value).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }); }
function showToast(message, type = '') {
  const toast = $('#toast'); toast.textContent = message; toast.className = `toast ${type}`; toast.hidden = false;
  clearTimeout(window.__eddToast); window.__eddToast = setTimeout(() => toast.hidden = true, 3200);
}
function empty(message) { return `<div class="empty-state">${escapeHtml(message)}</div>`; }
function projectById(id) { return state.projects.find(p => p.id === id); }
function areaById(id) { return state.areas.find(a => a.id === id); }
function totalXp() { return state.xpEvents.reduce((sum, e) => sum + Number(e.amount || 0), 0); }
function coinBalance() { return state.coinTransactions.reduce((sum, e) => sum + Number(e.amount || 0), 0); }
function computeLevel(total) {
  let level = 1, remaining = Math.max(0, total);
  while (level < 200) {
    const needed = 500 + 150 * (level - 1) + 25 * Math.pow(level - 1, 2);
    if (remaining < needed) return { level, current: remaining, needed, pct: Math.min(100, remaining / needed * 100) };
    remaining -= needed; level++;
  }
  return { level, current: 0, needed: 1, pct: 100 };
}

function currentPeriod() {
  const h = new Date().getHours();
  if (h >= 19) return { id:'evening', label:'noite', next:'amanhã de manhã' };
  if (h >= 15) return { id:'afternoon', label:'tarde', next:'19h' };
  return { id:'morning', label:'manhã', next:'15h' };
}
function periodLabel(period) { return ({morning:'manhã',afternoon:'tarde',evening:'noite'})[period] || period; }
function todaysCheckin(period = currentPeriod().id) { return state.checkins.find(c => c.checkin_date === isoDateLocal() && c.period === period); }
function latestTodayCheckin() {
  const order = { morning:1, afternoon:2, evening:3 };
  return state.checkins.filter(c => c.checkin_date === isoDateLocal()).sort((a,b)=>(order[b.period]||0)-(order[a.period]||0))[0] || null;
}
function currentEnergy() { return latestTodayCheckin()?.energy || 5; }
function schedulePeriodBoundary() {
  clearTimeout(state.boundaryTimer);
  const now = new Date();
  let next = new Date(now);
  const h = now.getHours();
  if (h < 15) next.setHours(15,0,1,0);
  else if (h < 19) next.setHours(19,0,1,0);
  else { next.setDate(next.getDate()+1); next.setHours(8,0,1,0); }
  const delay = Math.max(5000, next - now);
  state.boundaryTimer = setTimeout(() => { renderAll(); schedulePeriodBoundary(); }, delay);
}

async function init() {
  setAvatarSources();
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/,''));
  if (params.get('error_description') || hash.get('error_description')) {
    $('#authMessage').textContent = decodeURIComponent(params.get('error_description') || hash.get('error_description'));
    $('#authMessage').className = 'auth-message error';
  }
  const { data: { session }, error } = await db.auth.getSession();
  if (error) console.error(error);
  await handleSession(session);
  db.auth.onAuthStateChange((_event, nextSession) => {
    setTimeout(() => handleSession(nextSession), 0);
  });
  schedulePeriodBoundary();
}
async function handleSession(session) {
  state.session = session; state.user = session?.user || null;
  $('#authGate').hidden = !!session;
  $('#appShell').hidden = !session;
  if (!session) return;
  $('#userEmail').textContent = session.user.email || 'Edd';
  await loadAll();
  renderAll();
}
async function loadAll() {
  const uid = state.user.id;
  const since = new Date(); since.setDate(since.getDate() - 8);
  const [areas, projects, tasks, rewards, templates, achievements, unlocked, checkins, xp, coins, focus] = await Promise.all([
    db.from('areas').select('*').eq('user_id', uid).eq('is_active', true).order('sort_order'),
    db.from('projects').select('*').eq('user_id', uid).eq('is_active', true).order('created_at'),
    db.from('tasks').select('*').eq('user_id', uid).order('created_at', { ascending:false }),
    db.from('rewards').select('*').eq('user_id', uid).eq('is_active', true).order('is_featured', { ascending:false }).order('cost'),
    db.from('quest_templates').select('*').eq('is_active', true).order('created_at'),
    db.from('achievements').select('*').order('created_at'),
    db.from('user_achievements').select('*, achievements(*)').eq('user_id', uid).order('unlocked_at', { ascending:false }),
    db.from('checkins').select('*').eq('user_id', uid).order('created_at', { ascending:false }).limit(90),
    db.from('xp_events').select('*').eq('user_id', uid).order('created_at', { ascending:false }).limit(300),
    db.from('coin_transactions').select('*').eq('user_id', uid).order('created_at', { ascending:false }).limit(300),
    db.from('focus_events').select('*').eq('user_id', uid).gte('created_at', since.toISOString()).order('created_at', { ascending:false })
  ]);
  const failed = [areas,projects,tasks,rewards,templates,achievements,unlocked,checkins,xp,coins,focus].find(r => r.error);
  if (failed) { console.error(failed.error); showToast(`Erro ao carregar: ${failed.error.message}`, 'error'); }
  state.areas=areas.data||[]; state.projects=projects.data||[]; state.tasks=tasks.data||[]; state.rewards=rewards.data||[];
  state.questTemplates=templates.data||[]; state.achievements=achievements.data||[]; state.userAchievements=unlocked.data||[];
  state.checkins=checkins.data||[]; state.xpEvents=xp.data||[]; state.coinTransactions=coins.data||[]; state.focusEvents=focus.data||[];
  await ensureWeeklyQuests();
}
async function refreshCore() {
  const uid = state.user.id; const since = new Date(); since.setDate(since.getDate()-8);
  const [tasks,checkins,xp,coins,focus,rewards] = await Promise.all([
    db.from('tasks').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
    db.from('checkins').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(90),
    db.from('xp_events').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(300),
    db.from('coin_transactions').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(300),
    db.from('focus_events').select('*').eq('user_id',uid).gte('created_at',since.toISOString()).order('created_at',{ascending:false}),
    db.from('rewards').select('*').eq('user_id',uid).eq('is_active',true).order('is_featured',{ascending:false}).order('cost')
  ]);
  state.tasks=tasks.data||[]; state.checkins=checkins.data||[]; state.xpEvents=xp.data||[]; state.coinTransactions=coins.data||[]; state.focusEvents=focus.data||[]; state.rewards=rewards.data||[];
}
async function ensureWeeklyQuests() {
  const weekStart = isoDateLocal(mondayOf());
  const { data, error } = await db.from('weekly_quest_offers').select('*').eq('user_id',state.user.id).eq('week_start',weekStart).order('slot');
  if (error) { console.error(error); return; }
  if (!data?.length && state.questTemplates.length >= 3) {
    const shuffled=[...state.questTemplates].sort(()=>Math.random()-.5).slice(0,3);
    const payload=shuffled.map((q,i)=>({user_id:state.user.id,week_start:weekStart,quest_template_id:q.id,slot:i+1}));
    const inserted=await db.from('weekly_quest_offers').insert(payload).select('*');
    state.questOffers=inserted.data||[];
  } else state.questOffers=data||[];
}
