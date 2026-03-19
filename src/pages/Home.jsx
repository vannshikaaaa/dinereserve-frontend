import { useEffect, useState } from "react";
import API from "../api/axios";
import RestaurantCard from "../components/RestaurantCard";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import "../styles/Home.css";
 
function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
 
  const fetchRestaurants = async (params = {}) => {
    try {
      const res = await API.get("/restaurants", { params });
      setRestaurants(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };
 
  useEffect(() => { fetchRestaurants(); }, []);
 
  return (
    <div className="home-container">
      <h2 className="page-title">Featured Restaurants</h2>
      <SearchBar onSearch={fetchRestaurants} />
      <Filters onFilter={fetchRestaurants} />
      {loading && <p>Loading restaurants...</p>}
      <div className="restaurant-grid">
        {restaurants.length === 0 && !loading && <p>No restaurants found</p>}
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant._id} restaurant={restaurant} />
        ))}
      </div>
    </div>
  );
}
 
export default Home;
