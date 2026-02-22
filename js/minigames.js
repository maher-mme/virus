// ============================
// MINI-JEUX IMPLEMENTATIONS (23 uniques)
// ============================

// Helpers communs
function mjShuffle(arr) { for (var i=arr.length-1;i>0;i--) { var j=Math.floor(Math.random()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; } return arr; }
function mjBtn(text, bg, color) { var b=document.createElement('button'); b.textContent=text; b.style.cssText='padding:12px 24px;border:none;border-radius:10px;font-family:Impact,Arial Black,sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;background:'+bg+';color:'+color+';margin:4px;'; return b; }
function mjGrid(cols) { var g=document.createElement('div'); g.style.cssText='display:grid;grid-template-columns:repeat('+cols+',1fr);gap:8px;width:100%;'; return g; }
function mjCell(emoji, size) { var c=document.createElement('div'); c.textContent=emoji; c.style.cssText='display:flex;align-items:center;justify-content:center;font-size:'+(size||'28')+'px;background:#1a252f;border:2px solid #34495e;border-radius:8px;padding:10px;cursor:pointer;transition:all 0.15s;user-select:none;-webkit-user-select:none;'; return c; }
function mjMsg(text) { var m=document.createElement('div'); m.textContent=text; m.style.cssText='color:#bdc3c7;font-size:13px;text-align:center;margin:8px 0;min-height:20px;'; return m; }
function mjTitle(text) { var t=document.createElement('div'); t.textContent=text; t.style.cssText='color:#f39c12;font-family:Impact,Arial Black,sans-serif;font-size:16px;letter-spacing:2px;margin-bottom:10px;text-align:center;'; return t; }
function mjGauge(w) { var bg=document.createElement('div'); bg.style.cssText='width:'+w+'%;height:24px;background:#1a1a2e;border:2px solid #2c3e50;border-radius:12px;overflow:hidden;position:relative;'; var fill=document.createElement('div'); fill.style.cssText='width:0%;height:100%;background:linear-gradient(90deg,#e74c3c,#f39c12,#2ecc71);border-radius:12px;transition:width 0.1s;'; var txt=document.createElement('div'); txt.style.cssText='position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:white;text-shadow:1px 1px 2px #000;'; bg.appendChild(fill); bg.appendChild(txt); return {el:bg,fill:fill,txt:txt}; }

// 1. LIVRES : Remettre les livres dans l'ordre (clic pour swap)
function initMJ_livres(zone) {
  var nums = mjShuffle([1,2,3,4,5]);
  var selected = -1;
  var grid = mjGrid(5);
  var msg = mjMsg(t('mjSwapBooks'));
  var cells = [];
  for (var i=0;i<5;i++) {
    var c = mjCell(nums[i], 24);
    c.textContent = '\uD83D\uDCD5 ' + nums[i];
    c.setAttribute('data-i', i);
    c.addEventListener('click', (function(idx) { return function() { selectBook(idx); }; })(i));
    cells.push(c);
    grid.appendChild(c);
  }
  zone.appendChild(msg); zone.appendChild(grid);
  function selectBook(idx) {
    if (selected < 0) { selected = idx; cells[idx].style.borderColor = '#f39c12'; cells[idx].style.transform = 'scale(1.1)'; }
    else if (selected === idx) { cells[idx].style.borderColor = '#34495e'; cells[idx].style.transform = ''; selected = -1; }
    else {
      var tmp = nums[selected]; nums[selected] = nums[idx]; nums[idx] = tmp;
      cells[selected].textContent = '\uD83D\uDCD5 ' + nums[selected];
      cells[idx].textContent = '\uD83D\uDCD5 ' + nums[idx];
      cells[selected].style.borderColor = '#34495e'; cells[selected].style.transform = '';
      selected = -1;
      var ok = true; for (var j=0;j<5;j++) if (nums[j]!==j+1) ok=false;
      if (ok) completerMiniJeu();
    }
  }
}

// 2. COLIS : Scanner le code-barre (recopier un numero de suivi)
function initMJ_colis(zone) {
  var code = ''; for (var i=0;i<6;i++) code += Math.floor(Math.random()*10);
  var input = ''; var showing = true;
  var display = document.createElement('div'); display.style.cssText='background:#0a0a1a;border:2px solid #2c3e50;border-radius:8px;padding:14px 20px;font-family:Courier New,monospace;font-size:28px;letter-spacing:8px;color:#2ecc71;text-align:center;margin-bottom:12px;text-shadow:0 0 10px rgba(46,204,113,0.5);';
  display.textContent = '\uD83D\uDCE6 ' + code;
  var msg = mjMsg(t('mjMemorize'));
  var pad = document.createElement('div'); pad.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-width:280px;display:none;';
  for (var n=0;n<=9;n++) { var b=document.createElement('button'); b.className='digicode-btn'; b.textContent=n; b.addEventListener('click',(function(d){return function(){doInput(d);};})(n)); pad.appendChild(b); }
  zone.appendChild(display); zone.appendChild(msg); zone.appendChild(pad);
  var t1=setTimeout(function(){ showing=false; display.textContent='\uD83D\uDCE6 _ _ _ _ _ _'; msg.textContent=t('mjEnterCode'); pad.style.display='grid'; },3000); miniJeuTimeouts.push(t1);
  function doInput(d) { if(showing)return; input+=d; var s='\uD83D\uDCE6 '; for(var i=0;i<6;i++) s+=(i<input.length)?input[i]:'_'; display.textContent=s;
    if(input.length>=6){if(input===code){display.style.color='#2ecc71';completerMiniJeu();}else{display.style.color='#e74c3c';msg.textContent=t('mjWrongCode');input='';pad.style.display='none';var t2=setTimeout(function(){display.style.color='#2ecc71';display.textContent='\uD83D\uDCE6 '+code;showing=true;var t3=setTimeout(function(){showing=false;display.textContent='\uD83D\uDCE6 _ _ _ _ _ _';msg.textContent=t('mjEnterNum');pad.style.display='grid';},3000);miniJeuTimeouts.push(t3);},800);miniJeuTimeouts.push(t2);}}
  }
}

// 3. CAMERAS : Trouver l'ecran qui clignote
function initMJ_cameras(zone) {
  var found = 0; var target = 3;
  var msg = mjMsg(t('mjFindCamera',found,target));
  var grid = mjGrid(3);
  var cams = [];
  for (var i=0;i<6;i++) { var c = mjCell('\uD83D\uDCF9', 22); c.style.minHeight='60px'; cams.push(c); grid.appendChild(c); }
  zone.appendChild(msg); zone.appendChild(grid);
  setAlert();
  function setAlert() {
    var idx = Math.floor(Math.random()*6);
    for (var i=0;i<6;i++) { cams[i].style.borderColor='#34495e'; cams[i].style.background='#1a252f'; cams[i].onclick=null; }
    cams[idx].style.borderColor='#e74c3c'; cams[idx].style.background='rgba(231,76,60,0.15)';
    cams[idx].textContent='\uD83D\uDCF9 \u26A0\uFE0F';
    cams[idx].onclick = function() {
      found++; msg.textContent=t('mjFindCamera',found,target);
      cams[idx].style.background='rgba(46,204,113,0.2)'; cams[idx].style.borderColor='#2ecc71'; cams[idx].textContent='\u2705';
      if (found>=target) { completerMiniJeu(); } else { var tt=setTimeout(function(){ for(var j=0;j<6;j++){cams[j].textContent='\uD83D\uDCF9';} setAlert(); },600); miniJeuTimeouts.push(tt); }
    };
  }
}

// 4. RAYONS : Glisser les produits sur les bons rayons
function initMJ_rayons(zone) {
  var items = mjShuffle([{e:'\uD83C\uDF4E',n:'Fruits'},{e:'\uD83E\uDD5B',n:'Lait'},{e:'\uD83C\uDF5E',n:'Pain'},{e:'\uD83E\uDDC0',n:'Fromage'}]);
  var targets = [{e:'\uD83C\uDF4E',n:'Fruits'},{e:'\uD83E\uDD5B',n:'Lait'},{e:'\uD83C\uDF5E',n:'Pain'},{e:'\uD83E\uDDC0',n:'Fromage'}];
  var selectedItem = -1; var placed = 0;
  var msg = mjMsg(t('mjPlaceProduct'));
  var topRow = mjGrid(4); var botRow = mjGrid(4);
  var itemCells = []; var targetCells = [];
  for (var i=0;i<4;i++) {
    var ic = mjCell(items[i].e, 30); ic.addEventListener('click', (function(idx){return function(){selectItem(idx);};})(i)); itemCells.push(ic); topRow.appendChild(ic);
    var tc = mjCell('?', 20); tc.style.background='#2c3e50'; tc.innerHTML='<div style="font-size:10px;color:#95a5a6;">'+targets[i].n+'</div>'; tc.addEventListener('click', (function(idx){return function(){placeItem(idx);};})(i)); targetCells.push(tc); botRow.appendChild(tc);
  }
  zone.appendChild(msg); zone.appendChild(topRow); zone.appendChild(document.createElement('br')); zone.appendChild(botRow);
  function selectItem(idx) { if(itemCells[idx].style.opacity==='0.3')return; if(selectedItem>=0)itemCells[selectedItem].style.borderColor='#34495e'; selectedItem=idx; itemCells[idx].style.borderColor='#f39c12'; }
  function placeItem(idx) { if(selectedItem<0)return; if(items[selectedItem].n===targets[idx].n){ targetCells[idx].textContent=items[selectedItem].e; targetCells[idx].style.borderColor='#2ecc71'; itemCells[selectedItem].style.opacity='0.3'; itemCells[selectedItem].style.borderColor='#34495e'; placed++; selectedItem=-1; if(placed>=4)completerMiniJeu(); } else { targetCells[idx].style.borderColor='#e74c3c'; setTimeout(function(){targetCells[idx].style.borderColor='#34495e';},300); } }
}

// 5. ESCALATOR : Connecter les engrenages (cliquer pour tourner)
function initMJ_escalator(zone) {
  var gears = [0,0,0,0]; // 0=pas bon, 1=bon sens
  var target = [1,0,1,0]; // alternance
  var msg = mjMsg(t('mjGears'));
  var grid = mjGrid(4);
  var cells = [];
  for (var i=0;i<4;i++) {
    var c = mjCell('\u2699\uFE0F', 36); c.style.color=(gears[i]?'#2ecc71':'#e74c3c');
    c.innerHTML = '<span style="display:inline-block;transform:rotate(0deg);font-size:36px;">\u2699\uFE0F</span><div style="font-size:10px;color:#95a5a6;">'+(gears[i]?'\u21BB':'\u21BA')+'</div>';
    c.addEventListener('click', (function(idx){return function(){toggleGear(idx);};})(i));
    cells.push(c); grid.appendChild(c);
  }
  zone.appendChild(msg); zone.appendChild(grid);
  function toggleGear(idx) {
    gears[idx] = gears[idx]?0:1;
    cells[idx].innerHTML = '<span style="display:inline-block;transform:rotate('+(gears[idx]?'180':'0')+'deg);font-size:36px;">\u2699\uFE0F</span><div style="font-size:10px;color:#95a5a6;">'+(gears[idx]?'\u21BB':'\u21BA')+'</div>';
    var ok=true; for(var j=0;j<4;j++)if(gears[j]!==target[j])ok=false;
    if(ok) completerMiniJeu();
  }
}

// 6. TOILETTES : Fermer les fuites (cliquer quand elles apparaissent)
function initMJ_toilettes(zone) {
  var fixed = 0; var total = 5;
  var msg = mjMsg(t('mjFixLeaks',fixed,total));
  var grid = mjGrid(3);
  var pipes = [];
  for (var i=0;i<6;i++) { var c = mjCell('\uD83D\uDEB0', 28); c.style.minHeight='60px'; pipes.push(c); grid.appendChild(c); }
  zone.appendChild(msg); zone.appendChild(grid);
  spawnLeak();
  function spawnLeak() {
    if(fixed>=total)return;
    var idx=Math.floor(Math.random()*6);
    pipes[idx].textContent='\uD83D\uDCA7'; pipes[idx].style.borderColor='#3498db'; pipes[idx].style.background='rgba(52,152,219,0.15)';
    pipes[idx].onclick=function(){ fixed++; msg.textContent=t('mjFixLeaks',fixed,total); pipes[idx].textContent='\u2705'; pipes[idx].style.borderColor='#2ecc71'; pipes[idx].style.background='#1a252f'; pipes[idx].onclick=null;
      if(fixed>=total){completerMiniJeu();}else{var tt=setTimeout(spawnLeak,400);miniJeuTimeouts.push(tt);}
    };
  }
}

// 7. POMPES : Alterner haut/bas
function initMJ_pompes(zone) {
  var count = 0; var total = 16; var expectUp = true;
  var msg = mjMsg(t('mjAlternate',count,total));
  var btnUp = mjBtn(t('mjUp'), '#2ecc71', 'white'); var btnDown = mjBtn(t('mjDown'), '#e74c3c', 'white');
  btnUp.style.width='120px'; btnUp.style.height='80px'; btnUp.style.fontSize='20px';
  btnDown.style.width='120px'; btnDown.style.height='80px'; btnDown.style.fontSize='20px';
  var gauge = mjGauge(80);
  btnUp.addEventListener('click', function(){ if(!expectUp)return; count++; expectUp=false; update(); });
  btnDown.addEventListener('click', function(){ if(expectUp)return; count++; expectUp=true; update(); });
  btnUp.addEventListener('touchstart', function(e){ e.preventDefault(); btnUp.click(); }, {passive:false});
  btnDown.addEventListener('touchstart', function(e){ e.preventDefault(); btnDown.click(); }, {passive:false});
  var row = document.createElement('div'); row.style.cssText='display:flex;gap:16px;justify-content:center;margin-top:10px;';
  row.appendChild(btnUp); row.appendChild(btnDown);
  zone.appendChild(msg); zone.appendChild(gauge.el); zone.appendChild(row);
  function update(){ var pct=Math.round(count/total*100); gauge.fill.style.width=pct+'%'; gauge.txt.textContent=pct+'%'; msg.textContent=t('mjAlternate',count,total); btnUp.style.opacity=expectUp?'1':'0.4'; btnDown.style.opacity=expectUp?'0.4':'1'; if(count>=total)completerMiniJeu(); }
  update();
}

// 8. VITRINES : Nettoyer les taches sur les vitrines
function initMJ_vitrines(zone) {
  var cleaned = 0; var total = 8;
  var msg = mjMsg(t('mjCleanSpots',cleaned,total));
  var grid = mjGrid(4);
  for (var i=0;i<total;i++) {
    var c = mjCell('\uD83D\uDCA9', 24); c.style.background='rgba(139,115,85,0.2)';
    c.addEventListener('click', (function(el){return function(){
      if(el.dataset.done)return; el.dataset.done='1'; el.textContent='\u2728'; el.style.background='rgba(46,204,113,0.1)'; el.style.borderColor='#2ecc71';
      cleaned++; msg.textContent=t('mjCleanSpots',cleaned,total); if(cleaned>=total)completerMiniJeu();
    };})(c));
    grid.appendChild(c);
  }
  zone.appendChild(msg); zone.appendChild(grid);
}

// 9. ECHANTILLONS : Trouver le bon parfum (memoire d'odeurs)
function initMJ_echantillons(zone) {
  var parfums = ['\uD83C\uDF39','\uD83C\uDF3B','\uD83C\uDF3A','\uD83C\uDF37','\uD83C\uDF38','\uD83C\uDF3C'];
  var pairs = mjShuffle([0,0,1,1,2,2]); var revealed = []; var first = -1; var found = 0;
  var msg = mjMsg(t('mjFindPairs'));
  var grid = mjGrid(3);
  var cells = [];
  for (var i=0;i<6;i++) {
    var c = mjCell('?', 28); c.style.minHeight='55px';
    c.addEventListener('click', (function(idx){return function(){reveal(idx);};})(i));
    cells.push(c); grid.appendChild(c);
  }
  zone.appendChild(msg); zone.appendChild(grid);
  function reveal(idx) {
    if(revealed[idx]||cells[idx].dataset.locked)return;
    revealed[idx]=true; cells[idx].textContent=parfums[pairs[idx]];
    if(first<0){first=idx;}
    else{
      var f=first; first=-1;
      if(pairs[f]===pairs[idx]){cells[f].dataset.locked='1';cells[idx].dataset.locked='1';cells[f].style.borderColor='#2ecc71';cells[idx].style.borderColor='#2ecc71';found++;if(found>=3)completerMiniJeu();}
      else{var tt=setTimeout(function(){revealed[f]=false;revealed[idx]=false;cells[f].textContent='?';cells[idx].textContent='?';},800);miniJeuTimeouts.push(tt);}
    }
  }
}

// 10. CAFE : Remplir la tasse au bon niveau (maintenir et relacher)
function initMJ_cafe(zone) {
  var level = 0; var targetMin = 65; var targetMax = 80; var filling = false; var done = false;
  var msg = mjMsg(t('mjPourRelease'));
  var cup = document.createElement('div'); cup.style.cssText='width:80px;height:140px;border:3px solid #8b6914;border-top:none;border-radius:0 0 12px 12px;position:relative;overflow:hidden;background:#1a1a2e;margin:10px auto;';
  var fill = document.createElement('div'); fill.style.cssText='position:absolute;bottom:0;width:100%;height:0%;background:linear-gradient(180deg,#6b4226,#8b5e34);transition:height 0.05s;';
  var greenZone = document.createElement('div'); greenZone.style.cssText='position:absolute;bottom:'+targetMin+'%;width:100%;height:'+(targetMax-targetMin)+'%;background:rgba(46,204,113,0.25);border-top:2px solid #2ecc71;border-bottom:2px solid #2ecc71;';
  cup.appendChild(greenZone); cup.appendChild(fill);
  var pourBtn = mjBtn(t('mjPour'), '#8b5e34', 'white'); pourBtn.style.width='100%';
  pourBtn.addEventListener('mousedown', function(e){e.preventDefault();filling=true;});
  pourBtn.addEventListener('mouseup', function(){filling=false;checkLevel();});
  pourBtn.addEventListener('touchstart', function(e){e.preventDefault();filling=true;},{passive:false});
  pourBtn.addEventListener('touchend', function(){filling=false;checkLevel();});
  zone.appendChild(msg); zone.appendChild(cup); zone.appendChild(pourBtn);
  var tickCafe = function(){ if(done)return; if(filling){level=Math.min(100,level+1.5);} fill.style.height=level+'%'; };
  miniJeuInterval = setInterval(tickCafe,50);
  miniJeuResumeFn = function(){ miniJeuInterval = setInterval(tickCafe,50); };
  function checkLevel(){ if(done)return; if(level>=targetMin&&level<=targetMax){done=true;msg.textContent=t('mjPerfect');completerMiniJeu();}else if(level>targetMax){msg.textContent=t('mjTooMuch');level=0;} }
}

// 11. BOX INTERNET : Connecter les fils colores
function initMJ_box(zone) {
  var colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];
  var names = ['R', 'B', 'V', 'J'];
  var rightOrder = [0,1,2,3];
  for (var i = rightOrder.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = rightOrder[i]; rightOrder[i] = rightOrder[j]; rightOrder[j] = tmp;
  }

  var connected = 0;
  var selectedLeft = -1;

  var container = document.createElement('div');
  container.className = 'wires-container';

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'wires-svg');

  var leftCol = document.createElement('div');
  leftCol.className = 'wires-left';
  var rightCol = document.createElement('div');
  rightCol.className = 'wires-right';

  for (var li = 0; li < 4; li++) {
    var ep = document.createElement('div');
    ep.className = 'wire-endpoint';
    ep.style.background = colors[li];
    ep.textContent = names[li];
    ep.setAttribute('data-color-idx', li);
    ep.addEventListener('click', (function(idx, el) {
      return function() { wiresSelectLeft(idx, el); };
    })(li, ep));
    leftCol.appendChild(ep);
  }

  for (var ri = 0; ri < 4; ri++) {
    var ci = rightOrder[ri];
    var ep2 = document.createElement('div');
    ep2.className = 'wire-endpoint';
    ep2.style.background = colors[ci];
    ep2.textContent = names[ci];
    ep2.setAttribute('data-color-idx', ci);
    ep2.addEventListener('click', (function(idx, el) {
      return function() { wiresSelectRight(idx, el); };
    })(ci, ep2));
    rightCol.appendChild(ep2);
  }

  container.appendChild(leftCol);
  container.appendChild(svg);
  container.appendChild(rightCol);
  zone.appendChild(container);

  function wiresSelectLeft(colorIdx, el) {
    var prev = leftCol.querySelector('.wire-selected');
    if (prev) { prev.classList.remove('wire-selected'); prev.style.boxShadow = ''; }
    selectedLeft = colorIdx;
    el.classList.add('wire-selected');
    el.style.boxShadow = '0 0 15px ' + colors[colorIdx];
  }

  function wiresSelectRight(colorIdx, el) {
    if (selectedLeft < 0) return;
    if (colorIdx === selectedLeft) {
      var leftEl = leftCol.children[selectedLeft];
      leftEl.classList.add('connected');
      el.classList.add('connected');
      leftEl.style.boxShadow = '';
      leftEl.classList.remove('wire-selected');

      var lr = leftEl.getBoundingClientRect();
      var rr = el.getBoundingClientRect();
      var cr = container.getBoundingClientRect();
      var line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', lr.right - cr.left);
      line.setAttribute('y1', lr.top + lr.height/2 - cr.top);
      line.setAttribute('x2', rr.left - cr.left);
      line.setAttribute('y2', rr.top + rr.height/2 - cr.top);
      line.setAttribute('stroke', colors[colorIdx]);
      svg.appendChild(line);

      connected++;
      selectedLeft = -1;
      if (connected >= 4) {
        completerMiniJeu();
      }
    } else {
      selectedLeft = -1;
      var prev = leftCol.querySelector('.wire-selected');
      if (prev) { prev.classList.remove('wire-selected'); prev.style.boxShadow = ''; }
    }
  }
}

