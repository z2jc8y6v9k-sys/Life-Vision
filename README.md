# My Life Vision App — Foundation Release

Foundation fixes:
- Removes “What deserves your attention right now?” from This Moment’s Decision.
- Removes the explanatory sentence under My Actions.
- Keeps Delegated and Scheduled items inside My Actions instead of separate sections.
- Keeps Waiting as its own section.
- Removes Resources from the Workplan table.
- Reorders Workplan columns to: Action, Priority, Time, Feeling, Owner, Unlock.
- Persists action metadata and Feeling into the goal record using the existing `behavior_standard` field as an internal JSON metadata store, with localStorage only as a cache.
- This means clearing browser cache should no longer wipe Time, Owner, Feeling, or action metadata once those values have synced to cloud.

No SQL changes required.
