/* Shared code for index.html and manage.html. Each page defines BOARD before loading this file. */
var SB_URL='https://irujnmfbefjpztovqwjx.supabase.co';
var SB_KEY='sb_publishable_31eIEGWomuVnjU2qnjTdDw_DDlS8K-M';
var TABLE='/rest/v1/'+BOARD.table;
var HEADERS={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'};
var CATS=BOARD.cats;
var prayers=[];var editingId=null;
async function api(method,query,body){
var opts={method:method,headers:HEADERS};
if(body){opts.body=JSON.stringify(body);}
var r=await fetch(SB_URL+TABLE+query,opts);
if(!r.ok){throw new Error('request failed');}
return r;
}
async function load(){
var r=await fetch(SB_URL+TABLE+'?select=*&order=sort_order.desc',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
if(!r.ok){throw new Error('load failed');}
prayers=await r.json();
}
async function refresh(){
if(!document.getElementById('activeList')){return;}
try{await load();render();}
catch(e){document.getElementById('activeList').innerHTML='<div class="empty">Could not load. Check your internet and refresh the page.</div>';}
}
function setStatus(id,msg){
var s=document.getElementById(id);s.textContent=msg;
setTimeout(function(){s.textContent='';},5000);
}
function fmtDate(iso){return new Date(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}
function esc(t){var d=document.createElement('div');d.textContent=t||'';return d.innerHTML;}
function linkify(h){return h.replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,function(u){var t='';var m=u.match(/[.,;:!?)]+$/);if(m){t=m[0];u=u.slice(0,-t.length);}var href=u.indexOf('http')===0?u:'https://'+u;return '<a href="'+href+'" target="_blank" rel="noopener" style="color:var(--gold);word-break:break-all;">'+u+'</a>'+t;});}

/* ---- adding ---- */
async function addPrayer(){
var point=document.getElementById('ppoint').value.trim();
var text=document.getElementById('ptext').value.trim();
var cat=document.getElementById('pcat').value;
var byEl=document.getElementById('pby');var by=byEl?byEl.value.trim():'';
if(!point){setStatus('status','Please write the prayer point first.');return;}
if(!text){setStatus('status','Please write the prayer request.');return;}
if(BOARD.nameRequired&&!by){setStatus('status','Please add your name.');return;}
try{
var row={name:point,text:text,category:cat};if(by){row.added_by=by;}
await api('POST','',row);
document.getElementById('ppoint').value='';
document.getElementById('ptext').value='';
setStatus('status',BOARD.addedMsg);
await refresh();
}catch(e){setStatus('status','Could not save. Please try again.');}
}

/* ---- managing (no passcode: this is a small family board) ---- */
function metaLine(p){
var by=p.added_by?esc(p.added_by)+' &middot; ':'';
var upd=p.edited?' &middot; updated '+fmtDate(p.edited):'';
return '<div class="meta">'+by+fmtDate(p.created_at)+upd+'</div>';
}
function cardHtml(p,idx,count){
if(p.id===editingId){
var cats=CATS.slice();if(p.category&&cats.indexOf(p.category)<0){cats.push(p.category);}
var sel='<select id="editCat">'+cats.map(function(c){return '<option'+(c===p.category?' selected':'')+'>'+esc(c)+'</option>';}).join('')+'</select>';
return '<div class="prayer">'+metaLine(p)+'<input id="editPoint" value="'+esc(p.name)+'"><textarea id="editArea">'+esc(p.text)+'</textarea>'+sel+'<div class="actions"><button class="small-btn answer" onclick="saveEdit(\''+p.id+'\')">Save changes</button><button class="small-btn" onclick="cancelEdit()">Cancel</button></div></div>';
}
var up=idx>0?'':'disabled';
var down=idx<count-1?'':'disabled';
return '<div class="prayer"><div class="point">'+esc(p.name)+'</div>'+metaLine(p)+'<div class="text">'+linkify(esc(p.text))+'</div><div class="actions"><button class="small-btn move" '+up+' onclick="movePrayer(\''+p.id+'\',-1)" title="Move up">&#8593;</button><button class="small-btn move" '+down+' onclick="movePrayer(\''+p.id+'\',1)" title="Move down">&#8595;</button><button class="small-btn answer" onclick="markAnswered(\''+p.id+'\')">Prayer answered</button><button class="small-btn" onclick="startEdit(\''+p.id+'\')">Edit</button><button class="small-btn danger" onclick="removePrayer(\''+p.id+'\')">Remove</button></div></div>';
}
function render(){
var active=prayers.filter(function(p){return !p.answered;});
var done=prayers.filter(function(p){return p.answered;});
var al=document.getElementById('activeList');
if(active.length===0){al.innerHTML='<div class="empty">No active requests.</div>';}
else{
var html='';
CATS.forEach(function(cat){
var items=active.filter(function(p){return p.category===cat;});
if(!items.length){return;}
html+='<h3>'+cat+'</h3>';
items.forEach(function(p,i){html+=cardHtml(p,i,items.length);});
});
var other=active.filter(function(p){return CATS.indexOf(p.category)<0;});
if(other.length){html+='<h3>Other</h3>';other.forEach(function(p,i){html+=cardHtml(p,i,other.length);});}
al.innerHTML=html;
}
var dl=document.getElementById('answeredList');
if(done.length===0){dl.innerHTML='<div class="empty">No answered prayers yet.</div>';}
else{
dl.innerHTML=done.map(function(p){
return '<div class="prayer answered"><div class="point">&#128591; '+esc(p.name)+'</div>'+metaLine(p)+'<div class="text">'+linkify(esc(p.text))+'</div><div class="answered-tag">Answered '+(p.answered_date?fmtDate(p.answered_date):'')+'</div><div class="actions"><button class="small-btn danger" onclick="removePrayer(\''+p.id+'\')">Remove</button></div></div>';
}).join('');
}
}
async function movePrayer(id,dir){
var p=prayers.find(function(x){return x.id===id;});
if(!p){return;}
var siblings=prayers.filter(function(x){return !x.answered&&x.category===p.category;});
var idx=siblings.findIndex(function(x){return x.id===id;});
var other=siblings[idx+dir];
if(!other){return;}
try{
await api('PATCH','?id=eq.'+id,{sort_order:other.sort_order});
await api('PATCH','?id=eq.'+other.id,{sort_order:p.sort_order});
await refresh();
}catch(e){setStatus('manageStatus','Could not move. Try again.');}
}
async function markAnswered(id){
try{await api('PATCH','?id=eq.'+id,{answered:true,answered_date:new Date().toISOString()});await refresh();setStatus('manageStatus','Moved to Thanksgiving.');}
catch(e){setStatus('manageStatus','Could not update. Try again.');}
}
function startEdit(id){editingId=id;render();var t=document.getElementById('editPoint');if(t){t.focus();}}
function cancelEdit(){editingId=null;render();}
async function saveEdit(id){
var pt=document.getElementById('editPoint');
var t=document.getElementById('editArea');
var np=pt?pt.value.trim():'';
var v=t?t.value.trim():'';
var cs=document.getElementById('editCat');var nc=cs?cs.value:null;
if(!np||!v){return;}
var patch={name:np,text:v,edited:new Date().toISOString()};if(nc){patch.category=nc;}
try{await api('PATCH','?id=eq.'+id,patch);editingId=null;await refresh();setStatus('manageStatus','Saved.');}
catch(e){setStatus('manageStatus','Could not save the edit. Try again.');}
}
async function removePrayer(id){
if(!confirm('Remove this point permanently?')){return;}
try{await api('DELETE','?id=eq.'+id);await refresh();setStatus('manageStatus','Removed.');}
catch(e){setStatus('manageStatus','Could not remove. Try again.');}
}
function exportBoard(){
var active=prayers.filter(function(p){return !p.answered;});
var done=prayers.filter(function(p){return p.answered;});
var out=BOARD.backupHeader+' - backup made '+new Date().toLocaleDateString()+'\n\n=== PRAYING FOR ('+active.length+') ===\n\n';
active.forEach(function(p){out+='* '+p.name+'\n  '+p.text+'\n  ('+(p.added_by?p.added_by+', ':'')+fmtDate(p.created_at)+', '+p.category+')\n\n';});
if(!active.length){out+='(none)\n\n';}
out+='=== THANKSGIVING / ANSWERED ('+done.length+') ===\n\n';
done.forEach(function(p){out+='* '+p.name+'\n  '+p.text+'\n  (asked '+fmtDate(p.created_at)+(p.answered_date?', answered '+fmtDate(p.answered_date):'')+')\n\n';});
if(!done.length){out+='(none)\n';}
var ta=document.getElementById('exportText');
ta.value=out;
navigator.clipboard.writeText(out).then(function(){setStatus('exportStatus','Copied! Paste it into an email or note. The text is also shown below.');ta.style.display='block';})
.catch(function(){setStatus('exportStatus','Select and copy the text below to save it.');ta.style.display='block';ta.select();});
}

/* ---- the reading list ---- */
function buildList(){
var active=prayers.filter(function(p){return !p.answered;});
var thanks=prayers.filter(function(p){return p.answered;}).concat(active.filter(function(p){return p.category==='Thanksgiving';}));
var seen={};thanks=thanks.filter(function(p){if(seen[p.id]){return false;}seen[p.id]=true;return true;});
return {active:active.filter(function(p){return p.category!=='Thanksgiving';}),thanks:thanks,order:CATS.filter(function(c){return c!=='Thanksgiving';})};
}
function entryHtml(p,answered){
var by=(BOARD.showAddedBy&&p.added_by)?'<div class="mby">Added by '+esc(p.added_by)+'</div>':'<div class="mby"></div>';
var mark=answered?'&#128591; ':'';
var ans=answered&&p.answered_date?' <span style="color:var(--green);font-size:16px;font-weight:normal;">(answered '+fmtDate(p.answered_date)+')</span>':'';
return '<div class="mpoint">'+mark+esc(p.name)+ans+'</div><div class="mdetail">'+linkify(esc(p.text))+'</div>'+by;
}
async function showList(){
document.getElementById('listView').style.display='block';
window.scrollTo(0,0);
document.getElementById('listDate').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
try{await load();}catch(e){document.getElementById('listBody').innerHTML='<div class="empty">Could not load the list. Check your internet and try again.</div>';return;}
var b=buildList();
var html='';
if(b.thanks.length){html+='<h2>Thanksgiving</h2>';
b.thanks.forEach(function(p){html+=entryHtml(p,p.answered);});}
b.order.forEach(function(cat){
var items=b.active.filter(function(p){return p.category===cat;});
if(!items.length){return;}
html+='<h2>'+cat+'</h2>';
items.forEach(function(p){html+=entryHtml(p,false);});
});
if(!html){html='<p class="empty">No requests on the board yet.</p>';}
document.getElementById('listBody').innerHTML=html;
}
function hideList(){document.getElementById('listView').style.display='none';if(document.getElementById('activeList')){render();}}
function copyList(){
var b=buildList();
var dateStr=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
var out='🙏 *'+BOARD.waHeader+'*\n'+dateStr+'\n\n';
if(b.thanks.length){out+='*Thanksgiving*\n';
b.thanks.forEach(function(p){out+='🙏 *'+p.name+'*\n'+p.text+'\n\n';});}
b.order.forEach(function(cat){
var items=b.active.filter(function(p){return p.category===cat;});
if(!items.length){return;}
out+='*'+cat+'*\n';
items.forEach(function(p){out+='- *'+p.name+'*\n'+p.text+'\n\n';});
});
if(!b.thanks.length&&!b.active.length){out+='No requests on the board yet.\n';}
navigator.clipboard.writeText(out).then(function(){setStatus('listCopyStatus','Copied! Paste it into WhatsApp or any chat.');})
.catch(function(){setStatus('listCopyStatus','Could not copy automatically. Please screenshot the list instead.');});
}
refresh();
