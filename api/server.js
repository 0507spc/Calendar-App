const express = require('express');
const { createCanvas } = require('canvas');
const dayjs = require('dayjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ===== DEVICE SIZES =====
const DEVICES = {
  iphone16pm: { width: 1290, height: 2796 },
  iphone15: { width: 1179, height: 2556 },
  default: { width: 1080, height: 1920 }
};

// ===== HELPERS =====
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

function dimColor(hex, factor = 0.4) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
}

// ===== DRAW MONTH =====
function drawMonth(ctx, x, y, month, highlighted, color, scale = 1, options = {}) {
  const {
    showHighlighted = true,
    showHeaders = false,
    futureOnly = false,
    glow = true
  } = options;

  const start = month.startOf('month');
  const daysInMonth = month.daysInMonth();
  const today = dayjs();

  const startDay = (start.day() + 6) % 7;
  const cell = 40 * scale;

  ctx.fillStyle = '#fff';
  ctx.font = `${28 * scale}px Sans`;
  ctx.textAlign = 'left';
  ctx.fillText(month.format('MMMM').toUpperCase(), x, y - 20 * scale);

  if (showHeaders) {
    const days = ['M','T','W','T','F','S','S'];
    ctx.font = `${12 * scale}px Sans`;
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';

    for (let i = 0; i < 7; i++) {
      ctx.fillText(days[i], x + i * cell + cell / 2, y - 2);
    }
  }

  let col = startDay;
  let row = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dx = x + col * cell;
    const dy = y + row * cell;

    const isHighlightedRaw = highlighted.includes(d);
    const thisDate = month.date(d);
    const isPast = thisDate.isBefore(today, 'day');

    const isHighlighted =
      showHighlighted &&
      (futureOnly ? (isHighlightedRaw && !isPast) : isHighlightedRaw);

    let fillColor = '#333';
    let textColor = '#fff';

    if (isHighlighted) {
      if (isPast) {
        fillColor = dimColor(color, 0.35);
        ctx.globalAlpha = 0.6;
      } else {
        fillColor = color;
        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 20 * scale;
        }
      }
    } else if (futureOnly && isHighlightedRaw && isPast) {
      fillColor = '#222';
      ctx.globalAlpha = 0.5;
    } else if (isPast) {
      fillColor = '#1a1a1a';
      textColor = '#666';
      ctx.globalAlpha = 0.7;
    }

    ctx.beginPath();
    ctx.arc(dx + cell/2, dy + cell/2, 14 * scale, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.fillStyle = textColor;
    ctx.font = `${14 * scale}px Sans`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.toString(), dx + cell/2, dy + cell/2);

    col++;
    if (col > 6) {
      col = 0;
      row++;
    }
  }
}

// ===== API =====
app.post('/calendar', (req, res) => {
  const {
    dates = [],
    color = '#ff3b30',
    device = 'default',
    showHeaders = false,
    widgetMode = false,

    glowCurrentMonth = true,
    glowSmallMonths = false,
    glowNextEvent = true,

    heightOffset = 0,
    widthOffset = 0,

    mainScaleAdjust = 1,
    smallScaleAdjust = 1
  } = req.body;

  const { width, height } = DEVICES[device] || DEVICES.default;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const grouped = groupDates(dates);
  const now = dayjs();

  const centerX = width / 2 + widthOffset;

  const safeTop = height * (widgetMode ? 0.05 : 0.12);
  const safeBottom = height * (widgetMode ? 0.05 : 0.12);

  const baseLarge = widgetMode ? 1.1 : 1.4;
  const baseSmall = widgetMode ? 0.7 : 0.8;

  let largeScale = baseLarge * mainScaleAdjust;
  let smallScale = baseSmall * smallScaleAdjust;

  // ===== AUTO BALANCE =====
  function calculateHeights(ls, ss) {
    return {
      large: 40 * ls * 6 + 60,
      small: 240 * 2 * ss
    };
  }

  let sizes = calculateHeights(largeScale, smallScale);
  let totalHeight = sizes.large + 40 + sizes.small + 40 + 120;

  const maxHeight = height - safeTop - safeBottom;

  if (totalHeight > maxHeight) {
    const ratio = maxHeight / totalHeight;

    // scale both proportionally
    largeScale *= ratio;
    smallScale *= ratio;

    sizes = calculateHeights(largeScale, smallScale);
    totalHeight = sizes.large + 40 + sizes.small + 40 + 120;
  }

  // ===== ADAPTIVE SPACING =====
  const gap = Math.max(20, Math.min(60, height * 0.02));
  const verticalGap = Math.max(20, Math.min(80, height * 0.03));

  const baseY =
    safeTop +
    (height - safeTop - safeBottom - totalHeight) / 2;

  const contentStartY = baseY + height * 0.05 + heightOffset;

  // ===== LARGE =====
  const largeWidth = 7 * 40 * largeScale;
  const largeX = centerX - largeWidth / 2;
  const largeY = contentStartY + 60;

  drawMonth(ctx, largeX, largeY, now,
    grouped[now.format('YYYY-MM')] || [],
    color,
    largeScale,
    { showHeaders, glow: glowCurrentMonth }
  );

  // ===== SMALL =====
  const smallWidth = 7 * 40 * smallScale;
  const gridWidth = smallWidth * 2 + gap;

  const gridStartX = centerX - gridWidth / 2;
  const gridStartY = largeY + sizes.large + verticalGap;

  for (let i = 1; i <= 4; i++) {
    const m = now.add(i, 'month');
    const key = m.format('YYYY-MM');

    const col = (i - 1) % 2;
    const row = Math.floor((i - 1) / 2);

    const x = gridStartX + col * (smallWidth + gap);
    const y = gridStartY + row * (200 * smallScale + verticalGap);

    drawMonth(ctx, x, y, m, grouped[key] || [], color, smallScale, {
      showHighlighted: true,
      futureOnly: true,
      showHeaders,
      glow: glowSmallMonths
    });
  }

  // ===== NEXT EVENT =====
  const next = getNextDate(dates);
  let bottomY = gridStartY + 2 * (200 * smallScale + verticalGap);

  if (next) {
    let diff = next.startOf('day').diff(dayjs().startOf('day'), 'day');
    if (diff === 0) diff = 1;

    const textY = bottomY + 40;

    if (!widgetMode) {
      ctx.fillStyle = '#aaa';
      ctx.font = '28px Sans';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT EVENT', centerX, textY);
    }

    if (glowNextEvent) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = '#fff';
    ctx.font = '48px Sans';
    ctx.fillText(`${diff} DAY${diff > 1 ? 'S' : ''}`, centerX, textY + 50);

    ctx.shadowBlur = 0;

    bottomY = textY + 80;
  }

  // ===== BORDER =====
  const borderPadding = 40;
  const contentWidth = width * 0.65;
  const borderX = (width - contentWidth) / 2 + widthOffset;

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = widgetMode ? 4 : 8;

  ctx.beginPath();
  ctx.roundRect(
    borderX,
    contentStartY - borderPadding,
    contentWidth,
    (bottomY - contentStartY) + borderPadding * 2,
    40
  );
  ctx.stroke();

  res.setHeader('Content-Type', 'image/png');
  canvas.createPNGStream().pipe(res);
});

app.listen(3000, () =>
  console.log('API running on http://localhost:3000')
);
