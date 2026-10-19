# My Life Vision V44 — Restored Cards with Focused Pages

This build restores the prior full-size navigation design while retaining the cleaner selected-page behavior.

## What changed

- Reversed the integrated-header navigation from V43.
- Restored the full-size white Dashboard and Workbook boxes beneath My Life Vision.
- Kept the bottom-right Dashboard, Workbook, divider, and + Capture controls.
- Clicking Dashboard or Workbook at the bottom reopens the two navigation boxes.
- Selecting any Dashboard section or Workbook category hides both boxes.
- After selection, the page shows My Life Vision, the selected section heading, and its content without the navigation boxes.

- Returned the Dashboard and Workbook card backgrounds to white.
- Renamed the Workplan control from the numeric Do Next label to + Focus.
- Updated the related star guidance and focused-view messages to use Focus consistently.
- Preserved the three-action Focus limit and existing filtering behavior.

- Restored the full-size Dashboard and Workbook navigation cards; they no longer collapse into a slim bar.
- Preserved all navigation choices in their prior visible positions.
- Kept the increased cream opacity over the opening artwork so the card background is less dominant.

- Replaced the spectrum-style Dashboard and Workbook backgrounds with a softened miniature of the actual opening artwork.
- Used the text-free version of the artwork so Pause does not appear inside the navigation cards.
- Added a light cream veil so the artwork remains visible while the buttons and text stay easy to read.
- Positioned Dashboard page headings at the same top and left spacing as the Workbook category headings.

- Increased the blue, green, merlot, and gold shading behind the Dashboard and Workbook navigation without making the cards dark or heavy.
- Changed the Dashboard page headings—including This Moment's Decisions, Priority Stack, Achievements, Resources, and the remaining Dashboard sections—to the same 28px font treatment used by Relationships, Health, and the other Workbook category headings.

- Preserved the approved Pause artwork on the initial opening screen.
- Added a matched alternate background with only the baked-in Pause lettering removed.
- Automatically switches to the text-free artwork after Create from Possibility is clicked.
- Prevented the Pause lettering from intersecting with the belief, boundaries, and gratitude questions.
- Changed the Dashboard and Workbook box backgrounds from white to a subtle blue, green, merlot, and gold blend matching the My Life Vision title.

- Removed the Relationships, Health, Adventure, Creativity, and Impact filter buttons from Workplan.
- Removed their category action counts.
- Removed the now-unnecessary divider lines from the Workplan toolbar.
- Left only + Action and Do Next so the controls stay focused on taking action.
- Preserved category colors on the action rows themselves.

- Increased separation between the Workplan Priority and Time column headings.
- Preserved the compact relationship between the other Workplan columns.
- Changed My Life Vision from black to a blue, green, merlot, and gold blend inspired by the Pause artwork.
- Clipped the color treatment strictly inside the title letters.

- Fixed the Dashboard More menu so its dropdown is no longer clipped by the navigation card.
- Raised the More menu above adjacent cards so every option remains clickable.
- Forced the bottom + Capture button to remain green in its normal, hover, and open states.

- Moved + Capture to the right of Workbook in the fixed navigation.
- Added the matching vertical gray divider between Workbook and + Capture.

- Added a persistent + Capture button throughout the signed-in app.
- Captured ideas and tasks save to the existing private cloud data store.
- Added a compact Capture inbox for reviewing saved items.
- Captures can be assigned to a goal and converted directly into Workplan actions.
- Captures can be deleted without affecting goals or actions.
- Changed both Workplan toolbar separators from horizontal lines to vertical gray lines.

- Removed the All button from the Workplan category controls.
- Clicking an already-selected category now returns the Workplan to all categories.
- Moved + Action into the same outlined toolbar as the category buttons.
- Moved the Do Next counter into that toolbar as an outlined button.
- Added short light-gray divider lines between categories, + Action, and Do Next.
- Removed the word Focus from the Do Next control.

- Made the opening artwork fit fully within computer and tablet screens.
- Unified the Workbook and Dashboard widths so neither can extend beyond the screen.
- Reduced oversized navigation spacing while preserving the existing visual design.
- Added dedicated laptop, tablet, phone, and small-phone layouts.
- Converted wide Workplan content into readable stacked cards before it can overflow.
- Kept the fixed Dashboard/Workbook controls inside the visible screen area.

- Made the Do Next count clickable: switch between all actions and only the selected Do Next actions.
- Made each Workplan action editable directly in its row; press Return or click away to save.
- Made each action's Time editable directly in the Workplan.
- Synced action-level Time, Owner, Notes, and Do Next selections through the existing private cloud data store.
- Automatically migrates action details already saved in the current browser into cloud sync.

- Added the approved dark blue-green, merlot, and emerging-gold opening artwork.
- Added the final upper-left light speckles radiating from the center.
- Removed the earlier experimental color overlay so the artwork renders with its intended colors and contrast.
- Removed the Overview introduction so the Dashboard begins with Priority Stack.
- Removed the Need time estimate summary from This Moment's Decision.
- Removed the explanatory paragraph above My Actions.
- Renamed the Workplan page to This Moment's Decisions.
- Renamed the decision snapshot to Summary and removed its prompt sentence.
- Moved the category filter bubbles directly above My Actions.
- Removed the Workplan metrics summary, including priority, duration, waiting, and estimated-time counts.
- Removed the separate My Actions heading.
- Added the current My Actions count directly to the This Moment's Decisions page heading.
- Simplified the Dashboard navigation to Workplan, Priority Stack, and Achievements.
- Moved Resources, Life Seasons, Weekly Review, Strategic Brief, and Coach into a More menu.
- After the opening reflections, the app now goes directly to This Moment's Decisions.
- Removed the redundant Owner column and Owner sorting control from Workplan tables.
- Reordered the Workplan columns to Action, Feeling, Priority, Time, and Resources.
- Tightened the spacing between Feeling and Priority.
- Removed the separate Sort By controls and added sort arrows to every table heading.
- Removed the Action column heading while preserving the action column itself.
- Reduced the vertical space above the action table.
- Removed the Resources column and its sorting behavior from Workplan.
- Expanded the action column while keeping Feeling, Priority, and Time.
- Added a Do Next star for personal actions, limited to three selections.
- Pinned Do Next actions to the top of the action list and added a 0–3 count beside the page title.
- Added an editable Notes column after Time, with notes saved to each individual action.
- Removed Overview from the Dashboard navigation and routing.
- Made the Dashboard button open Workplan / This Moment's Decisions directly.
- Swapped the main navigation panels so Dashboard appears before Workbook.
- Swapped the fixed bottom-right controls to Dashboard, then Workbook, while preserving their styling.
- Applied each Workbook category color to its Workplan action, Feeling, Priority, Time, and Notes text.
- Removed repeated inner page headings from Priority Stack, Achievements, Resources, Life Seasons, Weekly Review, Strategic Brief, and Coach.
- Kept the opening reflection flow, including Return to advance and Shift+Return for a new line.
- Preserved all existing workbook, dashboard, workplan, priority, review, and goal functionality.

## Files to upload

- `index.html`
- `app-v44.js`
- `styles-v44.css`
- `pause-background-v44.png`
- `pause-background-questions-v44.png`
- `README.md`

## GitHub installation

Upload all six files to the repository root, preserving the exact lowercase filenames. `index.html` already points to the V44 JavaScript and stylesheet filenames.
