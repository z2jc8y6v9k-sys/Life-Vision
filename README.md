# My Life Vision App v55 Schema Fix

Fixes:
- Removes the unsupported `friction` field from Supabase insert/update flows.
- Fixes the add-goal error: “Could not find the friction column…”
- Keeps Resources dashboard analysis intact.
- Keeps action metadata working without requiring a database migration.

No SQL changes required.
