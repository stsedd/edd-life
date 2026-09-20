const SUPABASE_URL = 'https://jtiivqzaywpuqjyhvitg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QFB2OR4tYtX1wBkLS5JK7g_UPhpjZUs';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  session: null,
  user: null,
  currentView: 'today',
  todayFilter: 'today',
  editingTaskId: null,
  checkinMood: null,
  currentEnergy: 5,
  areas: [], projects: [], tasks: [], rewards: [], questTemplates: [], questOffers: [],
  achievements: [], checkins: [], xpEvents: [], coinTransactions: [], focusEvents: []
};

const difficultyLabels = { micro: 'Micro', simple: 'Simples', medium: 'Média', complex: 'Complexa', epic: 'Épica' };
const bonusByEnergy = { 1: 40, 2: 20, 3: 10, 4: 0, 5: 0 };
const viewCopy = {
  today: ['HOJE', 'Bom dia, Edd.', 'Pequenos passos também constroem grandes jornadas.'],
  tasks: ['PLANNER', 'Tarefas', 'Tudo que precisa acontecer, sem espalhar sua cabeça em cinco lugares.'],
  inbox: ['CAPTURA', 'Inbox', 'Jogue aqui primeiro. Organize quando tiver espaço mental.'],
  quests: ['QUESTS', 'Quest da Semana', 'Três cartas, uma escolha e um reroll por carta.'],
  character: ['FICHA', 'Edd', 'Seu nível é geral; sua vida continua multidimensional.'],
  shop: ['RECOMPENSAS', 'Loja', 'Moedas viram permissões reais para aproveitar o que você conquistou.'],
  chronicle: ['CRÔNICA', 'Crônica', 'O histórico do que você fez, sentiu e priorizou.']
};

function isoDateLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date, days) { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; }
function mondayOf(date = new Date()) { const copy = new Date(date); const day = copy.getDay() || 7; copy.setDate(copy.getDate() - day + 1); copy.setHours(0,0,0,0); return copy; }
function sundayOf(date = new Date()) { return addDays(mondayOf(date), 6); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function formatDate(value) { if (!value) return 'sem data'; const d = new Date(`${value}T12:00:00`); return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }); }
function formatDateTime(value) { if (!value) return ''; return new Date(value).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }); }
function showToast(message, type = '') {
  const toast = $('#toast'); toast.textContent = message; toast.className = `toast ${type}`; toast.hidden = false;
  clearTimeout(window.__eddToast); window.__eddToast = setTimeout(() => toast.hidden = true, 3200);
}
function empty(message) { return `<div class="empty-state compact">${escapeHtml(message)}</div>`; }

function computeLevel(totalXp) {
  let level = 1, remaining = Math.max(0, totalXp);
  while (level < 200) {
    const needed = 500 + 150 * (level - 1) + 25 * Math.pow(level - 1, 2);
    if (remaining < needed) return { level, current: remaining, needed, pct: Math.min(100, remaining / needed * 100) };
    remaining -= needed; level++;
  }
  return { level, current: 0, needed: 1, pct: 100 };
}
function totalXp() { return state.xpEvents.reduce((sum, e) => sum + Number(e.amount || 0), 0); }
function coinBalance() { return state.coinTransactions.reduce((sum, e) => sum + Number(e.amount || 0), 0); }
function projectById(id) { return state.projects.find(p => p.id === id); }
function areaById(id) { return state.areas.find(a => a.id === id); }

