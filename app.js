(async function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const load=n=>fetch('data/'+n+'.json?v='+Date.now()).then(r=>r.json());
const [meta,sources,tours,events,rpd,auds,artists]=await Promise.all(['meta','sources','tours','events','rpd','auditions','artists'].map(load));

const LABEL={verified:'검증됨',partial:'부분 확인',grok:'Grok 대화 기준',unverified:'미확인',forecast:'전망',conflict:'충돌',claude:'Claude 리서치 기준'};
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
const LABEL={verified:'검증됨',partial:'부분 확인',unverified:'미확인',conflict:'충돌',claude:'Claude 리서치 기준'};
const badge=s=>`<span class="badge ${s}">${LABEL[s]||s}</span>`;
const ids=[];const ref=l=>(l||[]).map(id=>{let i=ids.indexOf(id);if(i<0){ids.push(id);i=ids.length-1;}return `<a class="sref" href="#src-tracker-${i+1}" title="${esc(sources[id]?.title)}">[${i+1}]</a>`}).join('');
const n=v=>v==null?'<span class="muted">—</span>':Math.round(v).toLocaleString('ko-KR');
const usd=v=>v==null?'—':(v>=1e9?'$'+(v/1e9).toFixed(2)+'B':'$'+(v/1e6).toFixed(1)+'M');
const GRP={girl:'걸그룹',boy:'보이그룹',solo:'솔로'};
$('#trkIntro').textContent=trk.intro+` (Claude 기준일 ${trk.claudeCut}, 병합·재검증 ${trk.asOf})`;
const rows=trk.tours.map(r=>({...r,startKey:r.start||'9999',endKey:r.end||'9999',revKey:r.revenue}));
let sk='startKey',asc=true,fy='all',fg='all';
const COLS=[['artist','아티스트'],['tour','투어'],['startKey','시작'],['endKey','종료'],['region','권역·도시'],['tier','체급'],['shows','회차',1],['attendance','관객',1],['revKey','매출',1],['status','검증'],['ticket','예매처'],['note','메모']];
function dateCell(r,k){const v=r[k];if(v)return esc(v);return `<span class="tbd">날짜 미정</span><span class="note">${esc(r.yearHint)}</span>`;}
function render(){
 const q=$('#trkSearch').value.trim().toLowerCase(),st=$('#trkStatus').value,ti=$('#trkTier').value;
 let L=rows.filter(r=>(!q||(r.artist+' '+r.tour+' '+r.region).toLowerCase().includes(q))&&(fy==='all'||r.years.includes(fy))&&(fg==='all'||r.group===fg)&&(st==='all'||r.status===st)&&(ti==='all'||r.tier===ti));
 L.sort((a,b)=>{const x=a[sk],y=b[sk];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;const c=typeof x==='number'?x-y:String(x).localeCompare(String(y),'ko');return asc?c:-c;});
 $('#trkTable').innerHTML='<thead><tr>'+COLS.map(([k,l,num])=>`<th class="${['ticket','note'].includes(k)?'':'sortable'} ${num?'num':''} ${k===sk?'active':''}" data-k="${k}">${l}${k===sk?(asc?' ▲':' ▼'):''}</th>`).join('')+'</tr></thead><tbody>'+
  (L.map(r=>`<tr><td><b>${esc(r.artist)}</b><span class="note">${GRP[r.group]||''}</span></td><td>${esc(r.tour)}${r.changes?` <span class="badge chg" title="${esc(r.changes)}">변경</span>`:''}</td><td>${dateCell(r,'start')}</td><td>${dateCell(r,'end')}</td><td>${esc(r.region)}${r.cities?`<span class="note">${r.cities}개 도시</span>`:''}</td><td>${esc(r.tier)}</td><td class="num">${n(r.shows)}</td><td class="num">${r.attendanceText?esc(r.attendanceText):'<span class="muted">—</span>'}</td><td class="num">${r.revenueText?esc(r.revenueText):'<span class="muted">—</span>'}</td><td>${badge(r.status)}<span class="note">원자료: ${esc(r.claudeAcc)}</span>${ref(r.sources)}</td><td><a href="${esc(r.ticket.url)}" target="_blank" rel="noopener">${esc(r.ticket.name)}</a></td><td class="small">${esc(r.note)||'<span class="muted">—</span>'}${r.changes?`<span class="note"><b>변경:</b> ${esc(r.changes)}</span>`:''}</td></tr>`).join('')||'<tr><td colspan="12" class="muted">조건에 맞는 투어 없음</td></tr>')+'</tbody>';
}
$('#trkTable').addEventListener('click',e=>{const th=e.target.closest('th.sortable');if(!th)return;const k=th.dataset.k;if(k===sk)asc=!asc;else{sk=k;asc=!['shows','attendance','revKey'].includes(k);}render();});
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
