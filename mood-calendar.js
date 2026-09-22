(function installMoodCalendar(){
  const extraMoods=[
    ['Cansado','😴'],
    ['Sem vontade','😑'],
    ['Frustrado','😤'],
    ['Com preguiça','🫠']
  ];
  extraMoods.forEach(([name,emoji])=>{if(!moodOptions.some(([m])=>m===name))moodOptions.push([name,emoji]);});

  state.moodCalendarMonth=state.moodCalendarMonth||new Date(new Date().getFullYear(),new Date().getMonth(),1);
  state.moodCalendarCache=state.moodCalendarCache||{};

  const periodIcons={morning:'☀',afternoon:'◐',evening:'☾'};
  const periodOrder={morning:1,afternoon:2,evening:3};
  const monthFmt=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'});
  const weekdayLabels=['seg','ter','qua','qui','sex','sáb','dom'];

  function emojiForMood(name){return moodOptions.find(([m])=>m===name)?.[1]||'•';}
  function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
  function firstMondayOffset(d){const day=d.getDay();return day===0?6:day-1;}

  async function loadMonth(month){
    const key=monthKey(month);
    if(state.moodCalendarCache[key])return state.moodCalendarCache[key];
    if(!state.user)return [];
    const first=new Date(month.getFullYear(),month.getMonth(),1);
    const last=new Date(month.getFullYear(),month.getMonth()+1,0);
    const {data,error}=await db.from('checkins').select('*').eq('user_id',state.user.id).gte('checkin_date',iso(first)).lte('checkin_date',iso(last)).order('checkin_date',{ascending:true});
    if(error){console.error(error);showToast('Não consegui carregar o calendário de check-ins.','error');return [];}
    state.moodCalendarCache[key]=data||[];
    return data||[];
  }

  function ensurePanel(){
    const layout=document.querySelector('[data-view-panel="character"] .character-layout');
    if(!layout)return null;
    let panel=document.getElementById('moodCalendarPanel');
    if(!panel){
      panel=document.createElement('section');
      panel.id='moodCalendarPanel';
      panel.className='rpg-panel mood-calendar-panel';
      layout.appendChild(panel);
    }
    return panel;
  }

  function monthStats(entries){
    if(!entries.length)return {avg:'—',mood:'—',count:0};
    const avg=(entries.reduce((s,e)=>s+Number(e.energy||0),0)/entries.length).toFixed(1).replace('.',',');
    const counts={}; entries.forEach(e=>{if(e.mood)counts[e.mood]=(counts[e.mood]||0)+1;});
    const mood=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
    return {avg,mood,count:entries.length};
  }

  async function renderMoodCalendar(){
    const panel=ensurePanel(); if(!panel||!state.user)return;
    const month=new Date(state.moodCalendarMonth.getFullYear(),state.moodCalendarMonth.getMonth(),1);
    panel.innerHTML='<div class="mood-calendar-loading">carregando calendário…</div>';
    const entries=await loadMonth(month);
    if(!document.body.contains(panel))return;
    const byDay={};
    entries.forEach(e=>{(byDay[e.checkin_date]??=[]).push(e);});
    Object.values(byDay).forEach(list=>list.sort((a,b)=>(periodOrder[a.period]||0)-(periodOrder[b.period]||0)));
    const first=new Date(month.getFullYear(),month.getMonth(),1);
    const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    const offset=firstMondayOffset(first);
    const today=iso(new Date());
    const stats=monthStats(entries);
    const currentMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
    const canNext=month<currentMonth;

    const cells=[];
    for(let i=0;i<offset;i++)cells.push('<div class="mood-day empty" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++){
      const date=new Date(month.getFullYear(),month.getMonth(),day),key=iso(date),items=byDay[key]||[];
      const rows=items.map(c=>`<div class="mood-checkin-line" title="${escapeHtml(periodLabel(c.period))}: ${escapeHtml(c.mood||'—')} · energia ${c.energy}/5"><span class="mood-period">${periodIcons[c.period]||'•'}</span><span class="mood-emoji">${emojiForMood(c.mood)}</span><span class="mood-energy">${c.energy}/5</span></div>`).join('');
      cells.push(`<div class="mood-day ${key===today?'today':''} ${items.length?'has-checkin':''}"><div class="mood-day-number">${day}</div><div class="mood-day-checkins">${rows||'<span class="mood-no-checkin">—</span>'}</div></div>`);
    }

    panel.innerHTML=`
      <div class="mood-calendar-head">
        <div><p class="eyebrow">HUMOR & ENERGIA</p><h3>Calendário de check-ins</h3><p class="muted">Acompanhe como você esteve ao longo dos dias, sem transformar isso em meta.</p></div>
        <div class="mood-calendar-nav"><button type="button" class="chip" data-mood-month="prev" aria-label="Mês anterior">‹</button><strong>${escapeHtml(monthFmt.format(month))}</strong><button type="button" class="chip" data-mood-month="next" aria-label="Próximo mês" ${canNext?'':'disabled'}>›</button></div>
      </div>
      <div class="mood-month-summary"><span><small>energia média</small><strong>${stats.avg}${stats.avg==='—'?'':'/5'}</strong></span><span><small>humor mais frequente</small><strong>${stats.mood==='—'?'—':emojiForMood(stats.mood)+' '+escapeHtml(stats.mood)}</strong></span><span><small>check-ins</small><strong>${stats.count}</strong></span></div>
      <div class="mood-calendar-weekdays">${weekdayLabels.map(d=>`<span>${d}</span>`).join('')}</div>
      <div class="mood-calendar-grid">${cells.join('')}</div>
      <div class="mood-calendar-legend"><span>☀ manhã</span><span>◐ tarde</span><span>☾ noite</span><span>energia em escala de 1–5</span></div>`;
  }

  const baseRenderCharacter=renderCharacter;
  renderCharacter=function(){baseRenderCharacter();renderMoodCalendar();};

  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-mood-month]'); if(!nav)return;
    const dir=nav.dataset.moodMonth==='prev'?-1:1;
    const next=new Date(state.moodCalendarMonth.getFullYear(),state.moodCalendarMonth.getMonth()+dir,1);
    const current=new Date(new Date().getFullYear(),new Date().getMonth(),1);
    if(next>current)return;
    state.moodCalendarMonth=next; renderMoodCalendar();
  });

  if(state.user)renderMoodCalendar();
})();
