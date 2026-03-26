import { useState, useEffect } from "react";

const API_URL = "http://localhost:23000/calendar";

export default function App() {
  const [dates, setDates] = useState("2026-03-26\n2026-03-27");
  const [image, setImage] = useState(null);

  const [options, setOptions] = useState({
    color: "#ff3b30",
    device: "iphone16pm",
    showHeaders: false,
    widgetMode: false,

    glowCurrentMonth: true,
    glowSmallMonths: false,
    glowNextEvent: true,

    heightOffset: 0,
    widthOffset: 0,

    mainScaleAdjust: 1,
    smallScaleAdjust: 1
  });

  const payload = {
    dates: dates
      .split("\n")
      .map(d => d.trim())
      .filter(Boolean),
    ...options
  };

  const generate = async () => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const blob = await res.blob();
    setImage(URL.createObjectURL(blob));
  };

  useEffect(() => {
    generate();
  }, []);

  const update = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={styles.container}>
      <h1>Calendar Wallpaper Generator</h1>

      <div style={styles.grid}>
        {/* LEFT PANEL */}
        <div style={styles.panel}>
          <h3>Dates (one per line)</h3>
          <textarea
            style={styles.textarea}
            value={dates}
            onChange={e => setDates(e.target.value)}
          />

          <h3>Options</h3>

          <label>Color</label>
          <input
            type="color"
            value={options.color}
            onChange={e => update("color", e.target.value)}
          />

          <label>Device</label>
          <select
            value={options.device}
            onChange={e => update("device", e.target.value)}
          >
            <option value="iphone16pm">iPhone 16 Pro Max</option>
            <option value="iphone15">iPhone 15</option>
            <option value="default">Default</option>
          </select>

          <label>
            <input
              type="checkbox"
              checked={options.showHeaders}
              onChange={e => update("showHeaders", e.target.checked)}
            />
            Show Headers
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.widgetMode}
              onChange={e => update("widgetMode", e.target.checked)}
            />
            Widget Mode
          </label>

          <h4>Glow</h4>

          <label>
            <input
              type="checkbox"
              checked={options.glowCurrentMonth}
              onChange={e => update("glowCurrentMonth", e.target.checked)}
            />
            Current Month Glow
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.glowSmallMonths}
              onChange={e => update("glowSmallMonths", e.target.checked)}
            />
            Small Months Glow
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.glowNextEvent}
              onChange={e => update("glowNextEvent", e.target.checked)}
            />
            Next Event Glow
          </label>

          <h4>Position</h4>

          <label>Height Offset</label>
          <input
            type="number"
            value={options.heightOffset}
            onChange={e => update("heightOffset", Number(e.target.value))}
          />

          <label>Width Offset</label>
          <input
            type="number"
            value={options.widthOffset}
            onChange={e => update("widthOffset", Number(e.target.value))}
          />

          <h4>Scaling</h4>

          <label>Main Calendar Scale</label>
          <input
            type="number"
            step="0.1"
            value={options.mainScaleAdjust}
            onChange={e => update("mainScaleAdjust", Number(e.target.value))}
          />

          <label>Small Calendars Scale</label>
          <input
            type="number"
            step="0.1"
            value={options.smallScaleAdjust}
            onChange={e => update("smallScaleAdjust", Number(e.target.value))}
          />

          <button onClick={generate} style={styles.button}>
            Generate
          </button>
        </div>

        {/* PREVIEW */}
        <div style={styles.panel}>
          <h3>Preview</h3>
          {image && (
            <img
              src={image}
              alt="preview"
              style={{ maxWidth: "100%", borderRadius: 12 }}
            />
          )}
        </div>

        {/* JSON PANEL */}
        <div style={styles.panel}>
          <h3>JSON Payload</h3>

          <pre style={styles.json}>
            {JSON.stringify(payload, null, 2)}
          </pre>

          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(payload, null, 2))}
            style={styles.button}
          >
            Copy JSON
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== STYLES =====
const styles = {
  container: {
    padding: 20,
    fontFamily: "sans-serif",
    background: "#111",
    color: "#fff",
    minHeight: "100vh"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 20
  },
  panel: {
    background: "#1a1a1a",
    padding: 15,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  textarea: {
    width: "100%",
    height: 120,
    background: "#000",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 6,
    padding: 8
  },
  json: {
    background: "#000",
    padding: 10,
    borderRadius: 6,
    fontSize: 12,
    overflow: "auto",
    maxHeight: 300
  },
  button: {
    marginTop: 10,
    padding: "10px",
    border: "none",
    borderRadius: 8,
    background: "#ff3b30",
    color: "#fff",
    cursor: "pointer"
  }
};
