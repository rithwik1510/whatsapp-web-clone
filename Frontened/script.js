function init(){
  // API_BASE logic: use same origin for production, localhost:5000 for local dev
  const isLocal = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
  const API_BASE = isLocal && window.location.port !== '5000' 
    ? 'http://127.0.0.1:5000' 
    : '';
  
  console.log('API_BASE:', API_BASE, 'Current origin:', window.location.origin);
  
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
    const url = `${API_BASE}/chats`;
    console.log('Fetching chats from:', url);
    const res = await fetch(url);
    console.log('Response status:', res.status);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    chats = await res.json();
    console.log('Loaded chats:', chats);
    renderChatList(chats);
    if (chats.length) openChat(chats[0]);
  }catch(e){
    console.error('Failed to load /chats', e);
    chatListEl.innerHTML = '<li class="chat-item"><div style="color:#f66">Failed to load chats: ' + e.message + '</div></li>';
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

// Add typing indicators
let typingTimer = null;
messageInput.addEventListener('input', () => {
  if (socket && activeChat) {
    // Emit typing start
    socket.emit('typing_start', { wa_id: activeChat.wa_id });
    
    // Clear existing timer
    if (typingTimer) clearTimeout(typingTimer);
    
    // Set timer to stop typing indicator after 2 seconds
    typingTimer = setTimeout(() => {
      if (socket && activeChat) {
        socket.emit('typing_stop', { wa_id: activeChat.wa_id });
      }
    }, 2000);
  }
});
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

  // Real-time: Socket.IO → SSE → Polling
  let socket = null;
  let boundRealtime = false;
  
  // Try Socket.IO first (best real-time experience)
  try {
    if (window.io) {
      const socketUrl = API_BASE || window.location.origin;
      socket = window.io(socketUrl, { 
        transports: ['websocket', 'polling'],
        timeout: 20000
      });
      
      socket.on('connect', () => {
        console.log('✅ Socket.IO connected');
        boundRealtime = true;
      });
      
      socket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
        boundRealtime = false;
      });
      
      socket.on('new_message', (msg) => {
        console.log('📨 New message via Socket.IO:', msg);
        if (activeChat && msg.wa_id === activeChat.wa_id) {
          renderMessages([...(window.__lastMsgs || []), msg]);
        }
        loadChats(); // Update chat list
      });
      
      // Optional: Add typing indicators
      socket.on('typing_start', (data) => {
        if (activeChat && data.wa_id === activeChat.wa_id) {
          chatPresence.textContent = 'typing...';
        }
      });
      
      socket.on('typing_stop', (data) => {
        if (activeChat && data.wa_id === activeChat.wa_id) {
          chatPresence.textContent = 'online';
        }
      });
      
      socket.on('connect_error', (error) => {
        console.warn('Socket.IO connection error:', error);
        boundRealtime = false;
      });
    }
  } catch (e) {
    console.warn('Socket.IO not available:', e);
  }

  // Fallback to SSE if Socket.IO fails
  if (!boundRealtime) {
    let es = null;
    try {
      es = new EventSource((API_BASE || '') + '/events');
      es.onmessage = (ev) => {
        if (!ev?.data) return;
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'new_message') {
            console.log('📨 New message via SSE:', data.message);
            const msg = data.message;
            if (activeChat && msg.wa_id === activeChat.wa_id) {
              renderMessages([...(window.__lastMsgs || []), msg]);
            }
            loadChats();
          }
        } catch (_) {}
      };
      boundRealtime = true;
      console.log('✅ SSE connected as fallback');
    } catch (_) {}
  }

  // Final fallback: polling
  if (!boundRealtime) {
    console.log('⚠️ Using polling fallback');
    setInterval(async () => {
      if (!activeChat) return;
      try {
        const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(activeChat.wa_id)}`);
        const msgs = await res.json();
        renderMessages(msgs);
      } catch (_) {}
    }, 3000);
  }

loadChats();
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


