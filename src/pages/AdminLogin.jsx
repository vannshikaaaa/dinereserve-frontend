import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import "../styles/auth.css";
 
function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    restaurant_unique_password: ""
  });
  const [error, setError] = useState("");
 
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await API.post("/admin/login", form);
      localStorage.setItem("token", res.data.token);
      navigate("/admin-dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    }
  };
 
  return (
    <div className="auth-container">
      <h2>Admin Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email"
          value={form.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password"
          value={form.password} onChange={handleChange} required />
        <input type="text" name="restaurant_unique_password"
          placeholder="Restaurant Unique Password"
          value={form.restaurant_unique_password} onChange={handleChange} required />
        <button type="submit">Login</button>
      </form>
      <p style={{ marginTop: "15px" }}>
        Don't have an admin account? <Link to="/admin-register">Register Restaurant</Link>
      </p>
    </div>
  );
}
 
export default AdminLogin;