async function init() {
  const { data: { session } } = await db.auth.getSession();
  await handleSession(session);
  db.auth.onAuthStateChange(async (_event, nextSession) => { if (nextSession?.user?.id !== state.user?.id) await handleSession(nextSession); });
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
  const [areas, projects, tasks, rewards, templates, achievements, checkins, xp, coins, focus] = await Promise.all([
    db.from('areas').select('*').eq('user_id', uid).eq('is_active', true).order('sort_order'),
    db.from('projects').select('*').eq('user_id', uid).eq('is_active', true).order('created_at'),
    db.from('tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    db.from('rewards').select('*').eq('user_id', uid).eq('is_active', true).order('is_featured', { ascending: false }).order('cost'),
    db.from('quest_templates').select('*').eq('is_active', true).order('created_at'),
    db.from('achievements').select('*').order('created_at'),
    db.from('checkins').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(60),
    db.from('xp_events').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(250),
    db.from('coin_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(250),
    db.from('focus_events').select('*').eq('user_id', uid).gte('created_at', since.toISOString()).order('created_at', { ascending: false })
  ]);
  const responses = [areas, projects, tasks, rewards, templates, achievements, checkins, xp, coins, focus];
  const failed = responses.find(r => r.error);
  if (failed) { console.error(failed.error); showToast(`Erro ao carregar dados: ${failed.error.message}`, 'error'); }
  state.areas = areas.data || []; state.projects = projects.data || []; state.tasks = tasks.data || [];
  state.rewards = rewards.data || []; state.questTemplates = templates.data || []; state.achievements = achievements.data || [];
  state.checkins = checkins.data || []; state.xpEvents = xp.data || []; state.coinTransactions = coins.data || []; state.focusEvents = focus.data || [];
  await ensureWeeklyQuests();
}

async function refreshCore() {
  const uid = state.user.id; const since = new Date(); since.setDate(since.getDate() - 8);
  const [tasks, checkins, xp, coins, focus, rewards] = await Promise.all([
    db.from('tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    db.from('checkins').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(60),
    db.from('xp_events').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(250),
    db.from('coin_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(250),
    db.from('focus_events').select('*').eq('user_id', uid).gte('created_at', since.toISOString()).order('created_at', { ascending: false }),
    db.from('rewards').select('*').eq('user_id', uid).eq('is_active', true).order('is_featured', { ascending: false }).order('cost')
  ]);
  state.tasks = tasks.data || []; state.checkins = checkins.data || []; state.xpEvents = xp.data || [];
  state.coinTransactions = coins.data || []; state.focusEvents = focus.data || []; state.rewards = rewards.data || [];
}

async function ensureWeeklyQuests() {
  const weekStart = isoDateLocal(mondayOf());
  const { data, error } = await db.from('weekly_quest_offers').select('*').eq('user_id', state.user.id).eq('week_start', weekStart).order('slot');
  if (error) { console.error(error); return; }
  if (!data?.length && state.questTemplates.length >= 3) {
    const shuffled = [...state.questTemplates].sort(() => Math.random() - .5).slice(0, 3);
    const payload = shuffled.map((q, i) => ({ user_id: state.user.id, week_start: weekStart, quest_template_id: q.id, slot: i + 1 }));
    const inserted = await db.from('weekly_quest_offers').insert(payload).select('*');
    state.questOffers = inserted.data || [];
  } else state.questOffers = data || [];
}

function renderAll() {
  renderNav(); renderProjects(); renderStats(); renderTasks(); renderQuests(); renderCheckin(); renderRewards(); renderCharacter(); renderChronicle(); renderWheel('#wheelContainer'); renderWheel('#chronicleWheel'); populateTaskFormOptions();
}

function renderNav() {
  $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === state.currentView));
  $$('.app-view').forEach(view => view.classList.toggle('active', view.dataset.viewPanel === state.currentView));
  const copy = viewCopy[state.currentView]; $('#pageEyebrow').textContent = copy[0]; $('#pageTitle').textContent = copy[1]; $('#pageSubtitle').textContent = copy[2];
  $('#quickAdd').style.display = ['quests','character','chronicle'].includes(state.currentView) ? 'none' : '';
}
function goView(view) { state.currentView = view; renderNav(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function renderProjects() {
  $('#sidebarProjects').innerHTML = state.projects.map(p => `<button data-project-jump="${p.id}">${escapeHtml(p.name)}</button>`).join('') || '<span class="small-note">nenhum projeto</span>';
  $('#taskProjectFilter').innerHTML = '<option value="all">Todos os projetos</option>' + state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  $('#inboxCount').textContent = state.tasks.filter(t => t.status === 'inbox').length;
}

function renderStats() {
  const xp = totalXp(); const level = computeLevel(xp); const coins = coinBalance();
  $('#levelValue').textContent = level.level; $('#xpProgressText').textContent = `${level.current.toLocaleString('pt-BR')} / ${level.needed.toLocaleString('pt-BR')} XP`; $('#xpProgressBar').style.width = `${level.pct}%`;
  $('#coinValue').textContent = coins.toLocaleString('pt-BR');
  const monday = mondayOf().getTime(); const earnedWeek = state.coinTransactions.filter(c => new Date(c.created_at).getTime() >= monday && Number(c.amount) > 0).reduce((s,c)=>s+Number(c.amount),0);
  $('#coinWeek').textContent = `+${earnedWeek.toLocaleString('pt-BR')} esta semana`;
  const today = isoDateLocal(); const latest = state.checkins.find(c => c.checkin_date === today) || state.checkins[0];
  $('#moodValue').textContent = latest?.mood || '—'; $('#moodPeriod').textContent = latest ? (latest.period === 'morning' ? 'início do dia' : 'fim do dia') : 'sem check-in';
  state.currentEnergy = latest?.energy || state.currentEnergy || 5;
  const dots = $$('#energyMini i'); dots.forEach((d,i)=>d.classList.toggle('off', i >= state.currentEnergy));
  $('#energyMiniText').textContent = latest ? `energia ${state.currentEnergy} = +${bonusByEnergy[state.currentEnergy]}% XP` : 'faça seu check-in';
}

function taskRow(task) {
  const project = projectById(task.project_id); const area = areaById(task.area_id);
  const checked = task.status === 'completed';
  const schedule = task.scheduled_for ? formatDate(task.scheduled_for) : (task.status === 'inbox' ? 'Inbox' : 'sem data');
  return `<div class="task-item ${checked ? 'done' : ''}" data-task-id="${task.id}">
    <input class="task-check" type="checkbox" ${checked ? 'checked' : ''} aria-label="Concluir tarefa">
    <div><span class="task-title">${escapeHtml(task.title)}</span><span class="task-sub">${schedule}${task.due_at ? ` · prazo ${formatDateTime(task.due_at)}` : ''}${task.client_context ? ` · ${escapeHtml(task.client_context)}` : ''}</span></div>
    <div class="task-project"><span class="tag">${escapeHtml(project?.name || 'Sem projeto')}</span></div>
    <div class="task-area">${escapeHtml(area?.name || 'Sem área')}</div>
    <div class="task-difficulty"><span class="difficulty ${task.difficulty}">${difficultyLabels[task.difficulty] || task.difficulty}</span></div>
    <div class="task-reward">${Number(task.xp_base).toLocaleString('pt-BR')} XP · ${task.coin_base} 🪙</div>
    <button class="task-menu" data-task-edit="${task.id}" aria-label="Editar tarefa">•••</button>
  </div>`;
}
function isOpenTask(t) { return !['completed','cancelled'].includes(t.status); }
function todayFilteredTasks(filter) {
  const today = new Date(); today.setHours(0,0,0,0); const tomorrow = addDays(today,1); const weekEnd = sundayOf(today); weekEnd.setHours(23,59,59,999);
  return state.tasks.filter(isOpenTask).filter(t => {
    if (t.status === 'inbox') return false;
    if (!t.scheduled_for) return filter === 'later';
    const d = new Date(`${t.scheduled_for}T12:00:00`);
    if (filter === 'today') return isoDateLocal(d) === isoDateLocal(today);
    if (filter === 'tomorrow') return isoDateLocal(d) === isoDateLocal(tomorrow);
    if (filter === 'week') return d >= today && d <= weekEnd;
    if (filter === 'later') return d > weekEnd;
    return false;
  });
}
function renderTasks() {
  const todayTasks = todayFilteredTasks(state.todayFilter); $('#todayTaskList').innerHTML = todayTasks.length ? todayTasks.map(taskRow).join('') : empty('Nada aqui. Isso também conta como progresso.');
  let all = [...state.tasks]; const status = $('#taskStatusFilter')?.value || 'open'; const project = $('#taskProjectFilter')?.value || 'all';
  if (status === 'open') all = all.filter(isOpenTask); else if (status === 'completed') all = all.filter(t => t.status === 'completed');
  if (project !== 'all') all = all.filter(t => t.project_id === project);
  $('#allTaskList').innerHTML = all.length ? all.map(taskRow).join('') : empty('Nenhuma tarefa com esses filtros.');
  const inbox = state.tasks.filter(t => t.status === 'inbox'); $('#inboxTaskList').innerHTML = inbox.length ? inbox.map(taskRow).join('') : empty('Inbox vazia. Sua cabeça agradece.');
}

function questTemplate(id) { return state.questTemplates.find(q => q.id === id); }
function renderQuests() {
  const cards = state.questOffers.map(offer => {
    const q = questTemplate(offer.quest_template_id); if (!q) return '';
    return `<article class="quest-option ${offer.selected ? 'selected' : ''}" data-offer-id="${offer.id}">
      <div><p class="eyebrow">CARTA ${offer.slot}</p><h4>${escapeHtml(q.title)}</h4></div><p>${escapeHtml(q.description)}</p>
      <div class="quest-meta"><span>+${q.xp_reward} XP</span><span>+${q.coin_reward} 🪙</span><span>${escapeHtml(q.category)}</span></div>
      <div class="quest-actions"><button class="${offer.selected ? 'secondary-action' : 'primary-action'}" data-select-quest="${offer.id}">${offer.selected ? 'Selecionada' : 'Escolher'}</button><button class="secondary-action" data-reroll-quest="${offer.id}" ${offer.rerolled ? 'disabled' : ''}>↻ ${offer.rerolled ? 'usado' : 'reroll'}</button></div>
    </article>`;
  }).join('');
  $('#questGrid').innerHTML = cards || empty('As cartas ainda estão sendo preparadas.');
  const selected = state.questOffers.find(o => o.selected); const q = selected && questTemplate(selected.quest_template_id);
  $('#questWeekLabel').textContent = `semana de ${formatDate(isoDateLocal(mondayOf()))}`;
  $('#activeQuestMini').innerHTML = q ? `<div class="quest-row"><div class="quest-icon">✦</div><div><h4>${escapeHtml(q.title)}</h4><p>${escapeHtml(q.description)}</p><p class="small-note">+${q.xp_reward} XP · +${q.coin_reward} 🪙</p></div></div>` : 'Escolha uma quest na aba Quests.';
}

function currentCheckinForPeriod() { return state.checkins.find(c => c.checkin_date === isoDateLocal() && c.period === $('#checkinPeriod').value); }
function renderCheckin() {
  const existing = currentCheckinForPeriod(); state.checkinMood = existing?.mood || null; if (existing?.energy) state.currentEnergy = existing.energy;
  $$('#moodSelector .mood').forEach(b => b.classList.toggle('selected', b.dataset.mood === state.checkinMood));
  $$('#energySelector button').forEach(b => b.classList.toggle('selected', Number(b.dataset.level) <= state.currentEnergy));
  $('#energyBonus').textContent = `Energia ${state.currentEnergy} · bônus atual: +${bonusByEnergy[state.currentEnergy]}% XP`;
  $('#checkinNote').value = existing?.note || '';
}

function renderRewards() {
  const balance = coinBalance();
  $('#rewardGrid').innerHTML = state.rewards.length ? state.rewards.map(r => `<article class="reward-card ${r.is_featured ? 'featured' : ''}"><div><p class="eyebrow">${r.is_featured ? 'META EM DESTAQUE' : 'RECOMPENSA'}</p><h4>${escapeHtml(r.name)}</h4></div><p class="muted">${escapeHtml(r.description || '')}</p><div class="reward-cost">${Number(r.cost).toLocaleString('pt-BR')} 🪙</div><button class="${balance >= r.cost ? 'primary-action' : 'secondary-action'}" data-redeem="${r.id}" ${balance < r.cost ? 'disabled' : ''}>${balance >= r.cost ? 'Resgatar' : `faltam ${(r.cost-balance).toLocaleString('pt-BR')}`}</button></article>`).join('') : empty('Adicione sua primeira recompensa.');
  const featured = state.rewards.find(r => r.is_featured) || state.rewards[0];
  $('#featuredReward').innerHTML = featured ? `<div class="goal-row"><div><h4>${escapeHtml(featured.name)}</h4><p>${balance.toLocaleString('pt-BR')} / ${Number(featured.cost).toLocaleString('pt-BR')} moedas</p><div class="progress"><span style="width:${Math.min(100,balance/featured.cost*100)}%"></span></div><p class="muted">${balance >= featured.cost ? 'Você já pode resgatar.' : `Faltam ${(featured.cost-balance).toLocaleString('pt-BR')} moedas.`}</p></div><div class="goal-icon">🎁</div></div><button class="secondary-action full" data-go-view="shop">Ver loja</button>` : 'Crie uma recompensa em destaque na Loja.';
}

function renderCharacter() {
  const xp = totalXp(), coins = coinBalance(), level = computeLevel(xp), completed = state.tasks.filter(t => t.status === 'completed').length;
  $('#sheetLevel').textContent = level.level; $('#sheetXp').textContent = xp.toLocaleString('pt-BR'); $('#sheetCoins').textContent = coins.toLocaleString('pt-BR'); $('#sheetCompleted').textContent = completed;
  $('#achievementList').innerHTML = state.achievements.map(a => `<div class="achievement-item"><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.description)}</span></div>`).join('') || empty('Conquistas ainda não carregadas.');
  $('#achievementPreview').innerHTML = state.achievements.slice(0,3).map(a => `<div class="history-row"><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.category || '')}</span></div>`).join('') || 'Suas conquistas aparecem aqui.';
}

function renderWheel(selector) {
  const el = $(selector); if (!el) return;
  const pointsByArea = Object.fromEntries(state.areas.map(a => [a.id, 0])); state.focusEvents.forEach(e => { if (pointsByArea[e.area_id] !== undefined) pointsByArea[e.area_id] += Number(e.amount || 0); });
  const areas = state.areas.slice(0,8); if (!areas.length) { el.innerHTML = empty('A roda aparece assim que suas áreas forem criadas.'); return; }
  const center = 160, radius = 112;
  const currentPts = areas.map((a,i) => { const score = Math.max(0, Math.min(100, (pointsByArea[a.id] || 0) / Math.max(1,a.weekly_focus_target) * 100)); const angle = (-Math.PI/2)+(i*2*Math.PI/areas.length); const r = radius*score/100; return `${(center+Math.cos(angle)*r).toFixed(1)},${(center+Math.sin(angle)*r).toFixed(1)}`; }).join(' ');
  const targetPts = areas.map((a,i)=>{ const angle=(-Math.PI/2)+(i*2*Math.PI/areas.length); const r=radius*.8; return `${(center+Math.cos(angle)*r).toFixed(1)},${(center+Math.sin(angle)*r).toFixed(1)}`;}).join(' ');
  const rings = [20,40,60,80,100].map(p => `<polygon points="${areas.map((a,i)=>{const angle=(-Math.PI/2)+(i*2*Math.PI/areas.length),r=radius*p/100;return `${(center+Math.cos(angle)*r).toFixed(1)},${(center+Math.sin(angle)*r).toFixed(1)}`;}).join(' ')}"/>`).join('');
  const axes = areas.map((a,i)=>{const angle=(-Math.PI/2)+(i*2*Math.PI/areas.length);return `<line x1="160" y1="160" x2="${(center+Math.cos(angle)*radius).toFixed(1)}" y2="${(center+Math.sin(angle)*radius).toFixed(1)}"/>`;}).join('');
  const labels = areas.map((a,i)=>{const angle=(-Math.PI/2)+(i*2*Math.PI/areas.length),r=radius+27; const x=center+Math.cos(angle)*r,y=center+Math.sin(angle)*r; const short=a.name.replace(' & Relacionamentos','').replace(' & Criatividade','').replace(' & Vida Prática',''); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${escapeHtml(short)}</text>`;}).join('');
  const ranked = areas.map(a=>({name:a.name,score:(pointsByArea[a.id]||0)/Math.max(1,a.weekly_focus_target)})).sort((a,b)=>b.score-a.score);
  el.innerHTML = `<div class="wheel-layout"><svg class="wheel" viewBox="0 0 320 320"><g class="wheel-grid">${rings}${axes}</g><polygon class="wheel-target" points="${targetPts}"></polygon><polygon class="wheel-current" points="${currentPts}"></polygon><g class="wheel-labels">${labels}</g></svg><div class="wheel-note"><p><strong>${escapeHtml(ranked[0]?.name || '—')}</strong> recebeu mais foco recentemente. A roda mede atenção no período, não um nível permanente.</p></div></div>`;
}

function renderChronicle() {
  $('#checkinHistory').innerHTML = state.checkins.length ? state.checkins.slice(0,12).map(c => `<div class="history-row"><strong>${formatDate(c.checkin_date)} · ${c.period === 'morning' ? 'início' : 'fim'}</strong><span>${escapeHtml(c.mood || '—')} · energia ${c.energy}</span></div>`).join('') : empty('Nenhum check-in registrado ainda.');
  const ledger = [
    ...state.xpEvents.slice(0,20).map(e => ({at:e.created_at,label:e.reason || 'XP',value:`${e.amount>0?'+':''}${e.amount} XP`})),
    ...state.coinTransactions.slice(0,20).map(e => ({at:e.created_at,label:e.reason || 'Moedas',value:`${e.amount>0?'+':''}${e.amount} 🪙`}))
  ].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,30);
  $('#progressLedger').innerHTML = ledger.length ? ledger.map(e=>`<div class="history-row"><strong>${escapeHtml(e.label)}</strong><span>${escapeHtml(e.value)} · ${formatDateTime(e.at)}</span></div>`).join('') : empty('Seu extrato começa quando você conclui a primeira tarefa.');
}

function populateTaskFormOptions() {
  $('#taskProject').innerHTML = '<option value="">Sem projeto</option>' + state.projects.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  $('#taskArea').innerHTML = '<option value="">Sem área</option>' + state.areas.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
}
function openTaskModal(task = null) {
  state.editingTaskId = task?.id || null; $('#taskModal').hidden = false;
  $('#taskTitle').value = task?.title || ''; $('#taskKind').value = task?.kind === 'quest' ? 'task' : (task?.kind || 'task'); $('#taskDifficulty').value = task?.difficulty || 'medium'; $('#taskPriority').value = task?.priority || 'normal';
  $('#taskProject').value = task?.project_id || ''; $('#taskArea').value = task?.area_id || ''; $('#taskScheduled').value = task?.scheduled_for || ''; $('#taskContext').value = task?.client_context || ''; $('#taskDescription').value = task?.description || '';
  $('#taskDue').value = task?.due_at ? new Date(new Date(task.due_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16) : '';
  $('#taskTitle').focus();
}
function closeModal(id) { $(`#${id}`).hidden = true; }

async function saveTask(statusOverride = null) {
  const scheduled = $('#taskScheduled').value || null; const dueLocal = $('#taskDue').value; const status = statusOverride || (scheduled ? 'planned' : 'inbox');
  const payload = { user_id: state.user.id, title: $('#taskTitle').value.trim(), kind: $('#taskKind').value, difficulty: $('#taskDifficulty').value, priority: $('#taskPriority').value, project_id: $('#taskProject').value || null, area_id: $('#taskArea').value || null, scheduled_for: scheduled, due_at: dueLocal ? new Date(dueLocal).toISOString() : null, client_context: $('#taskContext').value.trim() || null, description: $('#taskDescription').value.trim() || null, source: 'manual', status };
  if (!payload.title) return showToast('Dê um nome para a tarefa.', 'error');
  let response;
  if (state.editingTaskId) response = await db.from('tasks').update(payload).eq('id', state.editingTaskId).eq('user_id', state.user.id);
  else response = await db.from('tasks').insert(payload);
  if (response.error) return showToast(response.error.message, 'error');
  closeModal('taskModal'); state.editingTaskId = null; await refreshCore(); renderAll(); showToast('Tarefa salva.', 'success');
}

async function toggleTask(taskId, shouldComplete) {
  const task = state.tasks.find(t=>t.id===taskId); if (!task) return;
  const fn = shouldComplete ? 'complete_task' : 'reopen_task'; const args = shouldComplete ? { p_task_id: taskId, p_energy: state.currentEnergy || 5 } : { p_task_id: taskId };
  const { data, error } = await db.rpc(fn, args);
  if (error) return showToast(error.message, 'error');
  await refreshCore(); renderAll();
  if (shouldComplete) showToast(`Concluída: +${data.xp} XP · +${data.coins} moedas`, 'success'); else showToast('Tarefa reaberta e recompensas revertidas.');
}

async function saveCheckin() {
  if (!state.checkinMood) return showToast('Escolha um humor antes de salvar.', 'error');
  const row = { user_id: state.user.id, checkin_date: isoDateLocal(), period: $('#checkinPeriod').value, mood: state.checkinMood, energy: state.currentEnergy, note: $('#checkinNote').value.trim() || null };
  const { error } = await db.from('checkins').upsert(row, { onConflict: 'user_id,checkin_date,period' });
  if (error) return showToast(error.message, 'error');
  await refreshCore(); renderAll(); showToast('Check-in salvo.', 'success');
}

async function selectQuest(offerId) {
  await db.from('weekly_quest_offers').update({ selected:false }).eq('user_id', state.user.id).eq('week_start', isoDateLocal(mondayOf()));
  const { error } = await db.from('weekly_quest_offers').update({ selected:true }).eq('id', offerId).eq('user_id', state.user.id);
  if (error) return showToast(error.message,'error');
  const { data } = await db.from('weekly_quest_offers').select('*').eq('user_id',state.user.id).eq('week_start',isoDateLocal(mondayOf())).order('slot'); state.questOffers=data||[]; renderQuests(); showToast('Quest escolhida.', 'success');
}
async function rerollQuest(offerId) {
  const offer = state.questOffers.find(o=>o.id===offerId); if (!offer || offer.rerolled) return;
  const used = new Set(state.questOffers.map(o=>o.quest_template_id)); const choices = state.questTemplates.filter(q=>!used.has(q.id)); if (!choices.length) return showToast('Não há outra carta disponível para reroll.', 'error');
  const replacement = choices[Math.floor(Math.random()*choices.length)]; const { error } = await db.from('weekly_quest_offers').update({ quest_template_id: replacement.id, rerolled:true, selected:false }).eq('id',offerId).eq('user_id',state.user.id);
  if (error) return showToast(error.message,'error'); offer.quest_template_id=replacement.id; offer.rerolled=true; offer.selected=false; renderQuests(); showToast('Carta rerrolada.');
}

async function saveReward() {
  const payload = { user_id:state.user.id, name:$('#rewardName').value.trim(), description:$('#rewardDescription').value.trim()||null, cost:Number($('#rewardCost').value), category:'real', is_featured:$('#rewardFeatured').checked };
  if (!payload.name || !payload.cost) return showToast('Preencha nome e custo.', 'error');
  if (payload.is_featured) await db.from('rewards').update({is_featured:false}).eq('user_id',state.user.id);
  const { error } = await db.from('rewards').insert(payload); if (error) return showToast(error.message,'error');
  closeModal('rewardModal'); $('#rewardForm').reset(); await refreshCore(); renderAll(); showToast('Recompensa criada.', 'success');
}
async function redeemReward(id) {
  const reward = state.rewards.find(r=>r.id===id); if (!reward) return;
  if (!confirm(`Resgatar “${reward.name}” por ${reward.cost} moedas?`)) return;
  const { data, error } = await db.rpc('redeem_reward',{p_reward_id:id}); if (error) return showToast(error.message,'error');
  await refreshCore(); renderAll(); showToast(`Resgatado: ${data.reward}. Saldo: ${data.balance_after} moedas.`, 'success');
}

$('#authForm').addEventListener('submit', async e => {
  e.preventDefault(); $('#authMessage').textContent='Entrando…';
  const { error } = await db.auth.signInWithPassword({ email:$('#authEmail').value.trim(), password:$('#authPassword').value });
  $('#authMessage').textContent = error ? error.message : '';
});
$('#signUpButton').addEventListener('click', async () => {
  const email=$('#authEmail').value.trim(), password=$('#authPassword').value; if(!email||password.length<6){$('#authMessage').textContent='Use um e-mail válido e uma senha com pelo menos 6 caracteres.';return;}
  $('#authMessage').textContent='Criando conta…'; const { data,error }=await db.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin,data:{display_name:'Edd'}}});
  $('#authMessage').textContent=error?error.message:(data.session?'Conta criada.':'Conta criada. Confira seu e-mail para confirmar e depois volte para entrar.');
});
$('#signOutButton').addEventListener('click',()=>db.auth.signOut());
$('#quickAdd').addEventListener('click',()=>openTaskModal());
$('#newRewardButton').addEventListener('click',()=>$('#rewardModal').hidden=false);
$('#taskForm').addEventListener('submit',e=>{e.preventDefault();saveTask();});
$('#sendToInbox').addEventListener('click',()=>saveTask('inbox'));
$('#rewardForm').addEventListener('submit',e=>{e.preventDefault();saveReward();});
$('#saveCheckin').addEventListener('click',saveCheckin);
$('#checkinPeriod').addEventListener('change',renderCheckin);
$('#taskStatusFilter').addEventListener('change',renderTasks); $('#taskProjectFilter').addEventListener('change',renderTasks);
$('#taskProject').addEventListener('change',e=>{const p=projectById(e.target.value);if(p?.area_id)$('#taskArea').value=p.area_id;});

$('#todayTabs').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.todayFilter=b.dataset.filter;$$('#todayTabs .tab').forEach(x=>x.classList.toggle('active',x===b));renderTasks();});
$('#moodSelector').addEventListener('click',e=>{const b=e.target.closest('[data-mood]');if(!b)return;state.checkinMood=b.dataset.mood;$$('#moodSelector .mood').forEach(x=>x.classList.toggle('selected',x===b));});
$('#energySelector').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(!b)return;state.currentEnergy=Number(b.dataset.level);$$('#energySelector button').forEach(x=>x.classList.toggle('selected',Number(x.dataset.level)<=state.currentEnergy));$('#energyBonus').textContent=`Energia ${state.currentEnergy} · bônus atual: +${bonusByEnergy[state.currentEnergy]}% XP`;});

