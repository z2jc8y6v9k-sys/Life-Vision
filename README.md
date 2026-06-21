# My Life Vision App v11

Changes:
- Behavior goals no longer show project-style Status.
- For Behavior goals, Behavior Rating replaces Status:
  - Needs Improvement
  - Meets
  - Exceeds
- Project goals still show:
  - Status
  - Completion %
- Behavior goals no longer show a completion percentage.
- Strategic Brief logic treats:
  - Project Status separately from Behavior Rating.

No new Supabase SQL migration is needed if v10 migration was already run.

Deploy:
1. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
2. Wait for GitHub Pages to redeploy.
3. Hard refresh the site if the old version appears.
