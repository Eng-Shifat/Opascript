/* ================================================
   SCRIPTORA — dashboard.js  (Supabase connected)
   ================================================ */

const SUPABASE_URL  = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const LOGIN_PATH = '../Login page/login.html';

const STEPS = [
  { label: 'Order\nconfirmed' },
  { label: 'Payment\nreceived' },
  { label: 'Writing\nচলছে' },
  { label: 'Draft\nDelivery' },
  { label: 'Final\nPayment' },
  { label: 'File\nUnlock' },
];

const STATUS_STEP_MAP = {
  'pending':0,'confirmed':1,'payment_done':2,
  'writing':3,'draft_sent':4,'final_payment':5,'completed':6,
};

let currentUser=null, currentClient=null, allOrders=[], currentOrderId=null;
let countdownTimer=null, chatOrderId=null, realtimeSubs=[];

document.addEventListener('DOMContentLoaded', async () => {
  // Inject ripple styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes sbRipple { 
      0% { transform:scale(0); opacity:0.6; } 
      100% { transform:scale(5); opacity:0; } 
    }
    .sb-ripple-span {
      position:absolute; border-radius:50%;
      background:rgba(147,197,253,0.5);
      transform:scale(0); 
      animation:sbRipple 0.8s ease-out forwards;
      pointer-events:none;
    }
  `;
  document.head.appendChild(style);
  await checkSession();
  initNav();
  initChat();
  initProfile();
});

async function checkSession() {
  const { data:{ session } } = await sb.auth.getSession();
  if (!session) { window.location.href = LOGIN_PATH; return; }
  currentUser = session.user;

  const { data:client } = await sb.from('clients').select('*').eq('id',currentUser.id).single();
  if (!client) {
    const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    await sb.from('clients').insert({ id:currentUser.id, name, email:currentUser.email, phone:currentUser.user_metadata?.phone||'', created_at:new Date().toISOString() });
    currentClient = { id:currentUser.id, name, email:currentUser.email };
  } else {
    currentClient = client;
  }
  updateSidebarUser();
  await loadAllData();
  setupRealtime();
}

function updateSidebarUser() {
  const name = currentClient.name||'Client';
  setText('sbName', name); setText('sbEmail', currentClient.email||'');
  setText('headerName', name.split(' ')[0]); setText('sbAvatar', getInitials(name));
  if (currentClient.avatar_url) {
    document.getElementById('sbAvatar').innerHTML = `<img src="${currentClient.avatar_url}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  }
}

async function loadAllData() {
  await loadOrders();
  loadPaymentsPage();
  loadFilesPage();
  loadProfileData();
}

async function loadOrders() {
  const { data:orders } = await sb.from('orders').select('*').eq('client_id',currentUser.id).order('created_at',{ascending:false});
  allOrders = orders || [];
  renderHomePage();
  renderOrdersPage();
  populateChatOrderSelect();
}

function renderHomePage() {
  const total=allOrders.length;
  const active=allOrders.filter(o=>!['completed','cancelled'].includes(o.status)).length;
  const pending=allOrders.filter(o=>o.status==='pending').length;
  const completed=allOrders.filter(o=>o.status==='completed').length;
  setText('totalOrders',total); setText('activeOrders',active);
  setText('pendingOrders',pending); setText('completedOrders',completed);

  const activeList=document.getElementById('activeOrdersList');
  const activeOrders=allOrders.filter(o=>o.status!=='completed');
  if(activeList) {
    activeList.innerHTML='';
    const activeEmpty=document.getElementById('activeEmpty');
    if(activeEmpty) activeEmpty.style.display = activeOrders.length===0?'flex':'none';
    activeOrders.forEach(o=>activeList.appendChild(buildOrderCard(o)));
  }

  const completedList=document.getElementById('completedOrdersList');
  const completedOrders=allOrders.filter(o=>o.status==='completed');
  if(completedList) {
    completedList.innerHTML='';
    const completedEmpty=document.getElementById('completedEmpty');
    if(completedEmpty) completedEmpty.style.display = completedOrders.length===0?'block':'none';
  completedOrders.forEach(o=>completedList.appendChild(buildCompletedCard(o)));
  }
}

