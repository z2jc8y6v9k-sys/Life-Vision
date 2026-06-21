# My Life Vision App v9

Changes:
- Removed Blockers from the goal card
- Removed Support Needed from the goal card
- Added Today / This Week
- Added Project vs Behavior type
- Progress slider changes meaning:
  - Project = Completion
  - Behavior = Consistency
- Added Behavior Rhythm / Standard field for behavior-based goals
- Keeps Resources instead of Money

Important:
Run `supabase_v9_migration.sql` once in Supabase SQL Editor before uploading v9 files.

Deploy:
1. Run the SQL migration in Supabase.
2. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
3. Do not upload the SQL file unless you want it in GitHub as documentation.
4. Wait for GitHub Pages to redeploy.
5. Hard refresh the site if the old version appears.
