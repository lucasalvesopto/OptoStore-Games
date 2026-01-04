
import { supabase } from './supabase-client.js';
import { loadSidebar } from './sidebar-loader.js';

let currentClinicId = null;
let allPatients = [];

export async function setupAgendaPage() {
    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'Login - Pagina Inicial.html';
        return;
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*, clinics(name, social_name)')
        .eq('id', session.user.id)
        .single();

    if (profile) {
        currentClinicId = profile.clinic_id;
        currentUserRole = profile.role;
    }

    loadSidebar();

    injectAppointmentModal();
    loadAgenda();

    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new' || params.get('open_modal') === 'true') {
        openAppointmentModal();
    }
}



function injectAppointmentModal() {
    if (document.getElementById('appointment-modal')) return;

    const modalHtml = `
    <div id="appointment-modal" class="fixed inset-0 z-[60] hidden">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onclick="closeAppointmentModal()"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-6 bg-white dark:bg-surface-light rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">Novo Agendamento</h3>
                <button onclick="closeAppointmentModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <form id="appointment-form" class="space-y-4">
                <input type="hidden" id="appt-id">

                <!-- Searchable Patient Select -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Paciente</label>
                    <div class="relative">
                        <input type="text" id="appt-patient-search" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary pl-10" placeholder="Buscar paciente (Nome)..." required autocomplete="off">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
                        <input type="hidden" id="appt-patient-id" required>
                        
                        <div id="appt-patient-results" class="hidden absolute z-50 w-full mt-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        </div>
                    </div>
                </div>

                <!-- Professional Select -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profissional</label>
                    <select id="appt-professional" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" required>
                        <option value="">Selecione o Profissional</option>
                    </select>
                </div>

                <!-- Type Select -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Consulta</label>
                    <select id="appt-type" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" required>
                        <option value="pediatric">Pediátrico</option>
                        <option value="functional">Funcional</option>
                        <option value="neuro">Neuro/Comportamental</option>
                        <option value="visual">Processamento Visual</option>
                        <option value="trv">Terapia Visual (TRV)</option>
                        <option value="general">Geral / Retorno</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                        <input type="date" id="appt-date" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sala</label>
                        <div class="flex gap-2">
                             <select id="appt-room" class="flex-1 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary">
                                <option value="1">Sala 1</option>
                                <option value="2">Sala 2</option>
                                <option value="3">Sala 3</option>
                            </select>
                            <button type="button" onclick="promptNewRoom()" class="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-primary"><span class="material-symbols-outlined">add</span></button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Início</label>
                        <input type="time" id="appt-start" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Término</label>
                        <input type="time" id="appt-end" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" required>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" id="appt-price" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" placeholder="0.00">
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                    <textarea id="appt-notes" rows="3" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" placeholder="Detalhes adicionais..."></textarea>
                </div>

                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="closeAppointmentModal()" class="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-primary text-[#0d1b1b] font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 transition-all">Salvar Agendamento</button>
                </div>
            </form>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('appointment-form').onsubmit = async (e) => {
        e.preventDefault();
        await saveAppointment();
    };

    // SEARCH LOGIC
    const searchInput = document.getElementById('appt-patient-search');
    const resultsDiv = document.getElementById('appt-patient-results');

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) {
            resultsDiv.classList.add('hidden');
            return;
        }

        const filtered = allPatients.filter(p => p.full_name.toLowerCase().includes(term));

        if (filtered.length > 0) {
            resultsDiv.innerHTML = filtered.map(p => `
               <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                    onclick="selectPatient('${p.id}', '${p.full_name}')">
                   <p class="font-bold text-slate-900 dark:text-white">${p.full_name}</p>
               </div>
           `).join('');
            resultsDiv.classList.remove('hidden');
        } else {
            resultsDiv.innerHTML = '<div class="p-3 text-slate-500 text-sm">Nenhum paciente encontrado.</div>';
            resultsDiv.classList.remove('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.add('hidden');
        }
    });

    document.getElementById('appt-date').valueAsDate = new Date();
}

window.selectPatient = (id, name) => {
    document.getElementById('appt-patient-id').value = id;
    document.getElementById('appt-patient-search').value = name;
    document.getElementById('appt-patient-results').classList.add('hidden');
};

export async function openAppointmentModal(patientId = null, patientName = null) {
    const modal = document.getElementById('appointment-modal');
    if (!modal) {
        injectAppointmentModal();
    }
    const modalEl = document.getElementById('appointment-modal');
    modalEl.classList.remove('hidden');

    await loadFormMetrics();

    if (patientId) {
        document.getElementById('appt-patient-id').value = patientId;
        if (!patientName && allPatients.length > 0) {
            const p = allPatients.find(x => x.id === patientId);
            if (p) patientName = p.full_name;
        }
        document.getElementById('appt-patient-search').value = patientName || 'Paciente Selecionado';
    }
}

export function closeAppointmentModal() {
    const modal = document.getElementById('appointment-modal');
    if (modal) modal.classList.add('hidden');
}

window.openAppointmentModal = openAppointmentModal;
window.closeAppointmentModal = closeAppointmentModal;
window.promptNewRoom = () => {
    const newRoom = prompt("Digite o nome da nova sala:");
    if (newRoom) {
        const select = document.getElementById('appt-room');
        const option = document.createElement('option');
        option.value = newRoom;
        option.text = newRoom;
        select.add(option);
        select.value = newRoom;
    }
};

async function loadFormMetrics() {
    if (!currentClinicId) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', session.user.id).single();
        if (profile) currentClinicId = profile.clinic_id;
    }

    if (allPatients.length === 0) {
        const { data: patients } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('clinic_id', currentClinicId)
            .order('full_name');

        if (patients) allPatients = patients;
    }

    const proSelect = document.getElementById('appt-professional');
    if (proSelect.options.length <= 1) {
        const { data: pros } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('clinic_id', currentClinicId)
            .order('full_name');

        if (pros) {
            proSelect.innerHTML = '<option value="">Selecione o Profissional</option>' +
                pros.map(p => `<option value="${p.id}">${p.full_name}</option>`).join('');
        }
    }
}

async function saveAppointment() {
    const patientId = document.getElementById('appt-patient-id').value;
    const professionalId = document.getElementById('appt-professional').value;
    const type = document.getElementById('appt-type').value;
    const date = document.getElementById('appt-date').value;
    const room = document.getElementById('appt-room').value;
    const start = document.getElementById('appt-start').value;
    const end = document.getElementById('appt-end').value;
    const price = document.getElementById('appt-price').value;
    const notes = document.getElementById('appt-notes').value;

    if (!patientId) {
        alert('Selecione um paciente.');
        return;
    }
    if (!professionalId || !date || !start || !end) {
        alert('Preencha os campos obrigatórios.');
        return;
    }

    const payload = {
        clinic_id: currentClinicId,
        patient_id: patientId,
        professional_id: professionalId,
        type: type,
        date: date,
        start_time: start,
        end_time: end,
        room: room,
        price: price ? parseFloat(price) : null,
        notes: notes,
        status: 'scheduled'
    };

    try {
        const { error } = await supabase.from('appointments').insert([payload]);
        if (error) throw error;

        alert('Agendamento salvo com sucesso!');
        closeAppointmentModal();

        loadAgenda();
        if (window.refreshPatientAgenda) window.refreshPatientAgenda();

    } catch (err) {
        console.error(err);
        alert('Erro ao salvar agendamento: ' + err.message);
    }
}

// NEW: Global Status Updater
let currentUserRole = null;



export async function updateAppointmentStatus(apptId, newStatus) {
    if (!apptId) return;

    try {
        const { error } = await supabase
            .from('appointments')
            .update({ status: newStatus })
            .eq('id', apptId);

        if (error) {
            console.error('Erro ao atualizar status do agendamento:', error);
        } else {
            console.log(`Status do agendamento ${apptId} atualizado para ${newStatus}`);
        }
    } catch (err) {
        console.error('Erro status update:', err);
    }
}


// Expose functions globally for HTML filters
window.loadAgenda = loadAgenda;
window.clearFilters = () => {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-status').value = '';
    loadAgenda();
};

window.openStatusSelector = (id, currentStatus) => {
    const newStatus = prompt("Digite o novo status (scheduled, confirmed, in_progress, completed, cancelled, no_show):", currentStatus);
    if (newStatus && newStatus !== currentStatus) {
        updateAppointmentStatus(id, newStatus).then(() => loadAgenda());
    }
};

// Better UX: Status Modal
function injectStatusModal() {
    if (document.getElementById('status-modal')) return;
    const html = `
    <div id="status-modal" class="fixed inset-0 z-[70] hidden">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeStatusModal()"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white dark:bg-surface-light rounded-xl shadow-xl p-4">
            <h3 class="font-bold text-lg mb-4 text-slate-900 dark:text-white">Alterar Status</h3>
            <input type="hidden" id="status-appt-id">
            <div class="flex flex-col gap-2">
                <button onclick="setStatus('confirmed')" class="w-full text-left px-4 py-2 rounded-lg hover:bg-emerald-50 text-emerald-700 font-medium">Confirmado</button>
                <button onclick="setStatus('in_progress')" class="w-full text-left px-4 py-2 rounded-lg hover:bg-amber-50 text-amber-700 font-medium">Em Andamento</button>
                <button onclick="setStatus('completed')" class="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 text-blue-700 font-medium">Concluído</button>
                <button onclick="setStatus('cancelled')" class="w-full text-left px-4 py-2 rounded-lg hover:bg-rose-50 text-rose-700 font-medium">Cancelado</button>
                <button onclick="setStatus('no_show')" class="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-medium">Faltou</button>
                <button onclick="setStatus('scheduled')" class="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">Agendado (Reiniciar)</button>
            </div>
            <button onclick="closeStatusModal()" class="w-full mt-4 py-2 text-slate-400 hover:text-slate-600">Cancelar</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    window.closeStatusModal = () => document.getElementById('status-modal').classList.add('hidden');

    window.setStatus = async (status) => {
        const id = document.getElementById('status-appt-id').value;
        if (id) {
            await updateAppointmentStatus(id, status);
            loadAgenda();
            closeStatusModal();
        }
    };
}

