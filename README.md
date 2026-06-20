# My Life Vision App v6

This version adds:
- Money renamed to Resources throughout the user interface
- Real OpenAI-powered AI Coach page
- "Review My Life" button
- OpenAI API key setup stored locally in your browser
- All v5 dashboards, scorecards, reviews, metrics, vision board, and Supabase cloud sync retained

Important:
- Your Life Vision data remains in Supabase.
- Your OpenAI API key is stored only in browser localStorage on the device where you enter it.
- For a production-grade version, the OpenAI call should be moved to a Supabase Edge Function so the key is never in the browser.

Deploy:
1. Upload/replace these GitHub files:
   - index.html
   - styles.css
   - app.js
   - README.md
2. You do not need to run a new SQL migration if v5 migration was already run.
3. Wait for GitHub Pages to redeploy.
4. Open the app, go to Coach, paste your OpenAI API key, and click Review My Life.
