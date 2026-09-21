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
})();
