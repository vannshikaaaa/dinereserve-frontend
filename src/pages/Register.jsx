import { useState } from "react";
import API from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/auth.css";
 
function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords must match");
      return;
    }
    try {
      await API.post("/customer/register", {
        name: form.name, email: form.email, password: form.password,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Registration failed");
    }
  };
 
  return (
    <div className="auth-container">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input type="password" placeholder="Confirm Password" onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        <button type="submit">Register</button>
      </form>
      <Link to="/login">Already have an account? Login</Link>
    </div>
  );
}
 
export default Register;
