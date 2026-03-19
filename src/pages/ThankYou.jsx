import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api/axios";
import "../styles/Home.css";
 
function ThankYou() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state;
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    if (!booking?.restaurant_id) return;
    fetchRecommendations();
  }, []);
 
  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    setError("");
    try {
      const res = await API.post("/ai/recommend-dish", {
        restaurant_id: booking.restaurant_id,
        food_preference: booking.food_preference || null,
        top_n: 5,
      });
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      setError("Could not load recommendations");
    } finally {
      setLoadingRecs(false);
    }
  };
 
  if (!booking) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>No Booking Found</h2>
        <button onClick={() => navigate("/home")}>Go Back Home</button>
      </div>
    );
  }
 
  return (
    <div className="thankyou-container">
      <h2>Booking Confirmed!</h2>
      <div className="booking-details">
        <p><strong>Booking ID:</strong> {booking.booking_id || booking.id}</p>
        <p><strong>Restaurant:</strong> {booking.restaurant_name}</p>
        <p><strong>Table:</strong> {booking.table_name}</p>
        <p><strong>Date:</strong> {booking.date}</p>
        <p><strong>Time:</strong> {booking.time}</p>
        <p><strong>Guests:</strong> {booking.guests}</p>
      </div>
      <h3>Recommended Dishes For You</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {loadingRecs ? (
        <p>Loading recommendations...</p>
      ) : (
        <div className="recommendations-grid">
          {recommendations.length === 0 ? (
            <p>No recommendations available</p>
          ) : (
            recommendations.map((item, index) => (
              <div className="recommendation-card" key={index}>
                <h4>{item.dish_name}</h4>
                <p style={{ fontSize: "0.85rem", color: "#888" }}>
                  {item.cuisine_type} · {item.food_preference}
                </p>
                {item.description && <p>{item.description}</p>}
                <p style={{ fontSize: "0.8rem", color: "#aaa" }}>
                  ⭐ {item.popularity_score} orders
                </p>
              </div>
            ))
          )}
        </div>
      )}
      <button className="home-btn" onClick={() => navigate("/home")}>
        Back to Home
      </button>
    </div>
  );
}
 
export default ThankYou;
