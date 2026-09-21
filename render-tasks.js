function renderAll() {
  if (!state.user) return;
  viewCopy.today[1] = greeting();
  renderNav(); renderProjects(); renderCheckin(); renderStats(); renderFilters(); renderTaskBoards();
  renderQuests(); renderRewards(); renderCharacter(); renderChronicle(); populateTaskFormOptions(); setAvatarSources();
}
function renderNav() {
  $$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===state.currentView));
  $$('.app-view').forEach(view=>view.classList.toggle('active',view.dataset.viewPanel===state.currentView));
  const copy=viewCopy[state.currentView]; $('#pageEyebrow').textContent=copy[0]; $('#pageTitle').textContent=copy[1]; $('#pageSubtitle').textContent=copy[2];
}
function goView(view) { state.currentView=view; renderNav(); window.scrollTo({top:0,behavior:'smooth'}); }
function renderProjects() {
  $('#sidebarProjects').innerHTML=state.projects.map(p=>`<button data-project-jump="${p.id}">${escapeHtml(p.name)}</button>`).join('')||'<span class="week-label">nenhum projeto</span>';
  $('#inboxCount').textContent=state.tasks.filter(t=>t.status==='inbox').length;
}

function renderCheckin() {
  const slot=currentPeriod(); const existing=todaysCheckin(slot.id); const top=$('#checkinSpotlight'); const compact=$('#answeredCheckinCompact');
  compact.innerHTML='';
  if (existing) {
    top.innerHTML='';
    compact.innerHTML=`<section class="rpg-panel checkin-card collapsed"><div class="checkin-head"><div><p class="eyebrow">CHECK-IN DA ${slot.label.toUpperCase()}</p><h3>Registrado ✓</h3><div class="checkin-summary"><span class="summary-chip">${escapeHtml(existing.mood||'—')}</span><span class="summary-chip">energia ${existing.energy}/5</span><span class="summary-chip">+${bonusByEnergy[existing.energy]}% XP</span></div></div><span class="period-pill">próximo: ${slot.next}</span></div></section>`;
    return;
  }
  state.checkinMood=state.checkinMood||'Tranquilo'; state.checkinEnergy=state.checkinEnergy||4;
  top.innerHTML=`<section class="rpg-panel checkin-card"><div class="checkin-head"><div><p class="eyebrow">CHECK-IN DA ${slot.label.toUpperCase()}</p><h3>Como você está agora?</h3><p class="muted">Três lembretes no dia: manhã, tarde e noite. Respondeu? Ele sai do caminho até a próxima janela.</p></div><span class="period-pill">agora: ${slot.label}</span></div><div class="checkin-body"><div class="field-block"><span class="field-label">Humor</span><div class="mood-row" id="moodSelector">${moodOptions.map(([name,emoji])=>`<button class="mood ${state.checkinMood===name?'selected':''}" data-mood="${name}" title="${name}">${emoji}</button>`).join('')}</div></div><div class="field-block"><span class="field-label">Energia</span><div class="energy-row" id="energySelector">${[1,2,3,4,5].map(n=>`<button class="energy-dot-btn ${state.checkinEnergy===n?'selected':''}" data-level="${n}">${n}</button>`).join('')}</div><span class="week-label">energia ${state.checkinEnergy} = +${bonusByEnergy[state.checkinEnergy]}% XP</span></div><div class="field-block"><span class="field-label">Nota rápida</span><textarea class="checkin-note" id="checkinNote" placeholder="opcional">${escapeHtml(state.checkinNote||'')}</textarea></div><button class="btn primary" id="saveCheckin">salvar</button></div></section>`;
}
async function saveCheckin() {
  if (!state.checkinMood) return showToast('Escolha um humor.', 'error');
  const slot=currentPeriod();
  const row={user_id:state.user.id,checkin_date:isoDateLocal(),period:slot.id,mood:state.checkinMood,energy:state.checkinEnergy,note:$('#checkinNote')?.value.trim()||null};
  const {error}=await db.from('checkins').upsert(row,{onConflict:'user_id,checkin_date,period'});
  if (error) return showToast(error.message,'error');
  state.checkinNote=''; await refreshCore(); renderAll(); showToast('Check-in salvo.','success');
}

