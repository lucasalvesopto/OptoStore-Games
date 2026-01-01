
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const supabaseUrl = 'https://qiidwlygvvahinitndlx.supabase.co'
export const supabaseKey = 'sb_publishable_rr3W3GWc12Vc6Adm4vilJQ_sm8NqfR5' // Public Key

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to get current user profile with clinic_id
export async function getCurrentProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, clinics(*)')
        .eq('id', user.id)
        .single()

    if (error) console.error('Error fetching profile:', error)
    return profile
}