function buildOrderCard(order) {
  const deadline=new Date(order.deadline), now=new Date();
  const diffMs=deadline-now, daysLeft=Math.floor(diffMs/86400000);
  const isUrgent=daysLeft<=3, isPending=order.status==='pending';
  const card=document.createElement('div');
  card.className=`order-card ${isPending?'pending':isUrgent?'urgent':'safe'}`;
  card.onclick=()=>openOrderDetail(order.id);
  const badge=getStatusBadge(order.status);
  const cdColor=isUrgent?'cd-nums-urgent':'cd-nums-safe';
  const prog=order.progress_pct||0;
  const progColor=isUrgent?'#ef4444':'#22c55e';
  const due=(order.due_amount||0)>0;
  card.innerHTML=`
    <div class="oc-top">
      <div>
        <div class="oc-title">${escHtml(order.title||'Untitled')}</div>
        <div class="oc-meta">#SCR-${String(order.id).slice(-6).toUpperCase()} · ${escHtml(order.dept||'')} · <span class="oc-price">৳${fmt(order.total_price)}</span></div>
      </div>
      <span class="status-badge ${badge.cls}">${badge.label}</span>
    </div>
    <div class="oc-cd">
      <div class="cd-left">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Deadline — <strong>${fmtDate(order.deadline)}</strong>
      </div>
      <div class="${cdColor}">${diffMs>0?formatCountdown(diffMs):'সময় শেষ!'}</div>
    </div>
    <div class="oc-prog-bar"><div class="oc-prog-fill" style="width:${prog}%;background:${progColor}"></div></div>
    <div class="oc-foot">
      <button class="oc-det-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        Details দেখুন
      </button>
      ${due
        ?`<span class="oc-due"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>৳${fmt(order.due_amount)} বাকি</span>`
        :`<span class="oc-paid"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Advance paid ✓</span>`
      }
    </div>`;
  return card;
}

function buildCompletedCard(order) {
  const card=document.createElement('div');
  card.className='completed-card'; card.onclick=()=>openOrderDetail(order.id);
  card.innerHTML=`
    <div><div class="cc-title">${escHtml(order.title||'Untitled')}</div><div class="cc-meta">#SCR-${String(order.id).slice(-6).toUpperCase()} · ${fmtDate(order.created_at)}</div></div>
    <div class="cc-right">
      <span class="cc-done">✓ Done</span>
      <button class="cc-dl-btn" onclick="event.stopPropagation();showPage('files')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
    </div>`;
  return card;
}

