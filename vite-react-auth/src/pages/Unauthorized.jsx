import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <h1>403 — Access Denied</h1>
      <p>You don't have permission to view this page.</p>
      <button onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
    </div>
  );
};
export default Unauthorized;