// 12. PROJECTION : Ajuster le focus du projecteur
function initMJ_projection(zone) {
  var pos = 0; var dir = 1; var speed = 1.0; var hits = 0; var total = 2; var done = false;
  var targetMin = 40; var targetMax = 58;
  var msg = mjMsg(t('mjFocus',hits,total));
  var screen = document.createElement('div'); screen.style.cssText='width:90%;height:60px;background:#0a0a1a;border:2px solid #2c3e50;border-radius:6px;position:relative;overflow:hidden;margin:8px auto;';
  var tgt = document.createElement('div'); tgt.style.cssText='position:absolute;top:0;height:100%;width:18%;background:rgba(46,204,113,0.2);border-left:2px solid #2ecc71;border-right:2px solid #2ecc71;left:'+targetMin+'%;';
  var ind = document.createElement('div'); ind.style.cssText='position:absolute;top:2px;bottom:2px;width:6px;background:#f39c12;border-radius:3px;left:0;';
  screen.appendChild(tgt); screen.appendChild(ind);
  var btn = mjBtn(t('mjFocusBtn'), '#3498db', 'white'); btn.style.width='100%';
  btn.addEventListener('click', function(){
    if(done)return;
    if(pos>=targetMin&&pos<=targetMax){hits++;msg.textContent=t('mjFocus',hits,total);speed+=0.4;targetMin=20+Math.floor(Math.random()*55);targetMax=targetMin+18;tgt.style.left=targetMin+'%';if(hits>=total){done=true;completerMiniJeu();}}
    else{tgt.style.background='rgba(231,76,60,0.3)';setTimeout(function(){tgt.style.background='rgba(46,204,113,0.2)';},200);}
  });
  zone.appendChild(msg); zone.appendChild(screen); zone.appendChild(btn);
  var tickProj = function(){if(done)return;pos+=dir*speed;if(pos>=100){pos=100;dir=-1;}if(pos<=0){pos=0;dir=1;}ind.style.left=pos+'%';};
  miniJeuInterval = setInterval(tickProj,16);
  miniJeuResumeFn = function(){ miniJeuInterval = setInterval(tickProj,16); };
}

