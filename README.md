# Boys Prayer Board

A prayer board for the Wednesday Bible study group. Cloned from
[big-family-prayer-board](https://github.com/samsanwes/big-family-prayer-board)
and pointed at its own tables (`prayers_ws`, `admin_config_ws`) and RPCs
(`admin_*_ws`) in the same Supabase project.

- `index.html` — add a request, open / copy this week's prayer list.
- `manage.html` — reorder, edit, mark answered, remove, back up. No passcode.
- `board.js` — shared code for both pages.
- `supabase/boys_prayer_board_ws.sql` — original schema (tables + passcode RPCs).
- `supabase/open_manage_prayers_ws.sql` — the one-off SQL that opened edit /
  remove on `prayers_ws` when the passcode admin page was retired.

No build step. Deployed on Vercel as a static site.
