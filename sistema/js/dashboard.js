
import { supabase, getCurrentProfile } from './supabase-client.js'

export async function initDashboard() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        window.location.href = 'Login - Pagina Inicial.html'
        return
    }

    const profile = await getCurrentProfile()
    if (profile) {
        updateUserProfile(profile)
        loadDashboardData(profile.clinic_id)
    }
    setActiveLink()
}

function setActiveLink() {
    // Get filename only, handle URL encoding if necessary
    const currentPath = window.location.pathname.split('/').pop() || 'Pagina - Dashboard.html';

    // Select all nav links in the sidebar
    const links = document.querySelectorAll('aside nav a');

    links.forEach(link => {
        const href = link.getAttribute('href');

        // Reset to default state
        // This is a simplified reset, ensuring we remove the "active" style classes
        link.classList.remove('bg-primary/10', 'text-slate-900', 'dark:text-white', 'group');
        link.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-800');

        const icon = link.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.classList.remove('text-primary-dark', 'dark:text-primary', 'fill-1');
        }

        // Apply active state if matches
        // encoding handling: decodeURI to match "Pagina%20-%20Dashboard.html" with "Pagina - Dashboard.html"
        if (decodeURI(currentPath) === href) {
            link.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-800');
            link.classList.add('bg-primary/10', 'text-slate-900', 'dark:text-white', 'group');

            if (icon) {
                icon.classList.add('text-primary-dark', 'dark:text-primary', 'fill-1');
            }
        }
    });
}

function updateUserProfile(profile) {
    const nameEl = document.getElementById('header-user-name')
    const roleEl = document.getElementById('header-user-role')

    if (nameEl) nameEl.textContent = profile.full_name || 'Usuário'
    if (roleEl) roleEl.textContent = profile.role || 'Membro'

    // Sidebar Update
    const sbName = document.getElementById('sidebar-clinic-name')
    const sbSocial = document.getElementById('sidebar-clinic-social')

    if (profile.clinics) {
        if (roleEl) roleEl.textContent = profile.clinics.name; // userRole displays Clinic Name usually
        if (sbName) sbName.textContent = profile.clinics.name;
        if (sbSocial) sbSocial.textContent = profile.clinics.social_name || 'Unidade Centro';
    }
}

async function loadDashboardData(clinicId) {
    // 1. Appointments Today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { count: appointmentsToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('date_time', today.toISOString())
        .lt('date_time', tomorrow.toISOString())

    const countPatientsEl = document.getElementById('count-patients')
    if (countPatientsEl) countPatientsEl.textContent = appointmentsToday || 0

    // 2. Revenue (Month)
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('clinic_id', clinicId)
        .gte('date', firstDay.toISOString())
        .eq('type', 'income')

    const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

    const countRevenueEl = document.getElementById('count-revenue')
    if (countRevenueEl) {
        countRevenueEl.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)
    }
}

initDashboard()
