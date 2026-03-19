import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
 
function RestaurantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => { fetchRestaurant(); }, []);
 
  const fetchRestaurant = async () => {
    try {
      const res = await API.get(`/restaurants/${id}`);
      setRestaurant(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
 
  if (loading) return <p style={{ padding: "20px", textAlign: "center" }}>Loading restaurant details...</p>;
  if (!restaurant) return <p style={{ padding: "20px", textAlign: "center" }}>Restaurant not found</p>;
 
  return (
    <div className="restaurant-details-container">
      <div className="restaurant-details-card">
        <div className="restaurant-image-section">
          <img src={restaurant.image} alt={restaurant.name} />
        </div>
        <div className="restaurant-info-section">
          <h1 className="restaurant-title">{restaurant.name}</h1>
          <p className="description">{restaurant.description}</p>
          <div className="restaurant-meta">
            <p>⭐ <strong>Rating:</strong> {restaurant.rating || "Not rated"}</p>
            <p><strong>Cuisine:</strong> {restaurant.cuisine ? restaurant.cuisine.join(", ") : "Not specified"}</p>
            <p><strong>Price Range:</strong> {restaurant.price_range || "N/A"}</p>
            <p><strong>Max Capacity:</strong> {restaurant.max_capacity || "N/A"}</p>
          </div>
          <button className="book-btn" onClick={() => navigate(`/restaurant/${id}/book`)}>
            View Available Tables
          </button>
        </div>
      </div>
    </div>
  );
}
 
export default RestaurantDetails;
