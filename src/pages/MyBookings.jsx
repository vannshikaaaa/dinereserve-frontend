import { useEffect, useState, useCallback } from "react";
import API from "../api/axios";

function MyBookings() {
  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [riskScores, setRiskScores]   = useState({});
  const [cancelRisks, setCancelRisks] = useState({});

  // ── Review State ─────────────────────────────────────────
  const [reviewModal, setReviewModal]     = useState(null);
  const [reviewText, setReviewText]       = useState("");
  const [reviewRating, setReviewRating]   = useState(5);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult]   = useState(null);
  const [submittedIds, setSubmittedIds]   = useState([]);

  // ── Fetch risk scores for upcoming bookings ───────────────
  const fetchAllRisks = useCallback(async (bookingsList) => {
    const noShowScores = {};
    const cancelScores = {};

    await Promise.all(
      bookingsList.map(async (b) => {
        const hour        = parseInt(String(b.time).split(":")[0]) || 19;
        const dateObj     = new Date(b.date);
        const jsDay       = dateObj.getDay();
        const day_of_week = jsDay === 0 ? 6 : jsDay - 1;
        const month       = dateObj.getMonth() + 1;
        const guests      = parseInt(b.guests) || 2;
        const payload     = { hour, day_of_week, month, guests };

        const [noShowRes, cancelRes] = await Promise.allSettled([
          API.post("/ai/predict-noshow",       payload),
          API.post("/ai/predict-cancellation", payload),
        ]);

        // Backend returns: { status: "success", prediction: { risk_level, probability, ... } }
        if (noShowRes.status === "fulfilled" && noShowRes.value.data?.prediction) {
          noShowScores[b.booking_id] = noShowRes.value.data.prediction;
        }
        if (cancelRes.status === "fulfilled" && cancelRes.value.data?.prediction) {
          cancelScores[b.booking_id] = cancelRes.value.data.prediction;
        }
      })
    );

    setRiskScores(noShowScores);
    setCancelRisks(cancelScores);
  }, []);

  // ── Fetch bookings ────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await API.get("/customer/bookings");
      const data = res.data || [];
      setBookings(data);

      const upcoming = data.filter(
        (b) => b.status === "Pending" || b.status === "confirmed"
      );
      if (upcoming.length > 0) {
        await fetchAllRisks(upcoming);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchAllRisks]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ── Cancel booking ────────────────────────────────────────
  const cancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await API.delete(`/customer/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b.booking_id !== id));
      setRiskScores((prev)  => { const u = { ...prev }; delete u[id]; return u; });
      setCancelRisks((prev) => { const u = { ...prev }; delete u[id]; return u; });
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel booking");
    }
  };

  // ── Review modal handlers ─────────────────────────────────
  const openReviewModal = (booking) => {
    setReviewModal(booking);
    setReviewText("");
    setReviewRating(5);
    setReviewResult(null);
  };

  const closeReviewModal = () => {
    setReviewModal(null);
    setReviewText("");
    setReviewRating(5);
    setReviewResult(null);
  };

  const submitReview = async () => {
    if (!reviewText.trim()) {
      alert("Please write a review before submitting.");
      return;
    }
    setReviewLoading(true);
    try {
      const res = await API.post("/reviews", {
        restaurant_id: reviewModal.restaurant_id,
        rating:        reviewRating,
        comment:       reviewText.trim(),
      });
      setReviewResult({
        sentiment: res.data.sentiment || "Neutral",
        emoji:     res.data.emoji     || "😐",
      });
      setSubmittedIds((prev) => [...prev, reviewModal.booking_id]);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to submit review.";
      alert(msg);
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Badge renderers ───────────────────────────────────────
  const getNoShowBadge = (bookingId) => {
    const score = riskScores[bookingId];
    if (!score) return null;

    const config = {
      High:   { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b", icon: "🔴", label: "High No-Show Risk",   tip: "Please show up or cancel in advance." },
      Medium: { bg: "#fffbeb", border: "#fcd34d", color: "#92400e", icon: "🟡", label: "Medium No-Show Risk", tip: "Reminder: your table is reserved for you." },
      Low:    { bg: "#f0fdf4", border: "#86efac", color: "#166534", icon: "🟢", label: "Low No-Show Risk",    tip: "You are all set! We look forward to seeing you." },
    };
    const c = config[score.risk_level] || config.Low;

    return (
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "8px", padding: "10px 14px", marginTop: "10px" }}>
        <p style={{ margin: 0, fontWeight: "600", color: c.color, fontSize: "0.85rem" }}>
          {c.icon} {c.label} ({Math.round(score.probability * 100)}%)
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: c.color, opacity: 0.85 }}>
          {c.tip}
        </p>
      </div>
    );
  };

  const getCancelBadge = (bookingId) => {
    const score = cancelRisks[bookingId];
    if (!score) return null;

    const config = {
      High:   { bg: "#fdf4ff", border: "#e879f9", color: "#7e22ce", icon: "⚠️", label: "High Cancellation Risk",   tip: "This booking has a high chance of being cancelled." },
      Medium: { bg: "#f5f3ff", border: "#c4b5fd", color: "#5b21b6", icon: "💜", label: "Medium Cancellation Risk", tip: "Consider confirming this booking soon." },
      Low:    { bg: "#f0fdf4", border: "#86efac", color: "#166534", icon: "✅", label: "Low Cancellation Risk",    tip: "This booking looks stable." },
    };
    const c = config[score.risk_level] || config.Low;

    return (
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "8px", padding: "10px 14px", marginTop: "8px" }}>
        <p style={{ margin: 0, fontWeight: "600", color: c.color, fontSize: "0.85rem" }}>
          {c.icon} {c.label} ({Math.round(score.probability * 100)}%)
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: c.color, opacity: 0.85 }}>
          {c.tip}
        </p>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const config = {
      Pending:   { bg: "#eff6ff", color: "#1d4ed8", label: "Pending"   },
      confirmed: { bg: "#f0fdf4", color: "#15803d", label: "Confirmed" },
      completed: { bg: "#f3f4f6", color: "#374151", label: "Completed" },
      cancelled: { bg: "#fef2f2", color: "#b91c1c", label: "Cancelled" },
      no_show:   { bg: "#fff7ed", color: "#c2410c", label: "No Show"   },
    };
    const c = config[status] || config.Pending;
    return (
      <span style={{
        background: c.bg, color: c.color,
        padding: "2px 10px", borderRadius: "12px",
        fontSize: "0.78rem", fontWeight: "600",
      }}>
        {c.label}
      </span>
    );
  };

  const sentimentStyle = (sentiment) => {
    if (sentiment === "Positive") return { bg: "#f0fdf4", border: "#86efac", color: "#166534" };
    if (sentiment === "Negative") return { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b" };
    return { bg: "#f9fafb", border: "#e5e7eb", color: "#374151" };
  };

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        <p>Loading your bookings...</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>My Bookings</h2>

      {/* Empty state */}
      {bookings.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px", color: "#888",
          background: "#f9fafb", borderRadius: "10px",
        }}>
          <p style={{ fontSize: "1.1rem" }}>No bookings yet</p>
          <p style={{ fontSize: "0.9rem" }}>Book a table to get started!</p>
        </div>
      )}

      {/* Booking cards */}
      {bookings.map((b) => (
        <div key={b.booking_id} style={{
          background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: "10px", padding: "18px", marginBottom: "16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>

          {/* Header row */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: "10px",
          }}>
            <p style={{ margin: 0, fontWeight: "700", fontSize: "1rem" }}>
              {b.restaurant_name}
            </p>
            {getStatusBadge(b.status)}
          </div>

          {/* Details grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "4px 16px", fontSize: "0.88rem",
            color: "#555", marginBottom: "6px",
          }}>
            <p style={{ margin: 0 }}>📅 {b.date}</p>
            <p style={{ margin: 0 }}>🕐 {b.time}</p>
            <p style={{ margin: 0 }}>👥 {b.guests} guests</p>
            {b.table_name && <p style={{ margin: 0 }}>🪑 {b.table_name}</p>}
            {b.notes && (
              <p style={{ margin: 0, gridColumn: "1 / -1", fontStyle: "italic" }}>
                📝 {b.notes}
              </p>
            )}
          </div>

          {/* ML Risk Badges — upcoming bookings only */}
          {(b.status === "Pending" || b.status === "confirmed") && (
            <>
              {getNoShowBadge(b.booking_id)}
              {getCancelBadge(b.booking_id)}
            </>
          )}

          {/* Action buttons */}
          <div style={{
            display: "flex", gap: "10px", marginTop: "12px",
            flexWrap: "wrap", alignItems: "center",
          }}>

            {/* ── FIX: Cancel shows for BOTH Pending AND confirmed ── */}
            {(b.status === "Pending" || b.status === "confirmed") && (
              <button
                onClick={() => cancelBooking(b.booking_id)}
                style={{
                  background: "#e74c3c", color: "white", border: "none",
                  padding: "7px 14px", borderRadius: "6px",
                  cursor: "pointer", fontSize: "0.85rem",
                }}
              >
                Cancel Booking
              </button>
            )}

            {/* Review button — completed + not yet reviewed */}
            {b.status === "completed" && !submittedIds.includes(b.booking_id) && (
              <button
                onClick={() => openReviewModal(b)}
                style={{
                  background: "#1976d2", color: "white", border: "none",
                  padding: "7px 16px", borderRadius: "6px",
                  cursor: "pointer", fontSize: "0.85rem", fontWeight: "600",
                }}
              >
                ⭐ Write a Review
              </button>
            )}

            {/* Already reviewed label */}
            {b.status === "completed" && submittedIds.includes(b.booking_id) && (
              <span style={{ fontSize: "0.82rem", color: "#15803d", fontWeight: "600" }}>
                ✅ Review Submitted
              </span>
            )}
          </div>
        </div>
      ))}

      {/* ── Review Modal ──────────────────────────────────── */}
      {reviewModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeReviewModal(); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div style={{
            background: "#fff", borderRadius: "16px",
            padding: "28px", width: "430px", maxWidth: "92vw",
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}>

            {/* Modal header */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: "6px",
            }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#111" }}>
                ⭐ Write a Review
              </h3>
              <button
                onClick={closeReviewModal}
                style={{
                  background: "none", border: "none",
                  fontSize: "1.2rem", cursor: "pointer",
                  color: "#888", lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 20px 0", fontSize: "0.82rem", color: "#888" }}>
              {reviewModal.restaurant_name} · {reviewModal.date} · {reviewModal.guests} guests
            </p>

            {/* Star rating */}
            <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: "600", color: "#374151" }}>
              Rating
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => !reviewResult && setReviewRating(star)}
                  style={{
                    fontSize:   "30px",
                    cursor:     reviewResult ? "default" : "pointer",
                    color:      star <= reviewRating ? "#f59e0b" : "#d1d5db",
                    transition: "color 0.15s, transform 0.15s",
                    transform:  star <= reviewRating ? "scale(1.18)" : "scale(1)",
                    display:    "inline-block",
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            {/* Review textarea */}
            <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: "600", color: "#374151" }}>
              Your Review
            </p>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell us about your experience — food, service, ambiance..."
              rows={4}
              disabled={!!reviewResult}
              style={{
                width: "100%", border: "1px solid #d1d5db",
                borderRadius: "8px", padding: "10px 12px",
                fontSize: "0.88rem", resize: "vertical",
                outline: "none", fontFamily: "inherit",
                boxSizing: "border-box",
                background: reviewResult ? "#f9fafb" : "#fff",
                color: "#111", lineHeight: "1.5",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
              onBlur={(e)  => (e.target.style.borderColor = "#d1d5db")}
            />

            {/* Sentiment result */}
            {reviewResult && (() => {
              const s = sentimentStyle(reviewResult.sentiment);
              return (
                <div style={{
                  marginTop: "16px", background: s.bg,
                  border: `1px solid ${s.border}`, borderRadius: "10px",
                  padding: "14px 18px", textAlign: "center",
                }}>
                  <p style={{ margin: 0, fontSize: "2rem" }}>{reviewResult.emoji}</p>
                  <p style={{ margin: "6px 0 2px 0", fontWeight: "700", fontSize: "0.95rem", color: s.color }}>
                    {reviewResult.sentiment} Review
                  </p>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#888" }}>
                    Thank you for your feedback! It helps us improve.
                  </p>
                </div>
              );
            })()}

            {/* Modal buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
              <button
                onClick={closeReviewModal}
                style={{
                  background: "#f3f4f6", color: "#374151", border: "none",
                  padding: "8px 18px", borderRadius: "7px",
                  cursor: "pointer", fontSize: "0.88rem",
                }}
              >
                {reviewResult ? "Close" : "Cancel"}
              </button>

              {!reviewResult && (
                <button
                  onClick={submitReview}
                  disabled={reviewLoading || !reviewText.trim()}
                  style={{
                    background:   reviewLoading || !reviewText.trim() ? "#e5e7eb" : "#1976d2",
                    color:        reviewLoading || !reviewText.trim() ? "#aaa"    : "white",
                    border:       "none", padding: "8px 20px",
                    borderRadius: "7px", cursor: reviewLoading || !reviewText.trim() ? "not-allowed" : "pointer",
                    fontSize: "0.88rem", fontWeight: "600",
                  }}
                >
                  {reviewLoading ? "Submitting..." : "Submit Review"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBookings;