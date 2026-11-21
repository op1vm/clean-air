/* ==========================================================
   CleanAir — лендінг
   Логіка рівнів повторює прототип CleanAir:
   кожен показник ділиться на свою норму, береться найгірше відношення,
   ≤ 0.5 — добре, ≤ 1.0 — помірно, ≤ 2.0 — шкідливо, інакше — небезпечно.
   Менше трьох вимірювань — показується попередження.
   ========================================================== */

const NORMS = {
  "PM2.5": { limit: 15, unit: "мкг/м³" },
  "PM10":  { limit: 45, unit: "мкг/м³" },
  "NO₂":   { limit: 25, unit: "мкг/м³" },
  "CO":    { limit: 4,  unit: "мг/м³" },
  "SO₂":   { limit: 40, unit: "мкг/м³" }
};

const LEVELS = [
  { max: 0.5,      key: "good",      title: "добре",      color: "--good" },
  { max: 1.0,      key: "moderate",  title: "помірно",    color: "--moderate" },
  { max: 2.0,      key: "unhealthy", title: "шкідливо",   color: "--unhealthy" },
  { max: Infinity, key: "danger",    title: "небезпечно", color: "--danger" }
];

/* Демо-дані: середні значення за останню годину */
const DISTRICTS = {
  park:       { name: "Парк Шевченка", count: 6, values: { "PM2.5": 5,  "PM10": 14, "NO₂": 9,  "CO": 0.8, "SO₂": 4 } },
  center:     { name: "Центр",         count: 4, values: { "PM2.5": 13, "PM10": 36, "NO₂": 21, "CO": 2.3, "SO₂": 14.5 } },
  industrial: { name: "Промзона",      count: 2, values: { "PM2.5": 42, "PM10": 93, "NO₂": 62, "CO": 7.5, "SO₂": 72 } },
  seaside:    { name: "Узбережжя",     count: 0, values: null }
};

/* Додаткові райони лише для бігучого рядка */
const TICKER_EXTRA = [
  { name: "Аркадія",   values: { "PM2.5": 6,  "PM10": 18, "NO₂": 10, "CO": 0.9, "SO₂": 5 } },
  { name: "Пересип",   values: { "PM2.5": 24, "PM10": 61, "NO₂": 33, "CO": 3.1, "SO₂": 38 } },
  { name: "Таїрова",   values: { "PM2.5": 11, "PM10": 30, "NO₂": 19, "CO": 1.7, "SO₂": 9 } },
  { name: "Слобідка",  values: { "PM2.5": 14, "PM10": 39, "NO₂": 17, "CO": 2.0, "SO₂": 21 } },
  { name: "Фонтан",    values: { "PM2.5": 4,  "PM10": 12, "NO₂": 8,  "CO": 0.6, "SO₂": 3 } }
];

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Розрахунок рівня ---------- */

function analyse(values) {
  let worstName = null;
  let worstRatio = -1;
  for (const [name, value] of Object.entries(values)) {
    const ratio = value / NORMS[name].limit;
    if (ratio > worstRatio) {
      worstRatio = ratio;
      worstName = name;
    }
  }
  const level = LEVELS.find(l => worstRatio <= l.max);
  return { level, worstName, worstRatio };
}

