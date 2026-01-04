import { supabase } from './supabase-client.js';

export function initChat() {
    injectChatUI();
    setupChatListeners();
    subscribeToMessages();
}

let currentUser = null;
let currentProfile = null;

async function getCurrentUser() {
    if (currentUser && currentProfile) return { user: currentUser, profile: currentProfile };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    currentUser = session.user;

    // Fetch profile for name and clinic_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    currentProfile = profile;
    return { user: currentUser, profile };
}

function injectChatUI() {
    // Check if already exists
    if (document.getElementById('app-chat-overlay')) return;

    const chatHTML = `
    <!-- Floating Button (only visible if header button not present or for mobile) -->
    <!-- We will use the existing header button logic mainly, but this is the container -->
    
    <!-- Chat Window -->
    <div id="app-chat-window" class="fixed bottom-4 right-4 w-80 md:w-96 bg-white dark:bg-[#152a2a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 transform translate-y-[120%] transition-transform duration-300 z-50 flex flex-col h-[500px] max-h-[80vh]">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-primary/10 rounded-t-2xl flex justify-between items-center cursor-pointer" id="chat-header-click">
            <div class="flex items-center gap-2">
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span class="font-bold text-slate-800 dark:text-white text-sm">Chat da Clínica</span>
            </div>
            <div class="flex items-center gap-1">
                 <button id="btn-minimize-chat" class="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <button id="btn-close-chat" class="p-1 hover:bg-red-50 hover:text-red-500 rounded text-slate-500 dark:text-slate-400 transition-colors">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        </div>

        <!-- Messages Area -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0c1a1a] scroll-smooth">
            <div class="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">forum</span>
                <p>Carregando mensagens...</p>
            </div>
        </div>

        <!-- Input Area -->
        <form id="chat-form" class="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-[#152a2a] rounded-b-2xl">
            <div class="flex gap-2">
                <input type="text" id="chat-input" 
                    class="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-1 focus:ring-primary dark:text-white resize-none"
                    placeholder="Digite sua mensagem..." autocomplete="off">
                <button type="submit" 
                    class="p-2 bg-primary text-slate-900 rounded-xl hover:brightness-105 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-outlined">send</span>
                </button>
            </div>
        </form>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHTML);
}

function setupChatListeners() {
    const chatWindow = document.getElementById('app-chat-window');
    const btnClose = document.getElementById('btn-close-chat');
    const btnMinimize = document.getElementById('btn-minimize-chat');
    const headerClick = document.getElementById('chat-header-click');
    const form = document.getElementById('chat-form');

    // Toggle Logic
    const toggleChat = () => {
        const isHidden = chatWindow.classList.contains('translate-y-[120%]');
        if (isHidden) {
            chatWindow.classList.remove('translate-y-[120%]');
            // Clear Unread
            unreadCount = 0;
            updateUnreadBadge();
            // Scroll to bottom
            scrollToBottom();
            // Focus input
            setTimeout(() => document.getElementById('chat-input')?.focus(), 300);
        } else {
            chatWindow.classList.add('translate-y-[120%]');
        }
    };

    // 1. External Triggers (Header Buttons in HTMLs)
    // We look for buttons with specific icon or existing hardcoded classes
    const triggerBtns = document.querySelectorAll('button span.material-symbols-outlined');
    triggerBtns.forEach(span => {
        if (span.textContent.includes('chat')) {
            const btn = span.closest('button');
            if (btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    toggleChat();
                };
            }
        }
    });

    // 2. Internal Controls
    if (btnClose) btnClose.onclick = () => chatWindow.classList.add('translate-y-[120%]');
    if (btnMinimize) btnMinimize.onclick = () => chatWindow.classList.add('translate-y-[120%]');
    if (headerClick) headerClick.onclick = (e) => {
        if (e.target.closest('button')) return; // Ignore button clicks
        // Optional: toggle minimize or just do nothing (keep it draggable later?)
    };

    // 3. Send Message
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            await sendMessage(text);
        };
    }
}

async function sendMessage(text) {
    const { user, profile } = await getCurrentUser();
    if (!profile || !profile.clinic_id) {
        alert("Erro: Perfil incompleto para enviar mensagem.");
        return;
    }

    const { error } = await supabase
        .from('messages')
        .insert([{
            content: text,
            sender_id: user.id,
            profile_id: user.id, // storing redundancy for easier joins if needed, or rely on sender_id
            clinic_id: profile.clinic_id
        }]);

    if (error) {
        console.error('Error sending:', error);
        // Show error in chat??
    }
}

let messagesSubscription = null;

async function subscribeToMessages() {
    const { user, profile } = await getCurrentUser();
    if (!profile || !profile.clinic_id) return;

    // Load Initial History
    await loadMessageHistory(profile.clinic_id);

    // Subscribe
    messagesSubscription = supabase
        .channel('public:messages:' + profile.clinic_id)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `clinic_id=eq.${profile.clinic_id}`
        }, payload => {
            renderMessage(payload.new, user.id, true);
        })
        .subscribe();
}

async function loadMessageHistory(clinicId) {
    const container = document.getElementById('chat-messages');

    // Fetch last 50
    const { data: msgs, error } = await supabase
        .from('messages')
        .select(`
            *,
            profiles:profile_id (full_name)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching history", error);
        container.innerHTML = '<p class="text-xs text-red-500 p-2">Erro ao carregar mensagens.</p>';
        return;
    }

    container.innerHTML = ''; // Clear loading

    // Reverse to show oldest first at top
    if (msgs) {
        const sorted = msgs.reverse();
        sorted.forEach(msg => {
            // Check if profiles is populated (depends on RLS and query)
            // If sender_id is local user, we know who it is.
            renderMessage(msg, currentUser?.id, false); // false = isHistory
        });
        scrollToBottom();
    }

    if (!msgs || msgs.length === 0) {
        container.innerHTML = '<div class="text-center text-xs text-slate-300 mt-10">Nenhuma mensagem ainda.</div>';
    }
}