// 13. TABLES : Debarrasser les assiettes sales
function initMJ_tables(zone) {
  var cleaned = 0; var total = 6;
  var emojis = ['\uD83C\uDF7D\uFE0F','\uD83E\uDD62','\uD83C\uDF54','\uD83C\uDF5D','\uD83E\uDD57','\uD83C\uDF5B'];
  var msg = mjMsg(t('mjClearPlates',cleaned,total));
  var grid = mjGrid(3);
  for (var i=0;i<total;i++) {
    var c = mjCell(emojis[i], 28); c.style.background='rgba(139,69,19,0.15)';
    c.addEventListener('click', (function(el){return function(){
      if(el.dataset.done)return; el.dataset.done='1'; el.textContent='\u2728'; el.style.background='rgba(46,204,113,0.1)'; el.style.borderColor='#2ecc71';
      cleaned++; msg.textContent=t('mjClearPlates',cleaned,total); if(cleaned>=total)completerMiniJeu();
    };})(c));
    grid.appendChild(c);
  }
  zone.appendChild(msg); zone.appendChild(grid);
}

// 14. MEDICAMENTS : Trier les pilules par couleur
function initMJ_medicaments(zone) {
  var colors = ['#e74c3c','#3498db','#2ecc71']; var names = ['Rouge','Bleu','Vert'];
  var pills = mjShuffle([0,0,1,1,2,2]); var sorted = 0; var selectedPill = -1;
  var msg = mjMsg(t('mjSortPills'));
  var pillRow = mjGrid(6); var pillCells = [];
  for (var i=0;i<6;i++) {
    var c = mjCell('\uD83D\uDC8A', 22); c.style.color=colors[pills[i]]; c.style.textShadow='0 0 8px '+colors[pills[i]];
    c.addEventListener('click',(function(idx){return function(){if(pillCells[idx].dataset.done)return;if(selectedPill>=0)pillCells[selectedPill].style.borderColor='#34495e';selectedPill=idx;pillCells[idx].style.borderColor='#f39c12';};})(i));
    pillCells.push(c); pillRow.appendChild(c);
  }
  var binRow = mjGrid(3); var bins = [];
  for (var j=0;j<3;j++) {
    var b = mjCell('\uD83D\uDDD1\uFE0F', 22); b.style.borderColor=colors[j]; b.innerHTML='\uD83D\uDDD1\uFE0F<div style="font-size:9px;color:'+colors[j]+';">'+names[j]+'</div>';
    b.addEventListener('click',(function(ci){return function(){
      if(selectedPill<0)return;
      if(pills[selectedPill]===ci){pillCells[selectedPill].dataset.done='1';pillCells[selectedPill].style.opacity='0.3';pillCells[selectedPill].style.borderColor='#34495e';sorted++;selectedPill=-1;if(sorted>=6)completerMiniJeu();}
      else{bins[ci].style.background='rgba(231,76,60,0.2)';setTimeout(function(){bins[ci].style.background='#1a252f';},300);}
    };})(j));
    bins.push(b); binRow.appendChild(b);
  }
  zone.appendChild(msg); zone.appendChild(pillRow); zone.appendChild(document.createElement('br')); zone.appendChild(binRow);
}

