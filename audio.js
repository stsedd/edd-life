const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceRecognition = null;
let voiceListening = false;
let voiceFinalTranscript = '';
let voiceInterimTranscript = '';

function normalizeVoiceText(text='') {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function voiceIsoDate(offset=0) {
  const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10);
}
function nextWeekdayIso(target) {
  const d = new Date(); d.setHours(12,0,0,0); let delta=(target-d.getDay()+7)%7; if(delta===0)delta=7; d.setDate(d.getDate()+delta); return d.toISOString().slice(0,10);
}
function parseVoiceDate(normalized) {
  if (normalized.includes('depois de amanha')) return voiceIsoDate(2);
  if (normalized.includes('amanha')) return voiceIsoDate(1);
  if (normalized.includes('hoje')) return voiceIsoDate(0);
  const weekdays=[['domingo',0],['segunda',1],['terca',2],['quarta',3],['quinta',4],['sexta',5],['sabado',6]];
  for(const [word,day] of weekdays) if(normalized.includes(word)) return nextWeekdayIso(day);
  const slash=normalized.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if(slash){const year=slash[3]?(slash[3].length===2?`20${slash[3]}`:slash[3]):String(new Date().getFullYear());return `${year}-${String(slash[2]).padStart(2,'0')}-${String(slash[1]).padStart(2,'0')}`;}
  const dayOnly=normalized.match(/\b(?:dia\s+)(\d{1,2})\b/);
  if(dayOnly){
    const now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),Number(dayOnly[1]),12,0,0,0);
    if(d < new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0,0)) d.setMonth(d.getMonth()+1);
    return voiceIsoFromDate(d);
  }
  return '';
}
function voiceIsoFromDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function detectFromCatalog(text,list,labelKey='name'){const normalized=normalizeVoiceText(text);return list.find(item=>normalized.includes(normalizeVoiceText(item[labelKey]||'')))||null;}
function projectByVoiceAlias(text){
  const n=normalizeVoiceText(text),projects=state.projects||[];
  const byName=needle=>projects.find(p=>normalizeVoiceText(p.name).includes(needle));
  if(/\b(monking play|mkg play)\b/.test(n))return byName('monking play');
  if(/\b(monking|mkg)\b/.test(n))return byName('monking')&&!normalizeVoiceText(byName('monking')?.name||'').includes('play')?byName('monking'):projects.find(p=>normalizeVoiceText(p.name)==='monking');
  if(/\b(manu|ana|lucia|freela)\b/.test(n))return projects.find(p=>normalizeVoiceText(p.name).includes('manu'))||null;
  if(/\b(duodecima|rpg da duodecima|rpg)\b/.test(n))return projects.find(p=>normalizeVoiceText(p.name).includes('duodecima'))||null;
  if(/\b(pessoal|minha vida)\b/.test(n))return projects.find(p=>normalizeVoiceText(p.name)==='pessoal')||null;
  return detectFromCatalog(text,projects);
}
function detectVoiceClient(text){
  const n=normalizeVoiceText(text);
  if(/\bana\b/.test(n))return 'Ana';
  if(/\blucia\b/.test(n))return 'Lucia';
  if(/\bmanu\b/.test(n))return 'Manu';
  return '';
}
function earliestCut(text,patterns){
  let index=-1;
  for(const re of patterns){const m=re.exec(text);if(m&&(index<0||m.index<index))index=m.index;}
  return index;
}
function cleanVoiceTitle(raw){
  let title=raw.trim().replace(/^[\s,.;-]*(ah|ahn|entao|então|tipo)[,.;\s-]*/i,'');
  title=title.replace(/^(eu\s+)?(preciso|precisava|quero|queria|gostaria|tenho que|tem que)\s+(de\s+)?/i,'');
  title=title.replace(/^(cria|criar|adicione|adiciona|adicionar|coloca|colocar|anota|anotar|faz|fazer)\s+(pra mim\s+|para mim\s+)?/i,'');
  title=title.replace(/^(uma\s+)?(nova\s+)?(tarefa|rotina)\s*(pro|pra|para o|para a|para|de|do|da)?\s*/i,'');
  title=title.replace(/^(pro|pra|para o|para a|para)\s+/i,'');

  const cut=earliestCut(title,[
    /[,;.]\s*(que\s+)?(e|é)\s+(uma\s+)?(tarefa|rotina)\b/i,
    /\s+(que\s+)?(e|é)\s+(uma\s+)?(tarefa|rotina)\s+(micro|simples|media|média|complexa|epica|épica|dificil|difícil)\b/i,
    /\s+(tarefa|rotina)\s+(micro|simples|media|média|complexa|epica|épica|dificil|difícil)\b/i,
    /\s+(com\s+)?prioridade\s+(urgente|alta|normal|baixa)\b/i,
    /\s+(pra|para)\s+(hoje|amanhã|amanha|depois de amanhã|depois de amanha|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)\b/i,
    /\s+(até|ate|prazo)\s+(hoje|amanhã|amanha|depois de amanhã|depois de amanha|dia\s+\d|\d{1,2}[\/-])\b/i,
    /\s+(no|na)\s+projeto\b/i,
    /\s+(da|de)\s+categoria\b/i,
    /\s+e\s+(tudo mais|tudo o mais|tal|essas coisas)\b/i
  ]);
  if(cut>=0)title=title.slice(0,cut);

  title=title
    .replace(/\b(prioridade\s+)?(urgente|alta|normal|baixa)\b/gi,'')
    .replace(/\b(dificuldade\s+)?(micro|simples|media|média|complexa|epica|épica)\b/gi,'')
    .replace(/\b(hoje|amanhã|amanha|depois de amanhã|depois de amanha)\b/gi,'')
    .replace(/\b(no|na)\s+projeto\s+[^,.;]+/gi,'')
    .replace(/\b(e\s+)?(tudo mais|tudo o mais|e tal|por favor)\b/gi,'')
    .replace(/\s+,/g,',').replace(/^[,.;\s-]+|[,.;\s-]+$/g,'').replace(/\s{2,}/g,' ');

  title=title.replace(/\b(media kit|calend[aá]rio|site|posts?|carrossel|fluxograma|planilha|apresenta[cç][aã]o|landing page|briefing|relat[oó]rio|ajustes)\s+(?:da|do|de)\s+(ana|lucia|manu)\b/gi,(_,thing,person)=>`${thing} ${person}`);
  title=title.replace(/\bana\b/gi,'Ana').replace(/\blucia\b/gi,'Lucia').replace(/\bmanu\b/gi,'Manu');
  if(title.length<3)title=raw.trim();
  return title.charAt(0).toUpperCase()+title.slice(1);
}
function parseVoiceTask(text){
  const normalized=normalizeVoiceText(text); let difficulty='medium';
  if(/\b(micro|rapidinha|rapidinho|minima|minimo)\b/.test(normalized))difficulty='micro';
  else if(/\b(simples|facil|fácil)\b/.test(normalized))difficulty='simple';
  else if(/\b(complex|dificil|difícil|trabalhosa|trabalhoso)\b/.test(normalized))difficulty='complex';
  else if(/\b(epic|enorme|gigante)\b/.test(normalized))difficulty='epic';
  else if(/\b(media|média|medio|médio)\b/.test(normalized))difficulty='medium';

  let priority='normal';
  if(/\b(urgente|urgencia)\b/.test(normalized))priority='urgent';
  else if(/prioridade\s+alta|\balta prioridade\b/.test(normalized))priority='high';
  else if(/prioridade\s+baixa|\bbaixa prioridade\b/.test(normalized))priority='low';

  const scheduled=parseVoiceDate(normalized);
  const explicitDue=/(\bate\b|\bprazo\b)/.test(normalized)&&scheduled;
  const project=projectByVoiceAlias(text);
  let area=detectFromCatalog(text,state.areas||[]);
  if(!area&&project?.area_id)area=state.areas.find(a=>a.id===project.area_id)||null;
  const client=detectVoiceClient(text);
  const kind=/\b(rotina|diaria|diario|todo dia|todos os dias)\b/.test(normalized)?'routine':'task';
  return {
    title:cleanVoiceTitle(text),kind,difficulty,priority,
    projectId:project?.id||'',areaId:area?.id||'',clientContext:client,
    scheduled,dueAt:explicitDue?`${scheduled}T23:59`:'',raw:text.trim()
  };
}
function renderVoiceDetected(){
  const text=$('#voiceTranscript')?.value.trim()||'',el=$('#voiceDetected'); if(!el)return;
  if(!text){el.innerHTML='<span class="voice-detected-empty">Fale normalmente. Eu separo título, data, projeto, dificuldade e prioridade antes de criar a tarefa.</span>';return;}
  const parsed=parseVoiceTask(text),project=state.projects.find(p=>p.id===parsed.projectId),area=state.areas.find(a=>a.id===parsed.areaId),diffLabel=difficultyLabels[parsed.difficulty]||'Média',priorityLabel=priorityLabels[parsed.priority]||'Normal';
  el.innerHTML=`<div class="voice-title-suggestion"><span>Título sugerido</span><strong>${escapeHtml(parsed.title)}</strong></div><div class="voice-detected-pills"><span class="voice-pill">${parsed.kind==='routine'?'rotina':'tarefa'}</span><span class="voice-pill">${diffLabel}</span><span class="voice-pill">prioridade ${priorityLabel.toLowerCase()}</span>${parsed.scheduled?`<span class="voice-pill">${formatDate(parsed.scheduled)}</span>`:''}${project?`<span class="voice-pill">${escapeHtml(project.name)}</span>`:''}${area?`<span class="voice-pill">${escapeHtml(area.name)}</span>`:''}${parsed.clientContext?`<span class="voice-pill">${escapeHtml(parsed.clientContext)}</span>`:''}</div>`;
}
function setVoiceStatus(text,listening=false){const status=$('#voiceStatus'),modal=$('#voiceModal'),label=$('#voiceMicLabel');if(status)status.textContent=text;if(modal)modal.classList.toggle('is-listening',listening);if(label)label.textContent=listening?'parar gravação':'começar a falar';}
function ensureVoiceModal(){
  const button=$('#voiceCaptureButton'); if(button){button.textContent='🎙️ adicionar por áudio';button.classList.add('voice-entry');}
  if($('#voiceModal'))return;
  const wrapper=document.createElement('div');wrapper.className='modal-backdrop';wrapper.id='voiceModal';wrapper.hidden=true;wrapper.innerHTML=`<section class="modal rpg-panel voice-modal" role="dialog" aria-modal="true"><div class="modal-head"><div><p class="eyebrow">CAPTURA POR ÁUDIO</p><h3>Fala. Eu organizo.</h3></div><button type="button" class="icon-button" data-close-modal="voiceModal">×</button></div><p class="muted voice-help">Pode falar naturalmente: “Preciso de uma tarefa pro calendário da Ana, complexa, pra amanhã” ou “Media kit da Ana, simples, hoje”.</p><div class="voice-capture-stage"><button type="button" class="voice-mic" id="voiceMicButton"><span class="voice-mic-icon">🎙️</span><span id="voiceMicLabel">começar a falar</span></button><div class="voice-status" id="voiceStatus">microfone parado</div><div class="voice-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div><label class="voice-transcript-label"><span>Transcrição</span><textarea id="voiceTranscript" rows="5" placeholder="Sua fala aparece aqui. Você pode editar antes de transformar em tarefa."></textarea></label><div class="voice-detected" id="voiceDetected"></div><div class="modal-actions voice-actions"><button type="button" class="btn secondary" id="voiceClearButton">limpar</button><button type="button" class="btn secondary" id="voiceInboxButton">salvar na Inbox</button><button type="button" class="btn primary" id="voiceTaskButton">revisar como tarefa</button></div><p class="voice-privacy">O Edd's Life não guarda o áudio. A transcrição é interpretada localmente no navegador e só vira tarefa quando você confirma.</p></section>`;
  document.body.appendChild(wrapper);wrapper.addEventListener('click',e=>{if(e.target===wrapper)wrapper.hidden=true;});
}
function openVoiceCapture(){ensureVoiceModal();const modal=$('#voiceModal');modal.hidden=false;voiceFinalTranscript='';voiceInterimTranscript='';$('#voiceTranscript').value='';setVoiceStatus(SpeechRecognitionAPI?'microfone pronto':'ditado por voz não disponível neste navegador');renderVoiceDetected();}
function stopVoiceCapture(){if(voiceRecognition&&voiceListening)voiceRecognition.stop();}
function startVoiceCapture(){
  if(!SpeechRecognitionAPI){showToast('Seu navegador não oferece reconhecimento de voz aqui. Você ainda pode digitar a frase nessa caixa.','error');return;}
  if(voiceListening){stopVoiceCapture();return;}
  voiceRecognition=new SpeechRecognitionAPI();voiceRecognition.lang='pt-BR';voiceRecognition.interimResults=true;voiceRecognition.continuous=true;voiceRecognition.maxAlternatives=1;voiceFinalTranscript=$('#voiceTranscript')?.value.trim()||'';voiceInterimTranscript='';
  voiceRecognition.onstart=()=>{voiceListening=true;setVoiceStatus('ouvindo… pode falar',true);};
  voiceRecognition.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const piece=event.results[i][0].transcript;if(event.results[i].isFinal)voiceFinalTranscript+=`${voiceFinalTranscript?' ':''}${piece.trim()}`;else interim+=piece;}voiceInterimTranscript=interim;$('#voiceTranscript').value=[voiceFinalTranscript,voiceInterimTranscript].filter(Boolean).join(' ').trim();renderVoiceDetected();};
  voiceRecognition.onerror=event=>{const map={'not-allowed':'permissão de microfone negada','no-speech':'não ouvi nenhuma fala','audio-capture':'microfone não encontrado','network':'falha no reconhecimento de voz'};setVoiceStatus(map[event.error]||`erro: ${event.error}`,false);};
  voiceRecognition.onend=()=>{voiceListening=false;voiceInterimTranscript='';setVoiceStatus('transcrição pronta',false);renderVoiceDetected();};
  try{voiceRecognition.start();}catch{setVoiceStatus('não consegui iniciar o microfone',false);}
}
function fillTaskFromVoice(parsed,inbox=false){
  openTaskModal(null,inbox);
  $('#taskTitle').value=parsed.title;
  $('#taskKind').value=parsed.kind;
  $('#taskDifficulty').value=parsed.difficulty;
  $('#taskPriority').value=parsed.priority;
  $('#taskProject').value=parsed.projectId;
  $('#taskArea').value=parsed.areaId;
  $('#taskScheduled').value=inbox?'':parsed.scheduled;
  $('#taskDue').value=inbox?'':parsed.dueAt;
  $('#taskContext').value=parsed.clientContext||'';
  $('#taskDescription').value='';
}
function voiceToTask(){const text=$('#voiceTranscript')?.value.trim()||'';if(!text)return showToast('Fale ou digite uma tarefa primeiro.','error');stopVoiceCapture();const parsed=parseVoiceTask(text);closeModal('voiceModal');fillTaskFromVoice(parsed,false);}
async function voiceToInbox(){const text=$('#voiceTranscript')?.value.trim()||'';if(!text)return showToast('Fale ou digite uma tarefa primeiro.','error');stopVoiceCapture();const parsed=parseVoiceTask(text);closeModal('voiceModal');fillTaskFromVoice(parsed,true);await saveTask('inbox');}
function clearVoiceCapture(){stopVoiceCapture();voiceFinalTranscript='';voiceInterimTranscript='';$('#voiceTranscript').value='';setVoiceStatus(SpeechRecognitionAPI?'microfone pronto':'ditado por voz não disponível neste navegador');renderVoiceDetected();}
function bindVoiceCapture(){ensureVoiceModal();$('#voiceMicButton')?.addEventListener('click',startVoiceCapture);$('#voiceTaskButton')?.addEventListener('click',voiceToTask);$('#voiceInboxButton')?.addEventListener('click',voiceToInbox);$('#voiceClearButton')?.addEventListener('click',clearVoiceCapture);$('#voiceTranscript')?.addEventListener('input',renderVoiceDetected);}
bindVoiceCapture();window.openVoiceCapture=openVoiceCapture;window.stopVoiceCapture=stopVoiceCapture;
