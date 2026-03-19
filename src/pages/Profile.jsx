import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
 
function Profile() {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
 
  useEffect(() => { fetchProfile(); }, []);
 
  const fetchProfile = async () => {
    try {
      const res = await API.get("/customer/profile");
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };
 
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
 
  if (!profile) return <p style={{ padding: "20px" }}>Loading...</p>;
 
  return (
    <div style={{ padding: "30px", maxWidth: "500px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>My Profile</h2>
      <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Total Bookings:</strong> {profile.total_bookings}</p>
      </div>
      <button onClick={logout}
        style={{ padding: "10px 20px", background: "#c0392b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
        Logout
      </button>
    </div>
  );
}
 
export default Profile;
