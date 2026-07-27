# 🌆 My Chicago Summer — Travel Journal

A self-hosted, static travel-journal site: an interactive Chicago map of every
street you've walked, every place you've visited, and everywhere you still want
to go — each with a full Notion-style **Scouting Report → Post Analysis** entry.
Built to run in VS Code and deploy free on GitHub Pages. No build step, no backend.

---

## 1) Is this the correct file layout?

Yes — this is exactly right:

```
chicago-summer-journal/
├── index.html            ← the page
├── css/
│   └── style.css         ← all styling (Chicago flag palette, skyline, stars)
├── js/
│   └── app.js            ← map, auto-fill, editing, storage, export
├── data/
│   ├── places.json       ← every place + its journal entry  (the heart of it)
│   ├── streets.geojson   ← your walked streets (you refresh this)
│   └── strides.json      ← your headline stats (miles, streets, CityStrides URL)
├── images/               ← drop your photos here (referenced from places.json)
│   └── README.md
├── tools/
│   └── gpx_to_geojson.py ← merges a folder of GPX files into streets.geojson
├── .nojekyll             ← tells GitHub Pages to serve the folders as-is
└── README.md             ← this file
```

Keep that structure. The only files you'll routinely touch are inside `data/`
and `images/` — and even those you can now manage from inside the site itself
(see §5).

---

## 2) Your walking data — already loaded ✅

**Your 20 GPX files are already converted and on the map.** 126.0 miles across
20 routes, from Hyde Park up to the Baháʼí Temple in Wilmette. Hover any purple
line on the map and it names the walk.

### Why you couldn't find the export button
You weren't missing anything:

- **CityStrides has no map-data export at all.** Its LifeMap only renders inside
  their own site — there's no "download my streets" button at any tier. Use it
  for the *scoreboard* (streets completed), not the map lines.
- **Strava's GPX export exists only on the desktop website, never in the app.**
  That's almost certainly what happened. The mobile app has no export option
  whatsoever — it's a long-standing, deliberate limitation.

### Getting more walks in later
**Bulk (recommended):** strava.com in a browser → profile photo → **Settings** →
scroll to **My Account** → **Download or Delete Your Account** → **Request Your
Archive**. You'll get an email with a ZIP; inside is an `activities/` folder.

**Single walk:** strava.com in a browser → open the activity → **⋯** menu →
**Export GPX**.

Then run the included converter:

```bash
python3 tools/gpx_to_geojson.py ~/Downloads/activities data/streets.geojson
```

It recursively finds every `.gpx` and `.gpx.gz`, simplifies each track with
Ramer–Douglas–Peucker (~2 m precision — visually identical, 94% smaller),
preserves each walk's name for map tooltips, and skips GPS-less activities.
Your 187,957 raw points became 10,339 at 234 KB, so the map stays instant.

Want different fidelity? Pass a tolerance:
```bash
python3 tools/gpx_to_geojson.py <folder> data/streets.geojson 0.00001   # finer
python3 tools/gpx_to_geojson.py <folder> data/streets.geojson 0.0001    # smaller
```

`milesWalked` and `routes` in `data/strides.json` are auto-computed from the
GPX. Only `streetsCompleted` / `totalStreets` need to be typed in from your
CityStrides Chicago page.

## 3) How to run it, and push to your GitHub repo

Your repo: **https://github.com/YoungCoderPro/CHI-SUMMER**

### Run locally (VS Code)
This site loads JSON with `fetch()`, so you must serve it over `http://`, not
by double-clicking `index.html` (that uses `file://` and `fetch` will fail).

- **Easiest:** install the **Live Server** extension in VS Code → right-click
  `index.html` → **Open with Live Server**. Done.
- **Or terminal:** from inside the folder, run
  `python3 -m http.server 8000` and open `http://localhost:8000`.

### First-time push to GitHub
From inside the `chicago-summer-journal` folder:

```bash
git init
git add .
git commit -m "Chicago summer journal"
git branch -M main
git remote add origin https://github.com/YoungCoderPro/CHI-SUMMER.git
git push -u origin main
```

> If the repo already has commits and git refuses the push, run
> `git pull origin main --allow-unrelated-histories` once, resolve any
> conflicts, then `git push`.

### Turn on GitHub Pages
1. On GitHub: **Settings** → **Pages**.
2. **Source:** *Deploy from a branch*. **Branch:** `main`, **folder:** `/root`.
3. Save. Your site goes live at
   **https://youngcoderpro.github.io/CHI-SUMMER/** in a minute or two.

