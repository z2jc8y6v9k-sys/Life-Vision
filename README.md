# My Life Vision App v13

Implemented changes:
- Removed Objective from the visible goal card.
- Goal Title now carries the "what do I want?" function.
- Key Results remains as the success-measure field.
- Keeps:
  - Why This Matters
  - Key Results
  - People
  - Resources
  - Today / This Week
  - Next 30 Days
  - Next 12 Months
  - Life Season / Time Horizon
  - Project Status + Completion %
  - Behavior Rating for behavior goals

Database note:
- The old objective column remains in Supabase, but the app no longer shows it.
- No new Supabase SQL migration is needed.

Deploy:
1. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
2. Wait for GitHub Pages to redeploy.
3. Hard refresh the site if the old version appears.
