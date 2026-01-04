import { supabase } from './supabase-client.js';
import { loadSidebar } from './sidebar-loader.js';
import { updateAppointmentStatus } from './agenda-manager.js';
import { ensureAuthenticated } from './auth.js';

export let currentPatient = null;

export async function setupRecordPage(recordType) {
    // 0. Auth Guard
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
        window.location.replace('Login - Pagina Inicial.html');
        return;
    }

    // 1. Elements
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

    // 6. Setup Save (Header and Float)
    const saveBtns = ['btn-save-record', 'btn-save-header', 'btn-save-float'];
    saveBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = async () => {
                const data = collectFormData();
                await saveRecord(recordType, patientId, recordId, data);
            };
        }
    });

    // 7. Setup Print
    const btnPrint = document.getElementById('btn-print-record');
    if (btnPrint) {
        btnPrint.onclick = async () => {
            const data = collectFormData();
            // Save without redirecting to dashboard
            const savedId = await saveRecord(recordType, patientId, recordId, data, false);
            if (savedId) {
                window.location.href = `Impressão.html?record_id=${savedId}&patient_id=${patientId}`;
            }
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

        currentPatient = p; // Assign global variable

        // Update DOM
        if (document.getElementById('p-name')) document.getElementById('p-name').textContent = p.full_name;

        // Age Calculation
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

        // Format Details: CPF • Idade (anos) • Sexo
        const cpf = p.cpf || 'CPF n/d';
        const rawGender = p.gender || 'Sexo n/d';
        const genderMap = { 'M': 'Masculino', 'F': 'Feminino' };
        const gender = genderMap[rawGender] || rawGender; // Map or use raw

        const detailsText = `${cpf} <span class="mx-2 text-primary">•</span> ${age} anos <span class="mx-2 text-primary">•</span> ${gender}`;

        if (document.getElementById('p-details')) {
            document.getElementById('p-details').innerHTML = detailsText;
        }

        // Format Since Date
        if (document.getElementById('p-since')) {
            const sinceDate = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '--/--/----';
            document.getElementById('p-since').textContent = `Paciente desde: ${sinceDate}`;
        }

        // Form Date (Initial Default)
        if (document.getElementById('record-date')) {
            const today = new Date().toLocaleDateString('pt-BR');
            document.getElementById('record-date').textContent = `Data: ${today}`;
        }

        // Photo (Initials if no photo)
        const elPhoto = document.getElementById('p-photo');
        if (elPhoto) {
            // Placeholder logic (simulated for now, replace with actual photo URL if available)
            elPhoto.style.backgroundImage = 'none';
            elPhoto.className = ''; // Reset classes
            elPhoto.classList.add('bg-primary/20', 'rounded-full', 'shadow-md', 'flex', 'items-center', 'justify-center', 'text-text-main', 'dark:text-white', 'text-2xl', 'font-bold', 'size-20', 'md:size-24');

            // If photo URL exists:
            // elPhoto.style.backgroundImage = `url(${p.photo_url})`;
            // elPhoto.classList.remove('flex', ...);
            // elPhoto.classList.add('bg-center', 'bg-cover');

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

    // --- Custom Logic: Snapshot Date, Age, and Full Gender ---
    if (currentPatient) {
        // 1. Date (Current save time)
        const recordDateObj = new Date();
        const recordDateStr = recordDateObj.toISOString();
        // data['record_date'] = recordDateStr; 

        // 2. Age (at current moment)
        if (currentPatient.birth_date) {
            const birthDate = new Date(currentPatient.birth_date);
            // Use current date for calculation
            let age = recordDateObj.getFullYear() - birthDate.getFullYear();
            const m = recordDateObj.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && recordDateObj.getDate() < birthDate.getDate())) {
                age--;
            }
            data['patient_age_snapshot'] = age;
        } else {
            data['patient_age_snapshot'] = '?';
        }

        // 3. Gender (Full String)
        const genderMap = { 'M': 'Masculino', 'F': 'Feminino' };
        // If gender is already full string, use it, else map it, else default
        let gender = currentPatient.gender || 'Não Informado';
        if (genderMap[gender]) gender = genderMap[gender];

        data['patient_gender_snapshot'] = gender;
    }

    return data;
}

export async function saveRecord(type, patientId, recordId, content, redirect = true) {
    try {
        // Auth check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Sessão expirada. Faça login novamente.');
            return null;
        }

        // Get clinic_id from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single();

        if (!profile || !profile.clinic_id) {
            alert('Erro: Usuário sem clínica vinculada.');
            return null;
        }

        const payload = {
            patient_id: patientId,
            clinic_id: profile.clinic_id,
            professional_id: session.user.id,
            record_type: type,
            data: content,
            date: new Date().toISOString()
        };

        let finalRecordId = recordId;

        if (recordId) {
            // Update
            const { error: err } = await supabase
                .from('medical_records')
                .update({ data: content })
                .eq('id', recordId);
            if (err) throw err;
        } else {
            // Insert
            const { data: inserted, error: err } = await supabase
                .from('medical_records')
                .insert([payload])
                .select()
                .single();
            if (err) throw err;
            if (inserted) finalRecordId = inserted.id;
        }

        // Check for Appointment to complete
        const params = new URLSearchParams(window.location.search);
        const apptId = params.get('appointment_id');
        if (apptId) {
            await updateAppointmentStatus(apptId, 'completed');
        }

        if (redirect) {
            alert('Ficha salva com sucesso!');
            // Redirect back to patient chart
            window.location.href = `Pontuario Pacientes.html?id=${patientId}`;
        }

        return finalRecordId;

    } catch (err) {
        console.error("Erro ao salvar", err);
        alert('Erro ao salvar ficha: ' + err.message);
        return null;
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

        // 1. Set Record Date in Header (Read-Only)
        if (document.getElementById('record-date') && data.date) {
            const recDate = new Date(data.date).toLocaleDateString('pt-BR');
            document.getElementById('record-date').textContent = `Data: ${recDate}`;
        }

        // 2. Update Header with Snapshots if available
        if (data.data) {
            const snapAge = data.data.patient_age_snapshot;
            const snapGender = data.data.patient_gender_snapshot;

            if (snapAge !== undefined || snapGender !== undefined) {
                const detailsEl = document.getElementById('p-details');
                if (detailsEl && currentPatient) {
                    const cpf = currentPatient.cpf || 'CPF n/d';
                    // Use snapshot or current
                    const age = snapAge !== undefined ? snapAge : '?';

                    const genderMap = { 'M': 'Masculino', 'F': 'Feminino' };
                    let gender = snapGender;
                    if (gender === undefined) {
                        const raw = currentPatient.gender || 'Sexo n/d';
                        gender = genderMap[raw] || raw;
                    }

                    detailsEl.innerHTML = `${cpf} <span class="mx-2 text-primary">•</span> ${age} anos <span class="mx-2 text-primary">•</span> ${gender}`;
                }
            }
        }

    } catch (err) {
        console.error("Erro ao carregar ficha", err);
        alert('Erro ao carregar dados da ficha.');
    }
}
