-- =======================================
-- SCHEMA STRUCTURE: Users and Settings
-- =======================================

-- Create "users" table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    email TEXT UNIQUE,
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

-- =======================================
-- SCHEMA STRUCTURE: Game Rooms
-- =======================================

-- Create "rooms" table for persistent room state management
CREATE TABLE IF NOT EXISTS public.rooms (
    room_id UUID PRIMARY KEY,
    host_id UUID,
    players JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    max_players INTEGER DEFAULT 22,
    status TEXT DEFAULT 'waiting',
    created_at TIMESTAMPTZ DEFAULT now(),
    last_activity TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_host
        FOREIGN KEY (host_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
);

-- Create index for efficient room lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON public.rooms(last_activity);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
