import { supabase } from './supabase-client.js';
import { loadSidebar } from './sidebar-loader.js';

export async function initDashboard() {
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login - Pagina Inicial.html';
        return;
    }

    // 2. Load Initial Data
    await updateDashboard();
    await loadFinancialPerformance();
    await loadAgendaPreview();

    // 3. User Info & Sidebar
    loadSidebar();

    // 4. Search Redirect
    const searchInput = document.getElementById('header-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const term = searchInput.value;
                if (term) window.location.href = `Pagina - Pacientes.html?search=${encodeURIComponent(term)}`;
            }
        });
    }
}

// Ensure global scope for onchange
window.updateDashboard = async () => {
    const filter = document.getElementById('date-filter').value;
    const { start, end, label } = getDateRange(filter);

    // Update Date Header if needed
    // document.querySelector('h1 + p span').textContent = label; 

    // Fetch Metrics
    await loadMetrics(start, end, filter);
};

function getDateRange(filter) {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';

    if (filter === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        label = 'Hoje';
    } else if (filter === 'yesterday') {
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        label = 'Ontem';
    } else if (filter === 'last7') {
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        label = 'Últimos 7 dias';
    } else if (filter === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        label = 'Este Mês';
    }

    return { start: start.toISOString(), end: end.toISOString(), label };
}

async function loadMetrics(start, end, filter) {
    // 1. Patients (New)
    const { count: newPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end);

    document.getElementById('count-patients').textContent = newPatients || 0;
    document.getElementById('info-patients').textContent = `Novos cadastros`;

    // 2. Revenue (Transactions + Paid Appointments)
    // Fetch payments
    const { data: appts } = await supabase
        .from('appointments')
        .select('price, payment_status')
        .gte('date', start.split('T')[0])
        .lte('date', end.split('T')[0])
        .eq('payment_status', 'paid');

    // Fetch transactions
    const { data: trans } = await supabase
        .from('transactions')
        .select('amount, type')
        .gte('date', start.split('T')[0])
        .lte('date', end.split('T')[0]);

    let totalRevenue = 0;
    if (appts) totalRevenue += appts.reduce((sum, a) => sum + (a.price || 0), 0);
    if (trans) {
        trans.forEach(t => {
            if (t.type === 'income') totalRevenue += t.amount;
            else totalRevenue -= t.amount;
        });
    }

    document.getElementById('count-revenue').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue);
    document.getElementById('info-revenue').textContent = 'Receita Líquida';

    // 3. Exams/Reports
    const { count: exams } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true })
        .gte('date', start)
        .lte('date', end);

    document.getElementById('count-exams').textContent = exams || 0;
    document.getElementById('info-exams').textContent = 'Fichas Criadas';

    // 4. No-Show Rate
    const { data: allAppts } = await supabase
        .from('appointments')
        .select('status')
        .gte('date', start.split('T')[0])
        .lte('date', end.split('T')[0]);

    if (allAppts && allAppts.length > 0) {
        const noShows = allAppts.filter(a => a.status === 'no_show').length;
        const rate = (noShows / allAppts.length) * 100;
        document.getElementById('count-noshow').textContent = `${rate.toFixed(1)}%`;
        document.getElementById('info-noshow').textContent = `${noShows} não compareceram`;
    } else {
        document.getElementById('count-noshow').textContent = '0%';
        document.getElementById('info-noshow').textContent = 'Sem agendamentos';
    }
}