function renderOrdersPage() {
  const list=document.getElementById('allOrdersList');
  const empty=document.getElementById('ordersEmpty');
  list.innerHTML='';
  if(allOrders.length===0){empty.style.display='flex';return;}
  empty.style.display='none';
  allOrders.forEach(order=>{
    const item=document.createElement('div');
    item.className='order-list-item'; item.onclick=()=>openOrderDetail(order.id);
    const badge=getStatusBadge(order.status);
    item.innerHTML=`
      <div class="oli-left">
        <div class="oli-title">${escHtml(order.title||'Untitled')}</div>
        <div class="oli-meta">#SCR-${String(order.id).slice(-6).toUpperCase()} · ${escHtml(order.dept||'')} · ${fmtDate(order.deadline)}</div>
      </div>
      <div class="oli-right">
        <span class="status-badge ${badge.cls}">${badge.label}</span>
        <span class="oli-price">৳${fmt(order.total_price)}</span>
        <svg class="oli-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
    list.appendChild(item);
  });
}

async function openOrderDetail(orderId) {
  currentOrderId=orderId;
  const order=allOrders.find(o=>o.id===orderId);
  if(!order) return;
  showPage('orders');
  document.getElementById('ordersListView').style.display='none';
  document.getElementById('orderDetailView').style.display='block';
  setText('detailTitle',order.title||'Untitled');
  setText('detailMeta',`#SCR-${String(order.id).slice(-6).toUpperCase()} · ${order.dept||''} · Order: ${fmtDate(order.created_at)}`);
  const badge=getStatusBadge(order.status);
  const statusEl=document.getElementById('detailStatus');
  statusEl.textContent=badge.label; statusEl.className=`status-badge ${badge.cls}`;
  startCountdown(order.deadline);
  renderStepper(order.status);
  setText('detailTotal',`৳${fmt(order.total_price)}`);
  setText('detailAdvance',`৳${fmt(order.advance_paid)}`);
  setText('detailDue',`৳${fmt(order.due_amount)}`);
  const payBadges=document.getElementById('payBadges');
  payBadges.innerHTML='';
  if((order.advance_paid||0)>0) payBadges.innerHTML+=`<span class="pay-badge confirmed">✓ Advance paid</span>`;
  if((order.due_amount||0)>0) payBadges.innerHTML+=`<span class="pay-badge pending">✗ Due pending</span>`;
  await loadOrderFiles(orderId,(order.due_amount||0)>0);
  await loadLatestAdminMsg(orderId);
}

document.getElementById('backToOrders').onclick=()=>{
  document.getElementById('ordersListView').style.display='block';
  document.getElementById('orderDetailView').style.display='none';
  clearInterval(countdownTimer);
};

function startCountdown(deadlineStr) {
  clearInterval(countdownTimer);
  const deadline=new Date(deadlineStr);
  function tick() {
    const diff=deadline-new Date();
    if(diff<=0){
      ['cdDays','cdHours','cdMins','cdSecs'].forEach(id=>setText(id,'00'));
      setText('cdDaysLeft','সময় শেষ!'); clearInterval(countdownTimer); return;
    }
    const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    setText('cdDays',pad(d)); setText('cdHours',pad(h));
    setText('cdMins',pad(m)); setText('cdSecs',pad(s));
    setText('cdDeadline',fmtDateLong(deadlineStr));
    setText('cdDaysLeft',`আর মাত্র ${d} দিন বাকি`);
  }
  tick(); countdownTimer=setInterval(tick,1000);
}

function renderStepper(status) {
  const stepper=document.getElementById('progressStepper');
  const currentStep=STATUS_STEP_MAP[status]??0;
  stepper.innerHTML='';
  STEPS.forEach((step,i)=>{
    const isDone=i<currentStep, isActive=i===currentStep;
    const cls=isDone?'done':isActive?'active':'pending';
    const icon=isDone
      ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
      :isActive
        ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
        :`${i+1}`;
    const div=document.createElement('div');
    div.className=`step ${cls}`;
    div.innerHTML=`<div class="step-circle ${cls}">${icon}</div><div class="step-label ${cls}">${step.label.replace('\n','<br>')}</div>`;
    stepper.appendChild(div);
  });
}

async function loadOrderFiles(orderId,hasDue) {
  const {data:files}=await sb.from('files').select('*').eq('order_id',orderId).order('id',{ascending:true});
  const list=document.getElementById('filesList');
  if(!files||files.length===0){list.innerHTML='<div class="empty-note">কোনো file নেই</div>';return;}
  list.innerHTML='';
  files.forEach(file=>{
    const isLocked=file.locked&&hasDue;
    const ext=(file.name||'').split('.').pop().toUpperCase();
    const iconCls=isLocked?'fi-lock':ext==='PDF'?'fi-pdf':'fi-doc';
    const iconTxt=isLocked?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`:ext;
    const div=document.createElement('div');
    div.className='file-item';
    div.innerHTML=`
      <div class="file-icon ${iconCls}">${iconTxt}</div>
      <div class="file-info">
        <div class="file-name" style="${isLocked?'color:var(--text-muted)':''}">${escHtml(file.name)}</div>
        <div class="file-meta">${fmtDate(file.created_at)}</div>
        ${isLocked?'<div class="file-locked-label">Due payment করলে unlock হবে</div>':''}
      </div>
      ${isLocked
        ?`<button class="file-unlock-btn" onclick="showPage('payments')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>Unlock</button>`
        :`<a class="file-dl-btn" href="${escHtml(file.url)}" target="_blank" download><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</a>`
      }`;
    list.appendChild(div);
  });
}

async function loadLatestAdminMsg(orderId) {
  const {data:msgs}=await sb.from('messages').select('*').eq('order_id',orderId).eq('from_admin',true).order('sent_at',{ascending:false}).limit(1);
  const card=document.getElementById('adminMsgCard');
  if(msgs&&msgs.length>0){
    card.style.display='block';
    document.getElementById('adminMsgText').textContent=msgs[0].text;
    document.getElementById('goChatBtn').onclick=()=>{showPage('messages');document.getElementById('chatOrderSelect').value=orderId;loadChat(orderId);};
  } else { card.style.display='none'; }
}

async function loadFilesPage() {
  if(allOrders.length===0) return;
  const {data:files}=await sb.from('files').select('*, orders(title,due_amount)').in('order_id',allOrders.map(o=>o.id)).order('created_at',{ascending:false});
  const container=document.getElementById('allFilesList');
  const empty=document.getElementById('filesEmpty');
  if(!files||files.length===0){empty.style.display='flex';return;}
  empty.style.display='none';
  const grouped={};
  files.forEach(f=>{
    if(!grouped[f.order_id]) grouped[f.order_id]={title:f.orders?.title||'Order',files:[]};
    grouped[f.order_id].files.push(f);
  });
  container.innerHTML='';
  Object.entries(grouped).forEach(([orderId,group])=>{
    const groupDiv=document.createElement('div'); groupDiv.className='files-group';
    groupDiv.innerHTML=`<div class="files-group-label">${escHtml(group.title)}</div>`;
    const card=document.createElement('div'); card.className='files-card';
    group.files.forEach(file=>{
      const order=allOrders.find(o=>o.id===Number(orderId));
      const isLocked=file.locked&&(order?.due_amount||0)>0;
      const ext=(file.name||'').split('.').pop().toUpperCase();
      const iconCls=isLocked?'fi-lock':ext==='PDF'?'fi-pdf':'fi-doc';
      const iconTxt=isLocked?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`:ext;
      const item=document.createElement('div'); item.className='file-item';
      item.innerHTML=`
        <div class="file-icon ${iconCls}">${iconTxt}</div>
        <div class="file-info"><div class="file-name">${escHtml(file.name)}</div><div class="file-meta">${fmtDate(file.created_at)}</div></div>
        ${isLocked?`<span class="file-locked-label">🔒 Locked</span>`:`<a class="file-dl-btn" href="${escHtml(file.url)}" target="_blank" download><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</a>`}`;
      card.appendChild(item);
    });
    groupDiv.appendChild(card); container.appendChild(groupDiv);
  });
}

