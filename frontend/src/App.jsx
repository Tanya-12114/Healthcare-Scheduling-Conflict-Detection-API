import { useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { api, session } from "./api";
import { Avatar, Icon } from "./ui.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Patients from "./pages/Patients.jsx";
import Doctors from "./pages/Doctors.jsx";
import Appointments from "./pages/Appointments.jsx";

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const login = mode === "login";

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body = login ? { username: f.username, password: f.password } : f;
      const res = await api(login ? "/auth/login/" : "/auth/register/", { method: "POST", body });
      session.save(res, f.username);
      nav("/");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="logo"><Icon name="steth" size={22} /></div>
        <h1>CarePoint</h1>
        <p>Patients, doctors and appointments in one calm place. Double-bookings are caught before they happen.</p>
      </div>
      <form className="panel auth-card" onSubmit={submit}>
        <h2>{login ? "Welcome back" : "Create your account"}</h2>
        <p className="muted">{login ? "Sign in to manage your clinic." : "Register to start adding patients."}</p>
        <label>Username<input required autoFocus autoComplete="username" value={f.username} onChange={set("username")} /></label>
        {!login && <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></label>}
        <label>Password<input type="password" required autoComplete={login ? "current-password" : "new-password"} value={f.password} onChange={set("password")} /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn block" disabled={busy}>{busy ? "Please wait…" : login ? "Sign in" : "Create account"}</button>
        <button type="button" className="link center" onClick={() => { setMode(login ? "register" : "login"); setError(""); }}>
          {login ? "Need an account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

const NAV = [
  ["/", "home", "Dashboard", true],
  ["/appointments", "calendar", "Appointments"],
  ["/patients", "users", "Patients"],
  ["/doctors", "steth", "Doctors"],
];

function Layout() {
  const nav = useNavigate();
  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;
  const name = session.name();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="logo sm"><Icon name="steth" size={16} /></span>CarePoint</div>
        <nav>
          {NAV.map(([to, icon, label, end]) => (
            <NavLink key={to} to={to} end={end}><Icon name={icon} />{label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <Avatar name={name} />
          <div className="who-text"><b>{name}</b><span>{session.isStaff() ? "Admin" : "Staff"}</span></div>
          <button className="icon-btn light" title="Sign out" aria-label="Sign out" onClick={() => { localStorage.clear(); nav("/login"); }}><Icon name="logout" /></button>
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
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/appointments" element={<Appointments />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}