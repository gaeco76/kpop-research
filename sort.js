// 공용 표 정렬 헬퍼: 헤더 클릭으로 오름/내림 정렬 (날짜·숫자·한글 자동 판별)
(function(){
const SKIP=new Set(['tourTable','trkTable','recTable','ytTable']); // 자체 정렬 로직이 있는 표
const SECS=['artists','brands','industry','events','auditions','rpd','tracker'];
const txt=c=>(c?c.textContent:'').replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim();
const EMPTY=/^(—|-|–|미확인|미정|)$/;
function dateKey(s){let m=s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);if(m)return (+m[1])*10000+(+m[2])*100+(+(m[3]||0));
 m=s.match(/^(\d{4})(경)?$/);if(m)return (+m[1])*10000+1300;m=s.match(/^(\d{1,2})\/(\d{1,2})/);if(m)return 20260000+(+m[1])*100+(+m[2]);return null;}
function numKey(s){let t=s.replace(/^[+~≈약$₩\s]+/,''),neg=false;if(/^[-−]/.test(t)){neg=true;t=t.slice(1).replace(/^\$/,'');}if(!/^\d/.test(t))return null;
 t=t.split(/[–~]/)[0];let v;
 if(/\d\s*(억|만)/.test(t)){v=0;const re=/(\d[\d,]*(?:\.\d+)?)\s*(억|만)?/g;let m;while((m=re.exec(t))){const x=parseFloat(m[1].replace(/,/g,''));v+=m[2]==='억'?x*1e8:m[2]==='만'?x*1e4:x;}}
 else{const m=t.match(/^(\d[\d,]*(?:\.\d+)?)\s*([BMKk])?/);v=parseFloat(m[1].replace(/,/g,''))*({B:1e9,M:1e6,K:1e3,k:1e3}[m[2]]||1);}
 return neg?-v:v;}
const coll=new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
const state={};
function sortTable(table,col,dir){
 const tb=table.tBodies[0];if(!tb)return;
 const rows=[...tb.rows].filter(r=>r.cells.length>col&&!r.querySelector('td[colspan]'));
 const pinned=rows.filter(r=>/^(합계|총계|Total)$/.test(txt(r.cells[0])));
 const body=rows.filter(r=>!pinned.includes(r));
 const vals=body.map(r=>txt(r.cells[col]));const ne=vals.filter(v=>!EMPTY.test(v));
 const type=ne.length&&ne.every(v=>dateKey(v)!=null)?'date':ne.length&&ne.every(v=>numKey(v)!=null)?'num':'text';
 const key=v=>EMPTY.test(v)?null:type==='date'?dateKey(v):type==='num'?numKey(v):v;
 const items=body.map((r,i)=>({r,k:key(vals[i]),i}));
 items.sort((a,b)=>{if(a.k==null&&b.k==null)return a.i-b.i;if(a.k==null)return 1;if(b.k==null)return -1;
  const c=type==='text'?coll.compare(a.k,b.k):a.k-b.k;return (dir==='asc'?c:-c)||a.i-b.i;});
 items.forEach(x=>tb.appendChild(x.r));pinned.forEach(r=>tb.appendChild(r));
 const ths=table.tHead?[...table.tHead.rows[0].cells]:[];ths.forEach((th,i)=>{th.classList.remove('ks-asc','ks-desc');if(i===col)th.classList.add('ks-'+dir);th.setAttribute('aria-sort',i===col?(dir==='asc'?'ascending':'descending'):'none');});
 tb.dataset.ksorted='1';const id=table.id||table.dataset.ksid;state[id]={col,dir};
 const sel=document.querySelector(`select[data-ksort-for="${id}"]`);if(sel){const v=col+':'+dir;sel.value=[...sel.options].some(o=>o.value===v)?v:'';}
}
let n=0;
function tag(){document.querySelectorAll(SECS.map(s=>`.sec[data-sec="${s}"] table.data`).join(',')).forEach(t=>{
 if(SKIP.has(t.id)||!t.tHead||t.querySelector('th[data-k]'))return;
 if(!t.id&&!t.dataset.ksid)t.dataset.ksid='kst'+(++n);
 t.classList.add('ks');[...t.tHead.rows[0].cells].forEach(th=>{th.tabIndex=0;th.title=th.title||'클릭해 정렬 (다시 클릭하면 반대 방향)';});
 const id=t.id||t.dataset.ksid,st=state[id];if(st&&t.tBodies[0]&&!t.tBodies[0].dataset.ksorted)sortTable(t,st.col,st.dir);});}
function onTh(e){const th=e.target.closest('table.ks thead th');if(!th||e.target.closest('a'))return;if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();
 const t=th.closest('table'),col=th.cellIndex,id=t.id||t.dataset.ksid,st=state[id];
 sortTable(t,col,st&&st.col===col&&st.dir==='asc'?'desc':'asc');}
document.addEventListener('click',onTh);document.addEventListener('keydown',onTh);
document.addEventListener('change',e=>{const s=e.target.closest('select[data-ksort-for]');if(!s||!s.value)return;const t=document.getElementById(s.dataset.ksortFor);const [c,d]=s.value.split(':');t&&sortTable(t,+c,d);});
new MutationObserver(()=>tag()).observe(document.querySelector('main'),{childList:true,subtree:true});
window.kSort=sortTable;tag();
})();
