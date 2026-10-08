import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDay, session, timeOnly } from "../api";
import { Empty, Skeleton } from "../ui.jsx";

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/dashboard/").then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="error">{error}</div>;
  if (!d) return <Skeleton />;
  const s = d.appointments_by_status;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <>
      <div className="head">
        <div>
          <h1>{greet}, {session.name()}</h1>
          <p className="muted">
            {d.appointments_today} appointment{d.appointments_today === 1 ? "" : "s"} today · {d.total_patients} patient{d.total_patients === 1 ? "" : "s"} on file
          </p>
        </div>
        <Link className="btn" to="/appointments">Book appointment</Link>
      </div>
      <div className="stats">
        <div className="stat"><span>Today</span><b>{d.appointments_today}</b></div>
        <div className="stat accent"><span>Scheduled</span><b>{s.scheduled}</b></div>
        <div className="stat"><span>Completed</span><b>{s.completed}</b></div>
        <div className="stat"><span>Cancelled</span><b>{s.cancelled}</b></div>
      </div>
      <section className="panel">
        <h2>Next appointments</h2>
        {d.upcoming.length === 0 ? (
          <Empty icon="calendar" title="Nothing booked yet">
            <Link to="/appointments">Book your first appointment</Link> once you have a patient and a doctor.
          </Empty>
        ) : (
          <ul className="agenda">
            {d.upcoming.map((a) => (
              <li key={a.id}>
                <div className="when"><b>{timeOnly(a.scheduled_at)}</b><span>{fmtDay(a.scheduled_at)}</span></div>
                <div><b>{a.patient_name}</b><div className="muted">with Dr. {a.doctor_name}</div></div>
                <span className="muted reason">{a.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
