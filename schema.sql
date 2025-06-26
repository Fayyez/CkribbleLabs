-- =======================================
-- SCHEMA STRUCTURE: Users and Settings
-- =======================================

-- Create "users" table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create "user_settings" table
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY,
    default_room_settings JSONB,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);