// 15. VETEMENTS : Accrocher les vetements par couleur
function initMJ_vetements(zone) {
  var items = mjShuffle([{e:'\uD83D\uDC55',c:'#e74c3c'},{e:'\uD83D\uDC57',c:'#3498db'},{e:'\uD83E\uDDE5',c:'#2ecc71'},{e:'\uD83E\uDD7E',c:'#f39c12'}]);
  var hangers = [{e:'\uD83E\uDDE3',c:'#e74c3c',n:t('mjHangerRed')},{e:'\uD83E\uDDE3',c:'#3498db',n:t('mjHangerBlue')},{e:'\uD83E\uDDE3',c:'#2ecc71',n:t('mjHangerGreen')},{e:'\uD83E\uDDE3',c:'#f39c12',n:t('mjHangerOrange')}];
  var sel = -1; var placed = 0;
  var msg = mjMsg(t('mjHangClothes'));
  var topRow = mjGrid(4); var botRow = mjGrid(4);
  var itemCells = []; var hangerCells = [];
  for (var i=0;i<4;i++) {
    var ic = mjCell(items[i].e, 30); ic.style.textShadow='0 0 8px '+items[i].c;
    ic.addEventListener('click',(function(idx){return function(){if(itemCells[idx].dataset.done)return;if(sel>=0)itemCells[sel].style.borderColor='#34495e';sel=idx;itemCells[idx].style.borderColor='#f39c12';};})(i));
    itemCells.push(ic); topRow.appendChild(ic);
    var hc = mjCell('', 18); hc.style.borderColor=hangers[i].c; hc.innerHTML='<div style="font-size:10px;color:'+hangers[i].c+';">'+hangers[i].n+'</div>';
    hc.addEventListener('click',(function(idx){return function(){
      if(sel<0)return;
      if(items[sel].c===hangers[idx].c){hangerCells[idx].textContent=items[sel].e;hangerCells[idx].style.borderColor='#2ecc71';itemCells[sel].dataset.done='1';itemCells[sel].style.opacity='0.3';itemCells[sel].style.borderColor='#34495e';placed++;sel=-1;if(placed>=4)completerMiniJeu();}
      else{hangerCells[idx].style.background='rgba(231,76,60,0.2)';setTimeout(function(){hangerCells[idx].style.background='#1a252f';},300);}
    };})(i));
    hangerCells.push(hc); botRow.appendChild(hc);
  }
  zone.appendChild(msg); zone.appendChild(topRow); zone.appendChild(document.createElement('br')); zone.appendChild(botRow);
}

