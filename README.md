# Whereabouts

The dashboard of the activity monitoring system — a private almanac of
comings & goings, live at [dash.maddox-duke.com](https://dash.maddox-duke.com).
Reads the event log from [activity-api](https://github.com/MaddoxDuke/activity-api).

- `npm start` — dev server on :4200
- `npx ng test --watch=false` — unit tests
- `npm run deploy` — build + rsync to the VPS
- append `?demo=1` to browse seeded specimen data without a key

See `CLAUDE.md` for architecture and design-language conventions.
