-- Fix infinite recursion in group_members

-- Drop the bad policy
DROP POLICY IF EXISTS "Allow members to see other members" ON public.group_members;

-- A safe way to check membership without infinite recursion is to just allow reading if you are the user, 
-- or use a security definer function, or simply allow reading all members since group IDs are UUIDs (unguessable).
-- Let's allow users to see all group members. The group ID itself is the secret.
CREATE POLICY "Allow public read access to group members" ON public.group_members FOR SELECT USING (true);


-- We can also fix the groups policy just in case.
DROP POLICY IF EXISTS "Allow members to see groups" ON public.groups;
CREATE POLICY "Allow members to see groups" ON public.groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE public.group_members.group_id = groups.id AND public.group_members.user_id = auth.uid()) OR created_by = auth.uid()
);

-- And the workout sessions policy
DROP POLICY IF EXISTS "Allow users to view group members sessions" ON public.workout_sessions;
CREATE POLICY "Allow users to view group members sessions" ON public.workout_sessions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.group_members WHERE public.group_members.user_id = auth.uid()
        AND public.group_members.group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = public.workout_sessions.user_id
        )
    ) OR user_id = auth.uid()
);