function renderStats() {
  const xp=totalXp(), level=computeLevel(xp), coins=coinBalance(), latest=latestTodayCheckin();
  const monday=mondayOf().getTime(); const earnedWeek=state.coinTransactions.filter(c=>new Date(c.created_at).getTime()>=monday&&Number(c.amount)>0).reduce((s,c)=>s+Number(c.amount),0);
  const cards=[
    {label:'Nível',value:level.level,icon:'✨',foot:`${level.current.toLocaleString('pt-BR')} / ${level.needed.toLocaleString('pt-BR')} XP`,progress:level.pct},
    {label:'Moedas',value:coins.toLocaleString('pt-BR'),icon:'🪙',foot:`+${earnedWeek.toLocaleString('pt-BR')} esta semana`},
    {label:'Humor',value:latest?.mood||'—',icon:'💭',foot:latest?`check-in da ${periodLabel(latest.period)}`:'sem check-in hoje'},
    {label:'Energia',value:latest?`${latest.energy}/5`:'—',icon:'⚡',foot:latest?`+${bonusByEnergy[latest.energy]}% XP`:'faça o check-in'}
  ];
  $('#statsGrid').innerHTML=cards.map(c=>`<article class="rpg-panel stat-card"><div class="stat-top"><div><div class="stat-label">${c.label}</div><div class="stat-value">${escapeHtml(c.value)}</div></div><div class="stat-icon">${c.icon}</div></div><div class="stat-foot">${escapeHtml(c.foot)}</div>${c.progress!==undefined?`<div class="progress"><span style="width:${c.progress}%"></span></div>`:''}</article>`).join('');
}

