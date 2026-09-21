(function installLifeBalance(){
  state.checkinAreas = state.checkinAreas || [];
  state.momentAreas = [];

  const originalTaskMatches = taskMatches;
  taskMatches = function(task,f,scope){
    if(task.source==='life_moment' || task.source==='life_presence') return false;
    return originalTaskMatches(task,f,scope);
  };

  function lifeTasks(kind){
    return state.tasks.filter(t=>t.source===`life_${kind}` && t.status!=='cancelled');
  }
  function focusAreasForTask(taskId){
    return [...new Set(state.focusEvents.filter(e=>e.task_id===taskId && e.area_id).map(e=>e.area_id))];
  }
  function selectedAreaNames(ids){
    return ids.map(id=>areaById(id)?.name).filter(Boolean);
  }

  function ensureMomentUI(){
    const heroActions=document.querySelector('.hero-actions');
    if(heroActions && !document.getElementById('openMomentButton')){
      const audio=document.getElementById('voiceCaptureButton');
      const btn=document.createElement('button');
      btn.type='button'; btn.id='openMomentButton'; btn.className='btn secondary';
      btn.innerHTML='✦ registrar momento';
      if(audio?.nextSibling) heroActions.insertBefore(btn,audio.nextSibling); else heroActions.appendChild(btn);
    }
    if(!document.getElementById('momentModal')){
      document.body.insertAdjacentHTML('beforeend',`
        <div class="modal-backdrop" id="momentModal" hidden>
          <form class="modal rpg-panel life-moment-modal" id="momentForm">
            <div class="modal-head">
              <div><p class="eyebrow">REGISTRO DA VIDA</p><h3>Registrar momento</h3></div>
              <button type="button" class="icon-button" data-close-moment>×</button>
            </div>
            <p class="life-moment-help">Algo que fez parte do seu dia, sem virar obrigação. Não gera XP, moedas ou pendência.</p>
            <label>O que fez parte do seu dia?<textarea id="momentText" required placeholder="Ex.: joguei RPG e escrevi ações no Discord"></textarea></label>
            <div class="life-area-field">
              <span class="field-label">Áreas da vida <small>escolha até 2</small></span>
              <div class="life-area-options" id="momentAreaOptions"></div>
            </div>
            <div class="modal-actions"><button type="button" class="btn secondary" data-close-moment>cancelar</button><button type="submit" class="btn primary">registrar</button></div>
          </form>
        </div>`);
    }
  }

  function renderMomentAreaOptions(){
    const host=document.getElementById('momentAreaOptions');
    if(!host)return;
    host.innerHTML=state.areas.map(a=>`<button type="button" class="life-area-chip ${state.momentAreas.includes(a.id)?'selected':''}" data-moment-area="${a.id}">${escapeHtml(a.name)}</button>`).join('');
  }
  function openMoment(){
    ensureMomentUI();
    state.momentAreas=[];
    const modal=document.getElementById('momentModal');
    const text=document.getElementById('momentText');
    renderMomentAreaOptions();
    modal.hidden=false;
    text.value='';
    setTimeout(()=>text.focus(),0);
  }
  function closeMoment(){ const modal=document.getElementById('momentModal'); if(modal)modal.hidden=true; }

  async function insertLifeFocus(taskId,areaIds){
    if(!areaIds.length)return;
    const rows=areaIds.map(area_id=>({user_id:state.user.id,task_id:taskId,area_id,amount:1}));
    const {error}=await db.from('focus_events').insert(rows);
    if(error)throw error;
  }
  async function zeroHiddenTaskRewards(id){
    const {error}=await db.from('tasks').update({xp_base:0,coin_base:0,focus_base:0}).eq('id',id).eq('user_id',state.user.id);
    if(error)console.error(error);
  }

  async function saveMoment(){
    const note=document.getElementById('momentText')?.value.trim();
    if(!note)return showToast('Escreva o que aconteceu.','error');
    if(!state.momentAreas.length)return showToast('Escolha pelo menos uma área da vida.','error');
    const payload={
      user_id:state.user.id,title:note,description:null,kind:'task',difficulty:'micro',priority:'low',status:'completed',
      scheduled_for:isoDateLocal(),completed_at:new Date().toISOString(),area_id:state.momentAreas[0],project_id:null,source:'life_moment'
    };
    const {data,error}=await db.from('tasks').insert(payload).select('*').single();
    if(error)return showToast(error.message,'error');
    await zeroHiddenTaskRewards(data.id);
    try{await insertLifeFocus(data.id,state.momentAreas);}catch(err){console.error(err);}
    closeMoment(); state.momentAreas=[]; await refreshCore(); renderAll(); showToast('Momento registrado na Crônica.','success');
  }

  function presenceTaskToday(){return lifeTasks('presence').find(t=>t.scheduled_for===isoDateLocal());}
  function hydrateEveningAreas(){
    const existing=presenceTaskToday();
    if(existing && !state.checkinAreas.length) state.checkinAreas=focusAreasForTask(existing.id);
  }
  async function saveEveningPresence(areaIds){
    if(!areaIds.length)return;
    let task=presenceTaskToday();
    if(!task){
      const payload={
        user_id:state.user.id,title:'Presença do dia',kind:'task',difficulty:'micro',priority:'low',status:'completed',
        scheduled_for:isoDateLocal(),completed_at:new Date().toISOString(),project_id:null,area_id:null,source:'life_presence'
      };
      const created=await db.from('tasks').insert(payload).select('*').single();
      if(created.error){console.error(created.error);return showToast('O check-in foi salvo, mas não consegui registrar as áreas.','error');}
      task=created.data;
      await zeroHiddenTaskRewards(task.id);
    } else {
      await db.from('focus_events').delete().eq('user_id',state.user.id).eq('task_id',task.id);
    }
    try{await insertLifeFocus(task.id,areaIds);}catch(err){console.error(err);}
    await refreshCore(); renderAll();
  }

  const baseRenderCheckin=renderCheckin;
  renderCheckin=function(){
    baseRenderCheckin();
    if(currentPeriod().id!=='evening')return;
    hydrateEveningAreas();
    const existing=todaysCheckin('evening');
    if(existing){
      const compact=document.getElementById('answeredCheckinCompact');
      const card=compact?.querySelector('.checkin-card');
      if(card && !card.querySelector('.life-evening-summary')){
        const names=selectedAreaNames(state.checkinAreas);
        card.insertAdjacentHTML('beforeend',`<div class="life-evening-summary"><span>presença de hoje</span><div>${names.length?names.map(n=>`<span class="summary-chip">${escapeHtml(n)}</span>`).join(''):'<span class="muted">nenhuma área marcada</span>'}</div></div>`);
      }
      return;
    }
    const body=document.querySelector('#checkinSpotlight .checkin-body');
    const save=document.getElementById('saveCheckin');
    if(!body||!save||body.querySelector('.life-checkin-areas'))return;
    const markup=`<div class="field-block life-checkin-areas"><span class="field-label">O que esteve presente no seu dia?</span><p class="life-checkin-hint">Marque as áreas que realmente apareceram hoje. Isso alimenta a roda sem transformar sua vida em tarefas.</p><div class="life-area-options">${state.areas.map(a=>`<button type="button" class="life-area-chip ${state.checkinAreas.includes(a.id)?'selected':''}" data-checkin-area="${a.id}">${escapeHtml(a.name)}</button>`).join('')}</div></div>`;
    save.insertAdjacentHTML('beforebegin',markup);
  };

  const baseSaveCheckin=saveCheckin;
  saveCheckin=async function(){
    const wasEvening=currentPeriod().id==='evening';
    const selected=[...state.checkinAreas];
    await baseSaveCheckin();
    if(wasEvening && todaysCheckin('evening') && selected.length) await saveEveningPresence(selected);
  };

  const presenceScore=count=>[0,.35,.55,.70,.82,.90,.96,1][Math.max(0,Math.min(7,count))];
  renderWheel=function(){
    const el=document.getElementById('chronicleWheel');
    if(!el)return;
    const areas=state.areas.slice(0,8);
    if(!areas.length){el.innerHTML=empty('A roda aparece quando suas áreas forem criadas.');return;}
    const start=isoDateLocal(addDays(new Date(),-6));
    const daysByArea=Object.fromEntries(areas.map(a=>[a.id,new Set()]));
    state.focusEvents.forEach(e=>{
      if(!e.area_id || !daysByArea[e.area_id])return;
      const day=isoDateLocal(new Date(e.created_at));
      if(day>=start)daysByArea[e.area_id].add(day);
    });
    const center=160,radius=108;
    const polygonFor=fn=>areas.map((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/areas.length,r=radius*fn(a);return `${(center+Math.cos(ang)*r).toFixed(1)},${(center+Math.sin(ang)*r).toFixed(1)}`}).join(' ');
    const ring=p=>polygonFor(()=>p);
    const current=polygonFor(a=>presenceScore(daysByArea[a.id].size));
    const axes=areas.map((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/areas.length;return `<line x1="160" y1="160" x2="${(center+Math.cos(ang)*radius).toFixed(1)}" y2="${(center+Math.sin(ang)*radius).toFixed(1)}"/>`}).join('');
    const labels=areas.map((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/areas.length,r=radius+27,x=center+Math.cos(ang)*r,y=center+Math.sin(ang)*r;const short=a.name.replace(' & Relacionamentos','').replace(' & Criatividade','').replace(' & Vida Prática','');return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${escapeHtml(short)}</text>`}).join('');
    const presence=areas.map(a=>({name:a.name,days:daysByArea[a.id].size})).sort((a,b)=>b.days-a.days);
    el.innerHTML=`<div class="wheel-layout"><svg class="wheel" viewBox="0 0 320 320"><g class="wheel-grid">${[.2,.4,.6,.8,1].map(p=>`<polygon points="${ring(p)}"/>`).join('')}${axes}</g><polygon class="wheel-current" points="${current}"></polygon><g class="wheel-labels">${labels}</g></svg><div class="wheel-note life-wheel-note"><p><strong>Presença, não produtividade.</strong> Vinte tarefas de trabalho no mesmo dia contam como um único dia de Trabalho.</p><div class="life-presence-list">${presence.map(x=>`<span>${escapeHtml(x.name)} <strong>${x.days}/7</strong></span>`).join('')}</div></div></div>`;
  };

  function renderLifeMoments(){
    const grid=document.querySelector('.chronicle-grid');
    if(!grid)return;
    let panel=document.getElementById('lifeMomentsPanel');
    if(!panel){
      panel=document.createElement('section');
      panel.className='rpg-panel page-panel life-moments-panel'; panel.id='lifeMomentsPanel';
      const progress=grid.querySelector('.full-span');
      if(progress)grid.insertBefore(panel,progress);else grid.appendChild(panel);
    }
    const moments=lifeTasks('moment').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,16);
    panel.innerHTML=`<div class="section-head compact"><div><p class="eyebrow">VIDA FORA DA CHECKLIST</p><h3>Momentos registrados</h3><p class="muted">Coisas que fizeram parte da sua vida sem precisar virar tarefa.</p></div><button type="button" class="btn secondary small" id="chronicleMomentButton">＋ momento</button></div><div class="life-moment-list">${moments.length?moments.map(m=>{const names=selectedAreaNames(focusAreasForTask(m.id));return `<div class="life-moment-row"><div><strong>${escapeHtml(m.title)}</strong><span>${formatDate(m.scheduled_for)}${names.length?' · '+escapeHtml(names.join(' + ')):''}</span></div></div>`}).join(''):empty('Nenhum momento registrado ainda.')}</div>`;
  }

  const baseRenderChronicle=renderChronicle;
  renderChronicle=function(){baseRenderChronicle();renderLifeMoments();};

  const baseRenderCharacter=renderCharacter;
  renderCharacter=function(){
    baseRenderCharacter();
    const stats=[...document.querySelectorAll('#sheetStats .sheet-stat')];
    const target=stats.find(s=>s.querySelector('span')?.textContent==='Tarefas concluídas');
    if(target){const strong=target.querySelector('strong');if(strong)strong.textContent=state.tasks.filter(t=>t.status==='completed'&&!['life_moment','life_presence'].includes(t.source)).length;}
  };

  document.addEventListener('click',e=>{
    if(e.target.closest('#openMomentButton')||e.target.closest('#chronicleMomentButton')){openMoment();return;}
    if(e.target.closest('[data-close-moment]')){closeMoment();return;}
    const moment=e.target.closest('[data-moment-area]');
    if(moment){const id=moment.dataset.momentArea;const has=state.momentAreas.includes(id);if(!has&&state.momentAreas.length>=2)return showToast('Escolha no máximo duas áreas.');state.momentAreas=has?state.momentAreas.filter(x=>x!==id):[...state.momentAreas,id];renderMomentAreaOptions();return;}
    const check=e.target.closest('[data-checkin-area]');
    if(check){const id=check.dataset.checkinArea;state.checkinAreas=state.checkinAreas.includes(id)?state.checkinAreas.filter(x=>x!==id):[...state.checkinAreas,id];renderCheckin();return;}
  });
  document.addEventListener('submit',async e=>{if(e.target.id==='momentForm'){e.preventDefault();await saveMoment();}});
  document.addEventListener('click',e=>{if(e.target.id==='momentModal')closeMoment();});

  ensureMomentUI();
})();
