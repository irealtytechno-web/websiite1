CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('vp','agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)