import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt } from "../api";

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/dashboard/").then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="error">{error}</div>;
  if (!d) return <p className="muted">Loading…</p>;
  const s = d.appointments_by_status;
  return (
    <>
      <h1>Today</h1>
      <p className="muted">{d.appointments_today} appointment{d.appointments_today === 1 ? "" : "s"} scheduled today · {d.total_patients} patients on file</p>
      <div className="stats">
        <div className="stat"><b>{s.scheduled}</b>Scheduled</div>
        <div className="stat"><b>{s.completed}</b>Completed</div>
        <div className="stat"><b>{s.cancelled}</b>Cancelled</div>
      </div>
      <section className="panel">
        <h2>Next appointments</h2>
        {d.upcoming.length === 0 ? (
          <p className="muted">Nothing booked yet. <Link to="/appointments">Book an appointment</Link></p>
        ) : (
          <ul className="agenda">
            {d.upcoming.map((a) => (
              <li key={a.id}>
                <time>{fmt(a.scheduled_at)}</time>
                <span><b>{a.patient_name}</b> with Dr. {a.doctor_name}</span>
                <span className="muted">{a.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
