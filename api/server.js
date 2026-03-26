const express = require('express');
const { createCanvas } = require('canvas');
const dayjs = require('dayjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ===== DEVICES =====
const DEVICES = {
  iphone16pm: { width: 1320, height: 2868 },
  iphone15: { width: 1179, height: 2556 },
  pixel8pro: { width: 1344, height: 2992 },
  galaxys24ultra: { width: 1440, height: 3120 },
  default: { width: 1080, height: 1920 }
};

// ===== HELPERS =====
function groupDates(dates) {
  const perDay = {};
  const perMonth = {};

  dates.forEach(d => {
    const dayKey = dayjs(d).format('YYYY-MM-DD');
    const monthKey = dayjs(d).format('YYYY-MM');

    perDay[dayKey] = (perDay[dayKey] || 0) + 1;

    if (!perMonth[monthKey]) perMonth[monthKey] = [];
    perMonth[monthKey].push(dayjs(d).date());
  });

  return { perDay, perMonth };
}

function dimColor(hex, factor = 0.4) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
}

function getIntensityColor(base, intensity) {
  const factor = 0.3 + intensity * 0.7;
  return dimColor(base, factor);
}

function getNextDate(dates) {
  const now = dayjs();
  return dates
    .map(d => dayjs(d))
    .filter(d => d.isAfter(now))
    .sort((a, b) => a - b)[0];
}

// ===== DRAW MONTH (calendar mode) =====
function drawMonth(ctx, x, y, month, highlighted, color, scale = 1, options = {}) {
  const { showHeaders = false, glow = true } = options;

  const start = month.startOf('month');
  const daysInMonth = month.daysInMonth();
  const today = dayjs();

  const startDay = (start.day() + 6) % 7;
  const cell = 40 * scale;

  ctx.fillStyle = '#fff';
  ctx.font = `${28 * scale}px Sans`;
  ctx.fillText(month.format('MMMM').toUpperCase(), x, y - 20 * scale);

  let col = startDay;
  let row = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dx = x + col * cell;
    const dy = y + row * cell;

    const isHighlighted = highlighted.includes(d);
    const isPast = month.date(d).isBefore(today, 'day');

    let fill = '#333';

    if (isHighlighted) {
      fill = isPast ? dimColor(color, 0.35) : color;

      if (!isPast && glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 * scale;
      }
    }

    ctx.beginPath();
    ctx.arc(dx + cell/2, dy + cell/2, 14 * scale, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${14 * scale}px Sans`;
    ctx.fillText(d.toString(), dx + cell/2, dy + cell/2);

    col++;
    if (col > 6) { col = 0; row++; }
  }
}

// ===== HEATMAP =====
function drawHeatmap(ctx, x, y, months, grouped, color, scale, options = {}) {
  const { glow = true, density = false } = options;

  const today = dayjs();
  const cell = 12 * scale;
  const gap = 4 * scale;

  let offsetX = x;

  months.forEach(month => {
    const start = month.startOf('month');
    const daysInMonth = month.daysInMonth();
    const startDay = (start.day() + 6) % 7;

    let col = 0;
    let row = startDay;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = month.date(d).format('YYYY-MM-DD');
      const count = grouped[key] || 0;

      const isPast = month.date(d).isBefore(today, 'day');

      let fill = '#1a1a1a';

      if (count > 0) {
        if (density) {
          fill = getIntensityColor(color, Math.min(count / 5, 1));
        } else {
          fill = isPast ? dimColor(color, 0.4) : color;
        }

        if (!isPast && glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
        }
      }

      ctx.fillStyle = fill;
      ctx.fillRect(
        offsetX + col * (cell + gap),
        y + row * (cell + gap),
        cell,
        cell
      );

      ctx.shadowBlur = 0;

      col++;
      if (col > 6) { col = 0; row++; }
    }

    offsetX += 8 * (cell + gap) + 20;
  });
}

// ===== DEVICES =====
app.get('/devices', (req, res) => {
  res.json(Object.entries(DEVICES).map(([k, v]) => ({
    id: k,
    width: v.width,
    height: v.height,
    label: `${k} (${v.width}x${v.height})`
  })));
});

// ===== MAIN API =====
app.post('/calendar', (req, res) => {
  const {
    dates = [],
    color = '#ff3b30',
    device = 'default',

    viewMode = 'calendar',
    heatmapDensity = false,

    glowCurrentMonth = true
  } = req.body;

  const { width, height } = DEVICES[device] || DEVICES.default;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const { perDay, perMonth } = groupDates(dates);
  const now = dayjs();
  const centerX = width / 2;

  if (viewMode === 'heatmap') {
    const months = [0,1,2,3,4].map(i => now.add(i, 'month'));

    const scale = 2;
    const widthTotal = months.length * 120;

    drawHeatmap(
      ctx,
      centerX - widthTotal / 2,
      height * 0.3,
      months,
      perDay,
      color,
      scale,
      { glow: glowCurrentMonth, density: heatmapDensity }
    );
  } else {
    // ===== CALENDAR MODE =====
    drawMonth(
      ctx,
      centerX - 200,
      height * 0.25,
      now,
      perMonth[now.format('YYYY-MM')] || [],
      color,
      1.4,
      { glow: glowCurrentMonth }
    );
  }

  const next = getNextDate(dates);

  if (next) {
    let diff = next.startOf('day').diff(dayjs().startOf('day'), 'day');
    if (diff === 0) diff = 1;

    ctx.fillStyle = '#fff';
    ctx.font = '48px Sans';
    ctx.textAlign = 'center';
    ctx.fillText(`${diff} DAYS`, width / 2, height * 0.8);
  }

  res.setHeader('Content-Type', 'image/png');
  canvas.createPNGStream().pipe(res);
});

app.listen(3000);
