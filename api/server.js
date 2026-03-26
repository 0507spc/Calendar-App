const express = require('express');
const { createCanvas } = require('canvas');
const dayjs = require('dayjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ===== LOAD DEVICES =====
const DEVICES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'devices.json'), 'utf8')
);

// ===== HELPERS =====
function formatLabel(key, w, h) {
  return key
    .replace(/([a-z])([0-9])/i, '$1 $2')
    .replace(/pm/g, ' Pro Max')
    .replace(/pro/g, ' Pro')
    .replace(/plus/g, ' Plus')
    .replace(/\b\w/g, c => c.toUpperCase()) +
    ` (${w}x${h})`;
}

function groupDates(dates) {
  const perDay = {};
  const perMonth = {};

  dates.forEach(d => {
    const day = dayjs(d);
    const dayKey = day.format('YYYY-MM-DD');
    const monthKey = day.format('YYYY-MM');

    perDay[dayKey] = (perDay[dayKey] || 0) + 1;

    if (!perMonth[monthKey]) perMonth[monthKey] = [];
    perMonth[monthKey].push(day.date());
  });

  return { perDay, perMonth };
}

function dimColor(hex, factor = 0.4) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return `rgb(${r * factor},${g * factor},${b * factor})`;
}

function intensityColor(hex, intensity) {
  return dimColor(hex, 0.3 + intensity * 0.7);
}

function getNextDate(dates) {
  return dates.map(d => dayjs(d))
    .filter(d => d.isAfter(dayjs()))
    .sort((a,b)=>a-b)[0];
}

// ===== DRAW MONTH =====
function drawMonth(ctx, x, y, month, highlighted, color, scale) {
  const startDay = (month.startOf('month').day() + 6) % 7;
  const days = month.daysInMonth();
  const cell = 40 * scale;

  let col = startDay, row = 0;

  for (let d = 1; d <= days; d++) {
    const dx = x + col * cell;
    const dy = y + row * cell;

    if (highlighted.includes(d)) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dx+cell/2, dy+cell/2, 14*scale, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d, dx+cell/2, dy+cell/2);

    col++; if (col > 6) { col = 0; row++; }
  }
}

// ===== HEATMAP =====
function drawHeatmap(ctx, x, y, months, perDay, color, scale, density) {
  const cell = 12 * scale;
  const gap = 4 * scale;
  let offsetX = x;

  months.forEach(month => {
    let col = 0, row = (month.startOf('month').day()+6)%7;

    for (let d = 1; d <= month.daysInMonth(); d++) {
      const key = month.date(d).format('YYYY-MM-DD');
      const count = perDay[key] || 0;

      let fill = '#1a1a1a';
      if (count) {
        fill = density
          ? intensityColor(color, Math.min(count/5,1))
          : color;
      }

      ctx.fillStyle = fill;
      ctx.fillRect(
        offsetX + col*(cell+gap),
        y + row*(cell+gap),
        cell, cell
      );

      col++; if (col > 6) { col = 0; row++; }
    }

    offsetX += 8*(cell+gap) + 20;
  });
}

// ===== API =====
app.get('/devices', (req,res)=>{
  res.json(Object.entries(DEVICES).map(([k,v])=>({
    id:k,
    width:v.width,
    height:v.height,
    label:formatLabel(k,v.width,v.height)
  })));
});

app.post('/calendar', (req,res)=>{
  const {
    dates=[],
    color='#ff3b30',
    device='default',
    viewMode='calendar',
    heatmapDensity=false
  } = req.body;

  const {width,height} = DEVICES[device] || DEVICES.default;

  const canvas = createCanvas(width,height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle='#000';
  ctx.fillRect(0,0,width,height);

  const {perDay, perMonth} = groupDates(dates);
  const now = dayjs();

  if (viewMode === 'heatmap') {
    drawHeatmap(
      ctx,
      width*0.1,
      height*0.3,
      [0,1,2,3,4].map(i=>now.add(i,'month')),
      perDay,
      color,
      2,
      heatmapDensity
    );
  } else {
    drawMonth(
      ctx,
      width/2 - 200,
      height*0.25,
      now,
      perMonth[now.format('YYYY-MM')] || [],
      color,
      1.4
    );
  }

  const next = getNextDate(dates);
  if (next) {
    let diff = next.diff(dayjs(),'day') || 1;
    ctx.fillStyle='#fff';
    ctx.font='48px Sans';
    ctx.textAlign='center';
    ctx.fillText(`${diff} DAYS`, width/2, height*0.8);
  }

  res.setHeader('Content-Type','image/png');
  canvas.createPNGStream().pipe(res);
});

app.listen(3000,()=>console.log('API running'));
