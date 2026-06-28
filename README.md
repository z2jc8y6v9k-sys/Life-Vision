# My Life Vision App v43 Section Time + Auto Behavior Rating

Changes:
- Removes the top-level Time control from under Priority.
- Keeps Time inside the Resources section and sorts resource time low → high.
- Adds section-level time controls for Today / This Week and Next 30 Days.
- Today / This Week action view sorts by Priority, then Today / This Week time low → high.
- Behavior Rating is now automatic based on activity signals:
  - Needs Improvement: no meaningful action/results entered yet.
  - Meets: action, key result, Next 30, or win exists.
  - Exceeds: multiple wins or wins plus current/next actions.
- Inventory cards remain collapsed.

No SQL changes required. Section-level time estimates are stored in the existing goal metadata field.