The `.nojekyll` file is already included so Pages serves the folders correctly.

### Every update after that
```bash
git add .
git commit -m "add National Museum of Puerto Rican Arts + July photos"
git push
```
Pages redeploys automatically.

---

## 4) The Chicago design

- **Flag stripe** across the very top and a four-**six-pointed-star** motif
  (the Chicago flag's stars) in the eyebrow, footer, favorites, and rating rows.
- **Skyline silhouette** band under the masthead and above the footer —
  a stylized Chicago skyline (Willis Tower's twin antennas, the tapered
  Hancock/875 profile, Aon, a Trump-style stepped tower, and mid-rises).
- **Palette** pulled from the flag and the city: flag blue `#41B6E6`,
  flag red `#C60C30`, deep **lake navy** structure, warm **sand** paper
  background, CityStrides **purple** for the walked streets.
- Display type **Fraunces**, body **Space Grotesk**.

All of it lives in `css/style.css` under `:root` — change a couple of variables
and the whole site reskins.

---

## 5) Adding a place — auto-filled, editable, and saved

Click **“Add a place”** (top-right of the map). Type a name and hit **Look up** —
the site fetches the facts for you:

- **What's auto-filled from the web** (objective stuff):
  - **Address, neighborhood, latitude/longitude, category** — from
    OpenStreetMap's free Nominatim geocoder.
  - **A description** for the *“Why”* — from the Wikipedia summary API
    (and a photo, if one exists).
  - **Transportation + a transit plan** — computed from the distance between
    your home base (Presidential Towers) and the place, using your own rule:
    ≤55 min → *Walking*; a bit farther → *Divvy*; beyond that → *L / CTA*.
  - A sensible **budget** guess (parks/beaches free, museums `$$`, etc.).

- **What you write yourself** (subjective stuff): the personal parts of the
  Game Plan and Post Analysis — best time to go, what you're looking forward to,
  and everything under 📊 Post Analysis after you actually visit. The lookup
  can't invent your plans, so those start blank and editable.

Every field is editable in the form before you save. So your example works
exactly as you wanted: type **“National Museum of Puerto Rican Arts”**, hit
Look up, and it fills in the address (3015 W Division), neighborhood (Humboldt
Park), category (**Museum** → red pin), coordinates, a description, and a Divvy/L
transit plan. Tweak anything, hit **Save**, and it drops onto the map as a
red (Museum) pin instantly.

### Pins are color-coded by category
Museum = red · Scenic = lake blue · Sports = marigold · Beach = teal ·
Music = purple · Theatre = magenta · University = green.
Visited pins are solid with a ✓; want-to-go pins are dashed/lighter;
favorites carry the Chicago star. The legend under the map spells it out.

### Editing & status
Click any pin or card to open its entry. **Edit** turns every field into an
input; **Save changes** stores it. Quick buttons let you flip
visited↔want-to-go, toggle favorite, or remove a place.

### Making saves permanent — two options

Because a GitHub Pages site is static (there's no server sitting behind it to
write files), there are two ways to make an addition stick:

**Option A — Connect GitHub once, then every save is permanent automatically. (Recommended)**

Click **“⚙ Connect GitHub”** under the map. This is a one-time, two-minute setup:

1. On GitHub: **Settings** (top-right avatar menu) → **Developer settings**
   (bottom of left sidebar) → **Personal access tokens** → **Fine-grained tokens**
   → **Generate new token**.
2. **Repository access:** choose *Only select repositories* → pick
   **CHI-SUMMER**. (This token can't touch anything else on your GitHub account.)
3. **Permissions → Repository permissions → Contents:** set to **Read and write**.
4. Click **Generate token**, copy it (starts with `github_pat_…`).
5. Back on the site: paste your GitHub username, `CHI-SUMMER` as the repo,
   `main` as the branch, and the token. Click **Test connection** — it pushes
   a real test commit so you know it's working — then **Save**.

From then on, every time you **add a place, edit an entry, toggle
visited/favorite, or delete something**, the site automatically commits the
updated `data/places.json` straight to your GitHub repo in the background —
you'll see a toast confirm "✓ Saved permanently to GitHub." Because GitHub
Pages rebuilds from the repo automatically, your live site updates within
about a minute of every change. No export, no manual file replace, no `git push`.

Example, exactly as you described it: type **“Baha'i House of Worship”** in
Add a place, hit Look up (it fills in Wilmette address, Scenic category,
coordinates, a description, and an L/Metra transit plan since it's ~13 miles
out), tweak anything, hit **Save**. It appears on the map immediately *and* is
permanently committed to `CHI-SUMMER` on GitHub within a few seconds — refresh
the page, reopen it on your phone, ask a friend to load the site: it's there
for everyone, for good.

Your token is stored only in this browser's `localStorage` and is sent only to
`api.github.com` — never to any third party. If you ever want to revoke it,
delete it from GitHub's token settings page and click **Disconnect** on the site.

**Option B — Manual export (fallback, no token needed)**
If you'd rather not create a token, saves still work — they're kept in this
browser only. Click **“⬇ Export data”** any time to download a fresh
`places.json` with everything (baseline + your additions), drop it into
`data/`, and commit/push yourself (§3). This is the only option if you're
using the site on a computer where you don't want to store any credentials.

> Heads-up either way: the auto-fill Look-up calls free public APIs
> (OpenStreetMap + Wikipedia), so you need to be **online** when you use it.
> If a lookup misses (rare, obscure spots), just type the fields in by hand —
> the map only needs a latitude and longitude to place the pin.

---

## Notes on your data

- Seeded with **70 places** straight from your Notion export, plus a few you
  told me you'd visited (Chinatown, IIT, Old Town Art Festival).
- I kept your Notion statuses **exactly as they were** — so places you've
  actually been to but that still say *want-to-go* in Notion (Lincoln Park Zoo,
  The 606, Chicago History Museum, etc.) will show as want-to-go. Open each one
  and hit **“Mark visited”** — two seconds each now.
- Your Notion had the **Ohio Street Beach** and **31st Street Beach** *Location*
  fields swapped; I set each pin to its correctly-named coordinates.
- **Ed Paschke Art Center**'s listed address (420 W Randolph) is actually the
  Loop, but the real museum is at 5415 W Higgins — I used the real location.
  Fix any of these in two clicks via the site's edit panel.


---

## 6) What's on the site now

### 119 places, pre-loaded
Every place you listed is in the database with a researched description,
address, neighborhood, category, price tier, coordinates, and **opening hours**
— 103 visited, 16 still on the want-to-go list.

### 14 categories (restructured)
The old five-category system couldn't carry a list this varied, so it's now:

| | Category | | Category |
|---|---|---|---|
| 🏛 | Landmark | 🎓 | University |
| 🖼 | Museum | 🕊 | Sacred Space |
| 🍽 | Food & Drink | 🗺 | Neighborhood |
| 🍸 | Rooftop & Bar | 🎨 | Public Art |
| 🌳 | Park & Garden | 🎡 | Attraction |
| 🏖 | Beach & Lakefront | 🎭 | Stage & Screen |
| 🏟 | Sports | 🎵 | Music & Festival |

Map pins are colored by category, solid for visited and dashed for want-to-go,
with the Chicago star on favorites. Filter chips above the map let you isolate
any single category.

### "What should I do?" — the recommendation engine
This is the part that solves your Jane Addams problem. Every place carries a
full seven-day hours table, so the site can reason about time:

- **⏳ Running out of days** — ranks your want-to-go list by how few days remain
  where the place is *actually open* before you leave. Jane Addams Hull-House
  correctly shows **5 days**, not 7, because it's closed Sundays and Mondays.
- **🟢 Open right now** — live, checked against the real clock, refreshed every
  minute. Flags "Closes in 47 min" so you don't get burned.
- **💙 Free & open today** — the no-excuses list.
- **🚶 Walkable today** — everything open right now within 2.2 miles of
  Presidential Towers, sorted by distance with walk times.

Set your departure in `js/app.js`:
```js
const DEPARTURE = "2026-08-02";   // or null to hide the countdown
```
The countdown bar shows days remaining and how many places are still pending.
Every card and pin also shows a live open/closed dot, and each place's detail
panel has the full week's hours with today's row highlighted in red.

### Summer progress bar
A stacked bar showing how much of your list is done, segmented by category and
color-coded, so you can see at a glance that you're heavy on Food & Drink and
light on, say, Sacred Spaces.

### Adding places is now nearly zero-effort
Type a name → **Look up** → the site fills in address, neighborhood, category,
coordinates, description, photo, price tier, transit plan from your home base,
**and a full week of guessed hours** based on the category. It guesses
everything and tells you plainly that it's guessing — you correct what's wrong
and hit Save. If GitHub is connected, that's permanent immediately.

> **On accuracy:** I filled in hours and prices for all 119 places from
> knowledge, not by calling each one. They're right often enough to be useful
> for planning and wrong often enough that you should verify before crossing the
> city. The site says this out loud under the recommendations, and every field
> is two clicks from editable.
