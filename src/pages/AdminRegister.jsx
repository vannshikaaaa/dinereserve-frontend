import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "../styles/auth.css";
 
function AdminRegister() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
    restaurant_name: "",
    restaurant_unique_password: ""
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords must match");
      return;
    }
    try {
      await API.post("/admin/register", {
        email: form.email,
        password: form.password,
        restaurant_name: form.restaurant_name,
        restaurant_unique_password: form.restaurant_unique_password
      });
      navigate("/admin-login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  };
 
  return (
    <div className="auth-container">
      <h2>Admin Register</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input type="password" placeholder="Confirm Password"
          onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        <input placeholder="Restaurant Name"
          onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} />
        <input placeholder="Restaurant Unique Password"
          onChange={(e) => setForm({ ...form, restaurant_unique_password: e.target.value })} />
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
 
export default AdminRegister;
