import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

function AdminDashboard() {
  const navigate = useNavigate();

  const [data, setData]               = useState(null);
  const [error, setError]             = useState("");
  const [peakForecast, setPeakForecast] = useState([]);
  const [peakLoading, setPeakLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [todayBookings, setTodayBookings] = useState([]);
  const [riskScores, setRiskScores]     = useState({});
  const [cancelRisks, setCancelRisks]   = useState({});
  const [riskLoading, setRiskLoading]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/admin-login"); return; }
    fetchDashboard();
    fetchTodayBookings();
    fetchPeakForecast(selectedDay, selectedMonth);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await API.get("/admin/dashboard");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load dashboard");
      if (err.response?.status === 401) navigate("/admin-login");
    }
  };

  const fetchTodayBookings = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res   = await API.get("/admin/bookings", { params: { date: today } });
      const bookings = res.data || [];
      setTodayBookings(bookings);
      if (bookings.length > 0) fetchAllRisks(bookings);
    } catch (err) {
      console.error("Could not load today's bookings:", err);
    }
  };

  const fetchAllRisks = async (bookings) => {
    setRiskLoading(true);
    const noShowScores = {};
    const cancelScores = {};

    await Promise.all(
      bookings.map(async (booking) => {
        const hour        = parseInt(booking.time) || 19;
        const dateObj     = new Date(booking.date);
        const jsDay       = dateObj.getDay();
        const day_of_week = jsDay === 0 ? 6 : jsDay - 1;
        const month       = dateObj.getMonth() + 1;
        const guests      = parseInt(booking.guests) || 2;
        const payload     = { hour, day_of_week, month, guests };

        const [noShowRes, cancelRes] = await Promise.allSettled([
          API.post("/ai/predict-noshow",       payload),
          API.post("/ai/predict-cancellation", payload),
        ]);

        if (noShowRes.status === "fulfilled") {
          noShowScores[booking._id] = noShowRes.value.data.prediction;
        }
        if (cancelRes.status === "fulfilled") {
          cancelScores[booking._id] = cancelRes.value.data.prediction;
        }
      })
    );

    setRiskScores(noShowScores);
    setCancelRisks(cancelScores);
    setRiskLoading(false);
  };

  const fetchPeakForecast = async (day, month) => {
    setPeakLoading(true);
    setPeakForecast([]);
    try {
      const res    = await API.post("/ai/predict-peak-hour", { day_of_week: day, month });
      const sorted = [...(res.data.hourly_forecast || [])].sort((a, b) => a.hour - b.hour);
      setPeakForecast(sorted);
    } catch (err) {
      console.error("Peak forecast error:", err);
    } finally {
      setPeakLoading(false);
    }
  };

  const handleForecastChange = (day, month) => {
    setSelectedDay(day);
    setSelectedMonth(month);
    fetchPeakForecast(day, month);
  };

  const getNoShowBadge = (bookingId) => {
    const score = riskScores[bookingId];
    if (!score) return null;

    const styles = {
      High:   { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" },
      Medium: { background: "#fffbeb", color: "#92400e", border: "1px solid #fcd34d" },
      Low:    { background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" },
    };
    const icons = { High: "🔴", Medium: "🟡", Low: "🟢" };
    const s = styles[score.risk_level] || styles.Low;

    return (
      <span style={{
        ...s, padding: "2px 8px", borderRadius: "12px",
        fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap",
        display: "inline-block", marginBottom: "4px"
      }}>
        {icons[score.risk_level]} {score.risk_level} ({Math.round(score.probability * 100)}%)
      </span>
    );
  };

  const getCancelBadge = (bookingId) => {
    const score = cancelRisks[bookingId];
    if (!score) return null;

    const styles = {
      High:   { background: "#fdf4ff", color: "#7e22ce", border: "1px solid #e879f9" },
      Medium: { background: "#f5f3ff", color: "#5b21b6", border: "1px solid #c4b5fd" },
      Low:    { background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" },
    };
    const icons = { High: "⚠️", Medium: "💜", Low: "✅" };
    const s = styles[score.risk_level] || styles.Low;

    return (
      <span style={{
        ...s, padding: "2px 8px", borderRadius: "12px",
        fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap",
        display: "inline-block"
      }}>
        {icons[score.risk_level]} Cancel: {score.risk_level} ({Math.round(score.probability * 100)}%)
      </span>
    );
  };

  const maxBookings  = Math.max(1, ...peakForecast.map((s) => s.predicted_bookings));
  const dayNames     = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const monthNames   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (error) return <p style={{ color: "red", padding: "20px" }}>{error}</p>;
  if (!data)  return <p style={{ padding: "20px" }}>Loading dashboard...</p>;

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "24px" }}>Restaurant Dashboard</h2>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px", marginBottom: "40px",
      }}>
        {[
          { label: "Today's Reservations",     value: data.today_reservations },
          { label: "Booked Tables",             value: data.booked_tables      },
          { label: "Expected Guests",           value: data.expected_guests    },
          { label: "No Shows Prediction",       value: data.no_shows           },
          { label: "Historically Busiest Hour", value: data.peak_hours         },
          { label: "Average Guests / Day",      value: data.avg_guests         },
        ].map((item) => (
          <div key={item.label} style={cardStyle}>
            <h3 style={{ fontSize: "0.9rem", color: "#555", margin: 0 }}>{item.label}</h3>
            <p style={valueStyle}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── Peak Hour Forecast ──────────────────────────────── */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: "16px" }}>Peak Hour Forecast</h3>
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Day</label>
            <select
              value={selectedDay}
              onChange={(e) => handleForecastChange(Number(e.target.value), selectedMonth)}
              style={selectStyle}
            >
              {dayNames.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => handleForecastChange(selectedDay, Number(e.target.value))}
              style={selectStyle}
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {peakLoading ? (
          <p style={{ color: "#888" }}>Generating forecast...</p>
        ) : peakForecast.length === 0 ? (
          <p style={{ color: "#888" }}>No forecast data available</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {peakForecast.map((slot) => {
              const barWidth = Math.round((slot.predicted_bookings / maxBookings) * 100);
              const barColor = slot.is_peak ? "#ef4444" : "#3b82f6";
              return (
                <div key={slot.hour} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "70px", fontSize: "0.82rem", color: "#555", textAlign: "right" }}>
                    {slot.hour_label || `${slot.hour}:00`}
                  </span>
                  <div style={{ flex: 1, background: "#e5e7eb", borderRadius: "4px", height: "22px" }}>
                    <div style={{
                      width:      `${barWidth}%`,
                      background: barColor,
                      height:     "100%",
                      borderRadius: "4px",
                      minWidth:   "4px",
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <span style={{ width: "80px", fontSize: "0.82rem", color: "#555" }}>
                    {slot.predicted_bookings} bookings
                    {slot.is_peak && (
                      <span style={{ color: "#ef4444", fontWeight: "600", marginLeft: "4px" }}>
                        PEAK
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p style={{ marginTop: "12px", fontSize: "0.78rem", color: "#aaa" }}>
          Red bars = peak hours | Blue bars = normal hours
        </p>
      </div>

      {/* ── Today's Bookings — Risk Table ───────────────────── */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: "4px" }}>Today's Bookings — Risk Analysis</h3>
        <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "16px" }}>
          ML powered — no-show risk 🔴🟡🟢 and cancellation risk ⚠️💜✅ per booking
        </p>

        {todayBookings.length === 0 ? (
          <p style={{ color: "#888" }}>No bookings for today</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                  {["Customer", "Time", "Guests", "Table", "Notes", "No-Show Risk", "Cancel Risk"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayBookings.map((booking, i) => (
                  <tr key={booking._id} style={{
                    background:   i % 2 === 0 ? "#fff" : "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}>
                    <td style={tdStyle}>{booking.customer_name || "Guest"}</td>
                    <td style={tdStyle}>{booking.time}</td>
                    <td style={tdStyle}>{booking.guests}</td>
                    <td style={tdStyle}>{booking.table_name || "—"}</td>
                    <td style={tdStyle}>{booking.notes || "—"}</td>

                    {/* No-Show Risk */}
                    <td style={tdStyle}>
                      {riskLoading
                        ? <span style={{ color: "#aaa", fontSize: "0.78rem" }}>Analysing...</span>
                        : getNoShowBadge(booking._id) || <span style={{ color: "#aaa" }}>—</span>
                      }
                    </td>

                    {/* Cancellation Risk */}
                    <td style={tdStyle}>
                      {riskLoading
                        ? <span style={{ color: "#aaa", fontSize: "0.78rem" }}>Analysing...</span>
                        : getCancelBadge(booking._id) || <span style={{ color: "#aaa" }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Buttons ──────────────────────────────────── */}
      <div style={{ marginTop: "30px" }}>
        <button style={btnStyle} onClick={() => navigate("/manage-tables")}>
          Manage Tables
        </button>
        <button style={{ ...btnStyle, marginLeft: "15px" }} onClick={() => navigate("/reports")}>
          Reports
        </button>
      </div>
    </div>
  );
}

const cardStyle   = { background: "#f5f5f5", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" };
const valueStyle  = { fontSize: "24px", fontWeight: "bold", marginTop: "10px" };
const sectionStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const btnStyle    = { padding: "10px 16px", background: "#1976d2", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" };
const labelStyle  = { display: "block", fontSize: "0.78rem", color: "#666", marginBottom: "4px" };
const selectStyle = { padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem", cursor: "pointer" };
const thStyle     = { padding: "10px 12px", fontWeight: "600", fontSize: "0.82rem", color: "#374151" };
const tdStyle     = { padding: "10px 12px", color: "#374151" };

export default AdminDashboard;