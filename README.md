# Boys Prayer Board

A prayer board for the Wednesday Bible study group. Cloned from
[big-family-prayer-board](https://github.com/samsanwes/big-family-prayer-board)
and pointed at its own tables (`prayers_ws`, `admin_config_ws`) and RPCs
(`admin_*_ws`) in the same Supabase project.

- `index.html` — public page: add a request, view / copy this week's prayer list.
- `admin.html` — keeper admin, gated by a passcode (`/admin` on Vercel via `cleanUrls`).
- `supabase/boys_prayer_board_ws.sql` — run once in the Supabase SQL editor
  (set the passcode near the bottom first).

No build step. Deployed on Vercel as a static site.
