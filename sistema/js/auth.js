
import { supabase } from './supabase-client.js'

export async function handleLogin(email, password, rememberMe = false) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) throw error;

    // Session Persistence Logic
    if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
        localStorage.removeItem('session_only');
    } else {
        // Session Only: We mark it in sessionStorage (survives reload, dies on close)
        // And we ensure we don't look like a remembered user
        localStorage.removeItem('remember_me');
        sessionStorage.setItem('active_session', 'true');
    }

    return data
}

// Function to be called on protected pages
export async function ensureAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return false; // No Supabase session
    }

    // Check Persistence Policy
    const isRemembered = localStorage.getItem('remember_me');
    const isActiveSession = sessionStorage.getItem('active_session');

    // If user is NOT remembered AND has NO active session flag (browser was closed), force logout
    // Note: sessionStorage survives page reloads/restores but dies on browser close (usually).
    if (!isRemembered && !isActiveSession) {
        await handleLogout();
        return false;
    }

    // Mark session as active (for reloads)
    if (!isActiveSession) sessionStorage.setItem('active_session', 'true');

    return true;
}

export async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);

    // Clear local storage items we might have set
    sessionStorage.clear();
    localStorage.clear(); // Careful if we store other things, but for auth cleanlyness this is good

    // Redirect happens in the calling code or link default, 
    // but better to enforce here or return success
    return true;
}

export async function handleSignUp(email, password, clinicName, fullName) {
    // 1. Sign Up User
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    })
    if (authError) throw authError

    const user = authData.user
    if (!user) throw new Error("Erro ao criar usuário.")

    // 2. Create Clinic
    // Note: In a real app, this should be transactional or handled via triggers to avoid orphans.
    const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert([{ name: clinicName }])
        .select()
        .single()

    if (clinicError) throw clinicError

    // 3. Create Profile linked to Clinic
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: user.id,
            clinic_id: clinicData.id,
            full_name: fullName,
            email: email,
            role: 'admin'
        }])

    if (profileError) throw profileError

    return { user, clinic: clinicData }
}
