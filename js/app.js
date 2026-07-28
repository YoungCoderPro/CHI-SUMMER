/* ============================================================
   MY CHICAGO SUMMER — app.js
   • MapLibre GL JS map (OpenFreeMap tiles, real 3D buildings), pins by CATEGORY
   • Hover = photo card, click = full Notion-style journal entry
   • Add-a-place: auto-fills facts from the web (OSM + Wikipedia
     + OSRM walking time from home), you edit, saved to browser
   • Export merged places.json to commit back to the repo
   No build step. Works in VS Code Live Server + GitHub Pages.
   ============================================================ */

   const HOME = { lat: 41.8827, lng: -87.6412, name: "Presidential Towers" };
   const CHICAGO_CENTER = [41.8895, -87.6300];
   /* Set your departure date — powers the "days left" countdown + urgency flags.
      Format: YYYY-MM-DD. Set to null to hide the countdown entirely. */
   const DEPARTURE = "2026-08-02";
   const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];
   const DAY_LABEL = { sun:"Sun", mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat" };
   const LS_KEY = "chicago-summer-overrides-v1";   // browser-stored edits/additions
   const GH_KEY = "chicago-summer-github-config-v1"; // { owner, repo, branch, token }
   
   /* category → color + icon (kept in sync with CSS variables) */
   const CATS = {
     "Landmark":          { color: "#C60C30", icon: "🏛" },
     "Museum":            { color: "#8B2FC9", icon: "🖼" },
     "Food & Drink":      { color: "#F5871F", icon: "🍽" },
     "Rooftop & Bar":     { color: "#D6336C", icon: "🍸" },
     "Park & Garden":     { color: "#2F9E44", icon: "🌳" },
     "Beach & Lakefront": { color: "#12A594", icon: "🏖" },
     "Sports":            { color: "#1864AB", icon: "🏟" },
     "Stage & Screen":    { color: "#E8590C", icon: "🎭" },
     "Music & Festival":  { color: "#6B4EE6", icon: "🎵" },
     "University":        { color: "#0B7285", icon: "🎓" },
     "Sacred Space":      { color: "#7048E8", icon: "🕊" },
     "Neighborhood":      { color: "#A61E4D", icon: "🗺" },
     "Public Art":        { color: "#F59F00", icon: "🎨" },
     "Attraction":        { color: "#1CA3DE", icon: "🎡" },
   };
   const catIcon = (t) => (CATS[t] || { icon: "📍" }).icon;
   const catColor = (t) => (CATS[t] || { color: "#6A7B85" }).color;
   
   const state = {
     base: [],        // from data/places.json (committed baseline)
     places: [],      // base + browser overrides, merged
     strides: null,
     filter: "all",
     catFilter: null,
     recMode: "urgent",
     strideCount: 0,
     search: "",
     markers: new Map(),
     map: null,
     editing: null,   // id being edited in the panel
   };
   
   const $  = (s) => document.querySelector(s);
   const $$ = (s) => [...document.querySelectorAll(s)];
   const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"']/g,
     (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])));
   
   /* ---------- six-point Chicago star (SVG) ---------- */
   function starSVG(size = 13, fill = "#C60C30") {
     return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="pin-fav-star" aria-hidden="true">
       <path fill="${fill}" d="M12 0l2.9 8.3L24 8.3l-6.8 5.1L20 22 12 17 4 22l2.8-8.6L0 8.3l9.1 0z"/></svg>`;
   }
   function starRow(n) { return Array.from({length:n},()=>starSVG(12)).join(""); }
   
   /* ---------- skyline silhouette (SVG) ---------- */
   /* A stylized Chicago skyline: Willis (twin antennas), Hancock/875 (2 antennas,
      tapered), Aon (flat tall), Trump (stepped), plus mid-rises. */
   function skylineSVG() {
     return `<svg viewBox="0 0 1200 74" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
       <g fill="currentColor">
         <rect x="0" y="54" width="1200" height="20"/>
         <!-- left cluster -->
         <rect x="20" y="40" width="26" height="34"/>
         <rect x="50" y="30" width="20" height="44"/>
         <rect x="74" y="46" width="30" height="28"/>
         <!-- Willis Tower w/ twin antennas -->
         <rect x="120" y="16" width="46" height="58"/>
         <rect x="130" y="26" width="12" height="48"/><rect x="146" y="20" width="12" height="54"/>
         <rect x="128" y="4" width="3" height="14"/><rect x="152" y="2" width="3" height="16"/>
         <!-- mid -->
         <rect x="180" y="42" width="24" height="32"/>
         <rect x="208" y="34" width="30" height="40"/>
         <polygon points="242,74 242,40 257,28 272,40 272,74"/>
         <rect x="286" y="46" width="26" height="28"/>
         <!-- Aon (tall flat) -->
         <rect x="330" y="12" width="34" height="62"/>
         <rect x="374" y="40" width="26" height="34"/>
         <!-- Trump-style stepped -->
         <rect x="410" y="34" width="40" height="40"/>
         <rect x="416" y="24" width="28" height="12"/>
         <rect x="424" y="14" width="12" height="12"/>
         <rect x="428" y="2" width="3" height="12"/>
         <rect x="462" y="44" width="30" height="30"/>
         <rect x="498" y="36" width="22" height="38"/>
         <!-- Hancock / 875 (tapered w/ 2 antennas) -->
         <polygon points="536,74 542,20 566,20 572,74"/>
         <rect x="548" y="6" width="3" height="14"/><rect x="558" y="8" width="3" height="12"/>
         <rect x="590" y="46" width="28" height="28"/>
         <rect x="622" y="38" width="24" height="36"/>
         <rect x="650" y="30" width="34" height="44"/>
         <rect x="690" y="48" width="22" height="26"/>
         <rect x="718" y="26" width="30" height="48"/>
         <rect x="726" y="12" width="3" height="14"/>
         <rect x="756" y="44" width="26" height="30"/>
         <polygon points="790,74 790,38 806,26 822,38 822,74"/>
         <rect x="836" y="34" width="30" height="40"/>
         <rect x="872" y="46" width="24" height="28"/>
         <rect x="902" y="30" width="30" height="44"/>
         <rect x="938" y="42" width="26" height="32"/>
         <rect x="970" y="22" width="30" height="52"/>
         <rect x="982" y="8" width="3" height="14"/>
         <rect x="1008" y="46" width="24" height="28"/>
         <rect x="1038" y="36" width="28" height="38"/>
         <rect x="1072" y="44" width="24" height="30"/>
         <rect x="1102" y="30" width="30" height="44"/>
         <rect x="1140" y="46" width="40" height="28"/>
       </g>
     </svg>`;
   }
   
   /* ============================================================
      STORAGE — baseline JSON + browser overrides
      ============================================================ */
   function loadOverrides() {
     try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
     catch { return {}; }
   }
   function saveOverrides(ov) {
     localStorage.setItem(LS_KEY, JSON.stringify(ov));
   }
   /* merge base + overrides (overrides win; new ids append) */
   function mergePlaces() {
     const ov = loadOverrides();
     const byId = new Map(state.base.map((p) => [p.id, structuredClone(p)]));
     for (const [id, patch] of Object.entries(ov)) {
       if (patch.__deleted) { byId.delete(id); continue; }
       byId.set(id, { ...(byId.get(id) || {}), ...patch });
     }
     state.places = [...byId.values()];
   }
   
   async function loadData() {
     const [places, strides] = await Promise.all([
       fetch("data/places.json").then((r) => r.json()),
       fetch("data/strides.json").then((r) => r.json()).catch(() => null),
     ]);
     state.base = places;
     state.strides = strides;
     mergePlaces();
   }
   
   
   /* ============================================================
      HOURS ENGINE — is it open? closing soon? running out of days?
      hours = { mon:"10:00-17:00" | null, ... }   null = closed
      ============================================================ */
   function nowParts() {
     const d = new Date();
     return { d, dayKey: DAYS[d.getDay()], mins: d.getHours() * 60 + d.getMinutes() };
   }
   function parseRange(str) {
     if (!str) return null;
     const m = str.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
     if (!m) return null;
     return { open: +m[1] * 60 + +m[2], close: +m[3] * 60 + +m[4] };
   }
   function hoursFor(p, dayKey) {
     return p.hours ? p.hours[dayKey] ?? null : null;
   }
   /* → {state:"open"|"closed"|"closing-soon"|"unknown", label, minsLeft} */
   function openState(p) {
     if (!p.hours) return { state: "unknown", label: "Hours unknown" };
     const { dayKey, mins } = nowParts();
     const todayStr = hoursFor(p, dayKey);
     if (!todayStr) return { state: "closed", label: `Closed ${DAY_LABEL[dayKey]}s` };
     const r = parseRange(todayStr);
     if (!r) return { state: "unknown", label: "Hours unknown" };
     if (mins < r.open) {
       const h = Math.floor(r.open / 60), m = r.open % 60;
       return { state: "closed", label: `Opens ${fmtTime(h, m)}` };
     }
     if (mins >= r.close) return { state: "closed", label: "Closed for today" };
     const left = r.close - mins;
     if (left <= 90) return { state: "closing-soon", label: `Closes in ${left} min`, minsLeft: left };
     const h = Math.floor(r.close / 60), m = r.close % 60;
     return { state: "open", label: `Open until ${fmtTime(h, m)}`, minsLeft: left };
   }
   function fmtTime(h, m) {
     const ap = h >= 12 ? "pm" : "am";
     const hh = h % 12 === 0 ? 12 : h % 12;
     return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, "0")}${ap}`;
   }
   /* Days remaining (inclusive of today) until departure */
   function daysLeft() {
     if (!DEPARTURE) return null;
     const dep = new Date(DEPARTURE + "T23:59:59");
     const now = new Date();
     return Math.max(0, Math.ceil((dep - now) / 86400000));
   }
   /* Which of the remaining days is this place actually open? */
   function remainingOpenDays(p) {
     const n = daysLeft();
     if (n == null || !p.hours) return null;
     const out = [];
     const today = new Date();
     for (let i = 0; i < n; i++) {
       const d = new Date(today); d.setDate(today.getDate() + i);
       const k = DAYS[d.getDay()];
       if (hoursFor(p, k)) out.push({ key: k, label: DAY_LABEL[k], offset: i });
     }
     return out;
   }
   function isFree(p) {
     return (p.budget || "").toLowerCase() === "free";
   }
   
   /* ============================================================
      RECOMMENDATIONS — what should I actually do, right now?
      ============================================================ */
   function recOpenNow() {
     return state.places
       .filter((p) => p.status === "want-to-go")
       .map((p) => ({ p, st: openState(p) }))
       .filter((x) => x.st.state === "open" || x.st.state === "closing-soon")
       .sort((a, b) => (isFree(b.p) - isFree(a.p)) || a.p.name.localeCompare(b.p.name));
   }
   function recRunningOut() {
     /* want-to-go places with the FEWEST remaining open days — the true urgency list */
     return state.places
       .filter((p) => p.status === "want-to-go")
       .map((p) => ({ p, days: remainingOpenDays(p) }))
       .filter((x) => x.days && x.days.length > 0)
       .sort((a, b) => a.days.length - b.days.length || a.p.name.localeCompare(b.p.name));
   }
   function recFreeToday() {
     const { dayKey } = nowParts();
     return state.places
       .filter((p) => p.status === "want-to-go" && isFree(p) && hoursFor(p, dayKey))
       .sort((a, b) => a.name.localeCompare(b.name));
   }
   function recNearby() {
     /* want-to-go, walkable, open today — the "just go outside now" list */
     const { dayKey } = nowParts();
     return state.places
       .filter((p) => p.status === "want-to-go" && hoursFor(p, dayKey))
       .map((p) => ({ p, mi: haversineMi(HOME.lat, HOME.lng, p.lat, p.lng) }))
       .filter((x) => x.mi <= 2.2)
       .sort((a, b) => a.mi - b.mi);
   }
   
   function catPill(p) {
     return `<span class="pill pill--cat" style="background:${catColor(p.type)}">${catIcon(p.type)} ${esc(p.type)}</span>`;
   }
   function statePill(st) {
     const cls = st.state === "open" ? "pill--open"
               : st.state === "closing-soon" ? "pill--soon" : "pill--closed";
     const dot = st.state === "open" || st.state === "closing-soon" ? "on" : "off";
     return `<span class="pill ${cls}"><span class="livedot livedot--${dot}"></span>${esc(st.label)}</span>`;
   }
   
   function renderRecommendations() {
     const host = $("#recs");
     if (!host) return;
     const n = daysLeft();
     const mode = state.recMode || "urgent";
   
     let items = [], empty = "";
     if (mode === "open") {
       items = recOpenNow().map(({ p, st }) => ({
         p, why: st.label,
         pills: [catPill(p), statePill(st), isFree(p) ? `<span class="pill pill--free">Free</span>` : ""],
       }));
       empty = "Nothing on your list is open right now. Try “Running out of days” to plan ahead.";
     } else if (mode === "urgent") {
       items = recRunningOut().map(({ p, days }) => {
         const dayList = days.map((d) => d.label).join(", ");
         const urgent = days.length <= 2;
         return {
           p,
           why: n != null
             ? `Open on only ${days.length} of your last ${n} day${n === 1 ? "" : "s"}: ${dayList}`
             : `Open: ${dayList}`,
           pills: [catPill(p),
             `<span class="pill ${urgent ? "pill--urgent" : "pill--soon"}">${days.length} day${days.length === 1 ? "" : "s"} left</span>`,
             isFree(p) ? `<span class="pill pill--free">Free</span>` : ""],
         };
       });
       empty = "Nothing pending — everything on your want-to-go list is done. 🎉";
     } else if (mode === "free") {
       items = recFreeToday().map((p) => ({
         p, why: openState(p).label,
         pills: [catPill(p), `<span class="pill pill--free">Free</span>`, statePill(openState(p))],
       }));
       empty = "No free spots on your list are open today.";
     } else if (mode === "near") {
       items = recNearby().map(({ p, mi }) => ({
         p, why: `${mi.toFixed(1)} mi from home — about a ${Math.round(mi / 3.1 * 60)} min walk`,
         pills: [catPill(p), statePill(openState(p)), isFree(p) ? `<span class="pill pill--free">Free</span>` : ""],
       }));
       empty = "Nothing walkable on your list is open today.";
     }
   
     host.innerHTML = items.length
       ? items.map(({ p, why, pills }) => `
           <div class="rec" data-id="${esc(p.id)}" style="border-left-color:${catColor(p.type)}">
             <div class="rec__top">
               <div class="rec__name">${esc(p.name)}</div>
             </div>
             <div class="rec__why">${esc(why)}</div>
             <div class="rec__meta">${pills.filter(Boolean).join("")}</div>
           </div>`).join("")
       : `<div class="rec-empty">${empty}</div>`;
   
     $$("#recs .rec").forEach((el) => el.addEventListener("click", () => openPanel(el.dataset.id)));
   }
   
   function renderCountdown() {
     const host = $("#countdown");
     if (!host) return;
     const n = daysLeft();
     const { d, dayKey } = nowParts();
     const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
     if (n == null) { host.style.display = "none"; return; }
     const left = state.places.filter((p) => p.status === "want-to-go").length;
     host.innerHTML = `
       <div>
         <div class="countdown__big">${n}</div>
         <div class="countdown__lab">day${n === 1 ? "" : "s"} left in Chicago</div>
       </div>
       <div style="width:1px;height:42px;background:rgba(255,255,255,.2)"></div>
       <div>
         <div class="countdown__big">${left}</div>
         <div class="countdown__lab">still on the list</div>
       </div>
       <div class="countdown__spacer"></div>
       <div class="countdown__today">📅 ${esc(dateStr)}</div>`;
   }
   
   function renderProgress() {
     const host = $("#progress");
     if (!host) return;
     const total = state.places.length;
     const visited = state.places.filter((p) => p.status === "visited").length;
     const pct = total ? (visited / total * 100) : 0;
     const byCat = {};
     state.places.filter((p) => p.status === "visited").forEach((p) => {
       byCat[p.type] = (byCat[p.type] || 0) + 1;
     });
     const segs = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
     host.innerHTML = `
       <div class="progress__head">
         <h4>Summer progress</h4>
         <span>${visited} of ${total} places · ${pct.toFixed(0)}%</span>
       </div>
       <div class="progress__bar">
         ${segs.map(([c, n]) => `<div class="progress__seg" style="width:${n / total * 100}%;background:${catColor(c)}" title="${esc(c)}: ${n}"></div>`).join("")}
         <div class="progress__seg" style="flex:1;background:var(--sand-2)"></div>
       </div>
       <div class="progress__legend">
         ${segs.slice(0, 8).map(([c, n]) => `<span class="it"><span class="sw" style="background:${catColor(c)}"></span>${esc(c)} ${n}</span>`).join("")}
       </div>`;
   }
   
   /* ============================================================
      RENDER — stats, legend, map, cards
      ============================================================ */
   function photoMarkup(p, cls, phCls) {
     const letter = esc(p.name.trim().charAt(0).toUpperCase());
     const bg = catColor(p.type);
     if (p.photo) {
       return `<img class="${cls}" src="${esc(p.photo)}" alt="${esc(p.name)}"
         onerror="this.outerHTML='<div class=\\'${cls} ${phCls}\\' style=\\'background:${bg}\\'>${letter}</div>'">`;
     }
     return `<div class="${cls} ${phCls}" style="background:${bg}">${letter}</div>`;
   }
   
   function renderStats() {
     const visited = state.places.filter((p) => p.status === "visited").length;
     const want = state.places.filter((p) => p.status === "want-to-go").length;
     const s = state.strides || {};
     const cards = [
       { num: s.milesWalked ?? "—", unit: "mi", label: "Miles walked" },
       { num: s.routes ?? state.strideCount ?? "—", unit: "", label: "Routes logged" },
       { num: visited, unit: "", label: "Places visited" },
       { num: want, unit: "", label: "Still on the list" },
       { num: s.streetsCompleted || "—", unit: s.totalStreets ? `/ ${s.totalStreets}` : "", label: "Streets complete" },
     ];
     $("#stats").innerHTML = cards.map((c) => `
       <div class="stat">
         <div class="stat__num">${esc(c.num)}${c.unit ? `<span class="unit">${esc(c.unit)}</span>` : ""}</div>
         <span class="stat__label">${esc(c.label)}</span>
       </div>`).join("");
     if (s.citystridesUrl) $("#cs-link").href = s.citystridesUrl;
   }
   
   function renderLegend() {
     const counts = {};
     state.places.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
     const items = Object.keys(CATS).filter((c) => counts[c]).map((c) => `
       <span class="item"><span class="dot" style="background:${CATS[c].color}"></span>${CATS[c].icon} ${esc(c)} <span style="color:var(--muted)">${counts[c]}</span></span>`).join("");
     $("#legend").innerHTML = `
       <h4>Pin color = category</h4>
       <div class="row">${items}</div>
       <div class="sep"></div>
       <div class="row">
         <span class="item"><span class="dot" style="background:#6A7B85"></span>Solid = visited</span>
         <span class="item"><span class="dot" style="background:#fff;border-color:#6A7B85;border-style:dashed"></span>Dashed = want to go</span>
         <span class="item">${starSVG(13)} Favorite</span>
         <span class="item"><span class="swatch-line"></span>Streets I've walked (${state.strideCount || 0} routes)</span>
       </div>`;
   }
   
   /* category filter chips */
   function renderCatChips() {
     const host = $("#cat-chips");
     if (!host) return;
     const counts = {};
     state.places.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
     const all = `<button class="cat-chip ${!state.catFilter ? "is-active" : ""}" data-cat="">All <span class="n">${state.places.length}</span></button>`;
     const chips = Object.keys(CATS).filter((c) => counts[c]).map((c) => `
       <button class="cat-chip ${state.catFilter === c ? "is-active" : ""}" data-cat="${esc(c)}">
         <span class="cdot" style="background:${CATS[c].color}"></span>${CATS[c].icon} ${esc(c)} <span class="n">${counts[c]}</span>
       </button>`).join("");
     host.innerHTML = all + chips;
     $$("#cat-chips .cat-chip").forEach((el) => el.addEventListener("click", () => {
       state.catFilter = el.dataset.cat || null;
       renderCatChips(); drawPlaces(); renderGrid();
     }));
   }
   
   /* ---------- map (MapLibre GL JS + OpenFreeMap — free, no API key, real 3D buildings) ---------- */
   function mapErrorBanner(msg) {
     const wrap = $(".map-wrap");
     if (!wrap) return;
     const el = document.createElement("div");
     el.style.cssText = "position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;background:var(--sand);color:var(--flag-red);font-size:13px;font-weight:500;line-height:1.6";
     el.innerHTML = `⚠ Map failed to load.<br><span style="color:var(--ink-soft);font-weight:400">${esc(msg)}</span><br><span style="color:var(--muted);font-size:11.5px">Check the browser console (F12) for the full error, and confirm index.html, css/style.css and js/app.js are all the latest versions.</span>`;
     wrap.appendChild(el);
   }
   
   function initMap() {
     if (typeof maplibregl === "undefined") {
       mapErrorBanner("maplibre-gl.js didn't load — check your internet connection or that the CDN <script> tag in index.html wasn't stripped out.");
       return;
     }
     let map;
     try {
       map = new maplibregl.Map({
         container: "map",
         style: "https://tiles.openfreemap.org/styles/liberty",
         center: [CHICAGO_CENTER[1], CHICAGO_CENTER[0]],
         zoom: 12,
         pitch: 45,
         bearing: -12,
         antialias: true,
         attributionControl: { compact: true },
       });
     } catch (e) {
       mapErrorBanner(`Map constructor threw: ${e.message}`);
       return;
     }
     state.map = map;
     state.mapDefault = { center: [CHICAGO_CENTER[1], CHICAGO_CENTER[0]], zoom: 12, pitch: 45, bearing: -12 };
   
     map.on("error", (e) => {
       console.error("MapLibre error:", e?.error || e);
     });
   
     // click-to-focus scroll zoom — same courtesy as before so the page still scrolls normally
     map.scrollZoom.disable();
     const canvasHolder = map.getCanvasContainer();
     canvasHolder.addEventListener("mouseenter", () => map.scrollZoom.enable());
     canvasHolder.addEventListener("mouseleave", () => map.scrollZoom.disable());
   
     map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
     map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");
   
     map.on("load", () => {
       try { add3DBuildings(map); } catch (e) { console.error("3D buildings layer failed (map still usable):", e); }
       try { drawStrides(map); } catch (e) { console.error("Streets layer failed (map still usable):", e); }
       try { drawHome(map); } catch (e) { console.error("Home marker failed:", e); }
       try { drawPlaces(); } catch (e) { console.error("Place markers failed:", e); }
     });
   
     $("#map-reset")?.addEventListener("click", () => {
       map.flyTo({ ...state.mapDefault, duration: 900 });
     });
   }
   
   /* Real 3D building extrusion, colored by height — the "alive, Google-Earth-ish" layer.
      Uses OpenStreetMap building height data via the OpenMapTiles schema OpenFreeMap serves. */
   function add3DBuildings(map) {
     const layers = map.getStyle().layers;
     const labelLayerId = layers.find((l) => l.type === "symbol" && l.layout && l.layout["text-field"])?.id;
   
     map.addSource("ofm-buildings", { type: "vector", url: "https://tiles.openfreemap.org/planet" });
     map.addLayer({
       id: "3d-buildings",
       source: "ofm-buildings",
       "source-layer": "building",
       type: "fill-extrusion",
       minzoom: 14,
       filter: ["!=", ["get", "hide_3d"], true],
       paint: {
         "fill-extrusion-color": [
           "interpolate", ["linear"], ["coalesce", ["get", "render_height"], 5],
           0, "#D8C9A3",
           40, "#9FB4C7",
           120, "#41B6E6",
           300, "#0B3C5D",
         ],
         "fill-extrusion-opacity": 0.88,
         "fill-extrusion-height": [
           "interpolate", ["linear"], ["zoom"],
           14, 0,
           16, ["coalesce", ["get", "render_height"], 8],
         ],
         "fill-extrusion-base": [
           "case", [">=", ["zoom"], 15], ["coalesce", ["get", "render_min_height"], 0], 0,
         ],
       },
     }, labelLayerId);
   }
   
   function drawStrides(map) {
     fetch("data/streets.geojson").then((r) => r.json()).then((geo) => {
       state.strideCount = (geo.features || []).length;
       map.addSource("strides", { type: "geojson", data: geo });
       map.addLayer({
         id: "strides-line",
         type: "line",
         source: "strides",
         layout: { "line-cap": "round", "line-join": "round" },
         paint: {
           "line-color": "#13294B",
           "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 16, 4.5],
           "line-opacity": 0.85,
         },
       });
       let stridePopup = null;
       map.on("mousemove", "strides-line", (e) => {
         map.getCanvas().style.cursor = "pointer";
         const nm = e.features[0]?.properties?.name;
         if (!nm) return;
         if (!stridePopup) {
           stridePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "place-tip", offset: 10 });
         }
         stridePopup.setLngLat(e.lngLat)
           .setHTML(`<div class="tip-meta"><div class="tip-name" style="font-size:13px">🚶 ${esc(nm)}</div></div>`)
           .addTo(map);
       });
       map.on("mouseleave", "strides-line", () => {
         map.getCanvas().style.cursor = "";
         stridePopup?.remove();
       });
       renderLegend();
     }).catch(() => {});
   }
   
   function drawHome(map) {
     const el = document.createElement("div");
     el.className = "pin-home";
     el.title = "Home base";
     const popup = new maplibregl.Popup({ closeButton: false, offset: 16, className: "place-tip" })
       .setHTML(`<div class="tip-meta"><div class="tip-name">${esc(HOME.name)}</div><div class="tip-hood">🏠 Home base · West Loop</div></div>`);
     new maplibregl.Marker({ element: el, anchor: "center" })
       .setLngLat([HOME.lng, HOME.lat])
       .setPopup(popup)
       .addTo(map);
     el.addEventListener("mouseenter", () => popup.addTo(map).setLngLat([HOME.lng, HOME.lat]));
     el.addEventListener("mouseleave", () => popup.remove());
   }
   
   function pinEl(p) {
     const color = catColor(p.type);
     const want = p.status !== "visited";
     const glyph = p.favorite ? starSVG(11, "#fff") : p.status === "visited" ? "✓" : "";
     const el = document.createElement("div");
     el.className = `pin ${want ? "is-want" : ""}`;
     el.style.background = color;
     el.innerHTML = `<span class="glyph">${glyph}</span>`;
     return el;
   }
   
   function tooltipHTML(p) {
     const badge = p.status === "visited"
       ? `<span class="tip-badge tip-badge--visited">Visited</span>`
       : `<span class="tip-badge tip-badge--want">Want to go</span>`;
     const fav = p.favorite ? `<span class="tip-badge" style="background:rgba(198,12,48,.12);color:#C60C30">★ Favorite</span>` : "";
     const cat = `<span class="tip-cat" style="background:${catColor(p.type)}">${catIcon(p.type)} ${esc(p.type)}</span>`;
     const st = openState(p);
     const open = st.state !== "unknown" ? statePill(st) : "";
     return `${photoMarkup(p, "tip-photo", "tip-photo--placeholder")}
       <div class="tip-meta">
         <div class="tip-name">${esc(p.name)}</div>
         ${p.neighborhood ? `<div class="tip-hood">${esc(p.neighborhood)}</div>` : ""}
         <div class="tip-badges">${cat}${badge}${fav}</div>
         <div class="tip-badges">${open}</div>
       </div>`;
   }
   
   function drawPlaces() {
     state.markers.forEach((m) => m.remove());
     state.markers.clear();
     if (!state.map) return;
     visiblePlaces().forEach((p) => {
       if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
       const el = pinEl(p);
       const popup = new maplibregl.Popup({ closeButton: false, offset: 18, className: "place-tip" })
         .setHTML(tooltipHTML(p));
       const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
         .setLngLat([p.lng, p.lat])
         .addTo(state.map);
       el.addEventListener("mouseenter", () => popup.setLngLat([p.lng, p.lat]).addTo(state.map));
       el.addEventListener("mouseleave", () => popup.remove());
       el.addEventListener("click", () => { popup.remove(); openPanel(p.id); });
       state.markers.set(p.id, marker);
     });
   }
   
   /* ---------- filtering ---------- */
   function visiblePlaces() {
     const q = state.search.trim().toLowerCase();
     return state.places.filter((p) => {
       if (state.filter === "visited" && p.status !== "visited") return false;
       if (state.filter === "want-to-go" && p.status !== "want-to-go") return false;
       if (state.filter === "favorite" && !p.favorite) return false;
       if (state.catFilter && p.type !== state.catFilter) return false;
       if (q) {
         const hay = `${p.name} ${p.neighborhood} ${p.type} ${p.location}`.toLowerCase();
         if (!hay.includes(q)) return false;
       }
       return true;
     });
   }
   
   /* ---------- cards ---------- */
   function cardHTML(p) {
     const badges = [
       p.status === "visited" ? `<span class="badge badge--visited">Visited</span>`
                              : `<span class="badge badge--want">Want to go</span>`,
       p.favorite ? `<span class="badge badge--fav">${starSVG(11)} Favorite</span>` : "",
     ].join("");
     const rating = p.rating ? `<span class="stars-rating" title="${p.rating}/5">${starRow(Math.round(p.rating))}</span>` : "";
     return `<article class="card" data-id="${esc(p.id)}">
       ${photoMarkup(p, "card__photo", "card__photo--placeholder")}
       <div class="card__body">
         <span class="card__cat" style="color:${catColor(p.type)}"><span class="cdot" style="background:${catColor(p.type)}"></span>${catIcon(p.type)} ${esc(p.type)}</span>
         <div class="card__name">${esc(p.name)}</div>
         <div class="card__badges">${badges}${openState(p).state !== "unknown" ? statePill(openState(p)) : ""}</div>
         <div class="card__meta">
           ${p.neighborhood ? `<span class="mi">📍 ${esc(p.neighborhood)}</span>` : ""}
           ${p.budget ? `<span class="mi">💵 ${esc(p.budget)}</span>` : ""}
           ${rating}
         </div>
       </div>
     </article>`;
   }
   
   function renderGrid() {
     const list = visiblePlaces().sort((a, b) => {
       if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
       if (a.status !== b.status) return a.status === "visited" ? -1 : 1;
       return a.name.localeCompare(b.name);
     });
     $("#grid").innerHTML = list.map(cardHTML).join("") ||
       `<p style="color:var(--muted)">No places match. Try a different filter.</p>`;
     $("#grid-count").textContent = `${list.length} place${list.length === 1 ? "" : "s"}`;
     $$("#grid .card").forEach((el) => el.addEventListener("click", () => openPanel(el.dataset.id)));
   }
   
   function refresh() {
     mergePlaces();
     renderStats(); renderLegend(); renderCatChips();
     renderCountdown(); renderProgress(); renderRecommendations();
     drawPlaces(); renderGrid();
   }
   
   /* ============================================================
      DETAIL PANEL — view + inline edit
      ============================================================ */
   function field(label, val, key, editable, multiline) {
     const empty = !val;
     if (state.editing) {
       const input = multiline
         ? `<textarea class="edit-field" data-key="${key}">${esc(val)}</textarea>`
         : `<input class="edit-field" data-key="${key}" value="${esc(val)}" />`;
       return `<div class="field"><div class="k">${label}</div>${input}</div>`;
     }
     return `<div class="field"><div class="k">${label}</div>
       <div class="v ${empty ? "empty" : ""}">${empty ? "" : esc(val).replace(/\n/g, "<br>")}</div></div>`;
   }
   
   function panelHTML(p) {
     const editing = state.editing === p.id;
     const sr = p.scoutingReport || {};
     const gp = sr.gamePlan || {};
     const pa = p.postAnalysis || {};
     const snap = pa.snapshot || {};
     const cat = `<span class="cat" style="color:#fff"><span style="width:9px;height:9px;border-radius:50%;background:${catColor(p.type)};display:inline-block"></span>${esc(p.type)}</span>`;
   
     const propRow = (dt, dd) => `<dt>${dt}</dt><dd>${dd}</dd>`;
     const pill = (txt, color) => `<span class="tag-pill" style="background:${color}22;color:${color}">${esc(txt)}</span>`;
   
     const props = `<dl class="props">
       ${propRow("◍ Status", p.status === "visited"
           ? pill("Visited", "#1CA3DE") : pill("Want to go", "#F5871F"))}
       ${propRow("♥ Favorite", p.favorite ? `${starSVG(13)} Yes` : "No")}
       ${propRow("🗂 Category", pill(p.type, catColor(p.type)))}
       ${p.neighborhood ? propRow("📍 Neighborhood", esc(p.neighborhood)) : ""}
       ${p.budget ? propRow("💵 Budget", esc(p.budget)) : ""}
       ${p.transportation ? propRow("🚇 Transportation", esc(p.transportation)) : ""}
       ${p.plannedTime ? propRow("📅 Planned time", esc(p.plannedTime)) : ""}
       ${p.duration ? propRow("⏱ Duration", esc(p.duration) + " hr") : ""}
       ${p.travelBuddy ? propRow("👥 Travel buddy", esc(p.travelBuddy)) : ""}
       ${p.location ? propRow("🗺 Location", esc(p.location)) : ""}
       ${p.rating ? propRow("⭐ Rating", `${starRow(Math.round(p.rating))} ${p.rating}/5`) : ""}
     </dl>`;
   
     /* live open/closed + full week hours */
     const st = openState(p);
     const { dayKey } = nowParts();
     const rem = remainingOpenDays(p);
     const hoursBlock = p.hours ? `
       <div class="report">
         <h3>🕒 Hours</h3>
         <div style="margin:6px 0 10px">${statePill(st)}
           ${isFree(p) ? `<span class="pill pill--free">Free</span>` : `<span class="pill pill--closed">${esc(p.budget || "—")}</span>`}
           ${rem && rem.length && p.status === "want-to-go"
             ? `<span class="pill ${rem.length <= 2 ? "pill--urgent" : "pill--soon"}">Open ${rem.length} more day${rem.length === 1 ? "" : "s"} before you go</span>` : ""}
         </div>
         <div class="hours-grid">
           ${DAYS.map((k) => {
             const v = p.hours[k];
             return `<div class="hd ${k === dayKey ? "is-today" : ""} ${!v ? "is-shut" : ""}">${DAY_LABEL[k]}</div>
                     <div class="hv ${k === dayKey ? "is-today" : ""} ${!v ? "is-shut" : ""}">${v ? esc(v.replace("-", " – ")) : "Closed"}</div>`;
           }).join("")}
         </div>
         ${p.notes ? `<div class="field" style="margin-top:10px"><div class="k">⚠ Note</div><div class="v">${esc(p.notes)}</div></div>` : ""}
       </div>` : "";
   
     const scouting = `<div class="report">
       <h3>📑 Scouting Report</h3>
       ${field("❓ Why", sr.why, "scoutingReport.why", editing, true)}
       <div class="lead" style="margin-top:16px">📅 Game Plan</div>
       ${field("Best time to go", gp.bestTime, "scoutingReport.gamePlan.bestTime", editing, true)}
       ${field("Recurring events", gp.recurringEvents, "scoutingReport.gamePlan.recurringEvents", editing, true)}
       ${field("Cost", gp.cost, "scoutingReport.gamePlan.cost", editing, false)}
       ${field("Transit plan", gp.transitPlan, "scoutingReport.gamePlan.transitPlan", editing, true)}
       ${field("👀 What I'm looking forward to", sr.lookingForwardTo, "scoutingReport.lookingForwardTo", editing, true)}
     </div>`;
   
     const post = `<div class="report">
       <div class="divider-stars">${starSVG(14)}</div>
       <h3>📊 Post Analysis</h3>
       <div class="lead">📸 The Snapshot</div>
       ${field("Date", snap.date, "postAnalysis.snapshot.date", editing, false)}
       ${field("Time of day", snap.timeOfDay, "postAnalysis.snapshot.timeOfDay", editing, false)}
       ${field("Who I went with", snap.who, "postAnalysis.snapshot.who", editing, false)}
       ${field("How long I stayed", snap.howLong, "postAnalysis.snapshot.howLong", editing, false)}
       ${field("How I got there", snap.howGotThere, "postAnalysis.snapshot.howGotThere", editing, false)}
       ${field("⭐ First impression", pa.firstImpression, "postAnalysis.firstImpression", editing, true)}
       ${field("🔥 Highlight of the day", pa.highlight, "postAnalysis.highlight", editing, true)}
       ${field("😅 Lowlight", pa.lowlight, "postAnalysis.lowlight", editing, true)}
       ${field("🔄 Would I go again?", pa.wouldGoAgain, "postAnalysis.wouldGoAgain", editing, true)}
     </div>`;
   
     const actions = editing
       ? `<div class="panel__actions">
            <button class="pbtn pbtn--primary" id="save-edit">✓ Save changes</button>
            <button class="pbtn" id="cancel-edit">Cancel</button>
          </div>`
       : `<div class="panel__actions">
            <button class="pbtn" id="edit-place">✎ Edit</button>
            <button class="pbtn" id="toggle-status">↔ Mark ${p.status === "visited" ? "want-to-go" : "visited"}</button>
            <button class="pbtn" id="toggle-fav">${p.favorite ? "♡ Unfavorite" : "★ Favorite"}</button>
            <button class="pbtn pbtn--danger" id="delete-place">🗑 Remove</button>
          </div>`;
   
     const photoEditor = editing ? `
       <div class="hero-photo-edit">
         <label class="hero-photo-lab">🖼 Header photo — paste an image URL</label>
         <div class="hero-photo-row">
           <input class="edit-field" id="photo-url-input" data-key="photo" value="${esc(p.photo || "")}"
                  placeholder="https://example.com/image.jpg" />
           <a class="pbtn pbtn--img-search" target="_blank" rel="noopener"
              href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p.name + " " + (p.neighborhood || "chicago"))}">
              🔍 Find on Google Images
           </a>
         </div>
         <p class="hero-photo-hint">On the Google Images tab: right-click any photo → <strong>Copy image address</strong> (Chrome) or <strong>Copy Image Link</strong> (Safari/Firefox) → paste it above. Preview updates as you type.</p>
       </div>` : "";
   
     return `
       <div class="panel__hero">
         ${p.photo ? `<img id="hero-img" src="${esc(p.photo)}" alt="${esc(p.name)}"
                       onerror="this.style.display='none'; document.getElementById('hero-fallback')?.style.setProperty('display','flex');">`
                   : ""}
         <div id="hero-fallback" class="panel__hero--placeholder" style="background:${catColor(p.type)};display:${p.photo ? "none" : "flex"}">${esc(p.name.charAt(0).toUpperCase())}</div>
         <div class="panel__hero-grad"></div>
         <button class="panel__close" id="panel-close" aria-label="Close">✕</button>
         <div class="panel__hero-cap">${cat}<h2>${esc(p.name)}</h2></div>
       </div>
       ${photoEditor}
       <div class="panel__body">
         ${actions}
         ${props}
         ${hoursBlock}
         ${scouting}
         ${post}
       </div>`;
   }
   
   function openPanel(id) {
     const p = state.places.find((x) => x.id === id);
     if (!p) return;
     state.editing = null;
     $("#panel-scroll").innerHTML = panelHTML(p);
     $("#panel").classList.add("is-open");
     $("#panel").setAttribute("aria-hidden", "false");
     $("#panel-backdrop").classList.add("is-open");
     wirePanel(p);
   }
   function closePanel() {
     $("#panel").classList.remove("is-open");
     $("#panel").setAttribute("aria-hidden", "true");
     $("#panel-backdrop").classList.remove("is-open");
     state.editing = null;
   }
   
   function wirePanel(p) {
     $("#panel-close")?.addEventListener("click", closePanel);
     if (state.editing === p.id) {
       $("#save-edit")?.addEventListener("click", () => saveEdits(p.id));
       $("#cancel-edit")?.addEventListener("click", () => { state.editing = null; openPanel(p.id); });
       // live hero-photo preview: update the header image as soon as a URL is pasted, no save needed to see it
       $("#photo-url-input")?.addEventListener("input", (e) => {
         const url = e.target.value.trim();
         const hero = $(".panel__hero");
         let img = $("#hero-img");
         const fallback = $("#hero-fallback");
         if (!url) {
           img?.remove();
           if (fallback) fallback.style.display = "flex";
           return;
         }
         if (!img) {
           img = document.createElement("img");
           img.id = "hero-img";
           img.alt = p.name;
           hero.prepend(img);
         }
         if (fallback) fallback.style.display = "none";
         img.onerror = () => { img.style.display = "none"; if (fallback) fallback.style.display = "flex"; };
         img.onload = () => { img.style.display = "block"; };
         img.src = url;
       });
       return;
     }
     $("#edit-place")?.addEventListener("click", () => { state.editing = p.id; $("#panel-scroll").innerHTML = panelHTML(p); wirePanel(p); });
     $("#toggle-status")?.addEventListener("click", () => {
       const next = p.status === "visited" ? "want-to-go" : "visited";
       patchPlace(p.id, { status: next });
       toast(`Moved to ${next}`); refresh(); openPanel(p.id);
       ghAutoCommit(`Mark "${p.name}" as ${next}`);
     });
     $("#toggle-fav")?.addEventListener("click", () => {
       const nowFav = !p.favorite;
       patchPlace(p.id, { favorite: nowFav });
       toast(nowFav ? "★ Favorited" : "Removed favorite"); refresh(); openPanel(p.id);
       ghAutoCommit(`${nowFav ? "Favorite" : "Unfavorite"} "${p.name}"`);
     });
     $("#delete-place")?.addEventListener("click", () => {
       if (!confirm(`Remove "${p.name}" from your journal?`)) return;
       const ov = loadOverrides();
       if (state.base.some((b) => b.id === p.id)) ov[p.id] = { __deleted: true };
       else delete ov[p.id];
       saveOverrides(ov); closePanel(); toast("Removed"); refresh();
       ghAutoCommit(`Remove "${p.name}"`);
     });
   }
   
   /* apply a set-in-path patch object to browser overrides */
   function patchPlace(id, patch) {
     const ov = loadOverrides();
     const current = state.places.find((x) => x.id === id) || {};
     ov[id] = { ...(ov[id] || {}), ...structuredClone(current), ...patch, id };
     delete ov[id].__deleted;
     saveOverrides(ov);
   }
   
   function saveEdits(id) {
     const p = structuredClone(state.places.find((x) => x.id === id));
     $$("#panel-scroll [data-key]").forEach((el) => {
       const path = el.dataset.key.split(".");
       let obj = p;
       for (let i = 0; i < path.length - 1; i++) obj = (obj[path[i]] ??= {});
       obj[path[path.length - 1]] = el.value;
     });
     const ov = loadOverrides();
     ov[id] = { ...p };
     saveOverrides(ov);
     state.editing = null;
     toast(ghIsConfigured() ? "Saving…" : "Saved to this browser");
     refresh(); openPanel(id);
     ghAutoCommit(`Edit "${p.name}"`);
   }
   
   /* ============================================================
      ADD A PLACE — auto-fill from the web, then save
      ============================================================ */
   function slugify(name) {
     return name.toLowerCase().replace(/['`']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
   }
   function haversineMi(a, b, c, d) {
     const R = 3958.8, toR = (x) => x * Math.PI / 180;
     const dLat = toR(c - a), dLng = toR(d - b);
     const x = Math.sin(dLat/2)**2 + Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)**2;
     return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
   }
   /* OSM class/type → one of our 14 categories */
   function guessCategory(cls, type, name = "") {
     const t = `${cls}:${type}:${name}`.toLowerCase();
     if (/beach/.test(t)) return "Beach & Lakefront";
     if (/museum|gallery|archive/.test(t)) return "Museum";
     if (/university|college|school/.test(t)) return "University";
     if (/place_of_worship|church|synagogue|mosque|temple|cathedral|chapel/.test(t)) return "Sacred Space";
     if (/theatre|cinema|comedy/.test(t)) return "Stage & Screen";
     if (/stadium|arena|sports|pitch|golf|track/.test(t)) return "Sports";
     if (/bar|pub|rooftop|biergarten|nightclub/.test(t)) return "Rooftop & Bar";
     if (/restaurant|cafe|fast_food|bakery|ice_cream|food|deli|pizza|brewery/.test(t)) return "Food & Drink";
     if (/park|garden|conservatory|zoo|nature_reserve|forest/.test(t)) return "Park & Garden";
     if (/artwork|mural|sculpture|public_art/.test(t)) return "Public Art";
     if (/music|concert|bandstand|festival/.test(t)) return "Music & Festival";
     if (/suburb|neighbourhood|quarter/.test(t)) return "Neighborhood";
     if (/monument|memorial|historic|building|attraction|tower|bridge|lighthouse/.test(t)) return "Landmark";
     return "Attraction";
   }
   
   /* Sensible default hours per category — a starting guess you then correct. */
   function guessHours(cat) {
     const wk = (s) => ({ mon:s, tue:s, wed:s, thu:s, fri:s, sat:s, sun:s });
     switch (cat) {
       case "Museum":            return { mon:null, tue:"10:00-17:00", wed:"10:00-17:00", thu:"10:00-17:00", fri:"10:00-17:00", sat:"10:00-17:00", sun:"11:00-17:00" };
       case "Park & Garden":
       case "Beach & Lakefront":
       case "Public Art":        return wk("06:00-23:00");
       case "Neighborhood":      return wk("00:00-23:59");
       case "Sacred Space":      return wk("09:00-17:00");
       case "Food & Drink":      return wk("11:00-22:00");
       case "Rooftop & Bar":     return { mon:"16:00-23:00", tue:"16:00-23:00", wed:"16:00-23:00", thu:"16:00-00:00", fri:"16:00-01:00", sat:"12:00-01:00", sun:"12:00-23:00" };
       case "Stage & Screen":    return { mon:null, tue:"19:00-22:30", wed:"19:00-22:30", thu:"19:00-22:30", fri:"19:00-23:59", sat:"17:00-23:59", sun:"17:00-21:00" };
       case "University":        return wk("08:00-20:00");
       case "Attraction":        return wk("10:00-21:00");
       default:                  return wk("09:00-18:00");
     }
   }
   
   function transitFromHome(lat, lng) {
     const mi = haversineMi(HOME.lat, HOME.lng, lat, lng);
     const walkMin = Math.round(mi / 3.1 * 60);   // ~3.1 mph walking
     const bikeMin = Math.round(mi / 9.5 * 60);   // ~9.5 mph Divvy
     if (walkMin <= 55) return { transport: "Walking", plan: `Walk ~${walkMin} min from Presidential Towers (${mi.toFixed(1)} mi).` };
     if (bikeMin <= 55) return { transport: "Cycling (Divvy)", plan: `Divvy ~${bikeMin} min from Presidential Towers (${mi.toFixed(1)} mi), or take the L.` };
     return { transport: "L / CTA", plan: `~${mi.toFixed(1)} mi from home — take the L or Metra (walk/Divvy would be over an hour).` };
   }
   function budgetGuess(cat) {
     if (["Beach & Lakefront","Park & Garden","University","Public Art","Sacred Space","Landmark"].includes(cat)) return "Free";
     if (cat === "Museum") return "$$";
     if (cat === "Food & Drink") return "$";
     if (["Rooftop & Bar","Stage & Screen","Sports"].includes(cat)) return "$$$";
     return "$$";
   }
   
   function setStatus(msg, kind) {
     const el = $("#lookup-status");
     el.className = `lookup-status show ${kind}`;
     el.textContent = msg;
   }
   
   async function lookupPlace() {
     const name = $("#lookup-name").value.trim();
     if (!name) return;
     const btn = $("#lookup-btn");
     btn.disabled = true;
     setStatus("Searching OpenStreetMap & Wikipedia…", "load");
     const f = $("#add-form");
     f.name.value = name;
   
     try {
       // 1) Geocode via Nominatim (free, no key). Bias to Chicago.
       const q = encodeURIComponent(/chicago/i.test(name) ? name : `${name}, Chicago`);
       const geoURL = `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&addressdetails=1&extratags=1&limit=1`;
       const geo = await fetch(geoURL, { headers: { "Accept": "application/json" } }).then((r) => r.json());
   
       if (geo && geo[0]) {
         const g = geo[0];
         const lat = parseFloat(g.lat), lng = parseFloat(g.lon);
         const a = g.address || {};
         const hood = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.borough || "";
         const cat = guessCategory(g.class, g.type, name);
         const { transport, plan } = transitFromHome(lat, lng);
   
         f.lat.value = lat.toFixed(5);
         f.lng.value = lng.toFixed(5);
         f.neighborhood.value = hood;
         f.type.value = [...f.type.options].some((o) => o.value === cat) ? cat : "Scenic";
         f.location.value = g.display_name ? g.display_name.split(",").slice(0, 3).join(",").trim() : name;
         f.transportation.value = transport;
         f.transitPlan.value = plan;
         if (!f.budget.value) f.budget.value = budgetGuess(cat);
         /* stash guessed hours on the form so submitAdd can pick them up */
         state.pendingHours = guessHours(cat);
         setStatus("Found it ✓ — filling in the rest…", "load");
       } else {
         setStatus("Couldn't place it on the map — fill coordinates by hand, or try a more specific name. Still grabbing a description…", "err");
       }
   
       // 2) Wikipedia summary for the "Why" (free, CORS-enabled)
       try {
         const wURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
         const w = await fetch(wURL).then((r) => (r.ok ? r.json() : null));
         if (w && w.extract && !/may refer to/i.test(w.extract)) {
           f.why.value = w.extract;
           if (w.thumbnail?.source && !f.photo.value) f.photo.value = w.thumbnail.source;
           setStatus("Auto-filled ✓ — these are best guesses (especially the hours). Fix anything wrong, then Save.", "ok");
         } else if (geo && geo[0]) {
           setStatus("Filled from the map ✓ — no Wikipedia entry, so write the “Why” yourself. Hours are a category guess; correct them and Save.", "ok");
         }
       } catch {
         if (geo && geo[0]) setStatus("Auto-filled from the map ✓  Review & Save.", "ok");
       }
     } catch (e) {
       setStatus("Lookup failed (are you online?). You can still type everything in by hand and Save.", "err");
     } finally {
       btn.disabled = false;
     }
   }
   
   function openAddModal() {
     state.pendingHours = null;
     $("#add-form").reset();
     $("#lookup-name").value = "";
     $("#lookup-status").className = "lookup-status";
     $("#add-modal").classList.add("is-open");
     setTimeout(() => $("#lookup-name").focus(), 60);
   }
   function closeAddModal() { $("#add-modal").classList.remove("is-open"); }
   
   function submitAdd(e) {
     e.preventDefault();
     const f = e.target;
     const name = f.name.value.trim();
     if (!name) return;
     let id = slugify(name);
     // avoid collision
     if (state.places.some((p) => p.id === id)) id = `${id}-${Date.now().toString(36).slice(-4)}`;
   
     const lat = parseFloat(f.lat.value), lng = parseFloat(f.lng.value);
     const place = {
       id, name,
       status: f.status.value,
       favorite: f.favorite.value === "true",
       type: f.type.value,
       neighborhood: f.neighborhood.value.trim(),
       budget: f.budget.value,
       transportation: f.transportation.value.trim(),
       plannedTime: "", duration: "", travelBuddy: "", firstVisit: "",
       location: f.location.value.trim(),
       rating: null,
       lat: Number.isFinite(lat) ? lat : null,
       lng: Number.isFinite(lng) ? lng : null,
       photo: f.photo.value.trim(),
       hours: state.pendingHours || guessHours(f.type.value),
       notes: "",
       scoutingReport: {
         why: f.why.value.trim(),
         gamePlan: { bestTime: "", recurringEvents: "", cost: f.budget.value, transitPlan: f.transitPlan.value.trim() },
         lookingForwardTo: "",
       },
       postAnalysis: {
         snapshot: { date: "", timeOfDay: "", who: "", howLong: "", howGotThere: "" },
         firstImpression: "", highlight: "", lowlight: "", memoryShelf: [], wouldGoAgain: "",
       },
     };
     const ov = loadOverrides();
     ov[id] = place;
     saveOverrides(ov);
     closeAddModal();
     refresh();
     toast(ghIsConfigured() ? "Added — saving to GitHub…" : `Added "${name}" ✓ (saved to this browser)`);
     if (Number.isFinite(lat) && Number.isFinite(lng)) state.map?.flyTo({ center: [lng, lat], zoom: 16, pitch: 55, duration: 1000 });
     setTimeout(() => openPanel(id), 400);
     ghAutoCommit(`Add "${name}"`);
   }
   
   /* ============================================================
      GITHUB SYNC — commit places.json straight to your repo from
      the browser, using GitHub's Contents API (which supports CORS).
      Your token is stored ONLY in this browser's localStorage and is
      sent ONLY to api.github.com — never anywhere else.
      ============================================================ */
   function ghConfig() {
     try { return JSON.parse(localStorage.getItem(GH_KEY)) || null; }
     catch { return null; }
   }
   function ghSaveConfig(cfg) { localStorage.setItem(GH_KEY, JSON.stringify(cfg)); }
   function ghClearConfig() { localStorage.removeItem(GH_KEY); }
   function ghIsConfigured() {
     const c = ghConfig();
     return !!(c && c.owner && c.repo && c.token);
   }
   
   function b64EncodeUnicode(str) {
     // handles emoji / non-Latin1 chars in JSON before btoa()
     return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
       (_, p1) => String.fromCharCode("0x" + p1)));
   }
   
   /* Push the CURRENT merged places.json straight to GitHub as a commit. */
   async function ghCommitPlaces(commitMessage) {
     const cfg = ghConfig();
     if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) {
       throw new Error("GitHub isn't connected yet — click “⚙ Connect GitHub” first.");
     }
     const branch = cfg.branch || "main";
     const path = "data/places.json";
     const api = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
     const headers = {
       "Accept": "application/vnd.github+json",
       "Authorization": `Bearer ${cfg.token}`,
     };
   
     // 1) Get current file SHA (required by GitHub to update an existing file)
     let sha;
     const getResp = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
     if (getResp.ok) {
       const info = await getResp.json();
       sha = info.sha;
     } else if (getResp.status !== 404) {
       const body = await getResp.text();
       throw new Error(`GitHub rejected the read (HTTP ${getResp.status}): ${body.slice(0,200)}`);
     }
   
     // 2) Build the merged, sorted JSON exactly like the export button does
     const clean = state.places.slice().sort((a, b) => a.name.localeCompare(b.name))
       .map((p) => { const q = structuredClone(p); delete q.__deleted; return q; });
     const content = b64EncodeUnicode(JSON.stringify(clean, null, 2));
   
     // 3) PUT the new content as a commit
     const putResp = await fetch(api, {
       method: "PUT",
       headers: { ...headers, "Content-Type": "application/json" },
       body: JSON.stringify({
         message: commitMessage || "Update places.json from My Chicago Summer",
         content, branch,
         ...(sha ? { sha } : {}),
         committer: { name: "Chicago Summer Journal", email: "journal@localhost" },
       }),
     });
     if (!putResp.ok) {
       const body = await putResp.json().catch(() => ({}));
       throw new Error(body.message || `GitHub rejected the write (HTTP ${putResp.status})`);
     }
     return true;
   }
   
   /* Auto-commit wrapper used after add/edit/delete/status/fav actions.
      Silently does nothing if GitHub isn't connected — falls back to the
      local-only + manual-export flow, so nothing breaks either way. */
   async function ghAutoCommit(message) {
     if (!ghIsConfigured()) return;
     try {
       toast("Saving to GitHub…");
       await ghCommitPlaces(message);
       toast("✓ Saved permanently to GitHub");
     } catch (e) {
       toast(`GitHub save failed — kept locally. (${e.message})`);
     }
   }
   
   function ghSettingsHTML() {
     const cfg = ghConfig() || {};
     return `
       <div class="modal">
         <div class="modal__top">
           <h2>⚙ Connect GitHub</h2>
           <p>Save places directly &amp; permanently to your repo — no export/import step.</p>
           <button class="close" id="gh-close" aria-label="Close">✕</button>
         </div>
         <div class="modal__body">
           <p class="lookup-hint" style="margin-bottom:14px">
             Create a token scoped to <strong>only this one repo</strong>:
             GitHub → <strong>Settings → Developer settings → Personal access tokens →
             Fine-grained tokens → Generate new token</strong>. Under
             <strong>Repository access</strong>, choose “Only select repositories” →
             your CHI-SUMMER repo. Under <strong>Permissions → Repository permissions</strong>,
             set <strong>Contents: Read and write</strong>. Generate, then paste it below.
             It's stored only in this browser and sent only to api.github.com.
           </p>
           <div class="form-grid">
             <div><label>GitHub username</label>
               <input class="edit-field" id="gh-owner" value="${esc(cfg.owner||"")}" placeholder="YoungCoderPro" /></div>
             <div><label>Repository name</label>
               <input class="edit-field" id="gh-repo" value="${esc(cfg.repo||"")}" placeholder="CHI-SUMMER" /></div>
             <div><label>Branch</label>
               <input class="edit-field" id="gh-branch" value="${esc(cfg.branch||"main")}" placeholder="main" /></div>
             <div><label>Fine-grained token</label>
               <input class="edit-field" id="gh-token" type="password" value="${esc(cfg.token||"")}" placeholder="github_pat_…" /></div>
           </div>
           <div class="lookup-status" id="gh-status"></div>
           <div class="modal__foot">
             ${cfg.token ? `<button class="pbtn pbtn--danger" id="gh-disconnect">Disconnect</button>` : ""}
             <button class="pbtn" id="gh-test">Test connection</button>
             <button class="pbtn pbtn--primary" id="gh-save">Save</button>
           </div>
         </div>
       </div>`;
   }
   
   function openGhSettings() {
     let modal = $("#gh-modal");
     if (!modal) {
       modal = document.createElement("div");
       modal.id = "gh-modal";
       modal.className = "modal-backdrop";
       document.body.appendChild(modal);
     }
     modal.innerHTML = ghSettingsHTML();
     modal.classList.add("is-open");
     $("#gh-close").addEventListener("click", () => modal.classList.remove("is-open"));
     modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("is-open"); });
   
     $("#gh-save").addEventListener("click", () => {
       ghSaveConfig({
         owner: $("#gh-owner").value.trim(),
         repo: $("#gh-repo").value.trim(),
         branch: $("#gh-branch").value.trim() || "main",
         token: $("#gh-token").value.trim(),
       });
       toast("GitHub connected ✓ — new saves commit automatically");
       modal.classList.remove("is-open");
       updateGhButtonLabel();
     });
   
     $("#gh-disconnect")?.addEventListener("click", () => {
       ghClearConfig();
       toast("Disconnected — saves are local-only again");
       modal.classList.remove("is-open");
       updateGhButtonLabel();
     });
   
     $("#gh-test").addEventListener("click", async () => {
       const statusEl = $("#gh-status");
       statusEl.className = "lookup-status show load";
       statusEl.textContent = "Testing…";
       ghSaveConfig({
         owner: $("#gh-owner").value.trim(),
         repo: $("#gh-repo").value.trim(),
         branch: $("#gh-branch").value.trim() || "main",
         token: $("#gh-token").value.trim(),
       });
       try {
         await ghCommitPlaces("Test connection from My Chicago Summer");
         statusEl.className = "lookup-status show ok";
         statusEl.textContent = "✓ Success — a test commit was just pushed to your repo.";
       } catch (e) {
         statusEl.className = "lookup-status show err";
         statusEl.textContent = `✕ ${e.message}`;
       }
     });
   }
   
   function updateGhButtonLabel() {
     const btn = $("#gh-connect-btn");
     if (!btn) return;
     btn.innerHTML = ghIsConfigured() ? "🟢 GitHub connected" : "⚙ Connect GitHub";
   }
   
   /* ============================================================
      EXPORT — download merged places.json to commit to the repo
      ============================================================ */
   function exportJSON() {
     const clean = state.places
       .slice()
       .sort((a, b) => a.name.localeCompare(b.name))
       .map((p) => { const q = structuredClone(p); delete q.__deleted; return q; });
     const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url; a.download = "places.json"; a.click();
     URL.revokeObjectURL(url);
     toast("Downloaded places.json — drop it in /data and commit");
   }
   
   /* ============================================================
      MISC — toast, stars, wiring
      ============================================================ */
   let toastT;
   function toast(msg) {
     const el = $("#toast");
     el.textContent = msg; el.classList.add("show");
     clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2600);
   }
   
   function paintStaticStars() {
     $("#eyebrow-stars").innerHTML = starRow(4);
     $("#foot-stars").innerHTML = starRow(4);
     $("#skyline").innerHTML = skylineSVG();
     $("#skyline-foot").innerHTML = skylineSVG();
   }
   
   function wireControls() {
     $("#search").addEventListener("input", (e) => { state.search = e.target.value; drawPlaces(); renderGrid(); });
     $$("#filters .chip").forEach((c) => c.addEventListener("click", () => {
       $$("#filters .chip").forEach((x) => x.classList.remove("is-active"));
       c.classList.add("is-active");
       state.filter = c.dataset.filter;
       drawPlaces(); renderGrid();
     }));
     $$("#rec-tabs .rec-tab").forEach((t) => t.addEventListener("click", () => {
       $$("#rec-tabs .rec-tab").forEach((x) => x.classList.remove("is-active"));
       t.classList.add("is-active");
       state.recMode = t.dataset.mode;
       renderRecommendations();
     }));
     $("#open-add").addEventListener("click", openAddModal);
     $("#close-add").addEventListener("click", closeAddModal);
     $("#cancel-add").addEventListener("click", closeAddModal);
     $("#lookup-btn").addEventListener("click", lookupPlace);
     $("#lookup-name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); lookupPlace(); } });
     $("#add-form").addEventListener("submit", submitAdd);
     $("#panel-backdrop").addEventListener("click", closePanel);
     document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePanel(); closeAddModal(); } });
   
     // GitHub connect + export buttons, injected under the legend
     const bar = document.createElement("div");
     bar.style.cssText = "display:flex;gap:9px;margin-top:12px;flex-wrap:wrap";
   
     const ghBtn = document.createElement("button");
     ghBtn.className = "pbtn pbtn--primary";
     ghBtn.id = "gh-connect-btn";
     ghBtn.innerHTML = "⚙ Connect GitHub";
     ghBtn.title = "Connect once, then every add/edit saves permanently to your repo automatically";
     ghBtn.addEventListener("click", openGhSettings);
   
     const exportBtn = document.createElement("button");
     exportBtn.className = "pbtn";
     exportBtn.style.marginLeft = "auto";
     exportBtn.innerHTML = "⬇ Export data";
     exportBtn.title = "Manual fallback: download places.json to commit yourself";
     exportBtn.addEventListener("click", exportJSON);
   
     bar.append(ghBtn, exportBtn);
     $("#legend").after(bar);
     updateGhButtonLabel();
   }
   
   async function main() {
     paintStaticStars();
     try {
       await loadData();
     } catch (e) {
       document.querySelector("main").insertAdjacentHTML("afterbegin",
         `<p style="color:#C60C30;padding:16px;background:#fff;border-radius:12px">Couldn't load <code>data/places.json</code>. Run through a local server (VS Code Live Server or <code>python3 -m http.server</code>), not by double-clicking the file.</p>`);
       return;
     }
     renderStats();
     renderLegend();
     renderCatChips();
     renderCountdown();
     renderProgress();
     renderRecommendations();
     initMap();
     renderGrid();
     wireControls();
     /* keep the live open/closed indicators honest */
     setInterval(() => { renderRecommendations(); renderGrid(); }, 60000);
   }
   document.addEventListener("DOMContentLoaded", main);