// 16. CONSOLES : Telecharger la mise a jour (cliquer quand ca pause)
function initMJ_consoles(zone) {
  var progress = 0; var paused = false; var pauses = 0; var totalPauses = 3; var done = false;
  var msg = mjMsg(t('mjDownloading'));
  var gauge = mjGauge(90);
  var resumeBtn = mjBtn(t('mjResumeBtn'), '#2ecc71', 'white'); resumeBtn.style.display='none'; resumeBtn.style.width='100%';
  resumeBtn.addEventListener('click', function(){if(!paused||done)return;paused=false;resumeBtn.style.display='none';msg.textContent=t('mjDownloading');});
  zone.appendChild(msg); zone.appendChild(gauge.el); zone.appendChild(resumeBtn);
  var nextPause = 15+Math.floor(Math.random()*20);
  var tickConsoles = function(){
    if(done||paused)return;
    progress+=0.5;
    gauge.fill.style.width=Math.min(progress,100)+'%'; gauge.txt.textContent=Math.round(progress)+'%';
    if(progress>=nextPause&&pauses<totalPauses){paused=true;pauses++;msg.textContent=t('mjDownloadError',pauses,totalPauses);resumeBtn.style.display='block';nextPause=progress+15+Math.floor(Math.random()*20);}
    if(progress>=100){done=true;completerMiniJeu();}
  };
  miniJeuInterval = setInterval(tickConsoles,50);
  miniJeuResumeFn = function(){ miniJeuInterval = setInterval(tickConsoles,50); };
}

