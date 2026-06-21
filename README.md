# My Life Vision App v15 Launch

Changes:
- Priority Stack items are clickable.
- Today / This Week Actions items are clickable.
- Clicking either jumps to the full goal card.
- The goal briefly highlights after the jump.
- Sidebar navigation now scrolls to the top of the selected section.

Keeps:
- Today / This Week Actions consolidated view
- Priority Stack
- Life Seasons
- Resource Profile
- Project vs Behavior
- Supabase sync

No new Supabase SQL migration is needed if v14 migration already ran.

Deploy:
1. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
2. Wait for GitHub Pages to redeploy.
3. Hard refresh the site if the old version appears.