async function loadPaymentsPage() {
  const {data:payments}=await sb.from('payments').select('*').eq('client_id',currentUser.id).order('id',{ascending:false});
  const container=document.getElementById('paymentsList');
  const empty=document.getElementById('paymentsEmpty');
  if(!payments||payments.length===0){empty.style.display='flex';return;}
  empty.style.display='none'; container.innerHTML='';
  payments.forEach(pay=>{
    const cls=pay.confirmed?'confirmed':'pending';
    const lbl=pay.confirmed?'✓ Confirmed':'⏳ Pending';
    const item=document.createElement('div'); item.className='payment-item';
    item.innerHTML=`
      <div class="pi-left">
        <div class="pi-order">${escHtml(pay.orders?.title||'Order')}</div>
        <div class="pi-method">${escHtml(pay.method||'')}${pay.txn_id?` · TXN: ${escHtml(pay.txn_id)}`:''}</div>
        <div class="pi-txn">${fmtDateLong(pay.created_at)}</div>
      </div>
      <div class="pi-right">
        <div><div class="pi-amount">৳${fmt(pay.amount)}</div><div><span class="pay-badge ${cls}">${lbl}</span></div></div>
      </div>`;
    container.appendChild(item);
  });
}

function initChat() {
  const select=document.getElementById('chatOrderSelect');
  const sendBtn=document.getElementById('chatSendBtn');
  const input=document.getElementById('chatInput');
  select.addEventListener('change',()=>{const id=parseInt(select.value);if(!id)return;chatOrderId=id;loadChat(id);});
  sendBtn.addEventListener('click',sendChatMessage);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage();}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,100)+'px';});
}

function populateChatOrderSelect() {
  const select=document.getElementById('chatOrderSelect');
  select.innerHTML='<option value="">Order বেছে নিন</option>';
  allOrders.forEach(order=>{
    const opt=document.createElement('option');
    opt.value=order.id; opt.textContent=`#SCR-${String(order.id).slice(-6).toUpperCase()} — ${truncate(order.title,30)}`;
    select.appendChild(opt);
  });
}