async function loadAgenda() {
    injectStatusModal(); // Ensure modal exists

    const container = document.getElementById('appointments-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-slate-500 py-8">Carregando agendamentos...</p>';

    if (!currentClinicId) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: profile } = await supabase.from('profiles').select('clinic_id, role').eq('id', session.user.id).single();
        if (profile) {
            currentClinicId = profile.clinic_id;
            currentUserRole = profile.role;
        }
    }

    // Read Filters
    const filterDate = document.getElementById('filter-date')?.value;
    const filterStatus = document.getElementById('filter-status')?.value;

    let query = supabase
        .from('appointments')
        .select(`*, patients(full_name), profiles(full_name)`)
        .eq('clinic_id', currentClinicId);

    // Filter Logic
    if (filterDate) {
        // Specific Date
        query = query.eq('date', filterDate);
    } else {
        // Default: Show recent history + future (LAST 30 DAYS?) or just ALL Descending limit 50?
        // User asked "Most recent to oldest". Usually means pagination. I'll limit to 50 for performance.
        // And maybe filter out very old ones?
        // Let's just limit 50 ordered by date DESC.
        query = query.limit(50);
    }

    if (filterStatus) {
        query = query.eq('status', filterStatus);
    }

    // Sort: Recent to Oldest (DESC)
    // Primary: Date DESC. Secondary: Time DESC (late appointments first?) or ASC?
    // "Recent to Oldest":
    // 2024-01-03 -> 2024-01-02.
    // Inside 2024-01-03: 18:00 is more recent than 08:00? Yes.
    // So both DESC.
    query = query
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

    const { data: appts, error } = await query;

    if (error) {
        container.innerHTML = `<p class="text-center text-red-500">Erro: ${error.message}</p>`;
        return;
    }

    if (!appts || appts.length === 0) {
        container.innerHTML = `
            <div class="p-12 text-center bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800">
                 <p class="text-slate-500">Nenhum agendamento encontrado com os filtros atuais.</p>
                 <button onclick="openAppointmentModal()" class="text-primary hover:underline font-bold mt-2">Criar novo</button>
            </div>`;
        return;
    }

    container.innerHTML = appts.map(appt => {
        const dateStr = new Date(appt.date).toLocaleDateString();
        const startStr = appt.start_time.substring(0, 5);
        const endStr = appt.end_time.substring(0, 5);

        const typeLabel = {
            'pediatric': 'Pediátrico',
            'functional': 'Funcional',
            'neuro': 'Neuro/Comp.',
            'visual': 'Proc. Visual',
            'trv': 'TRV',
            'general': 'Geral'
        }[appt.type] || appt.type;

        // Translate Status
        const statusMap = {
            'scheduled': 'Agendado',
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado',
            'completed': 'Concluído',
            'no_show': 'Faltou',
            'in_progress': 'Em Andamento'
        };
        const statusLabel = statusMap[appt.status] || appt.status;

        // Color
        let statusColor = 'bg-slate-100 text-slate-800 border-slate-200';
        if (appt.status === 'confirmed') statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (appt.status === 'completed') statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
        if (appt.status === 'in_progress') statusColor = 'bg-amber-100 text-amber-800 border-amber-200';
        if (appt.status === 'cancelled' || appt.status === 'no_show') statusColor = 'bg-rose-100 text-rose-800 border-rose-200';

        // Admin Delete Button Check
        // Note: currentUserRole must be 'admin' to see the button.
        const canDelete = currentUserRole === 'admin' || currentUserRole === 'owner';

        // Status Click Handler
        const statusClick = `onclick="openStatusModal('${appt.id}')"`;

        return `
            <div class="flex items-center justify-between p-4 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all shadow-sm group">
                <div class="flex items-center gap-4">
                     <div class="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg p-2 min-w-[4rem]">
                        <span class="text-lg font-bold text-slate-900 dark:text-white">${startStr}</span>
                        <span class="text-xs text-slate-500">${endStr}</span>
                     </div>
                     <div>
                        <div class="flex items-center gap-2">
                             <a href="Pontuario Pacientes.html?id=${appt.patient_id}" class="text-lg font-bold text-slate-900 dark:text-white hover:text-primary transition-colors">${appt.patients?.full_name || 'Paciente'}</a>
                            <span class="text-xs text-slate-400">(${dateStr})</span>
                        </div>
                        <p class="text-sm text-slate-500">${typeLabel} • ${appt.room} • ${appt.profiles?.full_name || 'Profissional'}</p>
                        ${appt.price ? `<p class="text-xs text-emerald-600 font-bold">R$ ${appt.price}</p>` : ''}
                     </div>
                </div>
                <div class="flex items-center gap-3">
                     <button ${statusClick} class="px-3 py-1 rounded-full text-xs font-bold ${statusColor} border uppercase hover:brightness-95 transition-all cursor-pointer" title="Clique para alterar status">
                        ${statusLabel}
                     </button>
                     
                     ${canDelete ? `
                     <button onclick="deleteAppointment('${appt.id}')" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir Agendamento">
                        <span class="material-symbols-outlined">delete</span>
                     </button>` : ''}
                </div>
            </div>`;
    }).join('');
}

