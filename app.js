// Stars
(function(){
  var c=document.getElementById('stars-canvas');
  c.style.pointerEvents='none';c.style.touchAction='none';
  var ctx=c.getContext('2d'),stars=[];
  for(var i=0;i<90;i++) stars.push({x:Math.random(),y:Math.random(),s:Math.random()<.7?1:2,p:Math.random()*6.28,f:.4+Math.random()*.8});
  function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}
  resize(); window.onresize=resize;
  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    var t=Date.now()/1000;
    for(var i=0;i<stars.length;i++){var s=stars[i],a=.25+.45*Math.sin(t*s.f+s.p);ctx.fillStyle='rgba(200,220,255,'+a+')';ctx.fillRect(Math.floor(s.x*c.width),Math.floor(s.y*c.height),s.s,s.s);}
    requestAnimationFrame(draw);
  }
  draw();
})();

// Emulator systems
var SYSTEMS={nes:{label:'NES',core:'nes',emoji:'[NES]',exts:['nes']},snes:{label:'SNES',core:'snes',emoji:'[SNES]',exts:['sfc','smc']},gb:{label:'GB',core:'gb',emoji:'[GB]',exts:['gb','gbc']},gba:{label:'GBA',core:'gba',emoji:'[GBA]',exts:['gba']}};
var EXT_MAP={};
for(var k in SYSTEMS){(function(k){SYSTEMS[k].exts.forEach(function(e){EXT_MAP[e]=k;});})(k);}

var library=[];
try{library=JSON.parse(localStorage.getItem('pk_library')||'[]');}catch(e){library=[];}
var activeFilter='all';
var currentGame=null;

// PAGE ROUTING — defined as global function so onclick="" works
function showPage(id){
  var pages=document.querySelectorAll('.page');
  for(var i=0;i<pages.length;i++) pages[i].classList.remove('active');
  var btns=document.querySelectorAll('.nav-btn');
  for(var i=0;i<btns.length;i++){
    if(btns[i].getAttribute('data-page')===id) btns[i].classList.add('active');
    else btns[i].classList.remove('active');
  }
  var pg=document.getElementById('page-'+id);
  if(pg) pg.classList.add('active');
  window.scrollTo(0,0);
  if(id==='emulator') renderLibrary();
}

// FILTER
function setFilter(btn,f){
  var btns=document.querySelectorAll('.filter-btn');
  for(var i=0;i<btns.length;i++) btns[i].classList.remove('active');
  btn.classList.add('active');
  activeFilter=f;
  renderLibrary();
}

// ROM Library
function renderLibrary(){
  var grid=document.getElementById('game-grid');
  var scoreEl=document.getElementById('score-val');
  var pageInfo=document.getElementById('page-info');
  if(!grid) return;
  var filtered=activeFilter==='all'?library:library.filter(function(g){return g.system===activeFilter;});
  if(scoreEl) scoreEl.textContent=('000'+library.length).slice(-3);
  if(pageInfo) pageInfo.textContent=filtered.length+' TITLE'+(filtered.length!==1?'S':'')+' LOADED';
  grid.innerHTML='';
  if(filtered.length===0){
    var es=document.createElement('div');es.className='empty-screen';
    es.innerHTML='<div class="es-border"><div class="es-inner"><div class="es-icon">?</div><p class="es-head">NO ROMS FOUND</p><p class="es-sub">Drop ROM files above to begin</p></div></div>';
    grid.appendChild(es);return;
  }
  for(var i=0;i<filtered.length;i++) grid.appendChild(makeCard(filtered[i]));
}

function makeCard(game){
  var sys=SYSTEMS[game.system]||{label:'?',emoji:'?'};
  var card=document.createElement('div');
  card.className='game-card sys-'+game.system;
  card.innerHTML='<div class="card-screen"><span class="card-sys-tag">'+sys.label+'</span><span class="card-emoji" style="font-size:1rem;font-family:var(--font)">'+sys.label+'</span></div><div class="card-body"><div class="card-name">'+game.name+'</div><div class="card-footer"><button class="card-play-btn">PLAY</button><button class="card-del-btn">X</button></div></div>';
  var id=game.id;
  card.querySelector('.card-play-btn').onclick=function(e){e.stopPropagation();launchGame(id);};
  card.querySelector('.card-del-btn').onclick=function(e){e.stopPropagation();removeGame(id);};
  card.onclick=function(){launchGame(id);};
  return card;
}

// File handling
var romInput=document.getElementById('rom-input');
var dropzone=document.getElementById('dropzone');
romInput.onchange=function(){handleFiles(romInput.files);};
dropzone.ondragover=function(e){e.preventDefault();dropzone.classList.add('dragover');};
dropzone.ondragleave=function(){dropzone.classList.remove('dragover');};
dropzone.ondrop=function(e){e.preventDefault();dropzone.classList.remove('dragover');handleFiles(e.dataTransfer.files);};

