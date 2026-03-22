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

function drawMonth(ctx, x, y, month, highlighted, color) {
  const start = month.startOf('month');
  const daysInMonth = month.daysInMonth();
  const startDay = start.day();

  const cell = 40;

  ctx.fillStyle = '#fff';
  ctx.font = '28px Sans';
  ctx.fillText(month.format('MMMM').toUpperCase(), x, y - 20);

  let col = startDay;
  let row = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dx = x + col * cell;
    const dy = y + row * cell;

    const isActive = highlighted.includes(d);

    ctx.beginPath();
    ctx.arc(dx, dy, 14, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? color : '#333';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '14px Sans';
    ctx.fillText(d.toString(), dx - 6, dy + 5);

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

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const grouped = groupDates(dates);
  const now = dayjs();

  let startX = width / 2 - 350;
  let startY = 200;

  for (let i = 0; i < 5; i++) {
    const m = now.add(i, 'month');
    const key = m.format('YYYY-MM');
    const highlights = grouped[key] || [];

    drawMonth(
      ctx,
      startX + (i % 2) * 400,
      startY + Math.floor(i / 2) * 300,
      m,
      highlights,
      color
    );
  }

  const next = getNextDate(dates);
  if (next) {
    const diff = next.diff(dayjs(), 'day');

    ctx.fillStyle = '#aaa';
    ctx.font = '32px Sans';
    ctx.fillText('NEXT EVENT', width / 2 - 120, height - 120);

    ctx.fillStyle = '#fff';
    ctx.font = '48px Sans';
    ctx.fillText(`${diff} DAYS`, width / 2 - 100, height - 60);
  }

  res.setHeader('Content-Type', 'image/png');
  canvas.createPNGStream().pipe(res);
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));