async function loadChat(orderId) {
  document.getElementById('chatSelectPrompt').style.display='none';
  document.getElementById('chatBox').style.display='flex';
  document.getElementById('chatOrderId').textContent=`#SCR-${String(orderId).slice(-6).toUpperCase()}`;
  const body=document.getElementById('chatBody');
  const loading=document.getElementById('chatLoading');
  body.innerHTML=''; body.appendChild(loading); loading.style.display='flex';
  const {data:msgs}=await sb.from('messages').select('*').eq('order_id',orderId).order('sent_at',{ascending:true});
  loading.style.display='none'; body.innerHTML='';
  if(!msgs||msgs.length===0){body.innerHTML='<div class="empty-note">এখনো কোনো message নেই। Admin কে message করুন!</div>';}
  else{msgs.forEach(msg=>appendChatMsg(msg));}
  scrollChatToBottom();
  const chatSub=sb.channel(`chat-${orderId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`order_id=eq.${orderId}`},payload=>{appendChatMsg(payload.new);scrollChatToBottom();if(payload.new.from_admin)updateMsgBadge(1);}).subscribe();
  realtimeSubs.push(chatSub);
}

function appendChatMsg(msg) {
  const body=document.getElementById('chatBody');
  const isAdmin=msg.from_admin;
  const emptyNote=body.querySelector('.empty-note');
  if(emptyNote) emptyNote.remove();
  const div=document.createElement('div');
  div.className=`chat-msg ${isAdmin?'admin':'client'}`;
  div.innerHTML=`<div class="msg-meta-label">${isAdmin?'Scriptora Admin':'আপনি'} · ${fmtTime(msg.sent_at)}</div><div class="msg-bubble">${escHtml(msg.text)}</div>`;
  body.appendChild(div);
}

async function sendChatMessage() {
  const input=document.getElementById('chatInput');
  const text=input.value.trim();
  if(!text||!chatOrderId) return;
  input.value=''; input.style.height='auto';
  const {error}=await sb.from('messages').insert({order_id:chatOrderId,client_id:currentUser.id,text,from_admin:false,sent_at:new Date().toISOString()});
  if(error){showToast('Message পাঠানো যায়নি','error');input.value=text;}
}

function scrollChatToBottom(){const body=document.getElementById('chatBody');setTimeout(()=>{body.scrollTop=body.scrollHeight;},50);}

function loadProfileData() {
  if(!currentClient) return;
  const name=currentClient.name||'';
  const parts=name.split(' ');
  setVal('pFirstName',parts[0]||''); setVal('pLastName',parts.slice(1).join(' ')||'');
  setVal('pEmail',currentClient.email||''); setVal('pPhone',currentClient.phone||'');
  setVal('pUniversity',currentClient.university||''); setVal('pSubject',currentClient.subject||'');
  setVal('pYear',currentClient.academic_year||'');
  const av=document.getElementById('profileAvatar');
  if(currentClient.avatar_url){av.innerHTML=`<img src="${currentClient.avatar_url}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;}
  else{av.textContent=getInitials(name);}
  setText('profileAvName',name||'—');
  setText('profileAvSince',`Member since ${fmtDate(currentClient.created_at)}`);
  setText('profileAvOrders',`${allOrders.length} orders`);
}

function initProfile() {
  document.getElementById('profileSaveBtn').addEventListener('click',saveProfile);
  document.getElementById('passChangeBtn').addEventListener('click',changePassword);
  document.getElementById('avatarInput').addEventListener('change',uploadAvatar);
  document.getElementById('logoutBtn').addEventListener('click',logout);
}

async function saveProfile() {
  const btn=document.getElementById('profileSaveBtn');
  const firstName=getVal('pFirstName').trim(), lastName=getVal('pLastName').trim();
  if(!firstName){showProfileMsg('profileMsg','নাম দিন','error');return;}
  btn.textContent='Saving...'; btn.disabled=true;
  const fullName=`${firstName} ${lastName}`.trim();
  const {error}=await sb.from('clients').update({name:fullName,phone:getVal('pPhone').trim(),university:getVal('pUniversity').trim(),subject:getVal('pSubject').trim(),academic_year:getVal('pYear').trim()}).eq('id',currentUser.id);
  btn.textContent='Profile Save করুন'; btn.disabled=false;
  if(error){showProfileMsg('profileMsg','Save হয়নি: '+error.message,'error');}
  else{currentClient.name=fullName;updateSidebarUser();showProfileMsg('profileMsg','✓ Profile save হয়েছে!','success');showToast('Profile update হয়েছে','success');}
}

async function changePassword() {
  const btn=document.getElementById('passChangeBtn');
  const current=getVal('pCurrentPass'),newPass=getVal('pNewPass'),confirm=getVal('pConfirmPass');
  if(!current||!newPass||!confirm){showProfileMsg('passMsg','সব field পূরণ করুন','error');return;}
  if(newPass.length<8){showProfileMsg('passMsg','কমপক্ষে ৮ অক্ষর হতে হবে','error');return;}
  if(newPass!==confirm){showProfileMsg('passMsg','নতুন password মিলছে না','error');return;}
  btn.textContent='Updating...'; btn.disabled=true;
  const {error:signInErr}=await sb.auth.signInWithPassword({email:currentUser.email,password:current});
  if(signInErr){showProfileMsg('passMsg','বর্তমান password ভুল','error');btn.textContent='Password Update করুন';btn.disabled=false;return;}
  const {error}=await sb.auth.updateUser({password:newPass});
  btn.textContent='Password Update করুন'; btn.disabled=false;
  if(error){showProfileMsg('passMsg','Password পরিবর্তন হয়নি','error');}
  else{setVal('pCurrentPass','');setVal('pNewPass','');setVal('pConfirmPass','');showProfileMsg('passMsg','✓ Password পরিবর্তন হয়েছে!','success');showToast('Password update হয়েছে','success');}
}

async function uploadAvatar(e) {
  const file=e.target.files[0];
  if(!file) return;
  if(file.size>2*1024*1024){showToast('File size max 2MB','error');return;}
  showToast('Uploading...');
  const ext=file.name.split('.').pop();
  const path=`avatars/${currentUser.id}.${ext}`;
  const {error:upErr}=await sb.storage.from('scriptora-files').upload(path,file,{upsert:true});
  if(upErr){showToast('Upload হয়নি','error');return;}
  const {data:urlData}=sb.storage.from('scriptora-files').getPublicUrl(path);
  const avatarUrl=urlData.publicUrl;
  await sb.from('clients').update({avatar_url:avatarUrl}).eq('id',currentUser.id);
  currentClient.avatar_url=avatarUrl;
  const avImg=`<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  document.getElementById('sbAvatar').innerHTML=avImg;
  document.getElementById('profileAvatar').innerHTML=avImg;
  showToast('Avatar update হয়েছে!','success');
}

async function logout() {
  await sb.auth.signOut();
  ['scriptora_client_id','scriptora_name','scriptora_email','scriptora_role'].forEach(k=>localStorage.removeItem(k));
  window.location.href=LOGIN_PATH;
}

const STATUS_LABELS_CLIENT = {
  'writing':     'In Progress — লেখা চলছে',
  'completed':   'Completed — সম্পন্ন হয়েছে ✓',
  'pending':     'Pending — অপেক্ষায় আছে',
  'draft_ready': 'In Review — রিভিউ চলছে',
  'overdue':     'Overdue — সময় পার হয়ে গেছে',
  'hold':        'On Hold — বিরতিতে আছে',
};

function setupRealtime() {
  /* Order status change */
  const orderSub = sb.channel('orders-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `client_id=eq.${currentUser.id}`
    }, async payload => {
      const oldStatus = payload.old?.status;
      const newStatus = payload.new?.status;
      const label = STATUS_LABELS_CLIENT[newStatus] || newStatus;

      await loadOrders();
      if (currentOrderId && payload.new?.id === currentOrderId) {
        openOrderDetail(currentOrderId);
      }

      /* Status badge in sidebar notification dot */
      if (oldStatus !== newStatus) {
        showToast(`📋 Status update: ${label}`, 'success');
        /* Flash the active order card */
        const orderId = payload.new?.id;
        if (orderId) {
          setTimeout(() => {
            const cards = document.querySelectorAll('.order-card, .order-list-item');
            cards.forEach(c => {
              if (c.dataset.orderId === orderId || c.onclick?.toString().includes(orderId)) {
                c.style.transition = 'box-shadow 0.3s';
                c.style.boxShadow = '0 0 0 2px #6366f1';
                setTimeout(() => c.style.boxShadow = '', 2000);
              }
            });
          }, 300);
        }
      } else {
        showToast('Order update হয়েছে!', 'success');
      }
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `client_id=eq.${currentUser.id}`
    }, async () => {
      await loadOrders();
      showToast('নতুন Order তৈরি হয়েছে!', 'success');
    })
    .subscribe();
  realtimeSubs.push(orderSub);

  /* Realtime unread message badge from admin */
  const msgSub = sb.channel('client-messages-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `from_admin=eq.true`
    }, async payload => {
      /* Check if this message belongs to current user's orders */
      const myOrderIds = allOrders.map(o => o.id);
      if (!myOrderIds.includes(payload.new?.order_id)) return;

      updateMsgBadge(1);

      const preview = (payload.new?.text || '').substring(0, 60);
      showToast(`💬 Admin: ${preview}${preview.length >= 60 ? '…' : ''}`, 'info');
    })
    .subscribe();
  realtimeSubs.push(msgSub);
}

function updateMsgBadge(n) {
  const badge=document.getElementById('msgBadge');
  badge.textContent=parseInt(badge.textContent||'0')+n;
  badge.style.display='inline';
}

function initNav() {
  document.querySelectorAll('.sb-item').forEach(item=>{
    item.addEventListener('click',e=>{
      e.preventDefault();

      // Ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('sb-ripple-span');
      const rect = item.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      item.appendChild(ripple);
      setTimeout(() => ripple.remove(), 850);

      const page=item.dataset.page;
      showPage(page,item);
      if(page==='messages'){const b=document.getElementById('msgBadge');b.textContent='0';b.style.display='none';}
    });
  });

  document.querySelectorAll('.mbn-item').forEach(item=>{
    item.addEventListener('click',e=>{
      e.preventDefault();

      // Ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('sb-ripple-span');
      const rect = item.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      item.appendChild(ripple);
      setTimeout(() => ripple.remove(), 850);

      const page=item.dataset.page;
      showPage(page);
      if(page==='messages'){const b=document.getElementById('msgBadge');b.textContent='0';b.style.display='none';}
    });
  });
}

function showPage(pageId,clickedItem) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target=document.getElementById('page-'+pageId);
  if(target) target.classList.add('active');
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.remove('active'));
  document.querySelectorAll('.mbn-item').forEach(i=>i.classList.remove('active'));
  if(clickedItem){clickedItem.classList.add('active');}
  else{
    const n=document.querySelector(`.sb-item[data-page="${pageId}"]`);if(n)n.classList.add('active');
    const m=document.querySelector(`.mbn-item[data-page="${pageId}"]`);if(m)m.classList.add('active');
  }
  if(pageId==='orders'){
    document.getElementById('ordersListView').style.display='block';
    document.getElementById('orderDetailView').style.display='none';
    clearInterval(countdownTimer);
  }
}

function showToast(msg,type='') {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast show ${type}`;
  setTimeout(()=>{t.classList.remove('show');},3000);
}

function setText(id,val){const el=document.getElementById(id);if(el)el.textContent=val??'—';}
function setVal(id,val){const el=document.getElementById(id);if(el)el.value=val??'';}
function getVal(id){return document.getElementById(id)?.value||'';}
function escHtml(str){return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmt(num){return Number(num||0).toLocaleString('en-BD');}
function pad(n){return String(Math.max(0,n)).padStart(2,'0');}
function truncate(str,len){return str&&str.length>len?str.slice(0,len)+'…':str||'';}
function getInitials(name){return(name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);}
function fmtDate(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-BD',{day:'numeric',month:'short',year:'numeric'});}
function fmtDateLong(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-BD',{day:'numeric',month:'long',year:'numeric'});}
function fmtTime(d){if(!d)return'';return new Date(d).toLocaleTimeString('en-BD',{hour:'2-digit',minute:'2-digit'});}
function formatCountdown(ms){if(ms<=0)return'সময় শেষ!';const d=Math.floor(ms/86400000),h=Math.floor((ms%86400000)/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);if(d>0)return`${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;return`${pad(h)}h ${pad(m)}m ${pad(s)}s`;}
function getStatusBadge(status){const map={'pending':{cls:'badge-pending',label:'Pending'},'confirmed':{cls:'badge-confirmed',label:'Confirmed'},'payment_done':{cls:'badge-confirmed',label:'Payment Done'},'writing':{cls:'badge-writing',label:'Writing চলছে'},'draft_sent':{cls:'badge-writing',label:'Draft Sent'},'final_payment':{cls:'badge-pending',label:'Final Payment'},'completed':{cls:'badge-completed',label:'Completed ✓'},'revision':{cls:'badge-revision',label:'Revision'}};return map[status]||{cls:'badge-pending',label:status||'Pending'};}
function showProfileMsg(id,msg,type){const el=document.getElementById(id);if(!el)return;el.textContent=msg;el.className=`profile-msg ${type}`;setTimeout(()=>{el.textContent='';el.className='profile-msg';},4000);}