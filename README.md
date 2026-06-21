# My Life Vision App v10

Changes:
- Project goals keep the percentage slider as Completion.
- Behavior goals no longer use percentage.
- Behavior goals now use:
  - Needs Improvement
  - Meets
  - Exceeds
- Keeps Project vs Behavior type from v9.
- Keeps Today / This Week.
- Keeps Resources instead of Money.
- Keeps Blockers and Support Needed removed.

Important:
Run `supabase_v10_migration.sql` once in Supabase SQL Editor before uploading v10 files.

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
