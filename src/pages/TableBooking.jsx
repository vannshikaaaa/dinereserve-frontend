import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import API from "../api/axios";

function TableBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("");
  const [notes, setNotes] = useState("");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [demand, setDemand] = useState(null);
  const [demandLoading, setDemandLoading] = useState(false);

  // ── Demand prediction ─────────────────────────────────────
  const fetchDemandPrediction = useCallback(async () => {
    setDemandLoading(true);
    try {
      const guestNum       = parseInt(guests);
      const table_category = guestNum <= 2 ? 0 : guestNum <= 4 ? 1 : 2;
      const dateObj        = new Date(date);
      const jsDay          = dateObj.getDay();
      const day_of_week    = jsDay === 0 ? 6 : jsDay - 1;
      const hour           = parseInt(time.split(":")[0]);
      const month          = dateObj.getMonth() + 1;

      const res = await API.post("/ai/predict-demand", {
        table_category, day_of_week, hour, month,
      });
      setDemand(res.data.demand);
    } catch (err) {
      console.error("Demand prediction error:", err);
      setDemand(null);
    } finally {
      setDemandLoading(false);
    }
  }, [date, time, guests]);

  useEffect(() => {
    if (!date || !time || !guests) {
      setDemand(null);
      return;
    }
    fetchDemandPrediction();
  }, [date, time, guests, fetchDemandPrediction]);

  // ── Demand styling helpers ────────────────────────────────
  const getDemandStyle = (level) => {
    const base = {
      padding: "12px 16px",
      borderRadius: "8px",
      marginBottom: "16px",
      borderLeft: "4px solid",
      fontSize: "0.9rem",
    };
    if (level === "High")   return { ...base, borderColor: "#ef4444", backgroundColor: "#fef2f2", color: "#991b1b" };
    if (level === "Medium") return { ...base, borderColor: "#f59e0b", backgroundColor: "#fffbeb", color: "#92400e" };
    return { ...base, borderColor: "#22c55e", backgroundColor: "#f0fdf4", color: "#166534" };
  };

  const getDemandIcon = (level) => {
    if (level === "High")   return "🔴";
    if (level === "Medium") return "🟡";
    return "🟢";
  };

  // ── Check table availability ──────────────────────────────
  const checkAvailability = async () => {
    if (!date || !time) {
      setError("Please select date and time");
      return;
    }
    try {
      setError("");
      setLoading(true);
      setTables([]);
      setSelectedTable(null);
      const res = await API.get(`/restaurants/${id}/available-tables`, {
        params: { date, time, guests },
      });
      if (res.data.length === 0) setError("No tables available for this time");
      setTables(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to fetch available tables"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm booking ───────────────────────────────────────
  const confirmBooking = async () => {
    if (!selectedTable) { setError("Please select a table"); return; }
    if (!guests)        { setError("Please enter number of guests"); return; }
    try {
      setBookingLoading(true);
      const res = await API.post("/bookings", {
        restaurant_id: id,
        table_id:      selectedTable,
        date,
        time,
        guests: Number(guests),
        notes,
      });
      const selectedTableObj = tables.find((t) => t._id === selectedTable);
      navigate("/thankyou", {
        state: {
          ...res.data,
          restaurant_id: id,
          table_name:    selectedTableObj?.name || "Your Table",
          date,
          time,
          guests: Number(guests),
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="booking-container">
      <h2>Book a Table</h2>

      {error && <p className="error">{error}</p>}

      <div className="booking-form">
        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label>Time</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <label>Number of Guests</label>
        <input
          type="number"
          min="1"
          placeholder="Guests"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />

        <label>Special Notes (optional)</label>
        <textarea
          placeholder="Allergies, special requests..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Demand loading indicator */}
        {demandLoading && (
          <p style={{ fontSize: "0.85rem", color: "#888" }}>
            Checking demand...
          </p>
        )}

        {/* Demand prediction result */}
        {demand && !demandLoading && (
          <div style={getDemandStyle(demand.demand_level)}>
            <strong>
              {getDemandIcon(demand.demand_level)} {demand.demand_level} Demand
            </strong>
            <p style={{ margin: "4px 0 0 0" }}>{demand.availability_advice}</p>
          </div>
        )}

        <button onClick={checkAvailability}>Check Availability</button>
      </div>

      {/* Table loading */}
      {loading && <p>Loading available tables...</p>}

      {/* Table selection grid */}
      {tables.length > 0 && (
        <div className="tables-grid">
          <h3>Select Table</h3>
          {tables.map((table) => (
            <div
              key={table._id}
              className={`table-card ${selectedTable === table._id ? "selected" : ""}`}
              onClick={() => setSelectedTable(table._id)}
            >
              <h4>{table.name}</h4>
              <p>Seats: {table.seats}</p>
            </div>
          ))}
        </div>
      )}

      {/* Confirm booking button */}
      {tables.length > 0 && (
        <button
          className="confirm-btn"
          onClick={confirmBooking}
          disabled={bookingLoading}
        >
          {bookingLoading ? "Confirming..." : "Confirm Booking"}
        </button>
      )}
    </div>
  );
}
export default TableBooking;