// 17. ANIMAUX : Donner la bonne nourriture
function initMJ_animaux(zone) {
  var animals = [{e:'\uD83D\uDC31',n:'Chat',food:'\uD83D\uDC1F'},{e:'\uD83D\uDC36',n:'Chien',food:'\uD83E\uDD69'},{e:'\uD83D\uDC30',n:'Lapin',food:'\uD83E\uDD55'}];
  var foods = mjShuffle(['\uD83D\uDC1F','\uD83E\uDD69','\uD83E\uDD55']);
  var selFood = -1; var fed = 0;
  var msg = mjMsg(t('mjFeedAnimal'));
  var animalRow = mjGrid(3); var foodRow = mjGrid(3);
  var aCells = []; var fCells = [];
  for (var i=0;i<3;i++) {
    var ac = mjCell(animals[i].e, 36); ac.innerHTML=animals[i].e+'<div style="font-size:10px;color:#bdc3c7;">'+animals[i].n+'</div>';
    ac.addEventListener('click',(function(idx){return function(){
      if(selFood<0||aCells[idx].dataset.done)return;
      if(foods[selFood]===animals[idx].food){aCells[idx].dataset.done='1';aCells[idx].style.borderColor='#2ecc71';aCells[idx].innerHTML=animals[idx].e+' '+animals[idx].food;fCells[selFood].style.opacity='0.3';fCells[selFood].dataset.done='1';selFood=-1;fed++;if(fed>=3)completerMiniJeu();}
      else{aCells[idx].style.background='rgba(231,76,60,0.2)';setTimeout(function(){aCells[idx].style.background='#1a252f';},300);}
    };})(i));
    aCells.push(ac); animalRow.appendChild(ac);
    var fc = mjCell(foods[i], 30);
    fc.addEventListener('click',(function(idx){return function(){if(fCells[idx].dataset.done)return;if(selFood>=0)fCells[selFood].style.borderColor='#34495e';selFood=idx;fCells[idx].style.borderColor='#f39c12';};})(i));
    fCells.push(fc); foodRow.appendChild(fc);
  }
  zone.appendChild(msg); zone.appendChild(animalRow); zone.appendChild(document.createElement('br')); zone.appendChild(foodRow);
}

// 18. FOURS : Regler la temperature (aiguille + zone cible)
function initMJ_fours(zone) {
  var temp = 0; var dir = 1; var speed = 0.8; var done = false;
  var targetMin = 170; var targetMax = 190;
  var msg = mjMsg(t('mjStopThermo'));
  var display = document.createElement('div'); display.style.cssText='font-family:Courier New,monospace;font-size:42px;color:#f39c12;text-align:center;margin:10px;text-shadow:0 0 10px rgba(243,156,18,0.5);';
  display.textContent='0\u00B0C';
  var btn = mjBtn(t('mjStopBtn'), '#e74c3c', 'white'); btn.style.width='100%';
  btn.addEventListener('click', function(){
    if(done)return;
    if(temp>=targetMin&&temp<=targetMax){done=true;display.style.color='#2ecc71';msg.textContent=t('mjTempPerfect');completerMiniJeu();}
    else{msg.textContent=(temp<targetMin?t('mjTooCold'):t('mjTooHot'))+t('mjRetry');display.style.color='#e74c3c';setTimeout(function(){display.style.color='#f39c12';msg.textContent=t('mjStopThermo');},500);}
  });
  zone.appendChild(msg); zone.appendChild(display); zone.appendChild(btn);
  var tickFours = function(){if(done)return;temp+=dir*speed;if(temp>=250){temp=250;dir=-1;}if(temp<=0){temp=0;dir=1;}display.textContent=Math.round(temp)+'\u00B0C';if(temp>=targetMin&&temp<=targetMax)display.style.color='#2ecc71';else display.style.color='#f39c12';};
  miniJeuInterval = setInterval(tickFours,30);
  miniJeuResumeFn = function(){ miniJeuInterval = setInterval(tickFours,30); };
}

