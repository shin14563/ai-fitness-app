'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?message=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        token: formData.get('token') as string,
        displayName: formData.get('displayName') as string,
    }

    // 1. Verify the invitation token
    const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', data.token)
        .single()

    if (inviteError || !invite) {
        redirect('/register?message=Invalid invitation token')
    }

    // 2. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                display_name: data.displayName,
            }
        }
    })

    if (authError) {
        redirect('/register?message=Could not register user: ' + authError.message)
    }

    // 3. Mark invitation as used
    // Disabled to allow infinite uses for QR code sharing
    /*
    if (authData.user) {
        await supabase
            .from('invitations')
            .update({ used: true })
            .eq('id', invite.id)
    }
    */

    revalidatePath('/', 'layout')
    redirect('/')
}
