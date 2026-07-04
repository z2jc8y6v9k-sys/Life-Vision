# My Life Vision App v56.7 Action Detail Persistence + Meaning/Feeling Layout

Changes:
- Fixes Today / This Week and Next 30 Days action detail persistence.
- Time and Owner values now save using both the action text and its row position, so unchanged actions keep their details after re-rendering.
- Completion still moves the action to Wins without wiping remaining action metadata.
- Why This Matters and Feeling This Will Provide When Completed are displayed side by side, like Wins and Lessons.
- Workplan / This Moment's Decision includes a Feeling column pulled from the goal's Feeling field.

No SQL changes required.
