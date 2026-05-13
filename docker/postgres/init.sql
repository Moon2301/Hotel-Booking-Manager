-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- needed for exclusion constraint on daterange (double-booking guard)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- for text search in reviews
