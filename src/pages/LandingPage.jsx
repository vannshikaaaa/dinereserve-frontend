import { useNavigate } from "react-router-dom";
 
function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f4f4f4" }}>
      <div style={{ textAlign: "center", padding: "50px", background: "white", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <h1 style={{ fontSize: "42px", fontWeight: "600", marginBottom: "10px", color: "#2c2c2c" }}>DineReserve</h1>
        <p style={{ color: "#777", marginBottom: "30px" }}>Effortless restaurant reservations</p>
        <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
          <button
            style={{ padding: "10px 20px", background: "#2c2c2c", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
            onClick={() => navigate("/login")}>
            Continue as Guest
          </button>
          <button
            style={{ padding: "10px 20px", background: "#e5e5e5", color: "#2c2c2c", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
            onClick={() => navigate("/admin-login")}>
            Continue as Operator
          </button>
        </div>
      </div>
    </div>
  );
}
 
export default LandingPage;