// 19. PLANTES : Arroser 3 plantes au bon niveau
function initMJ_plantes(zone) {
  var plants = [{e:'\uD83C\uDF31',target:60},{e:'\uD83C\uDF3F',target:70},{e:'\uD83C\uDF35',target:40}];
  var levels = [0,0,0]; var done = [false,false,false]; var filling = -1; var completed = 0;
  var msg = mjMsg(t('mjWaterPlants'));
  var grid = mjGrid(3);
  var bars = []; var cells = [];
  for (var i=0;i<3;i++) {
    var wrap = document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;';
    var bar = document.createElement('div'); bar.style.cssText='width:30px;height:100px;background:#1a252f;border:2px solid #34495e;border-radius:4px;position:relative;overflow:hidden;';
    var fl = document.createElement('div'); fl.style.cssText='position:absolute;bottom:0;width:100%;height:0%;background:#3498db;transition:height 0.05s;';
    var gz = document.createElement('div'); gz.style.cssText='position:absolute;bottom:'+(plants[i].target-8)+'%;width:100%;height:16%;background:rgba(46,204,113,0.3);border-top:1px solid #2ecc71;border-bottom:1px solid #2ecc71;';
    bar.appendChild(gz); bar.appendChild(fl);
    var lbl = document.createElement('div'); lbl.style.cssText='font-size:24px;'; lbl.textContent=plants[i].e;
    var btn = mjBtn('\uD83D\uDCA7', '#3498db', 'white'); btn.style.padding='6px 16px'; btn.style.fontSize='18px';
    btn.addEventListener('mousedown',(function(idx){return function(e){e.preventDefault();if(!done[idx])filling=idx;};})(i));
    btn.addEventListener('mouseup',(function(idx){return function(){if(filling===idx){filling=-1;checkPlant(idx);}};})(i));
    btn.addEventListener('touchstart',(function(idx){return function(e){e.preventDefault();if(!done[idx])filling=idx;};})(i),{passive:false});
    btn.addEventListener('touchend',(function(idx){return function(){if(filling===idx){filling=-1;checkPlant(idx);}};})(i));
    wrap.appendChild(lbl); wrap.appendChild(bar); wrap.appendChild(btn);
    bars.push(fl); cells.push(wrap); grid.appendChild(wrap);
  }
  zone.appendChild(msg); zone.appendChild(grid);
  var tickPlantes = function(){
    if(filling>=0&&!done[filling]){levels[filling]=Math.min(100,levels[filling]+1.2);bars[filling].style.height=levels[filling]+'%';}
  };
  miniJeuInterval = setInterval(tickPlantes,50);
  miniJeuResumeFn = function(){ miniJeuInterval = setInterval(tickPlantes,50); };
  function checkPlant(idx){
    var tgt=plants[idx].target;
    if(levels[idx]>=tgt-8&&levels[idx]<=tgt+8){done[idx]=true;bars[idx].style.background='#2ecc71';completed++;if(completed>=3)completerMiniJeu();}
    else{msg.textContent=(levels[idx]<tgt-8?t('mjNotEnough'):t('mjTooMuchWater'))+t('mjRetryPlant');levels[idx]=0;bars[idx].style.height='0%';}
  }
}

// 20. INFUSIONS : Etapes dans le bon ordre
function initMJ_infusions(zone) {
  var steps = ['\uD83D\uDD25 Faire bouillir','\uD83C\uDF75 Mettre le the','\u23F3 Laisser infuser','\uD83E\uDD64 Servir'];
  var shuffled = mjShuffle(steps.slice()); var current = 0;
  var msg = mjMsg(t('mjTeaOrder'));
  var orderDisplay = document.createElement('div'); orderDisplay.style.cssText='color:#f39c12;font-size:12px;text-align:center;margin-bottom:8px;letter-spacing:1px;';
  orderDisplay.textContent=t('mjTeaOrderHint');
  var grid = mjGrid(2);
  var cells = [];
  for (var i=0;i<4;i++) {
    var c = mjCell(shuffled[i], 14); c.style.fontSize='14px'; c.style.minHeight='50px';
    c.addEventListener('click',(function(idx){return function(){
      if(cells[idx].dataset.done)return;
      if(shuffled[idx]===steps[current]){cells[idx].dataset.done='1';cells[idx].style.borderColor='#2ecc71';cells[idx].style.opacity='0.5';current++;if(current>=4)completerMiniJeu();}
      else{cells[idx].style.borderColor='#e74c3c';setTimeout(function(){cells[idx].style.borderColor='#34495e';},400);msg.textContent=t('mjWrongOrder',current+1);}
    };})(i));
    cells.push(c); grid.appendChild(c);
  }
  zone.appendChild(msg); zone.appendChild(orderDisplay); zone.appendChild(grid);
}

