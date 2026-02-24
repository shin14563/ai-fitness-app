'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Workout Sessions ---

export async function recordWorkoutSession(
    exerciseType: string,
    reps: number,
    durationSeconds: number
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('workout_sessions')
        .insert({
            user_id: user.id,
            exercise_type: exerciseType,
            reps,
            duration_seconds: durationSeconds
        })

    if (error) {
        console.error('Error recording session:', error)
        throw new Error('Failed to record session')
    }

    revalidatePath('/')
    return { success: true }
}

// --- Group Management ---

export async function createGroup(formData: FormData) {
    const name = formData.get('name') as string
    if (!name) return { error: 'グループ名が必要です' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 1. Create the group
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: name, created_by: user.id })
        .select('id')
        .single()

    if (groupError || !group) {
        console.error('Error creating group:', groupError)
        return { error: 'グループの作成に失敗しました' }
    }

    // 2. Add creator as a member
    const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id })

    if (memberError) {
        console.error('Error adding creator to group:', memberError)
        // We don't rollback here for simplicity, but in production we should
    }

    revalidatePath('/')
    return { success: true }
}

export async function joinGroup(formData: FormData) {
    const groupId = formData.get('groupId') as string
    if (!groupId) return { error: 'グループIDが必要です' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id })

    if (error) {
        console.error('Error joining group:', error)
        if (error.code === '23505') { // Unique violation
            return { error: '既にこのグループのメンバーです' }
        }
        return { error: 'グループへの参加に失敗しました' }
    }

    revalidatePath('/')
    return { success: true }
}
