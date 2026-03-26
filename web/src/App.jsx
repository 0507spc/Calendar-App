import { useState, useEffect } from "react";

const API = "http://localhost:23000";

export default function App() {
  const [devices, setDevices] = useState([]);
  const [image, setImage] = useState(null);

  const [dates, setDates] = useState("2026-03-26\n2026-03-27");

  const [options, setOptions] = useState({
    device: "iphone16pm",
    color: "#ff3b30",
    viewMode: "calendar",
    heatmapDensity: true
  });

  const payload = {
    dates: dates.split("\n").filter(Boolean),
    ...options
  };

  useEffect(() => {
    fetch(`${API}/devices`)
      .then(r => r.json())
      .then(setDevices);

    generate();
  }, []);

  const generate = async () => {
    const res = await fetch(`${API}/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const blob = await res.blob();
    setImage(URL.createObjectURL(blob));
  };

  const update = (k,v) => setOptions(p => ({...p,[k]:v}));

  return (
    <div style={styles.container}>
      <div style={styles.grid}>

        {/* OPTIONS */}
        <div style={styles.panel}>
          <h3>Options</h3>

          <textarea value={dates} onChange={e=>setDates(e.target.value)} />

          <label>Device</label>
          <select value={options.device} onChange={e=>update('device',e.target.value)}>
            {devices.map(d=>(
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>

          <label>View</label>
          <select value={options.viewMode} onChange={e=>update('viewMode',e.target.value)}>
            <option value="calendar">Calendar</option>
            <option value="heatmap">Heatmap</option>
          </select>

          {options.viewMode === "heatmap" && (
            <label>
              <input
                type="checkbox"
                checked={options.heatmapDensity}
                onChange={e=>update('heatmapDensity',e.target.checked)}
              />
              Density
            </label>
          )}

          <label>Color</label>
          <input type="color" value={options.color} onChange={e=>update('color',e.target.value)} />

          <button onClick={generate}>Generate</button>
        </div>

        {/* PREVIEW */}
        <div style={styles.panel}>
          <h3>Preview</h3>
          {image && <img src={image} style={{width:'100%'}} />}
        </div>

        {/* JSON */}
        <div style={styles.panel}>
          <h3>JSON Payload</h3>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#111",
    color: "#fff",
    minHeight: "100vh",
    padding: 20
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 20
  },
  panel: {
    background: "#1a1a1a",
    padding: 15,
    borderRadius: 10
  }
};
