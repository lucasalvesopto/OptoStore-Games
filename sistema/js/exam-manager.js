
import { supabase } from './supabase-client.js';

let currentUploadPatientId = null;

export async function setupExamsTab(patientId) {
    currentUploadPatientId = patientId;

    // Inject Upload Modal if records don't exist
    if (!document.getElementById('upload-modal')) {
        const modalHtml = `
        <div id="upload-modal" class="fixed inset-0 z-[60] hidden">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onclick="closeUploadModal()"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 bg-white dark:bg-surface-light rounded-2xl shadow-xl">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white">Anexar Exame</h3>
                    <button onclick="closeUploadModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <form id="upload-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Exame</label>
                        <input type="text" id="upload-exam-name" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" placeholder="Ex: Topografia Corneana" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Médico/Local</label>
                        <input type="text" id="upload-doctor-name" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" placeholder="Ex: Dr. Silva / Lab X">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Exame</label>
                        <input type="date" id="upload-exam-date" class="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-dark focus:ring-primary focus:border-primary" required>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Arquivo</label>
                        <input type="file" id="upload-file-input" class="w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary/10 file:text-primary
                            hover:file:bg-primary/20" required>
                    </div>

                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" onclick="closeUploadModal()" class="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-primary text-[#0d1b1b] font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 transition-all">Salvar Arquivo</button>
                    </div>
                </form>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Bind Form Submit
        const form = document.getElementById('upload-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await handleFormUpload();
        };
    }

    const dropzone = document.getElementById('tab-content-files')?.querySelector('.border-dashed');
    const uploadBtn = document.querySelector('#tab-content-files button');

    if (uploadBtn) {
        uploadBtn.onclick = openUploadModal; // Change to open modal
    }

    if (dropzone) {
        dropzone.onclick = openUploadModal;
        // Drag and drop might need adjustment to prepopulate file input in modal, 
        // but for now let's just open modal on click. 
        // Implementing drag-to-modal is complex, so let's direct user to modal first.
    }

    // Initial Load
    loadExamsList(patientId);
}

export function openUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Reset form
        document.getElementById('upload-form').reset();
        // Set today as default
        document.getElementById('upload-exam-date').valueAsDate = new Date();
    }
}

export function closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.classList.add('hidden');
}

// Global for onclick
window.closeUploadModal = closeUploadModal;
window.openUploadModal = openUploadModal;

async function handleFormUpload() {
    const fileInput = document.getElementById('upload-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const examName = document.getElementById('upload-exam-name').value;
    const doctorName = document.getElementById('upload-doctor-name').value;
    const examDate = document.getElementById('upload-exam-date').value;

    await uploadFile(file, currentUploadPatientId, { examName, doctorName, examDate });
    closeUploadModal();
}

async function uploadFile(file, patientId, metadata) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('clinical-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Create Record Reference
        const { data: { session } } = await supabase.auth.getSession();
        const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', session.user.id).single();

        const payload = {
            patient_id: patientId,
            clinic_id: profile.clinic_id,
            record_type: 'exam_file',
            data: {
                fileName: file.name,
                filePath: filePath,
                fileSize: file.size,
                fileType: file.type,
                // Extra Metadata
                examName: metadata.examName,
                doctorName: metadata.doctorName,
                examDate: metadata.examDate
            },
            // Use examDate as the record date? Or creation date? 
            // Usually record date is good for sorting by exam date.
            date: new Date(metadata.examDate).toISOString()
        };

        const { error: dbError } = await supabase.from('medical_records').insert([payload]);

        if (dbError) throw dbError;

        alert(`Arquivo salvo com sucesso!`);
        loadExamsList(patientId);

    } catch (err) {
        console.error('Erro no upload:', err);
        alert(`Erro ao enviar: ${err.message}`);
    }
}

async function loadExamsList(patientId) {
    const listEl = document.getElementById('files-list');
    if (!listEl) return;

    listEl.innerHTML = '<p class="col-span-2 text-center text-slate-500">Carregando exames...</p>';

    const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .eq('record_type', 'exam_file')
        .order('date', { ascending: false });

    if (error || !data || data.length === 0) {
        listEl.innerHTML = '<p class="col-span-2 text-center text-slate-500 py-4">Nenhum exame anexado.</p>';
        return;
    }

    listEl.innerHTML = data.map(record => {
        const fileData = record.data;
        // Use manually entered date or record date
        const date = new Date(record.date).toLocaleDateString();

        // Metadata display
        const displayTitle = fileData.examName || fileData.fileName;
        const subtitle = fileData.doctorName ? `Médico: ${fileData.doctorName}` : 'Sem médico informado';

        const { data: publicData } = supabase.storage.from('clinical-files').getPublicUrl(fileData.filePath);
        const icon = fileData.fileType && fileData.fileType.includes('pdf') ? 'picture_as_pdf' : 'image';

        return `
            <div class="flex items-center gap-3 p-3 bg-white dark:bg-black/20 rounded-lg border border-gray-100 dark:border-gray-700">
                <div class="bg-slate-100 dark:bg-slate-800 p-2 rounded text-slate-500">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h5 class="text-sm font-semibold truncate text-text-main dark:text-white" title="${displayTitle}">${displayTitle}</h5>
                    <p class="text-xs text-slate-500">${subtitle}</p>
                    <p class="text-xs text-slate-400">${date} • ${(fileData.fileSize / 1024).toFixed(0)}KB</p>
                </div>
                <div class="flex gap-1">
                    <a href="${publicData.publicUrl}" target="_blank" class="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Visualizar">
                        <span class="material-symbols-outlined text-[18px]">visibility</span>
                    </a>
                    <button onclick="deleteExam('${record.id}', '${fileData.filePath}')" class="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Excluir">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    window.deleteExam = deleteExam;
}

async function deleteExam(recordId, filePath) {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;
    try {
        await supabase.storage.from('clinical-files').remove([filePath]);
        await supabase.from('medical_records').delete().eq('id', recordId);

        // Refresh
        const params = new URLSearchParams(window.location.search);
        loadExamsList(params.get('id'));
    } catch (err) {
        alert("Erro ao excluir: " + err.message);
    }
}
