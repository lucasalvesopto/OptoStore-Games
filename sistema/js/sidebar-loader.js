import { supabase } from './supabase-client.js';

export async function loadSidebar() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch Profile & Clinic
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, clinics(name, social_name, logo_url)')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            // 1. Sidebar Elements
            const sbName = document.getElementById('sidebar-clinic-name');
            const sbSocial = document.getElementById('sidebar-clinic-social');
            const sbLogo = document.getElementById('sidebar-clinic-logo');

            if (profile.clinics) {
                if (sbName) sbName.textContent = profile.clinics.name || 'Minha Clínica';
                if (sbSocial) sbSocial.textContent = profile.clinics.social_name || 'Optometria Especializada';

                // If logo_url exists, use it. Otherwise keep default or use placeholder.
                // Assuming logo_url column exists. If not, this might be undefined.
                if (sbLogo && profile.clinics.logo_url) {
                    sbLogo.style.backgroundImage = `url("${profile.clinics.logo_url}")`;
                }
            }

            // 2. Header User Info
            const hName = document.getElementById('header-user-name');
            const hRole = document.getElementById('header-user-role');

            if (hName) hName.textContent = profile.full_name || 'Usuário';
            if (hRole) hRole.textContent = profile.clinics?.name || 'Optometrista';
        }
    } catch (error) {
        console.error('Sidebar Load Error:', error);
    }
}
