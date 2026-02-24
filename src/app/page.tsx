import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import WorkoutDashboard from '@/components/WorkoutDashboard'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile from public.users table
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Fetch user's groups
  const { data: userGroups } = await supabase
    .from('group_members')
    .select('groups(id, name)')
    .eq('user_id', user.id)

  // Exclude nulls safely
  const groups = (userGroups || [])
    .map(g => g.groups)
    .filter((g): g is NonNullable<typeof g> => g !== null)

  // Fetch recent squad activity (RLS automatically filters to just own + group members)
  const { data: squadSessions } = await supabase
    .from('workout_sessions')
    .select(`
      id,
      exercise_type,
      reps,
      duration_seconds,
      created_at,
      users (display_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="w-full max-w-7xl flex flex-col items-center gap-8 text-center mt-10 px-4">
      <div className="flex w-full justify-between items-center px-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          AI Fitness Squad
        </h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-400 text-sm">
            {profile?.display_name || user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button className="px-4 py-2 rounded-full bg-gray-800 hover:bg-gray-700 transition text-sm font-semibold">
              サインアウト
            </button>
          </form>
        </div>
      </div>

      <WorkoutDashboard
        userName={profile?.display_name || user.email || 'User'}
        groups={groups as any[]}
        feed={squadSessions as any[]}
      />
    </div>
  )
}
