import { useEffect, useRef, useState } from "react";
import API from "../api/axios";
import Chart from "chart.js/auto";

function Reports() {
  // ── Existing bar chart ─────────────────────────────────────
  const barRef          = useRef(null);
  const barInstance     = useRef(null);

  // ── Sentiment pie chart ────────────────────────────────────
  const pieRef          = useRef(null);
  const pieInstance     = useRef(null);

  const [restaurants, setRestaurants]         = useState([]);
  const [selectedRest, setSelectedRest]       = useState("");
  const [sentimentData, setSentimentData]     = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentError, setSentimentError]   = useState("");

  useEffect(() => {
    fetchReports();
    fetchRestaurants();
  }, []);

  // ── Rebuild pie chart whenever sentimentData changes ───────
  useEffect(() => {
    if (!sentimentData || !pieRef.current) return;
    if (pieInstance.current) pieInstance.current.destroy();

    const { positive_count, neutral_count, negative_count } = sentimentData;

    pieInstance.current = new Chart(pieRef.current, {
      type: "doughnut",
      data: {
        labels: ["Positive 😊", "Neutral 😐", "Negative 😞"],
        datasets: [{
          data:            [positive_count, neutral_count, negative_count],
          backgroundColor: ["#22c55e", "#94a3b8", "#ef4444"],
          borderColor:     ["#16a34a", "#64748b", "#dc2626"],
          borderWidth:     2,
        }],
      },
      options: {
        responsive:       true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels:   { font: { size: 13 }, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${ctx.parsed} reviews (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }, [sentimentData]);

  // ── Fetch bookings bar chart data ──────────────────────────
  const fetchReports = async () => {
    try {
      const res = await API.get("/admin/analytics");
      if (barInstance.current) barInstance.current.destroy();
      barInstance.current = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels:   res.data.labels,
          datasets: [{
            label:           "Bookings Per Day",
            data:            res.data.bookings,
            backgroundColor: "rgba(54,162,235,0.6)",
            borderColor:     "rgba(54,162,235,1)",
            borderWidth:     1,
            borderRadius:    4,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "top" } },
          scales:  { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  };

  // ── Fetch restaurant list for dropdown ─────────────────────
  const fetchRestaurants = async () => {
    try {
      const res = await API.get("/restaurants");
      setRestaurants(res.data || []);
      if (res.data?.length > 0) setSelectedRest(res.data[0]._id);
    } catch (err) {
      console.error("Failed to load restaurants:", err);
    }
  };

  // ── Fetch sentiment summary for selected restaurant ────────
  const fetchSentiment = async () => {
    if (!selectedRest) return;
    setSentimentLoading(true);
    setSentimentError("");
    setSentimentData(null);
    try {
      const res = await API.get(`/reviews/${selectedRest}/sentiment-summary`);
      setSentimentData(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to load sentiment data.";
      setSentimentError(msg);
    } finally {
      setSentimentLoading(false);
    }
  };

  // ── Overall badge color ────────────────────────────────────
  const overallStyle = (overall) => {
    if (!overall) return {};
    if (overall.includes("Positive")) return { bg: "#f0fdf4", color: "#166534", border: "#86efac" };
    if (overall.includes("Negative")) return { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" };
    return { bg: "#f9fafb", color: "#374151", border: "#e5e7eb" };
  };

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "1.4rem", color: "#111" }}>
        Reports & Analytics
      </h2>

      {/* ── Bookings Bar Chart ─────────────────────────────── */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: "12px", padding: "20px", marginBottom: "28px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: "#374151" }}>
          📊 Bookings Per Day
        </h3>
        <canvas ref={barRef} />
      </div>

      {/* ── Sentiment Pie Chart ────────────────────────────── */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: "12px", padding: "20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "1rem", color: "#374151" }}>
          😊 Customer Sentiment Analysis
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "0.82rem", color: "#888" }}>
          Select a restaurant to see the breakdown of customer review sentiments.
        </p>

        {/* Restaurant selector + button */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
          <select
            value={selectedRest}
            onChange={(e) => { setSelectedRest(e.target.value); setSentimentData(null); setSentimentError(""); }}
            style={{
              flex:         1, minWidth: "200px",
              border:       "1px solid #d1d5db",
              borderRadius: "8px", padding: "8px 12px",
              fontSize:     "0.88rem", outline: "none",
              background:   "#fff", color: "#111",
            }}
          >
            {restaurants.map((r) => (
              <option key={r._id} value={r._id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={fetchSentiment}
            disabled={sentimentLoading || !selectedRest}
            style={{
              background:   sentimentLoading ? "#e5e7eb" : "#1976d2",
              color:        sentimentLoading ? "#aaa"    : "white",
              border:       "none", borderRadius: "8px",
              padding:      "8px 20px", fontSize: "0.88rem",
              fontWeight:   "600", cursor: sentimentLoading ? "not-allowed" : "pointer",
              whiteSpace:   "nowrap",
            }}
          >
            {sentimentLoading ? "Loading..." : "Analyse Reviews"}
          </button>
        </div>

        {/* Error */}
        {sentimentError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", color: "#991b1b", fontSize: "0.85rem" }}>
            ⚠️ {sentimentError}
          </div>
        )}

        {/* No data yet */}
        {!sentimentData && !sentimentLoading && !sentimentError && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
            <p style={{ fontSize: "2rem", margin: "0 0 8px 0" }}>😊😐😞</p>
            <p style={{ fontSize: "0.88rem", margin: 0 }}>
              Select a restaurant and click Analyse Reviews
            </p>
          </div>
        )}

        {/* Sentiment Results */}
        {sentimentData && sentimentData.total === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
            <p style={{ fontSize: "2rem", margin: "0 0 8px 0" }}>📭</p>
            <p style={{ fontSize: "0.88rem", margin: 0 }}>No reviews yet for this restaurant.</p>
          </div>
        )}

        {sentimentData && sentimentData.total > 0 && (() => {
          const s = overallStyle(sentimentData.overall);
          return (
            <div>
              {/* Overall badge */}
              <div style={{
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: "10px", padding: "12px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "20px", flexWrap: "wrap", gap: "8px",
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: "700", color: s.color, fontSize: "0.95rem" }}>
                    {sentimentData.overall_emoji} Overall: {sentimentData.overall}
                  </p>
                  <p style={{ margin: "3px 0 0 0", fontSize: "0.78rem", color: "#888" }}>
                    Based on {sentimentData.total} review{sentimentData.total !== 1 ? "s" : ""}
                  </p>
                </div>
                {/* Stat pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { label: "Positive", count: sentimentData.positive_count, pct: sentimentData.positive_percent, color: "#16a34a", bg: "#dcfce7" },
                    { label: "Neutral",  count: sentimentData.neutral_count,  pct: sentimentData.neutral_percent,  color: "#475569", bg: "#f1f5f9" },
                    { label: "Negative", count: sentimentData.negative_count, pct: sentimentData.negative_percent, color: "#dc2626", bg: "#fee2e2" },
                  ].map((item) => (
                    <span key={item.label} style={{
                      background: item.bg, color: item.color,
                      padding: "4px 10px", borderRadius: "20px",
                      fontSize: "0.78rem", fontWeight: "600",
                    }}>
                      {item.label}: {item.count} ({item.pct}%)
                    </span>
                  ))}
                </div>
              </div>

              {/* Pie chart */}
              <div style={{ maxWidth: "340px", margin: "0 auto" }}>
                <canvas ref={pieRef} />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default Reports;