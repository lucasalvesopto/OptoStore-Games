import { supabase } from './supabase-client.js';

export function loadSidebar() {
    // 1. Render Immediate from Cache
    const cachedProfile = sessionStorage.getItem('user_profile_cache');
    if (cachedProfile) {
        renderSidebar(JSON.parse(cachedProfile));
    }

    // 2. Fetch Latest (Async) & Update Cache
    fetchAndUpdateSidebar();

    // 3. Setup Mobile Menu
    setupMobileMenu();
}

function renderSidebar(profile) {
    if (!profile) return;

    // Sidebar Elements
    const sbName = document.getElementById('sidebar-clinic-name');
    const sbSocial = document.getElementById('sidebar-clinic-social');
    const sbLogo = document.getElementById('sidebar-clinic-logo');

    if (profile.clinics) {
        if (sbName) sbName.textContent = profile.clinics.name || 'Minha Clínica';
        if (sbSocial) sbSocial.textContent = profile.clinics.social_name || 'Optometria Especializada';

        // Clinic Logo
        if (sbLogo && profile.clinics.logo_url) {
            sbLogo.style.backgroundImage = `url("${profile.clinics.logo_url}")`;
        }
    }

    // Header User Info
    const hName = document.getElementById('header-user-name');
    const hRole = document.getElementById('header-user-role');

    if (hName) hName.textContent = profile.full_name || 'Usuário';

    // Format Role
    const roleMap = {
        'admin': 'Administrador',
        'optometrist': 'Optometrista',
        'secretary': 'Recepcionista'
    };
    const roleDisplay = roleMap[profile.role] || profile.role || 'Membro da Equipe';

    if (hRole) hRole.textContent = roleDisplay;
}

async function fetchAndUpdateSidebar() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: dbProfile } = await supabase
            .from('profiles')
            .select('full_name, role, clinics(name, social_name, logo_url)')
            .eq('id', session.user.id)
            .single();

        if (dbProfile) {
            sessionStorage.setItem('user_profile_cache', JSON.stringify(dbProfile));
            renderSidebar(dbProfile);
        }
    } catch (error) {
        console.error('Sidebar Update Error:', error);
    }
}

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('app-sidebar');

    // Create Overlay if not exists
    let overlay = document.getElementById('mobile-sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobile-sidebar-overlay';
        overlay.className = 'fixed inset-0 bg-black/50 z-30 hidden lg:hidden backdrop-blur-sm transition-opacity opacity-0';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            closeMobileMenu(sidebar, overlay);
        });
    }

    if (btn && sidebar) {
        // Clone to remove previous listeners if called multiple times (though logic prevents this usually)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileMenu(sidebar, overlay);
        });
    }
}

function toggleMobileMenu(sidebar, overlay) {
    const isClosed = sidebar.classList.contains('hidden') || sidebar.classList.contains('-translate-x-full');

    if (isClosed) {
        // Open
        sidebar.classList.remove('hidden', '-translate-x-full');
        sidebar.classList.add('translate-x-0', 'fixed', 'inset-y-0', 'left-0', 'z-40', 'h-full', 'shadow-2xl');
        // Ensure flex is active if it was hidden
        sidebar.classList.add('flex');

        overlay.classList.remove('hidden');
        // Small delay for opacity transition
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        closeMobileMenu(sidebar, overlay);
    }
}

function closeMobileMenu(sidebar, overlay) {
    // Close
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0', 'fixed', 'inset-y-0', 'left-0', 'z-40', 'h-full', 'shadow-2xl');

    // Reset to default desktop state classes if needed, but 'hidden md:flex' handles desktop visibility
    // We just need to make sure we don't break desktop view.
    // Ideally, we toggle a specific class for mobile open.

    // Simpler approach for Tailwind:
    // Sidebar default: "hidden md:flex"
    // Mobile Open: "flex fixed inset-y-0 left-0 z-40 w-64 translate-x-0"

    // Reverting to default state
    sidebar.classList.add('hidden');
    sidebar.classList.remove('fixed', 'inset-y-0', 'left-0', 'z-40', 'shadow-2xl');

    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}
