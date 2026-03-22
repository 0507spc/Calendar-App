import { useState } from 'react';

export default function App() {
  const [dates, setDates] = useState('2026-03-22,2026-03-27');
  const [color, setColor] = useState('#ff3b30');
  const [device, setDevice] = useState('iphone16pm');
  const [image, setImage] = useState(null);

  const generate = async () => {
    // const res = await fetch('http://localhost:3000/calendar', {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dates: dates.split(',').map(d => d.trim()),
        color,
        device
      })
    });

    const blob = await res.blob();
    setImage(URL.createObjectURL(blob));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Calendar Generator</h2>

      <div>
        <label>Dates (comma separated)</label><br/>
        <input
          value={dates}
          onChange={e => setDates(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <div>
        <label>Color</label><br/>
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
        />
      </div>

      <div>
        <label>Device</label><br/>
        <select value={device} onChange={e => setDevice(e.target.value)}>
          <option value="iphone16pm">iPhone 16 Pro Max</option>
          <option value="iphone15">iPhone 15</option>
          <option value="default">Default</option>
        </select>
      </div>

      <button onClick={generate} style={{ marginTop: 10 }}>
        Generate
      </button>

      {image && (
        <div style={{ marginTop: 20 }}>
          <img src={image} style={{ maxWidth: 300 }} />
        </div>
      )}
    </div>
  );
}