function filterMarkup(scope) {
  const f=state.filters[scope];
  const projectOptions=state.projects.map(p=>`<option value="${p.id}" ${f.project===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('');
  return `<div class="filter-field"><label>Busca</label><input type="search" data-filter-scope="${scope}" data-filter-key="search" value="${escapeHtml(f.search)}" placeholder="nome da tarefa…"></div><div class="filter-field"><label>Quando</label><select data-filter-scope="${scope}" data-filter-key="timeframe"><option value="all" ${f.timeframe==='all'?'selected':''}>Tudo</option><option value="today" ${f.timeframe==='today'?'selected':''}>Hoje</option><option value="tomorrow" ${f.timeframe==='tomorrow'?'selected':''}>Amanhã</option><option value="after_tomorrow" ${f.timeframe==='after_tomorrow'?'selected':''}>Depois de amanhã</option><option value="week" ${f.timeframe==='week'?'selected':''}>Próx. 7 dias</option><option value="later" ${f.timeframe==='later'?'selected':''}>Mais tarde</option><option value="unscheduled" ${f.timeframe==='unscheduled'?'selected':''}>Sem data</option></select></div><div class="filter-field"><label>Prioridade</label><select data-filter-scope="${scope}" data-filter-key="priority"><option value="all">Todas</option>${['urgent','high','normal','low'].map(v=>`<option value="${v}" ${f.priority===v?'selected':''}>${priorityLabels[v]}</option>`).join('')}</select></div><div class="filter-field"><label>Dificuldade</label><select data-filter-scope="${scope}" data-filter-key="difficulty"><option value="all">Todas</option>${Object.keys(difficultyLabels).map(v=>`<option value="${v}" ${f.difficulty===v?'selected':''}>${difficultyLabels[v]}</option>`).join('')}</select></div><div class="filter-field"><label>Projeto</label><select data-filter-scope="${scope}" data-filter-key="project"><option value="all">Todos</option>${projectOptions}</select></div>${scope==='planner'?`<div class="filter-field"><label>Status</label><select data-filter-scope="planner" data-filter-key="status"><option value="open" ${f.status==='open'?'selected':''}>Abertas</option><option value="all" ${f.status==='all'?'selected':''}>Todas</option><option value="completed" ${f.status==='completed'?'selected':''}>Concluídas</option><option value="inbox" ${f.status==='inbox'?'selected':''}>Inbox</option><option value="replan" ${f.status==='replan'?'selected':''}>Replanejar</option></select></div>`:''}<div class="filter-field"><label>Ordenar</label><select data-filter-scope="${scope}" data-filter-key="sort"><option value="date" ${f.sort==='date'?'selected':''}>Data</option><option value="priority" ${f.sort==='priority'?'selected':''}>Prioridade</option><option value="difficulty" ${f.sort==='difficulty'?'selected':''}>Dificuldade</option><option value="newest" ${f.sort==='newest'?'selected':''}>Mais novas</option></select></div>`;
}
function renderFilters() { $('#homeTaskFilters').innerHTML=filterMarkup('home'); $('#plannerTaskFilters').innerHTML=filterMarkup('planner'); }
function isOpenTask(t){return !['completed','cancelled'].includes(t.status)}
function isNeedsReplan(t){return isOpenTask(t)&&t.status!=='inbox'&&t.scheduled_for&&t.scheduled_for<isoDateLocal()}
function taskMatches(task,f,scope){
  if(scope==='home'&&!isOpenTask(task))return false;
  if(f.search){const q=f.search.toLowerCase();const hay=`${task.title} ${task.description||''} ${task.client_context||''} ${projectById(task.project_id)?.name||''} ${areaById(task.area_id)?.name||''}`.toLowerCase();if(!hay.includes(q))return false;}
  if(f.priority!=='all'&&task.priority!==f.priority)return false;
  if(f.difficulty!=='all'&&task.difficulty!==f.difficulty)return false;
  if(f.project!=='all'&&task.project_id!==f.project)return false;
  if(scope==='planner'){
    if(f.status==='open'&&!isOpenTask(task))return false;
    if(f.status==='completed'&&task.status!=='completed')return false;
    if(f.status==='inbox'&&task.status!=='inbox')return false;
    if(f.status==='replan'&&!isNeedsReplan(task))return false;
  }
  const today=isoDateLocal(),tomorrow=isoDateLocal(addDays(new Date(),1)),after=isoDateLocal(addDays(new Date(),2)),weekEnd=isoDateLocal(addDays(new Date(),7));
  if(f.timeframe==='today'&&task.scheduled_for!==today)return false;
  if(f.timeframe==='tomorrow'&&task.scheduled_for!==tomorrow)return false;
  if(f.timeframe==='after_tomorrow'&&task.scheduled_for!==after)return false;
  if(f.timeframe==='week'&&!(task.scheduled_for&&task.scheduled_for>=today&&task.scheduled_for<=weekEnd))return false;
  if(f.timeframe==='later'&&!(task.scheduled_for&&task.scheduled_for>weekEnd))return false;
  if(f.timeframe==='unscheduled'&&task.scheduled_for)return false;
  return true;
}
function sortTasks(list,sort){const p={urgent:0,high:1,normal:2,low:3},d={epic:0,complex:1,medium:2,simple:3,micro:4};return [...list].sort((a,b)=>{if(sort==='priority')return p[a.priority]-p[b.priority]||(a.scheduled_for||'9999').localeCompare(b.scheduled_for||'9999');if(sort==='difficulty')return d[a.difficulty]-d[b.difficulty]||(a.scheduled_for||'9999').localeCompare(b.scheduled_for||'9999');if(sort==='newest')return new Date(b.created_at)-new Date(a.created_at);return (a.scheduled_for||'9999').localeCompare(b.scheduled_for||'9999')||p[a.priority]-p[b.priority];});}
function renderTaskBoards(){renderTaskBoard('#todayTaskList','home');renderTaskBoard('#allTaskList','planner');renderInbox();}
function renderTaskBoard(selector,scope){const f=state.filters[scope];let list=state.tasks.filter(t=>taskMatches(t,f,scope));list=sortTasks(list,f.sort);const el=$(selector);if(!list.length){el.innerHTML=empty('Nada com esses filtros.');return;}el.innerHTML=`<div class="task-header"><span></span><span>Tarefa</span><span>Projeto</span><span>Planejado</span><span>Dificuldade</span><span>Prioridade</span><span>Recompensa</span><span></span></div>${list.map(taskRow).join('')}`;}
function renderInbox(){const el=$('#inboxTaskList');const list=state.tasks.filter(t=>t.status==='inbox');el.innerHTML=list.length?`<div class="task-header"><span></span><span>Tarefa</span><span>Projeto</span><span>Planejado</span><span>Dificuldade</span><span>Prioridade</span><span>Recompensa</span><span></span></div>${list.map(taskRow).join('')}`:empty('Inbox vazia. Sua cabeça agradece.');}
function taskRow(t){const project=projectById(t.project_id),area=areaById(t.area_id),done=t.status==='completed',replan=isNeedsReplan(t),overdue=t.due_at&&new Date(t.due_at)<new Date()&&!done;const planned=t.scheduled_for?(replan?`replanejar · ${formatDate(t.scheduled_for)}`:formatDate(t.scheduled_for)):(t.status==='inbox'?'Inbox':'sem data');return `<div class="task-row ${done?'completed':''} ${overdue?'overdue':''}" data-task-id="${t.id}"><input class="task-check" type="checkbox" ${done?'checked':''} aria-label="Concluir tarefa"><div><span class="task-title">${escapeHtml(t.title)}</span><span class="task-sub">${escapeHtml(area?.name||'Sem área')}${t.due_at?` · prazo ${escapeHtml(formatDateTime(t.due_at))}`:''}${t.client_context?` · ${escapeHtml(t.client_context)}`:''}</span></div><div><span class="tag">${escapeHtml(project?.name||'Sem projeto')}</span></div><div><span class="date-chip ${replan||overdue?'overdue':''}">${escapeHtml(planned)}</span></div><div><span class="difficulty ${t.difficulty}">${difficultyLabels[t.difficulty]||t.difficulty}</span></div><div><span class="priority ${t.priority}">${priorityLabels[t.priority]||t.priority}</span></div><div class="reward-text">${Number(t.xp_base).toLocaleString('pt-BR')} XP · ${t.coin_base} 🪙</div><button class="row-menu" data-task-edit="${t.id}" aria-label="Editar">•••</button></div>`;}
