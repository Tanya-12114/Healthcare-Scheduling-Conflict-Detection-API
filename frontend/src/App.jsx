import { useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api";
import Dashboard from "./pages/Dashboard.jsx";
import Patients from "./pages/Patients.jsx";
import Appointments from "./pages/Appointments.jsx";

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const body = mode === "login" ? { username: f.username, password: f.password } : f;
      const res = await api(mode === "login" ? "/auth/login/" : "/auth/register/", { method: "POST", body });
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", f.username);
      nav("/");
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="auth">
      <form className="panel auth-card" onSubmit={submit}>
        <h1>Clinic scheduling</h1>
        <p className="muted">{mode === "login" ? "Sign in to manage patients and appointments." : "Create an account to start booking."}</p>
        <label>Username<input required value={f.username} onChange={set("username")} /></label>
        {mode === "register" && <label>Email<input type="email" required value={f.email} onChange={set("email")} /></label>}
        <label>Password<input type="password" required value={f.password} onChange={set("password")} /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn">{mode === "login" ? "Sign in" : "Create account"}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

function Layout() {
  const nav = useNavigate();
  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Clinic<br />Scheduling</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/patients">Patients</NavLink>
          <NavLink to="/appointments">Appointments</NavLink>
        </nav>
        <div className="who">
          <span>{localStorage.getItem("user")}</span>
          <button className="link" onClick={() => { localStorage.clear(); nav("/login"); }}>Sign out</button>
        </div>
      </aside>
      <main><Outlet /></main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/appointments" element={<Appointments />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
