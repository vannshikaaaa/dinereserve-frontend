import { useEffect, useState } from "react";
import API from "../api/axios"; 
function ManageTables() {
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState({ name: "", seats: "" });
  const [error, setError] = useState("");
  useEffect(() => { fetchTables(); }, []);
  const fetchTables = async () => {
    try {
      const res = await API.get("/admin/tables");
      setTables(res.data);
    } catch (err) {
      setError("Failed to load tables");
    }
  };
  const addTable = async () => {
    if (!newTable.name || !newTable.seats) {
      setError("Please enter table name and seats");
      return;
    }
    try {
      await API.post("/admin/tables", { name: newTable.name, seats: Number(newTable.seats) });
      setNewTable({ name: "", seats: "" });
      fetchTables();
    } catch (err) {
      setError("Failed to add table");
    }
  };
  return (
    <div style={{ padding: "30px" }}>
      <h2>Manage Tables</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <input placeholder="Table Name" value={newTable.name}
          onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
          style={{ padding: "8px", width: "200px" }} />
        <input placeholder="Seats" type="number" value={newTable.seats}
          onChange={(e) => setNewTable({ ...newTable, seats: e.target.value })}
          style={{ padding: "8px", width: "100px" }} />
        <button onClick={addTable}
          style={{ padding: "8px 16px", background: "#1976d2", color: "white", border: "none", borderRadius: "4px" }}>
          Add Table
        </button>
      </div>
      <h3 style={{ marginTop: "30px" }}>Existing Tables</h3>
      {tables.length === 0 ? <p>No tables added yet.</p> : (
        tables.map(t => (
          <div key={t._id} style={{
            padding: "12px", border: "1px solid #ccc", marginTop: "12px",
            borderRadius: "6px", display: "flex", justifyContent: "space-between",
            alignItems: "center", background: "#fafafa"
          }}>
            <div><strong>{t.name}</strong> — {t.seats} seats</div>
            <div style={{ color: t.status === "Available" ? "green" : "red", fontWeight: "bold" }}>
              {t.status || "Available"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
export default ManageTables;