(async function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const load=n=>fetch('data/'+n+'.json?v='+Date.now()).then(r=>r.json());
const [meta,sources,tours,events,rpd,auds,artists]=await Promise.all(['meta','sources','tours','events','rpd','auditions','artists'].map(load));

const LABEL={verified:'검증됨',partial:'부분 확인',grok:'Grok 대화 기준',unverified:'미확인',forecast:'전망',conflict:'충돌',claude:'Claude 리서치 기준',estimate:'추정치'};
const badge=s=>s?`<span class="badge ${s}">${LABEL[s]||s}</span>`:'';

// per-section source registry
function Reg(sec){this.sec=sec;this.ids=[];}
Reg.prototype.ref=function(list){return (list||[]).map(id=>{let i=this.ids.indexOf(id);if(i<0){this.ids.push(id);i=this.ids.length-1;}return `<a class="sref" href="#src-${this.sec}-${i+1}" title="${esc(sources[id]?.title)}">[${i+1}]</a>`}).join('');};
Reg.prototype.render=function(el){el.innerHTML='<h4>출처</h4><ol>'+this.ids.map((id,i)=>{const s=sources[id]||{title:id,url:''};return `<li id="src-${this.sec}-${i+1}">${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s.title)}</li>`}).join('')+'</ol>';};

// last updated (KST)
const d=new Date(meta.lastUpdated);
const kst=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
$('#lastUpdated').textContent='마지막 업데이트: '+kst+' KST';

// tabs
const tabs=[...document.querySelectorAll('#tabs a')];
function show(){const t=(location.hash||'#tours').slice(1).split('-')[0];const ok=tabs.some(a=>a.dataset.tab===t)?t:'tours';
 tabs.forEach(a=>a.classList.toggle('on',a.dataset.tab===ok));
 document.querySelectorAll('.sec').forEach(s=>s.hidden=s.dataset.sec!==ok);}
window.addEventListener('hashchange',show);show();
document.addEventListener('click',e=>{const a=e.target.closest('a.sref');if(a){e.preventDefault();const el=document.querySelector(a.getAttribute('href'));el&&el.scrollIntoView({behavior:'smooth',block:'center'});}});

// ===== Tours =====
const fmtUSD=n=>n==null?'—':(n>=1e9?'$'+(n/1e9).toFixed(3)+'B':'$'+(n/1e6).toFixed(1)+'M');
const fmtN=n=>n==null?'<span class="muted">미확인</span>':Math.round(n).toLocaleString('ko-KR');
const KPOP=['BTS','BLACKPINK','SEVENTEEN','Stray Kids','TWICE'];
const R1=new Reg('tours');
$('#tourDef').textContent=tours.definition+' (기준일 '+tours.asOf+')';
const rows=tours.tours.map(t=>({...t,perShowGross:t.gross/t.shows,perShowAtt:t.attendance?t.attendance/t.shows:null}));
rows.slice().sort((a,b)=>b.gross-a.gross).forEach((r,i)=>r.grossRank=i+1);
let sortK='gross',asc=false;
const COLS=[['grossRank','#',1],['artist','아티스트',0],['tour','투어',0],['period','기간',0],['gross','총매출',1],['shows','회차',1],['attendance','관객',1],['perShowGross','회당 매출',1],['perShowAtt','회당 관객',1],['status','검증',0]];
function renderTours(){
 const q=$('#tourSearch').value.trim().toLowerCase(), k=$('#kOnly').checked;
 let list=rows.filter(r=>(!q||(r.artist+' '+r.tour).toLowerCase().includes(q))&&(!k||KPOP.includes(r.artist)));
 list.sort((a,b)=>{const x=a[sortK],y=b[sortK];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;
   const c=typeof x==='string'?x.localeCompare(y):x-y;return asc?c:-c;});
 const h='<thead><tr>'+COLS.map(([key,lab,num])=>`<th class="sortable ${num?'num':''} ${key===sortK?'active':''}" data-k="${key}">${lab}${key===sortK?(asc?' ▲':' ▼'):''}</th>`).join('')+'</tr></thead>';
 const b='<tbody>'+list.map(r=>`<tr class="${KPOP.includes(r.artist)?'kpop':''}"><td class="num">${r.grossRank}</td><td><b>${esc(r.artist)}</b></td><td>${esc(r.tour)}${r.ongoing?' †':''}${r.note?`<span class="note">${esc(r.note)}</span>`:''}</td><td>${esc(r.period)}</td><td class="num" title="$${r.gross.toLocaleString('en-US')}">${fmtUSD(r.gross)}</td><td class="num">${r.shows}</td><td class="num">${fmtN(r.attendance)}</td><td class="num">${fmtUSD(r.perShowGross)}</td><td class="num">${fmtN(r.perShowAtt)}</td><td>${badge(r.status)}${R1.ref(r.sources)}</td></tr>`).join('')+'</tbody>';
 $('#tourTable').innerHTML=h+b;
 document.querySelectorAll('#tourSort button').forEach(x=>x.classList.toggle('on',x.dataset.k===sortK));
}
$('#tourTable').addEventListener('click',e=>{const th=e.target.closest('th.sortable');if(!th)return;const k=th.dataset.k;if(k===sortK)asc=!asc;else{sortK=k;asc=['artist','tour','period','grossRank','status'].includes(k);}renderTours();});
$('#tourSort').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sortK=b.dataset.k;asc=false;renderTours();});
$('#tourSearch').addEventListener('input',renderTours);$('#kOnly').addEventListener('change',renderTours);
renderTours();
const bts=rows.find(r=>r.artist==='BTS');
const topAtt=rows.filter(r=>r.attendance).sort((a,b)=>b.attendance-a.attendance)[0];
const topPS=rows.slice().sort((a,b)=>b.perShowGross-a.perShowGross)[0];
$('#tourStats').innerHTML=[
 ['역대 1위 총매출',`${fmtUSD(rows[0].gross)}`,rows[0].artist],
 ['최다 관객',fmtN(topAtt.attendance)+'명',topAtt.artist+' · '+topAtt.tour],
 ['회당 매출 1위',fmtUSD(topPS.perShowGross),topPS.artist+' · '+topPS.tour],
 ['BTS ARIRANG †',fmtUSD(bts.gross)+' / '+bts.shows+'회','Billboard 공식: $500M 돌파']
].map(([k,v,s])=>`<div class="card"><div class="k">${k}</div><div class="v">${v}</div><div class="small muted">${esc(s)}</div></div>`).join('');
$('#milestones').innerHTML=tours.milestones.map(m=>`<li>${badge(m.status)} ${esc(m.text)}${R1.ref(m.sources)}</li>`).join('');
R1.render($('#src-tours'));