document.addEventListener('click',async e=>{
  const nav=e.target.closest('[data-view]');if(nav){goView(nav.dataset.view);return;}
  const go=e.target.closest('[data-go-view]');if(go){goView(go.dataset.goView);return;}
  const close=e.target.closest('[data-close-modal]');if(close){closeModal(close.dataset.closeModal);return;}
  const edit=e.target.closest('[data-task-edit]');if(edit){openTaskModal(state.tasks.find(t=>t.id===edit.dataset.taskEdit));return;}
  const select=e.target.closest('[data-select-quest]');if(select){await selectQuest(select.dataset.selectQuest);return;}
  const reroll=e.target.closest('[data-reroll-quest]');if(reroll){await rerollQuest(reroll.dataset.rerollQuest);return;}
  const redeem=e.target.closest('[data-redeem]');if(redeem){await redeemReward(redeem.dataset.redeem);return;}
  const project=e.target.closest('[data-project-jump]');if(project){goView('tasks');$('#taskProjectFilter').value=project.dataset.projectJump;renderTasks();return;}
});
document.addEventListener('change',async e=>{if(e.target.matches('.task-check')){const row=e.target.closest('[data-task-id]');if(row)await toggleTask(row.dataset.taskId,e.target.checked);}});
$$('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',e=>{if(e.target===backdrop)backdrop.hidden=true;}));

init().catch(error=>{console.error(error);showToast(error.message||'Erro ao iniciar o app.','error');});