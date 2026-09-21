(function installTaskFocusLayout(){
  const shell=document.getElementById('appShell');
  const sidebar=document.querySelector('.sidebar');
  const homeRail=document.querySelector('.home-rail');
  if(!shell||!sidebar||!homeRail)return;

  if(!document.getElementById('routinePanel')){
    homeRail.insertAdjacentHTML('afterbegin',`
      <section class="rpg-panel routine-panel" id="routinePanel">
        <div class="routine-panel-head">
          <div>
            <p class="eyebrow">ROTINAS DE HOJE</p>
            <h3>Manutenção diária</h3>
            <p>Lembretes pequenos ficam aqui para não inflar sua lista principal.</p>
          </div>
          <span class="routine-count" id="routineCount">0/0</span>
        </div>
        <div class="routine-list" id="routineList"></div>
        <div class="routine-note">Não fazer tudo não vira dívida. Amanhã a lista recomeça.</div>
      </section>`);
  }

  const navIcons={today:'✦',tasks:'✓',inbox:'⌁',quests:'◇',character:'♜',shop:'◉',chronicle:'☾'};
  document.querySelectorAll('.nav-item[data-view]').forEach(btn=>{
    const label=[...btn.children].find(el=>!el.classList.contains('nav-badge'));
    if(label)label.classList.add('nav-label');
    if(!btn.querySelector('.nav-icon'))btn.insertAdjacentHTML('afterbegin',`<span class="nav-icon" aria-hidden="true">${navIcons[btn.dataset.view]||'•'}</span>`);
    btn.title=(label?.textContent||btn.dataset.view).trim();
  });

  if(!document.getElementById('sidebarToggle')){
    sidebar.insertAdjacentHTML('beforeend','<button type="button" class="sidebar-toggle" id="sidebarToggle" aria-label="Recolher menu" title="Recolher menu">‹</button>');
  }
  const toggle=document.getElementById('sidebarToggle');
  const saved=localStorage.getItem('edd-sidebar-collapsed')==='1';
  shell.classList.toggle('sidebar-collapsed',saved);
  function syncToggle(){
    const collapsed=shell.classList.contains('sidebar-collapsed');
    toggle.setAttribute('aria-label',collapsed?'Expandir menu':'Recolher menu');
    toggle.title=collapsed?'Expandir menu':'Recolher menu';
  }
  syncToggle();
  toggle.addEventListener('click',()=>{
    shell.classList.toggle('sidebar-collapsed');
    localStorage.setItem('edd-sidebar-collapsed',shell.classList.contains('sidebar-collapsed')?'1':'0');
    syncToggle();
  });

  const baseTaskMatches=taskMatches;
  taskMatches=function(task,f,scope){
    if(task.kind==='routine')return false;
    return baseTaskMatches(task,f,scope);
  };

  function routineReward(task){
    const xp=Number(task.xp_base||0),coins=Number(task.coin_base||0);
    return coins>0?`+${xp} XP · +${coins} moedas`:`+${xp} XP`;
  }
  function renderRoutinePanel(){
    const list=document.getElementById('routineList');
    const count=document.getElementById('routineCount');
    if(!list||!count)return;
    const routines=state.tasks
      .filter(t=>t.kind==='routine'&&t.status!=='cancelled')
      .sort((a,b)=>Number(a.status==='completed')-Number(b.status==='completed')||(a.title||'').localeCompare(b.title||'','pt-BR'));
    const done=routines.filter(t=>t.status==='completed').length;
    count.textContent=`${done}/${routines.length}`;
    if(!routines.length){list.innerHTML='<div class="empty-state">Nenhuma rotina cadastrada ainda.</div>';return;}
    list.innerHTML=routines.map(t=>{
      const completed=t.status==='completed';
      return `<div class="routine-item ${completed?'completed':''}" data-task-id="${t.id}">
        <input class="task-check routine-check" type="checkbox" ${completed?'checked':''} aria-label="Concluir ${escapeHtml(t.title)}">
        <div class="routine-copy"><span class="routine-title">${escapeHtml(t.title)}</span><span class="routine-reward">${escapeHtml(routineReward(t))}</span></div>
        <button class="routine-edit" data-task-edit="${t.id}" aria-label="Editar rotina" title="Editar rotina">•••</button>
      </div>`;
    }).join('');
  }

  const baseRenderTaskBoards=renderTaskBoards;
  renderTaskBoards=function(){
    baseRenderTaskBoards();
    renderRoutinePanel();
  };

  const homeDescription=document.querySelector('.task-hub .section-head p.muted');
  if(homeDescription)homeDescription.textContent='Aqui ficam só tarefas e entregas. As rotinas diárias ficam separadas ao lado para a lista não parecer maior do que realmente é.';
  const plannerDescription=document.querySelector('[data-view-panel="tasks"] .section-head p.muted');
  if(plannerDescription)plannerDescription.textContent='Tarefas e entregas ficam aqui; rotinas diárias são acompanhadas separadamente na página Hoje.';

  /* Excluir tarefa pelo próprio modal de edição. */
  const modalActions=document.querySelector('#taskForm .modal-actions');
  if(modalActions&&!document.getElementById('deleteTaskButton')){
    modalActions.insertAdjacentHTML('afterbegin','<button type="button" class="btn danger task-delete-button" id="deleteTaskButton" hidden>Excluir tarefa</button>');
  }
  const deleteTaskButton=document.getElementById('deleteTaskButton');
  const baseOpenTaskModal=openTaskModal;
  openTaskModal=function(task=null,inbox=false){
    baseOpenTaskModal(task,inbox);
    if(deleteTaskButton){
      deleteTaskButton.hidden=!task;
      deleteTaskButton.dataset.taskDelete=task?.id||'';
      deleteTaskButton.textContent=task?.kind==='routine'?'Excluir rotina':'Excluir tarefa';
    }
  };

  async function deleteTaskPermanently(id){
    const task=state.tasks.find(t=>t.id===id);
    if(!task)return;
    const label=task.kind==='routine'?'rotina':'tarefa';
    if(!confirm(`Excluir “${task.title}”? Isso remove a ${label} da sua lista.`))return;

    if(task.status==='completed'){
      const reopened=await db.rpc('reopen_task',{p_task_id:id});
      if(reopened.error)return showToast(`Não consegui remover: ${reopened.error.message}`,'error');
    }
    const {error}=await db.from('tasks').delete().eq('id',id).eq('user_id',state.user.id);
    if(error)return showToast(`Não consegui excluir: ${error.message}`,'error');
    closeModal('taskModal');
    state.editingTaskId=null;
    await refreshCore();
    renderAll();
    showToast(`${task.kind==='routine'?'Rotina':'Tarefa'} excluída.`,'success');
  }
  deleteTaskButton?.addEventListener('click',()=>deleteTaskPermanently(deleteTaskButton.dataset.taskDelete));

  /* Progresso gradual das quests semanais. */
  function questProgressControls(offer,pct){
    if(!offer.selected){
      return `<div class="quest-progress-box inactive"><span>Progresso</span><strong>${Math.round(pct)}%</strong><small>Selecione esta carta para registrar o avanço.</small></div>`;
    }
    return `<div class="quest-progress-box ${offer.completed?'completed':''}">
      <div class="quest-progress-label"><span>Seu progresso</span><strong>${Math.round(pct)}%</strong></div>
      <input class="quest-progress-range" type="range" min="0" max="100" step="10" value="${Math.round(pct)}" data-quest-progress="${offer.id}" aria-label="Progresso da quest em porcentagem">
      <div class="quest-progress-actions">
        <button type="button" class="btn secondary small" data-quest-step="-10" data-quest-id="${offer.id}" ${pct<=0?'disabled':''}>−10%</button>
        <button type="button" class="btn secondary small" data-quest-step="10" data-quest-id="${offer.id}" ${pct>=100?'disabled':''}>+10%</button>
        <button type="button" class="btn ${offer.completed?'secondary':'primary'} small" data-quest-complete="${offer.id}" ${offer.completed?'disabled':''}>${offer.completed?'concluída ✓':'concluir'}</button>
      </div>
    </div>`;
  }

  questCardMarkup=function(offer){
    const q=questTemplate(offer.quest_template_id);
    if(!q)return'';
    const pct=progressPct(offer);
    return `<article class="quest-card tarot ${offer.selected?'selected':''} ${offer.completed?'quest-completed':''}">
      <div class="tarot-frame">
        <span class="tarot-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <div class="tarot-kicker"><span>${questRoman(offer.slot)}</span><span>${escapeHtml(questBadge(q))}</span></div>
        <div class="quest-art tarot-art"><img src="${questArt(q,offer.slot)}" alt="Símbolo da carta ${escapeHtml(q.title)}" loading="eager"></div>
        <div class="tarot-title"><span class="tarot-rule"></span><h4>${escapeHtml(q.title)}</h4><span class="tarot-rule"></span></div>
        <p class="tarot-description">${escapeHtml(q.description)}</p>
        <div class="quest-meta tarot-meta"><span>+${q.xp_reward} XP</span><span>+${q.coin_reward} 🪙</span></div>
        <div class="progress tarot-progress"><span style="width:${pct}%"></span></div>
        ${questProgressControls(offer,pct)}
        <div class="quest-actions">
          <button class="btn ${offer.selected?'secondary':'primary'} small" data-select-quest="${offer.id}">${offer.selected?'selecionada':'escolher'}</button>
          <button class="btn secondary small" data-reroll-quest="${offer.id}" ${offer.rerolled||offer.completed?'disabled':''}>↻ ${offer.rerolled?'usado':'reroll'}</button>
        </div>
      </div>
    </article>`;
  };

  renderQuestMini=function(){
    const selected=state.questOffers.find(o=>o.selected),q=selected&&questTemplate(selected.quest_template_id);
    if(!q){
      $('#activeQuestMini').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">QUEST DA SEMANA</p><h3>Nenhuma selecionada</h3></div></div><p class="muted" style="margin:0;font-size:12px">Escolha uma carta quando quiser — ou deixe a semana livre.</p><button class="btn secondary small" data-go-view="quests" style="margin-top:10px">ver cartas</button>`;
      return;
    }
    const pct=progressPct(selected);
    $('#activeQuestMini').innerHTML=`<div class="section-head compact"><div><p class="eyebrow">QUEST DA SEMANA</p><h3>${escapeHtml(q.title)}</h3></div><button class="chip" data-go-view="quests">abrir</button></div>
      <div class="mini-quest tarot-mini">
        <div class="mini-tarot-card"><span class="mini-tarot-kicker">${questRoman(selected.slot)} · ${escapeHtml(questBadge(q))}</span><img src="${questArt(q,selected.slot)}" alt="${escapeHtml(q.title)}"><strong>${escapeHtml(q.title)}</strong></div>
        <div class="mini-quest-copy"><p>${escapeHtml(q.description)}</p><div class="mini-progress-head"><span>progresso</span><strong>${Math.round(pct)}%</strong></div><div class="progress"><span style="width:${pct}%"></span></div><div class="mini-meta"><span>+${q.xp_reward} XP</span><span>+${q.coin_reward} 🪙</span></div></div>
      </div>`;
  };

  async function setQuestProgress(id,value){
    const offer=state.questOffers.find(o=>o.id===id);
    if(!offer)return;
    const target=Math.max(0,Math.min(100,Number(value)||0));
    const {data,error}=await db.rpc('set_weekly_quest_progress',{p_offer_id:id,p_progress:target});
    if(error)return showToast(`Não consegui salvar o progresso: ${error.message}`,'error');
    offer.progress=Number(data.progress||0);
    offer.completed=!!data.completed;
    if(data.awarded){
      await refreshCore();
      showToast(`Quest concluída: +${data.xp} XP · +${data.coins} moedas`,'success');
    }else if(data.reversed){
      await refreshCore();
      showToast('Quest reaberta e recompensa revertida.');
    }else{
      showToast(`Progresso da quest: ${Math.round(Number(data.progress||0))}%`,'success');
    }
    renderQuests();
    renderCharacter();
  }

  document.addEventListener('click',async e=>{
    const step=e.target.closest('[data-quest-step]');
    if(step){
      const offer=state.questOffers.find(o=>o.id===step.dataset.questId);
      if(offer)await setQuestProgress(offer.id,progressPct(offer)+Number(step.dataset.questStep||0));
      return;
    }
    const complete=e.target.closest('[data-quest-complete]');
    if(complete){await setQuestProgress(complete.dataset.questComplete,100);return;}
  });
  document.addEventListener('change',async e=>{
    if(e.target.matches('[data-quest-progress]'))await setQuestProgress(e.target.dataset.questProgress,e.target.value);
  });
})();
