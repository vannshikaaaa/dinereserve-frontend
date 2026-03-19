import { Link, useLocation, useNavigate } from "react-router-dom";
 
function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
 
  const hideNavbarRoutes = ["/", "/login", "/register", "/admin-login", "/admin-register"];
  if (hideNavbarRoutes.includes(location.pathname)) return null;
 
  const isAdminPage =
    location.pathname.includes("admin-dashboard") ||
    location.pathname.includes("manage-tables") ||
    location.pathname.includes("reports");
 
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
 
  return (
    <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 40px", background: "#f5f5f5", borderBottom: "1px solid #ddd" }}>
      <h2 style={{ margin: 0, fontWeight: "600" }}>DineReserve</h2>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {isAdminPage ? (
          <>
            <Link style={{ textDecoration: "none", color: "#333", fontWeight: "500" }} to="/admin-dashboard">Dashboard</Link>
            <Link style={{ textDecoration: "none", color: "#333", fontWeight: "500" }} to="/manage-tables">Manage Tables</Link>
            <Link style={{ textDecoration: "none", color: "#333", fontWeight: "500" }} to="/reports">Reports</Link>
          </>
        ) : (
          <>
            <Link style={{ textDecoration: "none", color: "#333", fontWeight: "500" }} to="/home">Home</Link>
            <Link style={{ textDecoration: "none", color: "#333", fontWeight: "500" }} to="/profile">Profile</Link>
            <Link style={{ textDecoration: "none", color: "#333", fontWeight: "500" }} to="/bookings">My Bookings</Link>
          </>
        )}
        <button onClick={handleLogout}
          style={{ padding: "6px 14px", background: "#c0392b", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
 
export default Navbar;