// ===== Events =====
const E=events.tma2026,R2=new Reg('events');
$('#tmaTitle').textContent=E.name;
$('#tmaInfo').innerHTML=[['일시',E.date],['장소',E.venue],['중계',E.broadcast]].map(([k,v])=>`<div class="card"><div class="k">${k}</div><div style="font-weight:600">${esc(v)}</div></div>`).join('');
$('#tmaSchedule').innerHTML='<thead><tr><th>시간(KST)</th><th>내용</th><th>검증</th></tr></thead><tbody>'+E.schedule.slice().sort((a,b)=>a.time.replace('~','').localeCompare(b.time.replace('~',''))).map(s=>`<tr><td class="num">${esc(s.time)}</td><td>${esc(s.item)}</td><td>${badge(s.status)}${R2.ref(s.sources)}</td></tr>`).join('')+'</tbody>';
$('#tmaLineup').innerHTML=E.lineup.map(a=>`<span class="chip">${esc(a)}</span>`).join('')+` <span class="badge verified">검증됨</span>${R2.ref(E.lineupSources)}`;
$('#tmaOrderNote').textContent=E.orderNote;
$('#tmaStages').innerHTML='<thead><tr><th>순서</th><th>아티스트</th><th>무대/곡</th><th>검증</th></tr></thead><tbody>'+E.stages.map(s=>`<tr><td>${esc(s.order)}</td><td><b>${esc(s.artist)}</b></td><td>${esc(s.stage)}</td><td>${badge(s.status)}${R2.ref(s.sources)}</td></tr>`).join('')+'</tbody>';
$('#tmaWinners').innerHTML='<thead><tr><th>부문</th><th>수상</th></tr></thead><tbody>'+E.winners.map(w=>`<tr><td>${esc(w.award)}</td><td>${esc(w.winner)}</td></tr>`).join('')+`</tbody>`;
$('#tmaWinners').insertAdjacentHTML('afterend',`<p class="small">${badge('verified')} 수상자 명단 출처${R2.ref(E.winnerSources)}</p>`);
$('#tmaVideo').innerHTML=badge('grok')+' '+esc(E.video);
R2.ref(['TMA-OFFICIAL']);R2.render($('#src-events'));

// ===== RPD =====
const R3=new Reg('rpd');
$('#rpdSummary').innerHTML=badge(rpd.status)+' '+esc(rpd.summary)+R3.ref(['GROK']);
$('#rpdPipe').innerHTML=rpd.pipeline.map(x=>`<li>${esc(x)}</li>`).join('');
$('#rpdCmd').textContent=rpd.commands.join('\n');
$('#rpdOut').textContent='출력: '+rpd.outputs.join(', ');
$('#rpdTune').innerHTML=rpd.tunables.map(x=>`<li><code>${esc(x)}</code></li>`).join('');
$('#rpdLim').innerHTML=rpd.limits.map(x=>`<li>${esc(x)}</li>`).join('');
$('#rpdTable').innerHTML='<thead><tr><th>타임스탬프</th><th>곡</th><th class="num">댄서 수</th><th class="num">조회수</th><th>검증</th></tr></thead><tbody>'+rpd.results.map(r=>`<tr><td class="num">${esc(r.time)}</td><td>${esc(r.song)}</td><td class="num">${esc(r.dancers)}</td><td class="num"><span class="muted">${esc(r.views)}</span></td><td>${badge(r.status)}</td></tr>`).join('')+'</tbody>';
$('#rpdNote').textContent=rpd.note;
R3.render($('#src-rpd'));

// ===== Auditions =====
const R4=new Reg('auditions');
$('#audTable').innerHTML='<thead><tr><th>프로그램</th><th>연도</th><th>주관</th><th>결과(데뷔)</th><th>특징</th><th>검증</th></tr></thead><tbody>'+auds.programs.map(p=>`<tr><td><b>${esc(p.program)}</b></td><td>${esc(p.year)}</td><td>${esc(p.organizer)}</td><td>${esc(p.result)}</td><td>${esc(p.feature)}</td><td>${badge(p.status)}${R4.ref(p.sources||(p.status==='grok'?['GROK']:[]))}</td></tr>`).join('')+'</tbody>';
$('#hiTitle').textContent=auds.hybeIndia.title;
$('#hiTable').innerHTML='<thead><tr><th>항목</th><th>내용</th><th>검증</th></tr></thead><tbody>'+auds.hybeIndia.facts.map(f=>`<tr><td>${esc(f.k)}</td><td>${esc(f.v)}</td><td>${badge(f.status)}${R4.ref(f.sources)}</td></tr>`).join('')+'</tbody>';
$('#audNotes').innerHTML=auds.notes.map(n=>`<li>${esc(n)}</li>`).join('')+`<li class="small muted">출처${R4.ref(auds.noteSources)}</li>`;
R4.render($('#src-auditions'));

