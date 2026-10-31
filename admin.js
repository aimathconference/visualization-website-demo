/* ---------- the Admin tab (the demo's admin page, demo/public/js/pages.js, on this front end) ----------
   Loaded after yours.js and before app.js; the functions below run at call time and use app.js helpers ($, $$, esc, toast,
   announce, view, refocus) and pfp from users.js. The tab shows only for an admin on the demo server, and the server
   enforces it: every /api/admin route answers 403 to anyone else (demo/server/routes/admin.js).
   People, the audit log, an import from the registry and the data export. The demo's Visualizations table stays behind:
   this front end shows the catalog whatever a row's hidden or pinned flag says, and it never shows a promoted post, so
   those buttons would do nothing, and deleting a catalog piece's row would only lose its likes. */
const ADMIN_ROLES={user:'User', moderator:'Moderator', blog:'Blog maintainer', admin:'Admin'};
let adminRemoving=null; // the id of the person whose Remove account form is open

const AdminPage={
  sync(){ $('#tab-admin').hidden=LociAPI.role()!=='admin'; },
};

async function renderAdmin(){
  const el=$('#admin');
  if(LociAPI.role()!=='admin'){ el.innerHTML='<div class="wrap"><div class="pagehead"><div class="kicker">Admin</div><h1>Admin</h1><p>Only admins can see this page.</p></div></div>'; return; }
  let users, log;
  try{ [users,log]=await Promise.all([LociAPI.call('GET','api/admin/users'), LociAPI.call('GET','api/admin/audit')]); }
  catch(e){ el.innerHTML=`<div class="wrap"><div class="pagehead"><div class="kicker">Admin</div><h1>Admin</h1><p>Could not load this page: ${esc(e.message)}</p></div></div>`; return; }
  const people=users.items.filter(u=>!u.placeholder), authors=users.items.filter(u=>u.placeholder);
  el.innerHTML=`<div class="wrap">
    <div class="pagehead"><div class="kicker">Admin</div><h1 tabindex="-1">People and the audit log</h1>
      <p>Every action here is recorded in the audit log below.</p></div>
    <div class="btnrow">
      <button class="btn ghost" type="button" data-admin-import>Import from the registry now</button>
      <a class="btn ghost" href="api/admin/export" download>Export all data (JSON)</a>
    </div>
    <h2 class="sechead">People <span class="ycount">${people.length}</span></h2>
    <div class="tablewrap"><table class="admin"><thead><tr><th>Person</th><th>Role</th><th>Posts</th><th>Joined</th><th></th></tr></thead><tbody>${people.map(adminPersonRow).join('')}</tbody></table></div>
    <h2 class="sechead">Authors without an account <span class="ycount">${authors.length}</span></h2>
    <p class="fine">Named on a visualization, but nobody has signed in as them.</p>
    <div class="tablewrap"><table class="admin"><thead><tr><th>Author</th><th>Posts</th></tr></thead><tbody>${authors.map(u=>`<tr><td>${adminWho(u)}</td><td>${u.count}</td></tr>`).join('')||'<tr><td colspan="2">Nobody.</td></tr>'}</tbody></table></div>
    <h2 class="sechead">Audit log</h2>
    <div class="tablewrap"><table class="admin"><thead><tr><th>When (UTC)</th><th>Who</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead><tbody>
      ${log.items.map(a=>`<tr><td>${esc(a.at)}</td><td>${a.actor?`@${esc(a.actor)}`:'—'}</td><td>${esc(a.action)}</td><td class="longtext">${esc(a.target||'')}</td><td class="longtext">${esc(a.reason||'')}</td></tr>`).join('')||'<tr><td colspan="5">Nothing yet.</td></tr>'}
    </tbody></table></div>
  </div>`;
  $$('[data-role-for]',el).forEach(s=>{ s.onchange=()=>adminAct(()=>LociAPI.call('PUT',`api/admin/users/${s.dataset.roleFor}/role`,{role:s.value}),'Role changed. Remember to update their GitHub team membership too.'); });
}

const adminWho=u=>`<span class="who-cell">${pfp('@'+u.handle,'sm')}<button class="by-user" type="button" data-user="@${esc(u.handle)}">@${esc(u.handle)}</button>${u.removed?' <span class="badge">removed</span>':''}</span>`;

function adminPersonRow(u){
  const you=u.handle===LociAPI.whoami().user?.handle;
  const roles=`<select class="input admin-role" data-role-for="${u.id}" aria-label="Role of @${esc(u.handle)}">${Object.entries(ADMIN_ROLES).map(([r,n])=>`<option value="${r}"${u.role===r?' selected':''}>${n}</option>`).join('')}</select>`;
  const act=you?'<span class="fine">You</span>':u.removed?`<button class="btn ghost" type="button" data-restore-user="${u.id}">Restore</button>`:`<button class="btn ghost" type="button" data-remove-user="${u.id}">Remove account</button>`;
  const row=`<tr class="${u.removed?'dim':''}"><td>${adminWho(u)}</td><td>${roles}</td><td>${u.count}</td><td>${esc((u.joined||'').slice(0,10))}</td><td>${act}</td></tr>`;
  if(adminRemoving!==u.id) return row;
  return row+`<tr><td colspan="5" class="longtext"><form class="btnrow" data-remove-form="${u.id}">
    <label class="flabel" for="admin-reason">Why remove @${esc(u.handle)}? This hides their posts and refuses their login. Recorded in the audit log.</label>
    <input class="input" id="admin-reason" maxlength="300" required>
    <button class="btn" type="submit">Remove account</button><button class="btn ghost" type="button" data-remove-cancel>Cancel</button></form></td></tr>`;
}

async function adminAct(run,msg){
  try{ const r=await run(); adminRemoving=null; const said=typeof msg==='function'?msg(r):msg; toast(said); announce(said); }
  catch(e){ toast(e.message); announce(e.message); }
  await renderAdmin();
}

document.addEventListener('click',e=>{
  if(!e.target.closest || !e.target.closest('#admin')) return;
  const t=e.target, rm=t.closest('[data-remove-user]'), rs=t.closest('[data-restore-user]');
  if(rm){ adminRemoving=Number(rm.dataset.removeUser); return renderAdmin().then(()=>refocus('#admin-reason')); }
  if(t.closest('[data-remove-cancel]')){ adminRemoving=null; return renderAdmin(); }
  if(rs) return adminAct(()=>LociAPI.call('POST',`api/admin/users/${rs.dataset.restoreUser}/restore`,{}),'Account restored.');
  if(t.closest('[data-admin-import]')) return adminAct(()=>LociAPI.call('POST','api/admin/import-registry'),r=>r.skipped?'An import is already running. Try again in a moment.':r.unchanged?'The registry has not changed.':`Imported ${r.imported?.length??0}, updated ${r.updated?.length??0}, hidden ${r.hidden?.length??0}${r.errors?.length?`, ${r.errors.length} failed`:''}.`);
});
document.addEventListener('submit',e=>{
  const f=e.target.closest&&e.target.closest('[data-remove-form]'); if(!f) return;
  e.preventDefault();
  const reason=$('#admin-reason',f).value.trim(); if(!reason) return $('#admin-reason',f).focus();
  adminAct(()=>LociAPI.call('DELETE',`api/admin/users/${f.dataset.removeForm}`,{reason}),'Account removed and their posts hidden.');
});