async function loadAgendaPreview() {
    const list = document.getElementById('dashboard-agenda-list'); // Need to add ID to HTML
    if (!list) return;

    list.innerHTML = '<p class="text-slate-500 text-center py-4">Carregando...</p>';

    const today = new Date().toISOString().split('T')[0];
    const { data: appts } = await supabase
        .from('appointments')
        .select('*, patients(full_name)')
        .gte('date', today)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

    if (!appts || appts.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-center py-4">Sem agendamentos próximos.</p>`;
        return;
    }

    list.innerHTML = appts.map(a => {
        const time = a.start_time.substring(0, 5);
        const date = new Date(a.date).toLocaleDateString('pt-BR');
        const statusColors = {
            'scheduled': 'bg-blue-100 text-blue-700',
            'confirmed': 'bg-emerald-100 text-emerald-700',
            'in_progress': 'bg-amber-100 text-amber-700'
        };
        const statusLabel = {
            'scheduled': 'Agendado',
            'confirmed': 'Confirmado',
            'in_progress': 'Em Andamento'
        };

        return `
        <div class="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div class="flex flex-col items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-w-[60px]">
                <span class="text-xs font-bold text-slate-500">${date.substring(0, 5)}</span>
                <span class="text-lg font-bold text-primary-dark">${time}</span>
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-slate-800 dark:text-white text-sm">${a.patients?.full_name || 'Paciente'}</h4>
                <p class="text-xs text-slate-500">${a.type}</p>
            </div>
            <span class="text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[a.status] || 'bg-gray-100 text-gray-500'}">
                ${statusLabel[a.status] || a.status}
            </span>
        </div>`;
    }).join('');
}

async function loadFinancialPerformance() {
    // 1. Get last 6 months buckets
    const today = new Date();
    const buckets = [];
    // Start from 5 months ago
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).substring(0, 3);
        const start = d.toISOString().split('T')[0];

        // End is First day of next month
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const end = nextMonth.toISOString().split('T')[0];

        buckets.push({ month: monthName, start, end, revenue: 0, isCurrent: i === 0 });
    }

    // 2. Fetch Data
    const rangeStart = buckets[0].start;
    const rangeEnd = buckets[buckets.length - 1].end;

    // Fetch Transactions (Income/Expense)
    const { data: trans } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', rangeStart)
        .lt('date', rangeEnd);

    // Fetch Paid Appointments
    const { data: appts } = await supabase
        .from('appointments')
        .select('date, price')
        .gte('date', rangeStart)
        .lt('date', rangeEnd)
        .eq('payment_status', 'paid');

    // 3. Aggregate
    const items = [...(trans || []), ...(appts || [])];

    items.forEach(item => {
        // Determine amount (+/-)
        let val = 0;
        if (item.price) val = item.price; // appointment
        else if (item.type === 'income') val = item.amount;
        else val = -item.amount;

        const dDate = item.date;
        const bucket = buckets.find(b => dDate >= b.start && dDate < b.end);
        if (bucket) bucket.revenue += val;
    });

    // 4. Render
    const container = document.getElementById('financial-chart-bars');
    if (!container) return; // Must assume HTML has this ID

    // Find Max for scaling (at least 1 to avoid /0)
    // Also handle if all revenue is 0 or negative
    const maxRev = Math.max(...buckets.map(b => b.revenue), 0) || 1000;

    container.innerHTML = buckets.map(b => {
        const heightPct = Math.max(0, Math.min(100, (b.revenue / maxRev) * 100)); // Cap at 100

        const isCurrent = b.isCurrent;
        const barColor = isCurrent ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/50';
        const labelVal = b.revenue >= 1000 ? `R$${(b.revenue / 1000).toFixed(1)}k` : `R$${b.revenue.toFixed(0)}`;

        return `
        <div class="flex flex-col items-center gap-2 flex-1 group cursor-pointer relative h-full justify-end">
            <div class="relative w-full flex items-end justify-center gap-1 h-full">
                <div class="w-3 sm:w-6 ${barColor} rounded-t-sm transition-all relative" style="height: ${heightPct}%">
                     ${isCurrent ? `
                     <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 shadow-lg">
                        ${labelVal}
                     </div>` : `
                     <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 transition-opacity pointer-events-none">
                        ${labelVal}
                     </div>
                     `}
                </div>
            </div>
            <span class="text-xs ${isCurrent ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400 font-medium'} uppercase">${b.month}</span>
        </div>
        `;
    }).join('');

}

async function loadUserInfo(userId) {
    const { data } = await supabase.from('profiles').select('full_name, clinics(name)').eq('id', userId).single();
    if (data) {
        if (document.getElementById('header-user-name')) document.getElementById('header-user-name').textContent = data.full_name;
        if (document.getElementById('header-user-role')) document.getElementById('header-user-role').textContent = data.clinics?.name || 'Optometrista';
    }
}