function handleFiles(files){
  var arr=Array.from(files),idx=0;
  function next(){if(idx>=arr.length){renderLibrary();return;}processROM(arr[idx++],next);}
  next();
}

function processROM(file,cb){
  var ext=file.name.split('.').pop().toLowerCase();
  if(ext==='zip'){toast('Extract ZIP first, then upload the ROM.','warn');cb();return;}
  var system=EXT_MAP[ext];
  if(!system){toast('Unsupported: .'+ext,'error');cb();return;}
  var reader=new FileReader();
  reader.onload=function(){
    library.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2),name:file.name.replace(/\.[^.]+$/,'').replace(/[_\-]+/g,' ').toUpperCase(),system:system,data:reader.result,added:Date.now()});
    saveLib();toast('LOADED: '+file.name.replace(/\.[^.]+$/,'').slice(0,20).toUpperCase(),'success');
    showPage('emulator');cb();
  };
  reader.onerror=function(){cb();};
  reader.readAsDataURL(file);
}

// Emulator
function launchGame(id){
  var game=null;
  for(var i=0;i<library.length;i++){if(library[i].id===id){game=library[i];break;}}
  if(!game) return;
  var modal=document.getElementById('modal');
  var container=document.getElementById('game-container');
  document.getElementById('modal-title').textContent=game.name;
  modal.style.display='flex';container.innerHTML='';
  var parts=game.data.split(','),mime=parts[0].match(/:(.*?);/)[1],bytes=atob(parts[1]),arr=new Uint8Array(bytes.length);
  for(var i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
  var blob=new Blob([arr],{type:mime}),url=URL.createObjectURL(blob);
  window.EJS_player='#game-container';window.EJS_core=SYSTEMS[game.system]?SYSTEMS[game.system].core:'nes';
  window.EJS_gameUrl=url;window.EJS_pathtodata='https://cdn.emulatorjs.org/latest/data/';
  window.EJS_startOnLoaded=true;window.EJS_color='#38c830';window.EJS_backgroundColor='#101010';
  window.EJS_defaultControls=true;window.EJS_volume=0.8;
  var old=document.getElementById('ejs-loader');if(old) old.remove();
  var s=document.createElement('script');s.id='ejs-loader';s.src='https://cdn.emulatorjs.org/latest/data/loader.js';
  document.body.appendChild(s);currentGame={url:url};
}

function closeModal(){
  var modal=document.getElementById('modal');
  if(!modal||modal.style.display==='none') return;
  modal.style.display='none';
  document.getElementById('game-container').innerHTML='';
  if(currentGame&&currentGame.url) URL.revokeObjectURL(currentGame.url);
  currentGame=null;
  var s=document.getElementById('ejs-loader');if(s) s.remove();
  try{delete window.EJS_player;delete window.EJS_core;delete window.EJS_gameUrl;}catch(e){}
}

document.getElementById('modal').onclick=function(e){if(e.target===document.getElementById('modal'))closeModal();};
document.getElementById('fullscreen-btn').onclick=function(){var w=document.querySelector('.emu-screen-border');if(w&&w.requestFullscreen)w.requestFullscreen();};
document.onkeydown=function(e){if(e.key==='Escape')closeModal();};

// Contact form
document.getElementById('form-submit').onclick=function(){
  var n=document.getElementById('f-name').value.trim();
  var e=document.getElementById('f-email').value.trim();
  var s=document.getElementById('f-subject').value;
  var m=document.getElementById('f-message').value.trim();
  var st=document.getElementById('form-status');
  if(!n||!e||!s||!m){st.textContent='ERROR: FILL ALL FIELDS';st.className='form-status err';return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){st.textContent='ERROR: INVALID EMAIL';st.className='form-status err';return;}
  window.location.href='mai'+'lto:rajvikrant888@gmail.com?subject='+encodeURIComponent('[PIXEL KEEP] '+s)+'&body='+encodeURIComponent('From: '+n+'\nEmail: '+e+'\n\n'+m);
  st.textContent='MESSAGE SENT!';st.className='form-status ok';
  document.getElementById('f-name').value='';document.getElementById('f-email').value='';document.getElementById('f-message').value='';document.getElementById('f-subject').value='';
  setTimeout(function(){st.textContent='';},4000);
};

// Helpers
function removeGame(id){if(!confirm('REMOVE THIS GAME?')) return;library=library.filter(function(g){return g.id!==id;});saveLib();renderLibrary();}
function saveLib(){try{localStorage.setItem('pk_library',JSON.stringify(library));}catch(e){toast('STORAGE FULL!','warn');}}
function toast(msg,type){var a=document.getElementById('toast-area'),t=document.createElement('div');t.className='toast '+(type||'info');t.textContent=msg;a.appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},3000);}

// Init
renderLibrary();
