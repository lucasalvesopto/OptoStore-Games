
import { supabase } from './supabase-client.js'

export async function handleLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        throw error
    }

    return data
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