function formatNumber(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/* ---------- Hero: вибір району ---------- */

const hero = document.querySelector(".hero");
const discLevel = document.getElementById("disc-level");
const discPercent = document.getElementById("disc-percent");
const discNote = document.getElementById("disc-note");
const discWarning = document.getElementById("disc-warning");
const pollutantsEl = document.getElementById("pollutants");
const districtButtons = document.querySelectorAll(".district");

function showDistrict(id) {
  const d = DISTRICTS[id];

  districtButtons.forEach(btn => {
    btn.setAttribute("aria-selected", String(btn.dataset.district === id));
  });

  if (!d.values) {
    root.style.setProperty("--level", "var(--nodata)");
    hero.dataset.level = "nodata";
    discLevel.textContent = "немає даних";
    discPercent.textContent = "—";
    discPercent.nextElementSibling.hidden = true;
    discNote.textContent = "за останню годину сенсори тут нічого не передали";
    pollutantsEl.innerHTML = "";
    discWarning.hidden = true;
    return;
  }

  const { level, worstName, worstRatio } = analyse(d.values);
  root.style.setProperty("--level", `var(${level.color})`);
  hero.dataset.level = level.key;

  discLevel.textContent = level.title;
  discPercent.textContent = Math.round(worstRatio * 100);
  discPercent.nextElementSibling.hidden = false;
  discNote.textContent = `найгірший показник — ${worstName}`;

  pollutantsEl.innerHTML = Object.entries(d.values).map(([name, value]) => {
    const over = value > NORMS[name].limit ? ' class="over"' : "";
    return `<div${over}><dt>${name}</dt><dd>${formatNumber(value)}</dd></div>`;
  }).join("");

  if (d.count < 3) {
    discWarning.hidden = false;
    discWarning.textContent = `Тут лише ${d.count} вимірювання за годину — результат може бути неточним.`;
  } else {
    discWarning.hidden = true;
  }
}

districtButtons.forEach((btn, i) => {
  btn.addEventListener("click", () => showDistrict(btn.dataset.district));
  btn.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = districtButtons[(i + step + districtButtons.length) % districtButtons.length];
    next.focus();
    showDistrict(next.dataset.district);
  });
});

showDistrict("center");

/* ---------- Бігучий рядок ---------- */

function buildTicker() {
  const track = document.getElementById("ticker-track");
  const all = [
    ...Object.values(DISTRICTS).filter(d => d.values),
    ...TICKER_EXTRA
  ];

  const items = all.map(d => {
    const { level, worstName } = analyse(d.values);
    const value = d.values[worstName];
    return `
      <span class="ticker-item">
        <i style="--c: var(${level.color})"></i>
        <b>${d.name}</b>
        <span>${level.title}, ${worstName} ${formatNumber(value)} ${NORMS[worstName].unit}</span>
      </span>`;
  }).join("");

  // дві копії поспіль — рядок рухається на половину ширини й непомітно повторюється
  track.innerHTML = items + `<span aria-hidden="true" style="display:contents">${items}</span>`;
}

buildTicker();

/* ---------- Карусель ---------- */

function initCarousel(el) {
  const track = el.querySelector(".carousel-track");
  const slides = [...el.querySelectorAll(".slide")];
  const dotsWrap = el.querySelector(".dots");
  const viewport = el.querySelector(".carousel-viewport");
  let index = 0;
  let timer = null;
  const DELAY = 7000;

  const dots = slides.map((slide, i) => {
    const dot = document.createElement("button");
    dot.className = "dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", slide.querySelector("h3").textContent);
    dot.addEventListener("click", () => { go(i); restart(); });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((s, n) => {
      const active = n === index;
      s.setAttribute("aria-hidden", String(!active));
      s.inert = !active;
    });
    dots.forEach((d, n) => d.setAttribute("aria-selected", String(n === index)));
  }

  function stop() { clearInterval(timer); timer = null; }
  function start() {
    if (reduceMotion || timer) return;
    timer = setInterval(() => go(index + 1), DELAY);
  }
  function restart() { stop(); start(); }

  el.querySelectorAll(".arrow").forEach(btn => {
    btn.addEventListener("click", () => {
      go(index + Number(btn.dataset.dir));
      restart();
    });
  });

  el.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { go(index + 1); restart(); }
    if (e.key === "ArrowLeft")  { go(index - 1); restart(); }
  });

  // пауза, поки людина читає або користується клавіатурою
  el.addEventListener("mouseenter", stop);
  el.addEventListener("mouseleave", start);
  el.addEventListener("focusin", stop);
  el.addEventListener("focusout", start);

  // свайп на телефоні
  let startX = null;
  viewport.addEventListener("pointerdown", e => { startX = e.clientX; });
  viewport.addEventListener("pointerup", e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) { go(index + (dx < 0 ? 1 : -1)); restart(); }
    startX = null;
  });

  // не крутити карусель, коли її не видно
  new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? start() : stop());
  }, { threshold: 0.4 }).observe(el);

  go(0);
}

initCarousel(document.getElementById("carousel"));