// ===== Artists =====
const C=artists.compare,R5=new Reg('artists');
$('#cmpTitle').textContent=C.title;
$('#cmpTable').innerHTML='<thead><tr><th>항목</th>'+C.columns.map(c=>`<th>${esc(c)}</th>`).join('')+'</tr></thead><tbody>'+C.rows.map(r=>`<tr><td>${esc(r.item)}</td>${r.cells.map(c=>`<td>${esc(c.v)}<br>${badge(c.status)}${R5.ref(c.sources.length?c.sources:(c.status==='grok'?['GROK']:[]))}</td>`).join('')}</tr>`).join('')+'</tbody>';
$('#cmpInsights').innerHTML=C.insights.map(x=>`<li>${badge(C.insightStatus)} ${esc(x)}</li>`).join('');
const G=artists.groups;
$('#grpTitle').textContent=G.title;
$('#grpList').innerHTML=G.list.map(g=>`<span class="chip">${esc(g)}</span>`).join('');
$('#grpFacts').innerHTML=G.facts.map(f=>`<li>${badge(f.status)} ${esc(f.text)}${R5.ref(f.sources)}</li>`).join('');
R5.render($('#src-artists'));

// ===== Log =====
$('#logList').innerHTML=meta.log.map(l=>`<li><b>${esc(l.date)}</b> — ${esc(l.text)}</li>`).join('');
$('#srcAll').innerHTML=Object.entries(sources).map(([id,s])=>`<li>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s.title)} <span class="muted small">(${esc(id)})</span></li>`).join('');
})().catch(e=>{document.querySelector('main').insertAdjacentHTML('afterbegin','<p style="color:#c9302c">데이터 로드 실패: '+e.message+' — 로컬에서는 <code>python3 -m http.server</code>로 열어주세요.</p>')});