// 21. CALIBRER : Deux aiguilles a aligner dans la zone verte
function initMJ_calibrer(zone) {
  var pos1=0,pos2=100,dir1=1,dir2=-1,sp1=0.9,sp2=1.3,done=false;
  var tgt=42,tgtW=16;
  var msg = mjMsg(t('mjAlignBoth'));
  var mkTrack=function(){
    var t=document.createElement('div');t.style.cssText='width:90%;height:30px;background:#1a1a2e;border:2px solid #2c3e50;border-radius:4px;position:relative;overflow:hidden;margin:6px auto;';
    var g=document.createElement('div');g.style.cssText='position:absolute;top:0;height:100%;width:'+tgtW+'%;background:rgba(46,204,113,0.2);border-left:2px solid #2ecc71;border-right:2px solid #2ecc71;left:'+tgt+'%;';
    var n=document.createElement('div');n.style.cssText='position:absolute;top:2px;bottom:2px;width:6px;background:#e74c3c;border-radius:3px;left:0;';
    t.appendChild(g);t.appendChild(n);return{el:t,needle:n};
  };
  var t1=mkTrack(),t2=mkTrack();
  var btn=mjBtn(t('mjValidateBtn'),'#f39c12','#000');btn.style.width='100%';
  btn.addEventListener('click',function(){
    if(done)return;
    var ok1=pos1>=tgt&&pos1<=tgt+tgtW,ok2=pos2>=tgt&&pos2<=tgt+tgtW;
    if(ok1&&ok2){done=true;completerMiniJeu();}
    else{msg.textContent=t('mjBothGreen');setTimeout(function(){msg.textContent=t('mjAlignBoth');},800);}
  });
  zone.appendChild(msg);zone.appendChild(t1.el);zone.appendChild(t2.el);zone.appendChild(btn);
  var tickCalibrer=function(){if(done)return;
    pos1+=dir1*sp1;if(pos1>=100){pos1=100;dir1=-1;}if(pos1<=0){pos1=0;dir1=1;}t1.needle.style.left=pos1+'%';
    pos2+=dir2*sp2;if(pos2>=100){pos2=100;dir2=-1;}if(pos2<=0){pos2=0;dir2=1;}t2.needle.style.left=pos2+'%';
  };
  miniJeuInterval=setInterval(tickCalibrer,16);
  miniJeuResumeFn=function(){ miniJeuInterval=setInterval(tickCalibrer,16); };
}

// 22. QUILLES : Relever les quilles tombees
function initMJ_quilles(zone) {
  var total = 10; var fallen = []; var fixed = 0;
  for(var i=0;i<total;i++) fallen.push(Math.random()<0.6);
  var toFix=0; for(var i=0;i<total;i++) if(fallen[i]) toFix++;
  if(toFix===0){fallen[0]=true;fallen[3]=true;toFix=2;}
  var msg = mjMsg(t('mjFixPins',fixed,toFix));
  var container = document.createElement('div'); container.style.cssText='display:flex;flex-direction:column;align-items:center;gap:6px;';
  var idx = 0; var cells = [];
  for(var r=0;r<4;r++){
    var row = document.createElement('div'); row.style.cssText='display:flex;gap:6px;justify-content:center;';
    for(var c=0;c<=r;c++){
      var pin = mjCell(fallen[idx]?'\u274C':'\uD83C\uDFB3', 22); pin.style.width='44px'; pin.style.height='44px'; pin.style.padding='4px';
      if(fallen[idx]){pin.style.background='rgba(231,76,60,0.15)';pin.style.borderColor='#e74c3c';
        pin.addEventListener('click',(function(pidx,el){return function(){if(el.dataset.done)return;el.dataset.done='1';fallen[pidx]=false;el.textContent='\uD83C\uDFB3';el.style.background='#1a252f';el.style.borderColor='#2ecc71';fixed++;msg.textContent=t('mjFixPins',fixed,toFix);if(fixed>=toFix)completerMiniJeu();};})(idx,pin));
      }
      cells.push(pin); row.appendChild(pin); idx++;
    }
    container.appendChild(row);
  }
  zone.appendChild(msg); zone.appendChild(container);
}

// 23. BALLONS : Gonfler sans eclater
function initMJ_ballons(zone) {
  var current = 0; var total = 3; var size = 0; var targets = [60,70,80]; var inflating = false; var done = false;
  var msg = mjMsg(t('mjInflate',current,total));
  var balloon = document.createElement('div'); balloon.style.cssText='width:40px;height:40px;background:radial-gradient(circle,#e74c3c,#c0392b);border-radius:50%;margin:10px auto;transition:width 0.05s,height 0.05s;display:flex;align-items:center;justify-content:center;font-size:20px;';
  balloon.textContent='\uD83C\uDF88';
  var dangerBar = mjGauge(70);
  var btn = mjBtn(t('mjInflateBtn'), '#e74c3c', 'white'); btn.style.width='100%';
  btn.addEventListener('mousedown',function(e){e.preventDefault();if(!done)inflating=true;});
  btn.addEventListener('mouseup',function(){inflating=false;checkBalloon();});
  btn.addEventListener('touchstart',function(e){e.preventDefault();if(!done)inflating=true;},{passive:false});
  btn.addEventListener('touchend',function(){inflating=false;checkBalloon();});
  zone.appendChild(msg); zone.appendChild(balloon); zone.appendChild(dangerBar.el); zone.appendChild(btn);
  var tickBallons=function(){
    if(done)return;
    if(inflating){size+=1.5;var s=40+size*0.8;balloon.style.width=s+'px';balloon.style.height=s+'px';
      dangerBar.fill.style.width=size+'%';dangerBar.txt.textContent=Math.round(size)+'%';
      if(size>=100){inflating=false;done=true;balloon.textContent='\uD83D\uDCA5';msg.textContent=t('mjPopped');
        setTimeout(function(){done=false;size=0;balloon.style.width='40px';balloon.style.height='40px';balloon.textContent='\uD83C\uDF88';dangerBar.fill.style.width='0%';dangerBar.txt.textContent='0%';msg.textContent=t('mjInflate',current,total);},1000);
      }
    }
  };
  miniJeuInterval=setInterval(tickBallons,50);
  miniJeuResumeFn=function(){ miniJeuInterval=setInterval(tickBallons,50); };
  function checkBalloon(){
    if(done)return; var tgt=targets[current];
    if(size>=tgt-10&&size<=tgt+5){current++;balloon.textContent='\u2705';
      if(current>=total){done=true;completerMiniJeu();}
      else{setTimeout(function(){size=0;balloon.style.width='40px';balloon.style.height='40px';balloon.textContent='\uD83C\uDF88';dangerBar.fill.style.width='0%';dangerBar.txt.textContent='0%';msg.textContent=t('mjKeepInflating',current,total);},600);}
    }else if(size<tgt-10){msg.textContent=t('mjNotInflated');}
  }
}
