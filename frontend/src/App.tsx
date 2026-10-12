import { useEffect, useState } from "react";
import "./App.css";

type Health = {
  message?: string;
  status: string;
};

function App() {
  const [health, setHealth] = useState("Checking...");
  const [brand, setBrand] = useState("");
  const [platform, setPlatform] = useState("Social Media");
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then((data: Health) => setHealth(data.status))
      .catch(() => setHealth("Offline"));
  }, []);

  function scanBrand() {
    if (!brand.trim()) {
      setResults(["Please enter a brand name before starting a scan."]);
      return;
    }

    setResults([
      `Demo scan created for "${brand.trim()}".`,
      `Selected monitoring area: ${platform}.`,
      "No live platforms have been scanned yet.",
      "Connect an authorized data source to perform real monitoring.",
    ]);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🛡️ <span>BrandShield</span></div>
        <p className="side-label">WORKSPACE</p>
        <div className="nav-item active">▦ Overview</div>
        <div className="nav-item">◎ Social Monitoring</div>
        <div className="nav-item">▣ App Monitoring</div>
        <div className="nav-item">⌕ Investigations</div>
        <div className="nav-item">⚙ Settings</div>
        <div className="sidebar-bottom">Digital Risk Protection</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">SECURITY OPERATIONS / OVERVIEW</span>
            <h1>Brand Protection Dashboard</h1>
            <p className="subtitle">
              Discover, investigate, and understand potential brand threats.
            </p>
          </div>
          <div className="status">
            <span className="status-dot"></span>
            API {health}
          </div>
        </header>

        <section className="welcome">
          <div>
            <span className="eyebrow">THREAT INTELLIGENCE</span>
            <h2>Your brand. Your reputation. Protected.</h2>
            <p>
              Monitor suspicious social profiles and mobile app listings
              from one investigation workspace.
            </p>
          </div>
          <div className="shield-art">🛡️</div>
        </section>

        <section className="stats">
          <article className="stat-card">
            <span>Monitored Brands</span>
            <strong>0</strong>
            <small>Register a brand to begin</small>
          </article>
          <article className="stat-card">
            <span>Social Threats</span>
            <strong>—</strong>
            <small>Awaiting data sources</small>
          </article>
          <article className="stat-card">
            <span>Suspicious Apps</span>
            <strong>—</strong>
            <small>Awaiting app listings</small>
          </article>
          <article className="stat-card">
            <span>API Status</span>
            <strong className="online">{health === "ok" ? "Online" : health}</strong>
            <small>Local development server</small>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">GET STARTED</span>
                <h3>Start a brand assessment</h3>
              </div>
              <span className="panel-icon">⌕</span>
            </div>

            <label htmlFor="brand">Brand or organization name</label>
            <input
              id="brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="e.g. Example Bank"
            />

            <label htmlFor="platform">Monitoring area</label>
            <select
              id="platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option>Social Media</option>
              <option>Mobile Apps</option>
              <option>Cross-Platform Investigation</option>
            </select>

            <button onClick={scanBrand}>Create demo assessment →</button>

            {results.length > 0 && (
              <div className="results" aria-live="polite">
                <h4>Assessment</h4>
                {results.map((result) => <p key={result}>{result}</p>)}
              </div>
            )}
          </article>

          <article className="panel">
            <span className="eyebrow">INVESTIGATION WORKFLOW</span>
            <h3>How BrandShield works</h3>
            <div className="workflow">
              <div className="workflow-number">01</div>
              <div>
                <strong>Register official assets</strong>
                <p>Add verified brand names, domains, and logos.</p>
              </div>
            </div>
            <div className="workflow">
              <div className="workflow-number">02</div>
              <div>
                <strong>Analyze potential threats</strong>
                <p>Compare suspicious profiles and app listings.</p>
              </div>
            </div>
            <div className="workflow">
              <div className="workflow-number">03</div>
              <div>
                <strong>Explain the risk</strong>
                <p>Show evidence and reasons behind each risk score.</p>
              </div>
            </div>
            <div className="notice">
              Demo interface: live monitoring and risk detection are not
              implemented yet.
            </div>
          </article>
        </section>

        <footer>
          BrandShield Sentinel · Local Development · Evidence-led Protection
        </footer>
      </main>
    </div>
  );
}

export default App;