// ===== Tracker (Claude 해외 투어 트래커 병합) =====
(async function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const [trk,sources]=await Promise.all(['tracker','sources'].map(n=>fetch('data/'+n+'.json?v='+Date.now()).then(r=>r.json())));
const LABEL={verified:'검증됨',partial:'부분 확인',unverified:'미확인',conflict:'충돌',claude:'Claude 리서치 기준',estimate:'추정치'};
const badge=s=>`<span class="badge ${s}">${LABEL[s]||s}</span>`;
const ids=[];const ref=l=>(l||[]).map(id=>{let i=ids.indexOf(id);if(i<0){ids.push(id);i=ids.length-1;}return `<a class="sref" href="#src-tracker-${i+1}" title="${esc(sources[id]?.title)}">[${i+1}]</a>`}).join('');
const n=v=>v==null?'<span class="muted">—</span>':Math.round(v).toLocaleString('ko-KR');
const usd=v=>v==null?'—':(v>=1e9?'$'+(v/1e9).toFixed(2)+'B':'$'+(v/1e6).toFixed(1)+'M');
const GRP={girl:'걸그룹',boy:'보이그룹',solo:'솔로'};
$('#trkIntro').textContent=trk.intro+` (Claude 기준일 ${trk.claudeCut}, 병합·재검증 ${trk.asOf})`;
const rows=trk.tours.map(r=>({...r,startKey:r.start||'9999',endKey:r.end||'9999',revKey:r.revenue}));
let sk='startKey',asc=true,fy='all',fg='all';
const COLS=[['artist','아티스트'],['tour','투어'],['startKey','시작'],['endKey','종료'],['region','권역·도시'],['tier','체급'],['shows','회차',1],['attendance','관객',1],['estimate','추정 관객',1],['revKey','매출',1],['status','검증'],['ticket','예매처'],['note','메모']];
function dateCell(r,k){const v=r[k];if(v)return esc(v);return `<span class="tbd">날짜 미정</span><span class="note">${esc(r.yearHint)}</span>`;}
function render(){
 const q=$('#trkSearch').value.trim().toLowerCase(),st=$('#trkStatus').value,ti=$('#trkTier').value;
 let L=rows.filter(r=>(!q||(r.artist+' '+r.tour+' '+r.region).toLowerCase().includes(q))&&(fy==='all'||r.years.includes(fy))&&(fg==='all'||r.group===fg)&&(st==='all'||r.status===st)&&(ti==='all'||r.tier===ti));
 L.sort((a,b)=>{const x=a[sk],y=b[sk];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;const c=typeof x==='number'?x-y:String(x).localeCompare(String(y),'ko');return asc?c:-c;});
 $('#trkTable').innerHTML='<thead><tr>'+COLS.map(([k,l,num])=>`<th class="${['ticket','note'].includes(k)?'':'sortable'} ${num?'num':''} ${k===sk?'active':''}" data-k="${k}">${l}${k===sk?(asc?' ▲':' ▼'):''}</th>`).join('')+'</tr></thead><tbody>'+
  (L.map(r=>`<tr><td><b>${esc(r.artist)}</b><span class="note">${GRP[r.group]||''}</span></td><td>${esc(r.tour)}${r.changes?` <span class="badge chg" title="${esc(r.changes)}">변경</span>`:''}</td><td>${dateCell(r,'start')}</td><td>${dateCell(r,'end')}</td><td>${esc(r.region)}${r.cities?`<span class="note">${r.cities}개 도시</span>`:''}</td><td>${esc(r.tier)}</td><td class="num">${n(r.shows)}</td><td class="num">${r.attendanceText?esc(r.attendanceText):'<span class="muted">—</span>'}</td><td class="num">${r.estimateText?esc(r.estimateText)+' '+badge('estimate'):'<span class="muted">—</span>'}</td><td class="num">${r.revenueText?esc(r.revenueText):'<span class="muted">—</span>'}</td><td>${badge(r.status)}<span class="note">원자료: ${esc(r.claudeAcc)}</span>${ref(r.sources)}</td><td><a href="${esc(r.ticket.url)}" target="_blank" rel="noopener">${esc(r.ticket.name)}</a></td><td class="small">${esc(r.note)||'<span class="muted">—</span>'}${r.changes?`<span class="note"><b>변경:</b> ${esc(r.changes)}</span>`:''}</td></tr>`).join('')||'<tr><td colspan="13" class="muted">조건에 맞는 투어 없음</td></tr>')+'</tbody>';
}
$('#trkTable').addEventListener('click',e=>{const th=e.target.closest('th.sortable');if(!th)return;const k=th.dataset.k;if(k===sk)asc=!asc;else{sk=k;asc=!['shows','attendance','estimate','revKey'].includes(k);}render();});
const seg=(id,set)=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;set(b.dataset.v);$(id).querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render();});
seg('#trkYear',v=>fy=v);seg('#trkGroup',v=>fg=v);
['#trkSearch','#trkStatus','#trkTier'].forEach(s=>$(s).addEventListener('input',render));
render();
const cnt=s=>rows.filter(r=>r.status===s).length;
$('#trkStats').innerHTML=[['투어 / 팀',rows.length+'건 / '+new Set(rows.map(r=>r.artist)).size+'팀'],['검증됨',cnt('verified')],['부분 확인',cnt('partial')],['충돌 / 미확인',cnt('conflict')+' / '+cnt('unverified')],['날짜 미정 포함',rows.filter(r=>!r.start||!r.end).length],['재검증 변경',rows.filter(r=>r.changes).length]].map(([k,v])=>`<div class="card"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
// records
let rk='all',rs='attendance',ra=false;
function renderRec(){
 let L=trk.records.filter(r=>rk==='all'||r.kind===rk).map(r=>({...r,avg:r.attendance&&r.shows?r.attendance/r.shows:null}));
 L.sort((a,b)=>{const x=a[rs],y=b[rs];if(x==null)return 1;if(y==null)return -1;const c=typeof x==='number'?x-y:String(x).localeCompare(String(y),'ko');return ra?c:-c;});
 const C=[['artist','그룹'],['label','투어·공연'],['region','지역'],['shows','회차',1],['avg','1회 평균',1],['attendance','누적',1],['note','비고']];
 $('#recTable').innerHTML='<thead><tr><th>#</th>'+C.map(([k,l,num])=>`<th class="sortable ${num?'num':''} ${k===rs?'active':''}" data-k="${k}">${l}</th>`).join('')+'<th>검증</th></tr></thead><tbody>'+L.map((r,i)=>`<tr><td class="num">${i+1}</td><td><b>${esc(r.artist)}</b></td><td>${esc(r.label)}</td><td>${esc(r.region)}</td><td class="num">${n(r.shows)}</td><td class="num">${n(r.avg)}</td><td class="num">${esc(r.attendanceText)}${r.estimate?' <span class="note">추정</span>':''}</td><td class="small">${esc(r.note)}</td><td>${badge(r.status)}${ref(['CLAUDE-TRACKER'])}</td></tr>`).join('')+'</tbody>';
}
$('#recTable').addEventListener('click',e=>{const th=e.target.closest('th.sortable');if(!th)return;const k=th.dataset.k;if(k===rs)ra=!ra;else{rs=k;ra=['artist','label','region','note'].includes(k);}renderRec();});
$('#recKind').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;rk=b.dataset.v;$('#recKind').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));renderRec();});
renderRec();
const B=trk.billboard2025;$('#bbTitle').textContent=B.title;
$('#bbTable').innerHTML='<thead><tr><th>#</th><th>아티스트</th><th class="num">총매출</th><th class="num">관객</th><th class="num">회차</th><th class="num">회당 관객</th><th>검증</th></tr></thead><tbody>'+B.rows.map((r,i)=>`<tr><td class="num">${i+1}</td><td><b>${esc(r.artist)}</b></td><td class="num">${usd(r.gross)}</td><td class="num">${n(r.attendance)}</td><td class="num">${r.shows}</td><td class="num">${n(r.attendance/r.shows)}</td><td>${badge('verified')}${ref(B.sources)}</td></tr>`).join('')+'</tbody>';
$('#trkOpen').innerHTML=trk.unresolved.map(x=>`<li>${badge('unverified')} ${esc(x)}</li>`).join('');
$('#src-tracker').innerHTML='<h4>출처</h4><ol>'+ids.map((id,i)=>{const s=sources[id]||{title:id};return `<li id="src-tracker-${i+1}">${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s.title)}</li>`}).join('')+'</ol>';
})().catch(e=>console.error(e));

// ===== Batch 1 (Claude 대화 병합): 시상식 캘린더 · 유튜브·SNS · 산업·수익 · RPD v2 · 아티스트 확장 =====
(async function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const [sources,events,social,ind,rpd,art]=await Promise.all(['sources','events','social','industry','rpd','artists'].map(n=>fetch('data/'+n+'.json?v='+Date.now()).then(r=>r.json())));
const LABEL={verified:'검증됨',partial:'부분 확인',grok:'Grok 대화 기준',unverified:'미확인',forecast:'전망',conflict:'충돌',claude:'Claude 리서치 기준',estimate:'추정치',pending:'배치 2 예정'};
const badge=s=>s?`<span class="badge ${s==='pending'?'unverified':s}">${LABEL[s]||s}</span>`:'';
function Reg(sec){const ids=[];return{ref:l=>(l||[]).map(id=>{let i=ids.indexOf(id);if(i<0){ids.push(id);i=ids.length-1;}return `<a class="sref" href="#src-${sec}-${i+1}" title="${esc(sources[id]?.title)}">[${i+1}]</a>`}).join(''),
 render:el=>{el.innerHTML='<h4>출처</h4><ol>'+ids.map((id,i)=>{const s=sources[id]||{title:id,url:''};return `<li id="src-${sec}-${i+1}">${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s.title)}</li>`}).join('')+'</ol>';}};}
const n=v=>v==null?'<span class="muted">—</span>':Math.round(v).toLocaleString('ko-KR');
const tbl=(head,rows)=>'<thead><tr>'+head.map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</tbody>';
const seg=(id,cb)=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$(id).children].forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset.v);});

// --- 시상식 캘린더 ---
{const A=events.awards2026,R=Reg('awards');let st='all';
 $('#awTitle').textContent=A.title; $('#awNote').textContent=A.note+' (기준일 '+A.asOf+')';
 const draw=()=>{$('#awTable').innerHTML=tbl(['일정','시상식','장소','상태','라인업','결과·비고','검증'],A.events.filter(e=>st==='all'||e.state===st).map(e=>[`<b>${esc(e.date)}</b>`,esc(e.name),esc(e.venue),`<span class="badge ${e.state==='종료'?'verified':'forecast'}" style="opacity:.85">${esc(e.state)}</span>`,`<span class="small">${esc(e.lineup)}</span>`,(e.results.length?'<ul class="small" style="margin:0;padding-left:16px">'+e.results.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'')+(e.note?`<span class="note">${esc(e.note)}</span>`:''),badge(e.status)+R.ref(e.sources)]));R.render($('#src-awards'));};
 seg('#awState',v=>{st=v;draw();});draw();}

// --- 유튜브·SNS ---
{const Y=social.youtube,R=Reg('social');let ty='girl',gen='all',sk='subs',asc=false;
 $('#ytTitle').innerHTML=esc(Y.title)+' '+badge(Y.status)+R.ref(Y.sources); $('#ytSnap').textContent='스냅샷: '+Y.snapshot;
 const TY={girl:'걸그룹',boy:'보이그룹',coed:'혼성'};
 const COLS=[['rank','전체 순위',1],['group','그룹',0],['gen','세대',1],['company','소속사',0],['subs','구독자',1],['weekly','주간 증감',1]];
 const draw=()=>{const q=$('#ytSearch').value.trim().toLowerCase();
  let L=Y.rows.filter(r=>(ty==='all'||r.type===ty)&&(gen==='all'||String(r.gen)===gen)&&(!q||(r.group+' '+r.ko+' '+r.company).toLowerCase().includes(q)));
  L.sort((a,b)=>{let x=a[sk],y=b[sk];if(typeof x==='string')return asc?x.localeCompare(y):y.localeCompare(x);return asc?x-y:y-x;});
  const tot=L.reduce((s,r)=>s+r.subs,0);
  $('#ytStats').innerHTML=[['표시 그룹',L.length+'팀'],['구독자 합계',(tot/1e6).toFixed(1)+'M'],['1위',L[0]?esc(L[0].ko):'—'],['주간 순증 합계',n(L.reduce((s,r)=>s+(r.weekly||0),0))]].map(([k,v])=>`<div class="card"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  $('#ytTable').innerHTML='<thead><tr><th>#</th>'+COLS.map(([k,l])=>`<th data-k="${k}" style="cursor:pointer">${l}${sk===k?(asc?' ▲':' ▼'):''}</th>`).join('')+'</tr></thead><tbody>'+L.map((r,i)=>`<tr><td class="num">${i+1}</td><td class="num">${r.rank}</td><td><b>${esc(r.ko)}</b><span class="note">${esc(r.group)} · ${TY[r.type]}</span></td><td class="num">${r.gen}세대</td><td class="small">${esc(r.company)}</td><td class="num">${n(r.subs)}</td><td class="num">${r.weekly?(r.weekly>0?'+':'')+n(r.weekly):'<span class="muted">0</span>'}</td></tr>`).join('')+'</tbody>';
  $('#ytTable').querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{const k=th.dataset.k;if(sk===k)asc=!asc;else{sk=k;asc=k==='rank'||k==='gen'||k==='group'||k==='company';}draw();});};
 seg('#ytType',v=>{ty=v;draw();});seg('#ytGen',v=>{gen=v;draw();});$('#ytSearch').addEventListener('input',draw);draw();
 $('#ytNotes').innerHTML=Y.notes.map(x=>`<li>${esc(x)}</li>`).join('');
 const I=social.instagram;$('#igTitle').textContent=I.title;
 $('#igTable').innerHTML=tbl(['멤버','계정','팔로워','기준 시각','검증'],I.rows.map(r=>[`<b>${esc(r.member)}</b>`,esc(r.handle),`<span class="num">${esc(r.text)}</span>`,esc(r.asOf),badge(r.status)+R.ref(r.sources)]));
 $('#igNotes').innerHTML=(I.notes||[]).map(x=>`<li>${esc(x)}</li>`).join('')+(I.others?`<li>비교(K-pop 개인 계정, 근사치): ${I.others.map(o=>esc(o.member)+' '+esc(o.text)).join(' · ')} ${badge('partial')}${R.ref(I.othersSources)}</li>`:'');
 const M=social.multiGroup;$('#mgTitle').innerHTML=esc(M.title)+' '+badge(M.status)+R.ref(M.sources);
 $('#mgTable').innerHTML=tbl(['멤버','소속 그룹'],M.rows.map(r=>[`<b>${esc(r.person)}</b>`,esc(r.groups)]));$('#mgNote').textContent=M.note;
 R.render($('#src-social'));}

