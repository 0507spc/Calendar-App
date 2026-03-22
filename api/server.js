const express = require('express');
const { createCanvas } = require('canvas');
const dayjs = require('dayjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DEVICES = {
  iphone16pm: { width: 1290, height: 2796 },
  iphone15: { width: 1179, height: 2556 },
  default: { width: 1080, height: 1920 }
};

function groupDates(dates) {
  const map = {};
  dates.forEach(d => {
    const key = dayjs(d).format('YYYY-MM');
    if (!map[key]) map[key] = [];
    map[key].push(dayjs(d).date());
  });
  return map;
}

function getNextDate(dates) {
  const now = dayjs();
  return dates
    .map(d => dayjs(d))
    .filter(d => d.isAfter(now))
    .sort((a, b) => a - b)[0];
}

function drawMonth(ctx, x, y, month, highlighted, color, scale = 1) {
  const start = month.startOf('month');
  const daysInMonth = month.daysInMonth();
  const startDay = start.day();

  const cell = 40 * scale;

  ctx.fillStyle = '#fff';
  ctx.font = `${28 * scale}px Sans`;
  ctx.fillText(month.format('MMMM').toUpperCase(), x, y - 20 * scale);

  let col = startDay;
  let row = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dx = x + col * cell;
    const dy = y + row * cell;

    const isActive = highlighted.includes(d);

    ctx.beginPath();
    ctx.arc(dx, dy, 14 * scale, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? color : '#333';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `${14 * scale}px Sans`;
    ctx.fillText(d.toString(), dx - (6 * scale), dy + (5 * scale));

    col++;
    if (col > 6) {
      col = 0;
      row++;
    }
  }
}

app.post('/calendar', (req, res) => {
  const { dates = [], color = '#ff3b30', device = 'default' } = req.body;

  const { width, height } = DEVICES[device] || DEVICES.default;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  // white border
  const padding = 40;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

  const grouped = groupDates(dates);
  const now = dayjs();
  const centerX = width / 2;

  // ===== DRAW MONTH FUNCTION (WITH SCALE) =====
  function drawMonth(ctx, x, y, month, highlighted, color, scale = 1) {
    const start = month.startOf('month');
    const daysInMonth = month.daysInMonth();
    const startDay = start.day();

    const cell = 40 * scale;

    ctx.fillStyle = '#fff';
    ctx.font = `${28 * scale}px Sans`;
    ctx.textAlign = 'left';
    ctx.fillText(month.format('MMMM').toUpperCase(), x, y - 20 * scale);

    let col = startDay;
    let row = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dx = x + col * cell;
      const dy = y + row * cell;

      const isActive = highlighted.includes(d);

      ctx.beginPath();
      ctx.arc(dx, dy, 14 * scale, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? color : '#333';
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `${14 * scale}px Sans`;
      ctx.fillText(d.toString(), dx - (6 * scale), dy + (5 * scale));

      col++;
      if (col > 6) {
        col = 0;
        row++;
      }
    }
  }

  // ===== LARGE CURRENT MONTH =====
  const largeScale = 1.4;
  const largeWidth = 7 * 40 * largeScale;

  const largeX = centerX - largeWidth / 2;
  const largeY = 220;

  drawMonth(
    ctx,
    largeX,
    largeY,
    now,
    grouped[now.format('YYYY-MM')] || [],
    color,
    largeScale
  );

  // ===== SMALL MONTHS (2x2 GRID) =====
  const smallScale = 0.8;
  const smallWidth = 7 * 40 * smallScale;
  const gap = 40;

  const gridWidth = smallWidth * 2 + gap;
  const gridStartX = centerX - gridWidth / 2;
  const gridStartY = largeY + 320;

  for (let i = 1; i <= 4; i++) {
    const m = now.add(i, 'month');
    const key = m.format('YYYY-MM');

    const col = (i - 1) % 2;
    const row = Math.floor((i - 1) / 2);

    const x = gridStartX + col * (smallWidth + gap);
    const y = gridStartY + row * 240;

    drawMonth(
      ctx,
      x,
      y,
      m,
      grouped[key] || [],
      color,
      smallScale
    );
  }

  // ===== NEXT EVENT =====
  const next = getNextDate(dates);

  if (next) {
    const diff = next.diff(dayjs(), 'day');
    const textY = gridStartY + 2 * 240 + 140;

    ctx.textAlign = 'center';

    ctx.fillStyle = '#aaa';
    ctx.font = '28px Sans';
    ctx.fillText('NEXT EVENT', centerX, textY);

    ctx.fillStyle = '#fff';
    ctx.font = '48px Sans';
    ctx.fillText(`${diff} DAYS`, centerX, textY + 60);
  }

  res.setHeader('Content-Type', 'image/png');
  canvas.createPNGStream().pipe(res);
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));