let unreadCount = 0;

async function renderMessage(msg, currentUserId, isRealtime = true) {
    // Ensure we have current user if not passed
    if (!currentUserId && currentUser) currentUserId = currentUser.id;

    const container = document.getElementById('chat-messages');

    // Remove "empty" message if exists
    if (container.querySelector('.text-slate-300')) container.innerHTML = '';

    const isMe = msg.sender_id === currentUserId;

    // Handle Unread Count (Only for Realtime incoming messages when chat is closed)
    if (isRealtime && !isMe) {
        const chatWindow = document.getElementById('app-chat-window');
        const isHidden = chatWindow.classList.contains('translate-y-[120%]');
        if (isHidden) {
            unreadCount++;
            updateUnreadBadge();
            // Optional: Play sound?
        }
    }

    // Attempt to get name if not in payload (Realtime payload usually lacks joins)
    let senderName = "Usuário";
    if (msg.profiles && msg.profiles.full_name) {
        senderName = msg.profiles.full_name.split(' ')[0];
    } else if (isMe) {
        senderName = "Você";
    }

    // Time
    const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const alignClass = isMe ? 'pl-8 justify-end' : 'pr-8 justify-start';
    const bubbleClass = isMe
        ? 'bg-primary text-slate-900 rounded-tr-none'
        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none border border-gray-100 dark:border-gray-600';

    const html = `
    <div class="flex w-full ${alignClass} mb-3 animate-fade-in-up">
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[90%]">
            ${!isMe ? `<span class="text-[10px] text-slate-400 ml-1 mb-0.5">${senderName}</span>` : ''}
            <div class="${bubbleClass} px-3 py-2 rounded-2xl shadow-sm text-sm break-words relative group">
                ${msg.content}
                <span class="text-[9px] opacity-50 absolute bottom-0.5 ${isMe ? 'left-[-30px]' : 'right-[-30px]'} group-hover:opacity-100 transition-opacity w-[30px] text-center text-slate-400">
                    ${time}
                </span>
            </div>
        </div>
    </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    if (isRealtime) scrollToBottom();
}

function updateUnreadBadge() {
    const triggerBtns = document.querySelectorAll('button span.material-symbols-outlined');
    triggerBtns.forEach(span => {
        if (span.textContent.includes('chat')) {
            const btn = span.closest('button');
            if (btn) {
                // Check if badge exists
                let badge = btn.querySelector('.chat-badge');
                if (unreadCount > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'chat-badge absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm border border-white dark:border-surface-dark';
                        // Add relative to btn if needed, but usually btn has it or we add it
                        if (getComputedStyle(btn).position === 'static') btn.classList.add('relative');
                        btn.appendChild(badge);
                    }
                    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    badge.style.display = 'block';
                } else if (badge) {
                    badge.style.display = 'none';
                }
            }
        }
    });
}


function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
}
