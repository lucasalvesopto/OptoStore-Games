
import { supabase } from './supabase-client.js';

export function setupPrescriptionModal() {
    // Inject Modal HTML if not exists
    if (!document.getElementById('prescription-modal')) {
        const modalHtml = `
        <div id="prescription-modal" class="fixed inset-0 z-[60] hidden">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onclick="closePrescriptionModal()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl p-6 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6 no-print">
                    <h3 class="text-xl font-bold text-slate-900">Gerar Documento</h3>
                    <button onclick="closePrescriptionModal()" class="text-slate-400 hover:text-slate-600">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div id="prescription-content" class="bg-white p-8 border border-slate-200">
                    <!-- Header -->
                    <div class="flex justify-between items-start mb-8 border-b-2 border-slate-800 pb-4">
                        <div class="flex gap-4 items-center">
                            <div class="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-xs text-center font-bold">LOGO</div>
                            <div>
                                <h1 class="text-2xl font-bold uppercase tracking-wider" id="presc-clinic-name">Nome da Clínica</h1>
                                <p class="text-sm text-slate-600" id="presc-clinic-details">Endereço da Clínica • Tel: (00) 0000-0000</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <h2 class="text-xl font-bold text-slate-800" id="presc-title">RECEITUÁRIO</h2>
                            <p class="text-sm text-slate-500" id="presc-date">Data: ...</p>
                        </div>
                    </div>

                    <!-- Patient Info -->
                    <div class="mb-6 grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-xs font-bold uppercase text-slate-500">Paciente</span>
                            <p class="text-lg font-bold text-slate-900" id="presc-patient-name">Nome do Paciente</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold uppercase text-slate-500">Idade</span>
                            <p class="text-lg font-bold text-slate-900" id="presc-patient-age">-- anos</p>
                        </div>
                    </div>

                    <!-- Rx Table -->
                    <div id="rx-table-container" class="mb-6 border border-slate-800">
                        <table class="w-full text-center border-collapse">
                            <thead class="bg-slate-100 border-b border-slate-800 font-bold uppercase text-sm">
                                <tr>
                                    <th class="p-2 border-r border-slate-800 w-12">Olho</th>
                                    <th class="p-2 border-r border-slate-300">Esférico</th>
                                    <th class="p-2 border-r border-slate-300">Cilindro</th>
                                    <th class="p-2 border-r border-slate-300">Eixo</th>
                                    <th class="p-2 border-r border-slate-300">Prisma</th>
                                    <th class="p-2 border-r border-slate-300">Base</th>
                                    <th class="p-2">AV</th>
                                </tr>
                            </thead>
                            <tbody class="text-slate-900 font-mono text-lg">
                                <tr class="border-b border-slate-300">
                                    <td class="p-2 border-r border-slate-800 font-bold bg-slate-50">OD</td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent font-bold" id="rx-od-esf"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent font-bold" id="rx-od-cyl"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent font-bold" id="rx-od-axis"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent" id="rx-od-prism"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent" id="rx-od-base"></td>
                                    <td class="p-0"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent" id="rx-od-av"></td>
                                </tr>
                                <tr>
                                    <td class="p-2 border-r border-slate-800 font-bold bg-slate-50">OE</td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent font-bold" id="rx-oe-esf"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent font-bold" id="rx-oe-cyl"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent font-bold" id="rx-oe-axis"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent" id="rx-oe-prism"></td>
                                    <td class="p-0 border-r border-slate-300"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent" id="rx-oe-base"></td>
                                    <td class="p-0"><input class="w-full text-center p-2 border-none focus:ring-0 bg-transparent" id="rx-oe-av"></td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="flex border-t border-slate-800">
                            <div class="w-24 bg-slate-100 p-2 border-r border-slate-800 font-bold uppercase text-sm flex items-center justify-center">Adição</div>
                            <div class="flex-1 p-0"><input class="w-full p-2 border-none focus:ring-0 font-mono text-lg font-bold" id="rx-add" placeholder="+0.00"></div>
                        </div>
                    </div>

                    <!-- Specs -->
                    <div id="rx-specs-container" class="grid grid-cols-2 gap-8 mb-12">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo de Lente</label>
                            <select id="rx-lens-type" class="w-full border-slate-300 rounded p-1 text-sm bg-slate-50">
                                <option value="Visão Simples">Visão Simples</option>
                                <option value="Bifocal Ultex">Bifocal Ultex</option>
                                <option value="Bifocal Kriptok">Bifocal Kriptok</option>
                                <option value="Bifocal Panoptic">Bifocal Panoptic</option>
                                <option value="Multifocal">Multifocal</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tratamentos</label>
                            <select id="rx-treatment" class="w-full border-slate-300 rounded p-1 text-sm bg-slate-50">
                                <option value="Nenhum">Nenhum</option>
                                <option value="Antirreflexo">Antirreflexo</option>
                                <option value="Fotocr com Antirreflexo">Fotocromático c/ Antirreflexo</option>
                                <option value="Filtro Luz Azul">Filtro Luz Azul</option>
                            </select>
                        </div>
                    </div>

                    <!-- Obs -->
                    <div class="mb-12">
                        <label id="rx-obs-label" class="block text-xs font-bold uppercase text-slate-500 mb-1">Observações</label>
                        <textarea id="rx-obs" class="w-full border-slate-300 rounded p-2 text-sm h-20 resize-none" placeholder="Uso constante, etc..."></textarea>
                    </div>

                    <!-- Signature -->
                    <div class="flex justify-end mt-20">
                        <div class="text-center w-64 border-t border-slate-800 pt-2">
                             <p class="font-bold text-slate-900" id="presc-pro-name">Dr. Optometrista</p>
                             <p class="text-sm text-slate-600">Optometrista</p>
                             <p class="text-xs text-slate-400 mt-1" id="presc-clinic-city">Cidade - UF</p>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-3 mt-6 no-print">
                    <button onclick="saveAndPrintPrescription()" class="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg">
                        <span class="material-symbols-outlined">print</span>
                        Salvar e Imprimir
                    </button>
                </div>
            </div>
        </div>
        <style>
            @media print {
                body * {
                    visibility: hidden;
                }
                #prescription-modal, #prescription-modal * {
                    visibility: visible;
                }
                #prescription-modal {
                    position: absolute;
                    left: 0;
                    top: 0;
                    background: white;
                    width: 100%;
                    height: 100%;
                }
                .no-print {
                    display: none !important;
                }
                /* Hide scrollbars/inputs borders for printing */
                input, select, textarea {
                    border: none !important;
                    background: transparent !important;
                    appearance: none;
                }
            }
        </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

export async function openPrescriptionModal(patientData, formData, type) {
    const modal = document.getElementById('prescription-modal');
    modal.classList.remove('hidden');

    // 1. Fill Header
    document.getElementById('presc-patient-name').textContent = patientData.name;
    document.getElementById('presc-patient-age').textContent = patientData.age;
    document.getElementById('presc-date').textContent = `Data: ${new Date().toLocaleDateString()}`;

    // Fill Clinic & Pro (Fetch from Supabase or cached)
    // For now assuming loaded in DOM
    const user = document.getElementById('header-user-name')?.textContent || 'Optometrista';
    document.getElementById('presc-pro-name').textContent = user;

    // Elements
    const title = document.getElementById('presc-title');
    const tableContainer = document.getElementById('rx-table-container');
    const specsContainer = document.getElementById('rx-specs-container');
    const obsLabel = document.getElementById('rx-obs-label');
    const obs = document.getElementById('rx-obs');

    // Reset Defaults
    title.textContent = 'RECEITUÁRIO';
    tableContainer.style.display = 'block';
    specsContainer.style.display = 'grid';
    obsLabel.textContent = 'Observações';
    obs.style.height = '5rem'; // h-20

    // Clear Values
    document.querySelectorAll('#prescription-modal input').forEach(i => i.value = '');
    document.querySelectorAll('#prescription-modal textarea').forEach(i => i.value = '');
    document.querySelectorAll('#prescription-modal select').forEach(i => i.selectedIndex = 0);

    // 2. Auto-Fill Data based on Record Type
    if (type === 'pediatric') {
        mapField('retino_estatica_od_esf', 'rx-od-esf', formData);
        mapField('retino_estatica_od_cil', 'rx-od-cyl', formData);
        mapField('retino_estatica_od_eixo', 'rx-od-axis', formData);
        mapField('retino_estatica_od_av', 'rx-od-av', formData);

        mapField('retino_estatica_oe_esf', 'rx-oe-esf', formData);
        mapField('retino_estatica_oe_cil', 'rx-oe-cyl', formData);
        mapField('retino_estatica_oe_eixo', 'rx-oe-axis', formData);
        mapField('retino_estatica_oe_av', 'rx-oe-av', formData);

    } else if (type === 'functional') {
        mapField('rx_final_od_esf', 'rx-od-esf', formData);
        mapField('rx_final_od_cil', 'rx-od-cyl', formData);
        mapField('rx_final_od_eixo', 'rx-od-axis', formData);
        mapField('rx_final_od_av', 'rx-od-av', formData);

        mapField('rx_final_oe_esf', 'rx-oe-esf', formData);
        mapField('rx_final_oe_cil', 'rx-oe-cyl', formData);
        mapField('rx_final_oe_eixo', 'rx-oe-axis', formData);
        mapField('rx_final_oe_av', 'rx-oe-av', formData);
        mapField('rx_final_add', 'rx-add', formData);

    } else if (type === 'neuro') {
        if (formData['afinamento_od_esf']) document.getElementById('rx-od-esf').value = formData['afinamento_od_esf'];
        // Add other neuro mappings if IDs are known
    } else if (type === 'trv') {
        // TRV Mode: Hide Rx Table/Specs, Show Exercises List
        title.textContent = 'PROTOCOLOS DE TERAPIA';
        tableContainer.style.display = 'none';
        specsContainer.style.display = 'none';
        obsLabel.textContent = 'Exercícios Prescritos';
        obs.style.height = '400px';

        // Build Exercise Text
        let text = "";

        function appendPhase(title, clinic, home) {
            if (clinic || home) {
                text += `${title}:\n`;
                if (clinic) text += `  • Clínica: ${clinic}\n`;
                if (home) text += `  • Casa: ${home}\n`;
                text += `\n`;
            }
        }

        appendPhase('Fase Monocular', formData['trv_mono_clinic'], formData['trv_mono_home']);
        appendPhase('Fase Biocular', formData['trv_bio_clinic'], formData['trv_bio_home']);
        appendPhase('Fase Binocular', formData['trv_bino_clinic'], formData['trv_bino_home']);

        if (!text) text = "Nenhum exercício registrado.";

        obs.value = text;
    }
}

function mapField(sourceId, targetId, formData) {
    if (formData[sourceId]) {
        document.getElementById(targetId).value = formData[sourceId];
    }
}

async function savePrescription() {
    // Collect Data from Prescription Modal Inputs
    const data = {
        od: {
            esf: document.getElementById('rx-od-esf').value,
            cyl: document.getElementById('rx-od-cyl').value,
            axis: document.getElementById('rx-od-axis').value,
            prism: document.getElementById('rx-od-prism').value,
            base: document.getElementById('rx-od-base').value,
            av: document.getElementById('rx-od-av').value,
        },
        oe: {
            esf: document.getElementById('rx-oe-esf').value,
            cyl: document.getElementById('rx-oe-cyl').value,
            axis: document.getElementById('rx-oe-axis').value,
            prism: document.getElementById('rx-oe-prism').value,
            base: document.getElementById('rx-oe-base').value,
            av: document.getElementById('rx-oe-av').value,
        },
        add: document.getElementById('rx-add').value,
        lensType: document.getElementById('rx-lens-type').value,
        treatment: document.getElementById('rx-treatment').value,
        obs: document.getElementById('rx-obs').value
    };

    // Prepare Payload
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patient_id');

    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', session.user.id).single();

    const payload = {
        patient_id: patientId,
        clinic_id: profile.clinic_id,
        professional_id: session.user.id,
        record_type: 'prescription',
        data: data,
        date: new Date().toISOString()
    };

    const { error } = await supabase.from('medical_records').insert([payload]);
    if (error) {
        alert('Erro ao salvar no histórico: ' + error.message);
    } else {
        alert('Prescrição salva com sucesso!');
    }
}

export async function loadPrescriptionsList(patientId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p class="text-slate-500 text-center p-4">Carregando prescrições...</p>';

    const { data: records, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .eq('record_type', 'prescription')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p class="text-red-500 text-center">Erro ao carregar: ${error.message}</p>`;
        return;
    }

    if (!records || records.length === 0) {
        container.innerHTML = '<p class="text-slate-500 p-8 text-center border border-dashed rounded-lg">Nenhuma prescrição encontrada.</p>';
        return;
    }

    container.innerHTML = '';

    records.forEach(record => {
        const date = new Date(record.created_at).toLocaleDateString('pt-BR');

        const isRx = record.data.od?.esf || record.data.oe?.esf || record.data.od?.cyl;
        const title = isRx ? 'Receituário Óptico' : 'Prescrição / TRV';

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-4 bg-white dark:bg-surface-light border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-shadow';
        item.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="size-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <span class="material-symbols-outlined">description</span>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-slate-100">${title}</h4>
                    <p class="text-xs text-slate-500">${date}</p>
                </div>
            </div>
            <button class="btn-view-presc px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" data-id="${record.id}">
                Visualizar/Imprimir
            </button>
        `;

        item.querySelector('.btn-view-presc').onclick = () => {
            // Fetch patient name/age again or pass it
            const pName = document.getElementById('p-name')?.textContent || 'Paciente';
            const pAge = document.getElementById('p-age')?.textContent || '?';
            openSavedPrescription({ name: pName, age: pAge }, record);
        };

        container.appendChild(item);
    });
}

export function openSavedPrescription(patientData, record) {
    const data = record.data;
    setupPrescriptionModal(); // Ensure modal exists

    const modal = document.getElementById('prescription-modal');
    modal.classList.remove('hidden');

    // Headers
    document.getElementById('presc-patient-name').textContent = patientData.name;
    document.getElementById('presc-patient-age').textContent = patientData.age;
    document.getElementById('presc-date').textContent = `Data: ${new Date(record.created_at).toLocaleDateString()}`;
    const user = document.getElementById('header-user-name')?.textContent || 'Optometrista';
    document.getElementById('presc-pro-name').textContent = user;

    // Determine Type by Data Content
    // If OD/OE are filled, it's Rx. If not, check Obs.
    const isRx = data.od?.esf || data.oe?.esf || data.od?.cyl;

    const title = document.getElementById('presc-title');
    const tableContainer = document.getElementById('rx-table-container');
    const specsContainer = document.getElementById('rx-specs-container');
    const obsLabel = document.getElementById('rx-obs-label');
    const obs = document.getElementById('rx-obs');

    if (isRx) {
        title.textContent = 'RECEITUÁRIO';
        tableContainer.style.display = 'block';
        specsContainer.style.display = 'grid';
        obsLabel.textContent = 'Observações';
        obs.style.height = '5rem';

        // Fill Fields
        document.getElementById('rx-od-esf').value = data.od?.esf || '';
        document.getElementById('rx-od-cyl').value = data.od?.cyl || '';
        document.getElementById('rx-od-axis').value = data.od?.axis || '';
        document.getElementById('rx-od-prism').value = data.od?.prism || '';
        document.getElementById('rx-od-base').value = data.od?.base || '';
        document.getElementById('rx-od-av').value = data.od?.av || '';

        document.getElementById('rx-oe-esf').value = data.oe?.esf || '';
        document.getElementById('rx-oe-cyl').value = data.oe?.cyl || '';
        document.getElementById('rx-oe-axis').value = data.oe?.axis || '';
        document.getElementById('rx-oe-prism').value = data.oe?.prism || '';
        document.getElementById('rx-oe-base').value = data.oe?.base || '';
        document.getElementById('rx-oe-av').value = data.oe?.av || '';

        document.getElementById('rx-add').value = data.add || '';
        document.getElementById('rx-lens-type').value = data.lensType || 'Visão Simples';
        document.getElementById('rx-treatment').value = data.treatment || 'Nenhum';

    } else {
        // Assume TRV or other text-based
        title.textContent = 'PROTOCOLOS DE TERAPIA'; // Or safe generic
        tableContainer.style.display = 'none';
        specsContainer.style.display = 'none';
        obsLabel.textContent = 'Exercícios Prescritos';
        obs.style.height = '400px';
    }

    document.getElementById('rx-obs').value = data.obs || '';
}

// Global Exports
export function closePrescriptionModal() {
    const modal = document.getElementById('prescription-modal');
    if (modal) modal.classList.add('hidden');
}

export async function saveAndPrintPrescription() {
    await savePrescription();
    window.print();
}

// Make functions available globally for onclick events in injected HTML
window.closePrescriptionModal = closePrescriptionModal;
window.saveAndPrintPrescription = saveAndPrintPrescription;
