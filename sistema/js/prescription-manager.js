/* Obsolete file - Logic removed via clean up request */

export function setupPrescriptionModal() {
    console.warn('prescription-manager.js is obsolete. setupPrescriptionModal called.');
}

export async function openPrescriptionModal() {
    console.warn('prescription-manager.js is obsolete. openPrescriptionModal called.');
}

export async function loadPrescriptionsList(patientId, containerId) {
    console.warn('prescription-manager.js is obsolete. loadPrescriptionsList called.');
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<p class="text-slate-400 text-sm italic p-4">Módulo de Prescrições desativado (Obsoleto).</p>';
    }
}

export function openSavedPrescription() {
    console.warn('prescription-manager.js is obsolete. openSavedPrescription called.');
}

export function closePrescriptionModal() { }
export async function saveAndPrintPrescription() { }

// Global stubs
window.closePrescriptionModal = closePrescriptionModal;
window.saveAndPrintPrescription = saveAndPrintPrescription;