// --- 산업·수익 ---
{const R=Reg('industry');const won=v=>n(v)+'억';let h='';
 const K=ind.kwda;h+=`<h3>${esc(K.title)} ${badge(K.status)}${R.ref(K.sources)}</h3><div class="tablewrap"><table class="data">${tbl(['항목','내용'],K.changes.map(c=>[`<b>${esc(c.k)}</b>`,esc(c.v)]))}</table></div><p><b>아티스트가 출연하는 이유(분석):</b> ${K.why.map(esc).join(' · ')}</p><p class="muted small">${esc(K.note)}</p>`;
 const T=ind.tourEcon;h+=`<h3>${esc(T.title)} ${badge(T.status)}${R.ref(T.sources)}</h3><p class="small">가정: ${T.assumptions.map(esc).join(' / ')}</p>
 <div class="tablewrap"><table class="data">${tbl(['그룹','세대','회차','관객','티켓','MD','스폰서','총매출','영업이익','이익률'],T.rows.concat([T.total]).map(r=>[`<b>${esc(r[0])}</b>`,r[1]?r[1]+'세대':'',n(r[2]),n(r[3]),won(r[4]),won(r[5]),won(r[6]),`<b>${won(r[7])}</b>`,won(r[8]),r[9]+'%']))}</table></div>
 <div class="grid2"><div class="card"><h4>효율 지표</h4><table class="data">${tbl(['그룹','회당 매출','1인 객단가','평균 티켓','손익분기 점유율'],T.eff.map(r=>[esc(r[0]),r[1]+'억',n(r[2])+'원',n(r[3])+'원',r[4]+'%']))}</table></div>
 <div class="card"><h4>지역별 가격·예매율 가정</h4><table class="data">${tbl(['지역','평균가','예매율'],T.prices.map(r=>r.map(esc)))}</table><h4>시나리오</h4><table class="data">${tbl(['시나리오','총매출','영업이익','이익률'],T.scenarios.map(r=>[r[0],won(r[1]),won(r[2]),r[3]+'%']))}</table></div></div><p class="muted small">${esc(T.caveat)}</p>`;
 const C=ind.compare;h+=`<h3>${esc(C.title)} ${badge(C.status)}${R.ref(C.sources)}</h3><div class="tablewrap"><table class="data">${tbl(['투어','총매출 추정(티켓+MD)'],C.rows.map(r=>[esc(r[0]),won(r[1])]))}</table></div><p class="muted small">${esc(C.note)}</p>`;
 const S=ind.lsf;h+=`<h3>${esc(S.title)} ${badge(S.status)}${R.ref(S.sources)}</h3><p class="small">${esc(S.actual)}</p><div class="tablewrap"><table class="data">${tbl(['지역','계산','티켓 매출'],S.model.map(r=>r.map(esc)))}</table></div><ul class="list small">${S.pnl.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 const M=ind.amort;h+=`<h3>${esc(M.title)} ${badge(M.status)}${R.ref(M.sources)}</h3><p class="small">${esc(M.base)}</p><div class="grid2"><div class="card"><table class="data">${tbl(['방법','상각액'],M.methods.map(r=>r.map(esc)))}</table></div><div class="card"><table class="data">${tbl(['공연 수','회당 상각'],M.perShow.map(r=>[r[0],'$'+n(r[1])]))}</table></div></div><p class="muted small">${esc(M.simple)}</p>`;
 $('#indBody').innerHTML=h;R.render($('#src-industry'));}

// --- RPD v2 ---
{const V=rpd.v2,R=Reg('rpd2');if(V){$('#rpdV2').innerHTML=`<h3>${esc(V.title)} ${badge(V.status)}${R.ref(V.sources)}</h3><div class="grid2"><div class="card"><h4>단계</h4><ol>${V.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div><div class="card"><h4>댄서 점수 가중치</h4><table class="data">${tbl(['신호','가중치'],V.weights.map(w=>[esc(w[0]),w[1]+'%']))}</table><p class="small">${esc(V.test)}</p></div></div><h4>실행</h4><pre>${esc(V.command)}</pre><h4>비용·시간 벤치마크 ${badge(V.benchStatus||'')}</h4><div class="tablewrap"><table class="data">${tbl(['방식','토큰','소요'],V.bench.map(r=>r.map(esc)))}</table></div><p class="muted small">${esc(V.benchNote)} 산출물: ${V.artifacts.map(esc).join(', ')}</p>`;R.render($('#src-rpd2'));}}

// --- 추가 패키지(from_claude): 트래커 추가표 · 페스티벌 · 굿즈 · RPD 옵션 ---
{const R=Reg('trk2');const T2=await fetch('data/tracker.json?v='+Date.now()).then(r=>r.json());let h='';
 if(T2.estimateNote)h+=`<p class="small">${badge('estimate')} ${esc(T2.estimateNote)}</p>`;
 const B=T2.btsMonthly;if(B){const usd=v=>'$'+(v/1e6).toFixed(1)+'M';h+=`<h3>${esc(B.title)} ${badge(B.status)}${R.ref(B.sources)}</h3><div class="tablewrap"><table class="data">${tbl(['월','회차','관객','매출','회당 관객','회당 매출','순위','검증'],B.rows.map(r=>[esc(r.month),r.shows,n(r.att),usd(r.gross),n(r.att/r.shows),usd(r.gross/r.shows),esc(r.rank),badge(r.status)+R.ref(r.sources)]))}</table></div><p class="muted small">${esc(B.note)} 회당 값은 직접 계산.</p>`;}
 const W2=T2.westStatus;if(W2)h+=`<h3>${esc(W2.title)} ${badge(W2.status)}${R.ref(W2.sources)}</h3><div class="tablewrap"><table class="data">${tbl(W2.columns,W2.rows.map(r=>r.map((c,i)=>i===0?`<b>${esc(c)}</b>`:`<span class="small">${esc(c)}</span>`)))}</table></div><p class="muted small">${esc(W2.note)}</p>`;
 $('#trkExtra').innerHTML=h;R.render($('#src-trk2'));}
{const F=events.festivals2026;if(F){const R=Reg('fest');$('#festBody').innerHTML=`<h2 style="margin-top:36px">${esc(F.title)}</h2><div class="tablewrap"><table class="data">${tbl(F.columns,F.rows.map(r=>[`<b>${esc(r[0])}</b>`,esc(r[1]),esc(r[2]),esc(r[3]),badge(r[4])+R.ref((F.rowSources||{})[r[0]]||F.sources)]))}</table></div><h3>걸그룹만 추린 비교 ${badge('claude')}</h3><div class="tablewrap"><table class="data">${tbl(['그룹','세대','출연 페스티벌','횟수','투어와의 관계'],F.girls.map(r=>r.map(esc)))}</table></div><h3>연도별 이정표 ${badge('claude')}</h3><div class="tablewrap"><table class="data">${tbl(['연도','이정표'],F.milestones.map(r=>r.map(esc)))}</table></div><p class="muted small">${esc(F.note)}</p>`;R.render($('#src-fest'));}}
{const M=ind.merch;if(M){const R=Reg('merch');const T=ind.tourEcon;let h=`<h3>${esc(M.title)} ${badge(M.status)}${R.ref(M.sources)}</h3><div class="tablewrap"><table class="data">${tbl(M.columns,M.rows.map(r=>r.map((c,i)=>i===0?`<b>${esc(c)}</b>`:esc(c))))}</table></div>
 <h4>그룹별 합산</h4><div class="tablewrap"><table class="data">${tbl(['그룹','투어 수','총 회차','누적 관객','티켓 수익','굿즈 수익','총 수익','인당 총매출','핵심 시장'],M.groups.map(r=>r.map(esc)))}</table></div>
 <div class="grid2"><div class="card"><h4>지역별 티켓·굿즈 객단가 가정</h4><table class="data">${tbl(['지역','일반석','VIP·프리미엄','티켓 평균','인당 굿즈','인당 합계','비고'],M.prices.map(r=>r.map(esc)))}</table></div><div class="card"><h4>시나리오 (관객 ±12%, 단가 ±8%)</h4><table class="data">${tbl(['투어','그룹','보수','기본','낙관','변동폭','주요 변수'],M.scenarios.map(r=>r.map(esc)))}</table></div></div>
 <h4>투어별 지역 구성 비율</h4><div class="tablewrap"><table class="data">${tbl(['투어','그룹','한국','일본','아시아 기타','북미','유럽','혼합 단가'],M.mix.map(r=>r.map(esc)))}</table></div>
 <h4>Claude가 밝힌 수치별 출처 (URL 미노출)</h4><div class="tablewrap"><table class="data">${tbl(['항목','수치','출처'],M.cites.map(r=>r.map(esc)))}</table></div><p class="muted small">${esc(M.note)}</p>`;
 if(T.basis)h+=`<h3>9팀 투어 경제성 모델 보충 ${badge('estimate')}</h3><div class="tablewrap"><table class="data">${tbl(['항목','가정','근거'],T.basis.map(r=>r.map(esc)))}</table></div>`;
 if(T.benchmark)h+=`<h4>${esc(T.benchmark.title)}</h4><div class="tablewrap"><table class="data">${tbl(['아티스트','기간','회차','관객','매출','회당 매출','티켓 단가'],T.benchmark.rows.map(r=>r.map(esc)))}</table></div><p class="muted small">${esc(T.benchmark.note)}</p>`;
 if(T.types)h+=`<div class="grid2"><div class="card"><h4>팀별 손익 구조 유형</h4><table class="data">${tbl(['유형','팀','구조','리스크'],T.types.map(r=>r.map(esc)))}</table></div><div class="card"><h4>지역별 수익 기여</h4><table class="data">${tbl(['지역','관객 비중','매출 비중','특징'],T.regionShare.map(r=>r.map(esc)))}</table></div></div><h4>모델 한계</h4><ul class="list small">${T.limits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 $('#indMerch').innerHTML=h;R.render($('#src-merch'));}}
{const V=rpd.v2;if(V&&V.options){const R=Reg('rpd3');let h=`<h3>실행 옵션 (count_dancers.py 기본값) ${badge('claude')}${R.ref(['CLAUDE-FC'])}</h3><div class="tablewrap"><table class="data">${tbl(['옵션','기본값','의미'],V.options.map(r=>[`<code>${esc(r[0])}</code>`,esc(r[1]),esc(r[2])]))}</table></div><p class="small">설치: ${esc(V.install)}<br>출력: ${esc(V.outputs)}</p><h4>튜닝 루프</h4><ul class="list small">${V.tuning.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 const Bo=V.bot;if(Bo)h+=`<h3>${esc(Bo.title)} ${badge(Bo.status)}${R.ref(Bo.sources)}</h3><ul class="list small">${Bo.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 $('#rpdV3').innerHTML=h;R.render($('#src-rpd3'));}}

// --- 아티스트 확장 (배치 1·2) ---
const gtable=(x,R,statusCol)=>`<div class="tablewrap"><table class="data">${tbl(x.columns,x.rows.map(r=>r.map((c,i)=>statusCol&&i===r.length-1?badge(c):(i===0?`<b>${esc(c)}</b>`:esc(c)))))}</table></div>`;
const block=(x,R,id,statusCol)=>x?`<h2 id="${id}" style="margin-top:36px">${esc(x.title)} ${badge(x.status)}${R.ref(x.sources)}</h2>`+(x.rows&&x.rows.length?gtable(x,R,statusCol):'')+(x.note?`<p class="muted small">${esc(x.note)}</p>`:''):'';
{const R=Reg('artists2');let h='<div class="chips" style="margin-top:28px"><a href="#artists-prof">프로필</a> <a href="#artists-members">2004–10년생 멤버 표</a> <a href="#artists-agency">소속사 명단</a> <a href="#artists-prod">프로듀서</a></div><h2 id="artists-prof">아티스트 프로필</h2>';
 (art.profiles||[]).forEach(p=>{h+=`<div class="card" style="margin-bottom:14px"><h3 style="margin-top:0">${esc(p.name)}</h3><table class="data">${tbl(['항목','내용','검증'],p.facts.map(f=>[`<b>${esc(f.k)}</b>`,esc(f.v),badge(f.status)+R.ref(f.sources)]))}</table>${p.timeline&&p.timeline.length?`<h4>타임라인</h4><ul class="list small">${p.timeline.map(t=>`<li><b>${esc(t.date)}</b> ${esc(t.text)} ${badge(t.status)}${R.ref(t.sources)}</li>`).join('')}</ul>`:''}${p.artifacts?`<p class="small muted">${esc(p.artifacts)}</p>`:''}${p.withheld?`<p class="small"><span class="badge unverified">보류</span> ${esc(p.withheld)}</p>`:''}${p.pending&&p.pending.length?`<p class="muted small">추가 예정: ${p.pending.map(esc).join(' · ')}</p>`:''}</div>`;});
 const M=art.memberChart;if(M){h+=`<h2 id="artists-members" style="margin-top:36px">${esc(M.title)} ${badge(M.status)}${R.ref(M.sources)}</h2><div class="controls"><input type="search" id="mcSearch" placeholder="이름/그룹 검색"><select id="mcSort" data-ksort-for="mcTable"><option value="">정렬 선택</option><option value="1:asc">생년월일 ↑ (빠른 순)</option><option value="1:desc">생년월일 ↓ (늦은 순)</option><option value="2:asc">이름 가나다</option><option value="3:asc">그룹 가나다</option><option value="0:asc"># 원래 순서</option></select><select id="mcYear"><option value="">출생연도: 전체</option>${[2004,2005,2006,2007,2008,2009,2010].map(y=>`<option>${y}</option>`).join('')}</select></div><div class="tablewrap"><table class="data" id="mcTable"></table></div><p class="muted small">${esc(M.note)}</p>`;}
 h+=block(art.agencies,R,'artists-agency')+block(art.producers,R,'artists-prod');
 $('#artExt').innerHTML=h;R.render($('#src-artists2'));
 if(M){const draw=()=>{const q=$('#mcSearch').value.trim().toLowerCase(),y=$('#mcYear').value;$('#mcTable').innerHTML=tbl(M.columns,M.rows.filter(r=>(!y||r[1].startsWith(y))&&(!q||(r[2]+' '+r[3]).toLowerCase().includes(q))).map(r=>[r[0],esc(r[1]),`<b>${esc(r[2])}</b>`,esc(r[3])]));};$('#mcSearch').addEventListener('input',draw);$('#mcYear').addEventListener('change',draw);draw();}
 $('#artExt').addEventListener('click',e=>{const a=e.target.closest('.chips a');if(a){e.preventDefault();document.getElementById(a.getAttribute('href').slice(1)).scrollIntoView({behavior:'smooth'});}});}

// --- 브랜드·팬덤 탭 ---
{const R=Reg('brands');let h='';const B=art.ambassadors;
 h+=block(art.brandCollabs,R,'brands-bts',true);
 if(B){h+=`<h2 style="margin-top:36px">${esc(B.title)} ${badge(B.status)}${R.ref(B.sources)}</h2><p class="small">${esc(B.summary)}</p><div class="grid2"><div class="card"><h4>브랜드별 K-pop vs 해외</h4><table class="data">${tbl(['브랜드','K-pop','해외'],B.comparisons.map(r=>r.map(esc)))}</table></div><div class="card"><h4>스포츠 브랜드 예시</h4><table class="data">${tbl(['아티스트','브랜드'],B.examples.map(r=>r.map(esc)))}</table></div></div><p class="muted small">${esc(B.note)}</p>`;
  const G=B.girlAds;if(G)h+=`<h3>${esc(G.title)} ${badge(G.status)}${R.ref(G.sources)}</h3><div class="tablewrap"><table class="data">${tbl(['그룹','광고·앰버서더'],G.rows.map(r=>[`<b>${esc(r[0])}</b>`,esc(r[1])]))}</table></div><p class="muted small">${esc(G.note)}</p>`;}
 const E=art.fanEvents;if(E){h+=`<h2 style="margin-top:36px">${esc(E.title)} ${badge(E.status)}${R.ref(E.sources)}</h2><p class="small">유형: ${E.types.map(esc).join(' · ')}</p><div class="grid2"><div class="card"><h4>유형별 예상 비용 (원)</h4><table class="data">${tbl(['유형','기간','비용'],E.costs.map(r=>r.map(esc)))}</table></div><div class="card"><h4>2026 지역별 집행 추정 (원)</h4><table class="data">${tbl(['지역','주요 구성','소계 추정'],E.regions.map(r=>[`<b>${esc(r[0])}</b>`,`<span class="small">${esc(r[1])}</span>`,esc(r[2])]))}</table></div></div><p class="muted small">${esc(E.note)}</p>`;}
 $('#brandsBody').innerHTML=h;R.render($('#src-brands'));}

// --- 산업: 유튜브 조회수 ---
{const Y=ind.ytViews;if(Y){const R=Reg('industry2');$('#indYT').innerHTML=`<h3>${esc(Y.title)} ${badge(Y.status)}${R.ref(Y.sources)}</h3><div class="grid2"><div class="card"><h4>30초 통과율별 예상 배수</h4><table class="data">${tbl(['통과율','배수','증가율'],Y.pass.map(r=>r.map(esc)))}</table></div><div class="card"><h4>영상 유형별</h4><table class="data">${tbl(['유형','추정 통과율','예상 배수'],Y.types.map(r=>r.map(esc)))}</table></div></div><ul class="list small">${Y.points.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;R.render($('#src-industry2'));}}
})().catch(e=>{document.querySelector('main').insertAdjacentHTML('afterbegin','<p style="color:#c9302c">배치1 데이터 로드 실패: '+e.message+'</p>')});
