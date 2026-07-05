# My Life Vision App v58 Action Object Persistence + Streamlined Workplan

Changes:
- Moves action metadata out of browser-only cache and into Supabase-backed goal metadata.
- Migrates existing local action metadata into cloud storage when available.
- Time, Owner, Feeling, and action metadata now survive cache clearing once saved.
- Keeps Today / This Week as the Workplan source of truth.
- Keeps Delegated underneath My Actions and Waiting as a separate section.
- Removes the Resources column from Workplan / This Moment's Decision.
- Reorders Workplan columns: Action, Priority, Time, Feeling, Owner, Unlock.
- Preserves Priority Stack cleanup and Inventory Goals section.

Note:
- No SQL changes required. v58 stores metadata in the existing `behavior_standard` goal field as structured JSON.
