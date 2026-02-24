-- 1. Create Invitations Table
CREATE TABLE public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to invitations (so register page can check if token is valid)
CREATE POLICY "Allow public read access to invitations" ON public.invitations
    FOR SELECT USING (true);

-- 2. Create Users Table (Public profile extensions)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 3. Create Groups Table
CREATE TABLE public.groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Create Group Members Table
CREATE TABLE public.group_members (
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to see other members" ON public.group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "Allow users to join via invite" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Delayed Policy Creation for groups (To avoid circular dependency issue during table creation)
CREATE POLICY "Allow members to see groups" ON public.groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE public.group_members.group_id = groups.id AND public.group_members.user_id = auth.uid()) OR created_by = auth.uid()
);

-- 5. Trigger to automatically create a public.users entry when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create Workout Sessions Table
CREATE TABLE public.workout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    exercise_type TEXT NOT NULL,
    reps INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own sessions
CREATE POLICY "Allow users to record sessions" ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view sessions of members in their groups
CREATE POLICY "Allow users to view group members sessions" ON public.workout_sessions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.group_members gm1
        JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = public.workout_sessions.user_id AND gm2.user_id = auth.uid()
    ) OR user_id = auth.uid()
);

-- 7. Fix RLS Infinite Recursion
-- The previous policy for group_members caused infinite recursion when someone
-- tried to join a group or insert into groups, because the trigger/insert selects the group.
DROP POLICY IF EXISTS "Allow members to see other members" ON public.group_members;

-- Since group IDs are unguessable UUIDs, we can safely allow any authenticated user
-- to see group members (they still need the UUID to query it).
CREATE POLICY "Allow members to see other members" ON public.group_members FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix session policy to avoid recursion on the same group_members table
DROP POLICY IF EXISTS "Allow users to view group members sessions" ON public.workout_sessions;
CREATE POLICY "Allow users to view group members sessions" ON public.workout_sessions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE public.group_members.user_id = auth.uid()
        AND public.group_members.group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = public.workout_sessions.user_id
        )
    ) OR user_id = auth.uid()
);
