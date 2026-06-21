# My Life Vision App v17

Changes:
- Adds per-goal Wins and Lessons.
- Wins and Lessons live inside a collapsible Reflection drawer on each goal card so the card does not get too long.
- Weekly Review automatically pulls together all goal-level Wins and Lessons.
- Keeps v16 changes:
  - Action-oriented Dashboard
  - Priority Stack
  - Today / This Week Actions
  - Life Seasons
  - Resource Profile
  - Click-through goal navigation
  - Vision Board removed

Important:
Run `supabase_v17_migration.sql` once in Supabase SQL Editor before uploading v17 files.

Deploy:
1. Run the v17 SQL migration.
2. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
3. Do not upload the SQL file unless you want it as documentation.
4. Wait for GitHub Pages to redeploy.
5. Hard refresh the site if the old version appears.