window.openStatusModal = (id) => {
    document.getElementById('status-appt-id').value = id;
    document.getElementById('status-modal').classList.remove('hidden');
}

window.deleteAppointment = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;
        loadAgenda(); // Reload list
    } catch (err) {
        console.error(err);
        alert('Erro ao excluir: ' + err.message);
    }
};

export async function loadPatientAgenda(patientId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p class="text-center text-slate-500">Carregando agenda...</p>';

    const { data: appts, error } = await supabase
        .from('appointments')
        .select(`*, profiles(full_name)`)
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
        .limit(10);

    if (error) {
        container.innerHTML = `<p class="text-red-500">Erro: ${error.message}</p>`;
        return;
    }

    if (!appts || appts.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-500 p-4 border border-dashed rounded-lg">Nenhum agendamento encontrado.</p>';
        return;
    }

    container.innerHTML = appts.map(appt => {
        const dateStr = new Date(appt.date).toLocaleDateString();
        const startStr = appt.start_time.substring(0, 5);
        const typeLabel = { 'pediatric': 'Pediátrico', 'functional': 'Funcional', 'neuro': 'Neuro/Comp.', 'visual': 'Proc. Visual', 'trv': 'TRV', 'general': 'Geral' }[appt.type] || appt.type;
        const statusMap = {
            'scheduled': 'Agendado',
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado',
            'completed': 'Concluído',
            'in_progress': 'Em Andamento',
            'no_show': 'Faltou'
        };
        const statusLabel = statusMap[appt.status] || appt.status;

        // Color Logic for Mini List
        let statusClass = 'bg-slate-100 text-slate-700';
        if (appt.status === 'completed') statusClass = 'bg-blue-100 text-blue-700';
        if (appt.status === 'in_progress') statusClass = 'bg-amber-100 text-amber-700';

        return `
            <div class="flex items-center justify-between p-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg">
                <div>
                    <h5 class="font-bold text-slate-900 dark:text-white">${dateStr} às ${startStr}</h5>
                    <p class="text-xs text-slate-500">${typeLabel} • ${appt.profiles?.full_name || 'Profissional'}</p>
                </div>
                <span class="text-xs font-bold uppercase ${statusClass} px-2 py-1 rounded">${statusLabel}</span>
            </div>
        `;
    }).join('');
}

window.refreshPatientAgenda = () => {
    // Handled in Pontuario context if needed
};
