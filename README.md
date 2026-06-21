# My Life Vision App v12 Real

Implemented changes:
- Behavior goals now use the same planning structure as Projects:
  - Objective
  - Key Results
  - Why This Matters
  - People
  - Resources
  - Today / This Week
  - Next 30 Days
  - Next 12 Months
  - Life Season / Time Horizon

Removed from the UI:
- Behavior Standard
- How I'll Know I'm Living It
- Behavior Rhythm / Standard

Difference between types:
- Project goals show Status + Completion %.
- Behavior goals show Behavior Rating:
  - Needs Improvement
  - Meets
  - Exceeds

No new Supabase SQL migration is needed if v10 migration was already run.

Deploy:
1. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
2. Wait for GitHub Pages to redeploy.
3. Hard refresh the site if the old version appears.
