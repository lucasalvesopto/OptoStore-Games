import { supabase } from './supabase-client.js';
import { loadSidebar } from './sidebar-loader.js';
import { updateAppointmentStatus } from './agenda-manager.js';

export async function setupRecordPage(recordType) {
    // 1. Elements
    const btnSave = document.getElementById('btn-save-record');

    // 2. Get Params
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patient_id');
    const recordId = params.get('record_id'); // If editing/viewing existing

    if (!patientId && !recordId) {
        alert('Erro: Paciente não identificado.');
        window.history.back();
        return;
    }

    // 3. Load Patient Info
    if (patientId) {
        await loadPatientHeader(patientId);
    }

    // 4. Load Provider Info (Logged User)
    await loadProviderHeader();

    // 5. Load Existing Record (if any)
    if (recordId) {
        await loadRecord(recordId);
    }

    // 6. Setup Save
    if (btnSave) {
        btnSave.onclick = async () => {
            const data = collectFormData();
            await saveRecord(recordType, patientId, recordId, data);
        };
    }
}

async function loadPatientHeader(patientId) {
    try {
        const { data: p, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (error) throw error;
        if (!p) throw new Error("Paciente não encontrado");

        // Update DOM
        if (document.getElementById('p-name')) document.getElementById('p-name').textContent = p.full_name;
        if (document.getElementById('p-id')) document.getElementById('p-id').textContent = p.id.substring(0, 8); // Short ID

        // Age
        let age = '?';
        if (p.birth_date) {
            const today = new Date();
            const birthDate = new Date(p.birth_date);
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }
        if (document.getElementById('p-age')) document.getElementById('p-age').textContent = `${age} anos`;

        // Photo (Initials if no photo)
        const elPhoto = document.getElementById('p-photo');
        if (elPhoto) {
            // Placeholder logic
            elPhoto.style.backgroundImage = 'none';
            elPhoto.classList.add('flex', 'items-center', 'justify-center', 'bg-primary', 'text-white', 'text-2xl', 'font-bold');
            elPhoto.textContent = p.full_name ? p.full_name.substring(0, 2).toUpperCase() : '??';
        }

    } catch (err) {
        console.error("Erro ao carregar paciente", err);
        alert("Erro ao carregar dados do paciente.");
    }
}

async function loadProviderHeader() {
    await loadSidebar();
    return;
    /*
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
    
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
    
        if (profile) {
            const elName = document.getElementById('header-user-name');
            const elRole = document.getElementById('header-user-role');
            if (elName) elName.textContent = profile.full_name || 'Usuário';
            if (elRole) elRole.textContent = profile.role === 'admin' ? 'Administrador' : 'Optometrista';
    
            const elAvatar = document.getElementById('header-user-avatar');
            if (elAvatar) {
                // If avatar_url exists use it, else initials
                elAvatar.style.backgroundImage = 'none';
                elAvatar.style.backgroundColor = '#13ecec';
                elAvatar.classList.add('flex', 'items-center', 'justify-center', 'text-black', 'text-xs', 'font-bold');
                elAvatar.textContent = profile.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'EU';
            }
        }
    } catch (err) {
        console.error('Erro ao carregar provider', err);
    }
    */
}

export function collectFormData() {
    const data = {};
    const inputs = document.querySelectorAll('input, textarea, select');

    // Use index as fallback key to ensure ALL fields are captured even without IDs
    inputs.forEach((el, index) => {
        const key = el.id || el.name || `field_${index}`;

        if (el.type === 'checkbox') {
            data[key] = el.checked;
        } else if (el.type === 'radio') {
            if (el.checked) data[el.name || key] = el.value;
        } else {
            data[key] = el.value;
        }
    });
    return data;
}

export async function saveRecord(type, patientId, recordId, content) {
    try {
        // Auth check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Sessão expirada. Faça login novamente.');
            return;
        }

        // Get clinic_id from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single();

        if (!profile || !profile.clinic_id) {
            alert('Erro: Usuário sem clínica vinculada.');
            return;
        }

        const payload = {
            patient_id: patientId,
            clinic_id: profile.clinic_id,
            professional_id: session.user.id,
            record_type: type,
            data: content,
            date: new Date().toISOString()
        };

        if (recordId) {
            // Update
            const { error: err } = await supabase
                .from('medical_records')
                .update({ data: content })
                .eq('id', recordId);
            if (err) throw err;
        } else {
            // Insert
            const { error: err } = await supabase
                .from('medical_records')
                .insert([payload]);
            if (err) throw err;
        }

        // Check for Appointment to complete
        const params = new URLSearchParams(window.location.search);
        const apptId = params.get('appointment_id');
        if (apptId) {
            await updateAppointmentStatus(apptId, 'completed');
        }

        alert('Ficha salva com sucesso!');
        // Redirect back to patient chart
        window.location.href = `Pontuario Pacientes.html?id=${patientId}`;

    } catch (err) {
        console.error("Erro ao salvar", err);
        alert('Erro ao salvar ficha: ' + err.message);
    }
}

export async function loadRecord(recordId) {
    try {
        const { data, error } = await supabase
            .from('medical_records')
            .select('*')
            .eq('id', recordId)
            .single();

        if (error) throw error;
        if (!data) throw new Error("Ficha não encontrada");

        // Populate Form
        const content = data.data;
        if (!content) return;

        const inputs = document.querySelectorAll('input, textarea, select');

        inputs.forEach((el, index) => {
            const key = el.id || el.name || `field_${index}`;

            if (content.hasOwnProperty(key)) {
                if (el.type === 'checkbox') {
                    el.checked = content[key];
                } else if (el.type === 'radio') {
                    if (el.value === content[key]) el.checked = true;
                } else {
                    el.value = content[key];
                }
            }
            // Handle radio groups by name if stored that way
            else if (el.type === 'radio' && el.name && content[el.name]) {
                if (el.value === content[el.name]) el.checked = true;
            }
        });

    } catch (err) {
        console.error("Erro ao carregar ficha", err);
        alert('Erro ao carregar dados da ficha.');
    }
}
