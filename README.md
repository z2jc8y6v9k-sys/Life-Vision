# My Life Vision App v7

This version keeps v6 intact and adds only the two features requested:

1. Life Balance Score
   - Shows momentum across Relationships, Health, Adventure, Creativity, and Impact.
   - Based on average progress in each category.

2. Weekly Review
   - A dedicated weekly review page.
   - Saves to Supabase using the existing life_reviews table.

No new Supabase SQL migration is needed if v5 was already installed.

Deploy:
1. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
2. Wait for GitHub Pages to redeploy.
3. Hard refresh the site if the old version appears.
