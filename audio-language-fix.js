(function improveNaturalVoiceLanguage(){
  if(typeof cleanVoiceTitle!=='function')return;
  const baseCleanVoiceTitle=cleanVoiceTitle;
  cleanVoiceTitle=function(raw){
    let text=String(raw||'').trim();
    text=text.replace(/^[\s,.;-]*(ah|ahn|entao|então|tipo)[,.;\s-]*/i,'');
    text=text.replace(/^(eu\s+)?(precisa|precisamos|preciso|precisava)\s+(de\s+)?/i,'');
    return baseCleanVoiceTitle(text);
  };

  if(!document.getElementById('voice-smart-inline-styles')){
    const style=document.createElement('style');
    style.id='voice-smart-inline-styles';
    style.textContent=`
      .voice-detected{display:grid!important;gap:8px!important;align-items:stretch!important}
      .voice-title-suggestion{display:grid;gap:2px;padding:10px 11px;border:1px solid rgba(91,59,40,.12);border-radius:10px;background:rgba(255,255,255,.32)}
      .voice-title-suggestion span{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800}
      .voice-title-suggestion strong{font-size:13px;color:var(--ink)}
      .voice-detected-pills{display:flex;gap:7px;flex-wrap:wrap}
    `;
    document.head.appendChild(style);
  }
})();