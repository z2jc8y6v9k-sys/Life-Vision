# My Life Vision App v16

Changes:
- Removed Vision Board from navigation.
- Dashboard is now action-oriented:
  - Priority Stack first
  - Today / This Week Actions second
  - Progress / recently updated / metrics after that
- Dedicated pages no longer start with the Life Portfolio hero:
  - Priority Stack opens directly at Priority Stack
  - Today / This Week opens directly at actions
  - Life Seasons opens directly at Life Seasons
  - Weekly Review opens directly at Weekly Review
  - Strategic Brief opens directly at Strategic Brief
  - Coach opens directly at Coach
- Keeps clickable Priority Stack and Today / This Week items.
- Keeps Supabase sync.

No new Supabase SQL migration is needed if v14 migration already ran.

Deploy:
1. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
2. Wait for GitHub Pages to redeploy.
3. Hard refresh the site if the old version appears.
