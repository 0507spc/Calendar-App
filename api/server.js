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

// ===== DRAW MONTH =====
function drawMonth(
  ctx,
  x,
  y,
  month,
  highlighted,
  color,
  scale = 1,
  options = {}
) {
  const {
    showHighlighted = true,
    showHeaders = false
  } = options;

  const start = month.startOf('month');
  const daysInMonth = month.daysInMonth();

  const today = dayjs();

  // Monday start
  const startDay = (start.day() + 6) % 7;

  const cell = 40 * scale;

  // Month title
  ctx.fillStyle = '#fff';
  ctx.font = `${28 * scale}px Sans`;
  ctx.textAlign = 'left';
  ctx.fillText(month.format('MMMM').toUpperCase(), x, y - 20 * scale);

  // Headers
  if (showHeaders) {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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

    const isHighlighted = highlighted.includes(d);

    const thisDate = month.date(d);
    const isPast = thisDate.isBefore(today, 'day');

    let fillColor = '#333';
    let textColor = '#fff';


    if (showHighlighted && isHighlighted) {
  
}

    // •	#8b1e1e = subtle
	  // •	#661111 = more faded
	  // •	#aa2a2a = slightly stronger
    if (showHighlighted && isHighlighted) {
      fillColor = isPast ? '#8b1e1e' : color; // 👈 dim red for past events
    } else if (isPast) {
      fillColor = '#1a1a1a';
      textColor = '#666';
    }

    // Circle
    ctx.beginPath();
    ctx.arc(
      dx + cell / 2,
      dy + cell / 2,
      14 * scale,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Text (centered)
    ctx.fillStyle = textColor;
    ctx.font = `${14 * scale}px Sans`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
      d.toString(),
      dx + cell / 2,
      dy + cell / 2
    );

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

    // NEW OPTIONS
    showHeaders = false,
    widgetMode = false,
    showSmallMonthEvents = false
  } = req.body;

  const { width, height } = DEVICES[device] || DEVICES.default;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  const grouped = groupDates(dates);
  const now = dayjs();
  const centerX = width / 2;

  // ===== SAFE AREAS =====
  const safeTop = height * (widgetMode ? 0.05 : 0.12);
  const safeBottom = height * (widgetMode ? 0.05 : 0.12);

  // ===== SCALES =====
  const largeScale = widgetMode ? 1.1 : 1.4;
  const smallScale = widgetMode ? 0.7 : 0.8;

  const largeHeight = 40 * largeScale * 6 + 60;
  const smallBlockHeight = 240 * 2 * smallScale;
  const nextHeight = widgetMode ? 80 : 120;

  const totalContentHeight =
    largeHeight + 40 + smallBlockHeight + 40 + nextHeight;

  const contentStartY =
    safeTop +
    (height - safeTop - safeBottom - totalContentHeight) / 2;

  // ===== LARGE MONTH =====
  const largeWidth = 7 * 40 * largeScale;
  const largeX = centerX - largeWidth / 2;
  const largeY = contentStartY + 60;

  drawMonth(
    ctx,
    largeX,
    largeY,
    now,
    grouped[now.format('YYYY-MM')] || [],
    color,
    largeScale,
    { showHeaders }
  );

  // ===== SMALL MONTHS =====
  const smallWidth = 7 * 40 * smallScale;
  const gap = 40;

  const gridWidth = smallWidth * 2 + gap;
  const gridStartX = centerX - gridWidth / 2;
  const gridStartY = largeY + largeHeight;

  for (let i = 1; i <= 4; i++) {
    const m = now.add(i, 'month');
    const key = m.format('YYYY-MM');

    const col = (i - 1) % 2;
    const row = Math.floor((i - 1) / 2);

    const x = gridStartX + col * (smallWidth + gap);
    const y = gridStartY + row * 240 * smallScale;

    drawMonth(
      ctx,
      x,
      y,
      m,
      grouped[key] || [],
      color,
      smallScale,
      {
        showHighlighted: showSmallMonthEvents,
        showHeaders
      }
    );
  }

  // ===== NEXT EVENT =====
  const next = getNextDate(dates);
  let bottomY = gridStartY + 2 * 240 * smallScale;

  if (next) {
    const diff = next.diff(dayjs(), 'day');
    const textY = bottomY + (widgetMode ? 40 : 80);

    ctx.textAlign = 'center';

    if (!widgetMode) {
      ctx.fillStyle = '#aaa';
      ctx.font = '28px Sans';
      ctx.fillText('NEXT EVENT', centerX, textY);
    }

    ctx.fillStyle = '#fff';
    ctx.font = widgetMode ? '36px Sans' : '48px Sans';
    ctx.fillText(`${diff} DAYS`, centerX, textY + 50);

    bottomY = textY + 80;
  }
  
  // ===== BORDER =====
  const borderPadding = 40;
  const innerPadding = 20;
  
  const contentTop = contentStartY;
  const contentBottom = bottomY;

  // const contentWidth = width * (widgetMode ? 0.9 : 0.72);
  const contentWidth = width * (widgetMode ? 0.85 : 0.65); // 👈 narrower
  const borderX = (width - contentWidth) / 2;
  const contentInnerX = borderX + innerPadding;

  const largeX = centerX - largeWidth / 2 + innerPadding / 2;

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = widgetMode ? 4 : 8;

  ctx.beginPath();
  ctx.roundRect(
    borderX,
    contentTop - borderPadding,
    contentWidth,
    (contentBottom - contentTop) + borderPadding * 2,
    40
  );
  ctx.stroke();

  res.setHeader('Content-Type', 'image/png');
  canvas.createPNGStream().pipe(res);
});

app.listen(3000, () =>
  console.log('API running on http://localhost:3000')
);
