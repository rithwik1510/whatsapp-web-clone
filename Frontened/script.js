function init(){
  // On Render/production, everything is served from the same origin
  // On localhost, API runs on port 5000
  const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:5000'
    : '';
  const chatListEl = document.getElementById('chatList');
  const messagePane = document.getElementById('messagePane');
  const searchInput = document.getElementById('searchInput');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const menuBtn = document.getElementById('menuBtn');
  const chatMenuBtn = document.getElementById('chatMenuBtn');
  const popover = document.getElementById('popover');
  const scrollDownBtn = document.getElementById('scrollDownBtn');

  const chatTitle = document.getElementById('chatTitle');
  const chatPresence = document.getElementById('chatPresence');
  const chatAvatar = document.getElementById('chatAvatar');

  let chats = [];
  let activeChat = null;

  function toNumberish(v){
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
    if (typeof v === 'object'){
      if (v.$numberDouble != null) return Number(v.$numberDouble);
      if (v.$numberLong != null) return Number(v.$numberLong);
      if (v.$date != null) {
        const d = v.$date;
        if (typeof d === 'number') return d/1000;
        const t = Date.parse(d); return Number.isFinite(t) ? t/1000 : 0;
      }
    }
    return 0;
  }
  function toUnixTime(ts){ return toNumberish(ts); }
  function fmtTime(ts){ const s = toNumberish(ts); if (!s) return ''; return new Date(s * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function fmtDay(ts){ const s = toNumberish(ts); return new Date(s * 1000).toDateString(); }

function renderChatList(list){
  chatListEl.innerHTML = '';
  list.sort((a,b)=> toNumberish(b.last_timestamp)-toNumberish(a.last_timestamp)).forEach(c=>{
    const li = document.createElement('li');
    li.className = 'chat-item';
    li.innerHTML = `
      <img class="avatar" src="/Frontened/assets/default-avatar.svg" alt="${c.name}">
      <div>
        <div class="chat-item__name">${c.name}</div>
        <div class="chat-item__last">${c.last_message || ''}</div>
      </div>
      <div class="chat-item__meta">
        <div class="chat-item__icons">
          ${c.pinned ? '<i class="pin"></i>' : ''}
          ${c.muted ? '<i class="mute"></i>' : ''}
        </div>
        <div class="chat-item__time">${fmtTime(c.last_timestamp)}</div>
      </div>
    `;
    li.addEventListener('click',()=>{
      document.body.classList.add('show-chat');
      openChat(c);
    });
    chatListEl.appendChild(li);
  });
}

async function openChat(chat){
  activeChat = chat;
  chatTitle.textContent = chat.name;
  chatAvatar.src = '/Frontened/assets/default-avatar.svg';
  chatPresence.textContent = 'online';
  const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(chat.wa_id)}`);
  const msgs = await res.json();
  renderMessages(msgs);
}

function renderMessages(messages){
  messagePane.innerHTML = '';
  const sorted = [...messages].sort((a,b)=> toUnixTime(a.timestamp) - toUnixTime(b.timestamp));
  let lastDay = '';
  window.__lastMsgs = sorted;
  for (const m of sorted){
    const ts = toUnixTime(m.timestamp);
    const day = fmtDay(ts);
    if (day !== lastDay){
      const d = document.createElement('div');
      d.className = 'day';
      d.innerHTML = `<span>${day}</span>`;
      messagePane.appendChild(d);
      lastDay = day;
    }
    const out = (m.from && m.wa_id) ? m.from !== m.wa_id : Boolean(m.name === 'You');
    const bubble = document.createElement('div');
    bubble.className = `bubble ${out ? 'bubble--out' : 'bubble--in'}`;
    const meta = document.createElement('span');
    meta.className = 'meta';
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = fmtTime(ts);
    const ticksWrap = document.createElement('span');
    ticksWrap.className = 'ticks';
    const statusClass = statusToTick(m.status);
    if (statusClass === 'single') {
      const t = document.createElement('i');
      t.className = 'tick tick--first';
      ticksWrap.appendChild(t);
    } else {
      const t1 = document.createElement('i');
      const t2 = document.createElement('i');
      t1.className = 'tick tick--first' + (statusClass === 'read' ? ' tick--read' : '');
      t2.className = 'tick tick--second' + (statusClass === 'read' ? ' tick--read' : '');
      ticksWrap.appendChild(t1);
      ticksWrap.appendChild(t2);
    }
    bubble.textContent = (m.text && m.text.body) ? m.text.body : '';
    meta.appendChild(time);
    if (out) meta.appendChild(ticksWrap);
    bubble.appendChild(meta);
    messagePane.appendChild(bubble);
  }
  messagePane.scrollTop = messagePane.scrollHeight;
  toggleScrollBtn();
}

  function statusToTick(status){
    const s = String(status || '').toLowerCase();
    if (s === 'read') return 'read';
    if (s === 'delivered') return 'double';
    if (s === 'sent') return 'single';
    return 'single';
  }

async function loadChats(){
  try{
    const res = await fetch(`${API_BASE}/chats`);
    chats = await res.json();
    renderChatList(chats);
    if (chats.length) openChat(chats[0]);
  }catch(e){
    chatListEl.innerHTML = '<li class="chat-item"><div style="color:#f66">Failed to load chats</div></li>';
    console.error('Failed to load /chats', e);
  }
}

function toggleSendMic(){
  const t = messageInput.value.trim().length>0;
  sendBtn.style.display = t ? 'inline-block':'none';
  micBtn.style.display = t ? 'none':'inline-block';
}

sendBtn.addEventListener('click', async ()=>{
  const text = messageInput.value.trim();
  if (!text || !activeChat) return;
  const payload = { wa_id: activeChat.wa_id, text, name: 'You' };
  // optimistic UI
  renderMessages([...(window.__lastMsgs||[]), { wa_id: activeChat.wa_id, name: 'You', text: { body: text }, timestamp: (Date.now()/1000), status: 'sent' }]);
  try{
    await fetch(`${API_BASE}/messages`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  }catch(e){console.warn('send failed',e)}
  messageInput.value=''; toggleSendMic();
  toggleScrollBtn();
});

messageInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendBtn.click(); });
messageInput.addEventListener('input', toggleSendMic); toggleSendMic();
  // back button for mobile
  const backBtn = document.getElementById('backBtn');
  backBtn?.addEventListener('click', ()=>{ document.body.classList.remove('show-chat'); });

searchInput.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  renderChatList(chats.filter(c=> c.name.toLowerCase().includes(q)));
});

// Position popover near the triggering element
function openPopoverFor(el, contentHtml){
  const rect = el.getBoundingClientRect();
  popover.innerHTML = contentHtml;
  popover.style.top = `${Math.round(rect.bottom + 8)}px`;
  popover.style.left = `${Math.round(rect.left)}px`;
  popover.classList.remove('hidden');
}

function sidebarMenuContent(){
  return `
    <div class="item">New group</div>
    <div class="item">Starred messages</div>
    <div class="item">Settings</div>
    <div class="item">Log out</div>`;
}

function chatMenuContent(){
  return `
    <div class="item">Contact info</div>
    <div class="item">Select messages</div>
    <div class="item">Mute notifications</div>
    <div class="item">Clear messages</div>`;
}

menuBtn?.addEventListener('click', (e)=>{
  if (popover.classList.contains('hidden')){
    openPopoverFor(e.currentTarget, sidebarMenuContent());
  } else popover.classList.add('hidden');
});

chatMenuBtn?.addEventListener('click', (e)=>{
  if (popover.classList.contains('hidden')){
    openPopoverFor(e.currentTarget, chatMenuContent());
  } else popover.classList.add('hidden');
});
document.addEventListener('click', (e)=>{
  if (!popover.classList.contains('hidden')){
    const within = e.target.closest('#menuBtn') || e.target.closest('#chatMenuBtn') || e.target.closest('#popover');
    if (!within) popover.classList.add('hidden');
  }
});

function toggleScrollBtn(){
  const nearBottom = messagePane.scrollHeight - messagePane.scrollTop - messagePane.clientHeight < 80;
  if (nearBottom) scrollDownBtn.classList.add('hidden'); else scrollDownBtn.classList.remove('hidden');
}
messagePane.addEventListener('scroll', toggleScrollBtn);
scrollDownBtn.addEventListener('click', ()=>{ messagePane.scrollTop = messagePane.scrollHeight; toggleScrollBtn(); });

  // SSE live updates
  let es = null;
  try{
    try {
      es = new EventSource((API_BASE||'') + '/events');
    } catch (err) {
      es = null;
    }
  if (es) es.onmessage = (ev)=>{
    if (!ev?.data) return;
    try{
      const data = JSON.parse(ev.data);
      if (data.type === 'new_message'){
        const msg = data.message;
        if (activeChat && msg.wa_id === activeChat.wa_id){
          renderMessages([...(window.__lastMsgs||[]), msg]);
        }
        loadChats();
      }
    }catch(_){/*ignore*/}
  };
}catch(e){ console.warn('SSE not available', e) }

  if (!es) {
    // Fallback: poll active chat every 3s when open
    setInterval(async ()=>{
      if (!activeChat) return;
      try{
        const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(activeChat.wa_id)}`);
        const msgs = await res.json();
        renderMessages(msgs);
      }catch(_){}
    }, 3000);
  }

loadChats();
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


