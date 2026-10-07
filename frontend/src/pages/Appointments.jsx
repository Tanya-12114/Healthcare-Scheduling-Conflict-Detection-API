import { useCallback, useEffect, useState } from "react";
import { api, fmt } from "../api";
import { Badge, Pager } from "../ui.jsx";

const EMPTY = { patient: "", doctor: "", when: "", duration_minutes: 30, reason: "" };

export default function Appointments() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/appointments/?page=${page}&status=${status}`).then(setData).catch((e) => setError(e.message));
  }, [page, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api("/patients/?page_size=100").then((r) => setPatients(r.results));
    api("/doctors/?page_size=100&is_active=true").then((r) => setDoctors(r.results));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function book(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/appointments/", {
        method: "POST",
        body: {
          patient: form.patient, doctor: form.doctor, reason: form.reason,
          duration_minutes: Number(form.duration_minutes),
          scheduled_at: new Date(form.when).toISOString(),
        },
      });
      setForm(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function act(a, action) {
    setError("");
    const notes = action === "complete" ? window.prompt("Visit notes (optional)") : undefined;
    if (notes === null) return;
    try {
      await api(`/appointments/${a.id}/${action}/`, { method: "POST", body: notes ? { notes } : {} });
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="head">
        <h1>Appointments</h1>
        <button className="btn" onClick={() => { setForm(EMPTY); setError(""); }}>Book appointment</button>
      </div>
      {form && (
        <form className="panel grid" onSubmit={book}>
          <label>Patient
            <select required value={form.patient} onChange={set("patient")}>
              <option value="">Select patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </label>
          <label>Doctor
            <select required value={form.doctor} onChange={set("doctor")}>
              <option value="">Select doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} · {d.specialization}</option>)}
            </select>
          </label>
          <label>Date and time<input type="datetime-local" required value={form.when} onChange={set("when")} /></label>
          <label>Duration (minutes)<input type="number" min="5" max="240" step="5" required value={form.duration_minutes} onChange={set("duration_minutes")} /></label>
          <label className="wide">Reason for visit<input required value={form.reason} onChange={set("reason")} /></label>
          {patients.length === 0 && <div className="muted wide">Add a patient first. Doctors are added by an admin at /admin/.</div>}
          {error && <div className="error wide" role="alert">{error}</div>}
          <div className="wide row">
            <button className="btn">Book appointment</button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="row filters">
        {["", "scheduled", "completed", "cancelled"].map((s) => (
          <button key={s} className={`chip ${status === s ? "on" : ""}`} onClick={() => { setStatus(s); setPage(1); }}>{s || "All"}</button>
        ))}
      </div>
      {!form && error && <div className="error" role="alert">{error}</div>}
      <div className="panel flush">
        <table>
          <thead><tr><th>When</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data?.results.map((a) => (
              <tr key={a.id}>
                <td>{fmt(a.scheduled_at)}<div className="muted">{a.duration_minutes} min</div></td>
                <td><b>{a.patient_name}</b></td><td>Dr. {a.doctor_name}</td>
                <td>{a.reason}{a.notes && <div className="muted">Notes: {a.notes}</div>}</td>
                <td><Badge status={a.status} /></td>
                <td className="actions">
                  {a.status === "scheduled" && (<>
                    <button className="link" onClick={() => act(a, "complete")}>Complete</button>
                    <button className="link danger" onClick={() => act(a, "cancel")}>Cancel</button>
                  </>)}
                </td>
              </tr>
            ))}
            {data?.results.length === 0 && <tr><td colSpan="6" className="muted">No appointments match. Book one to see it here.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager data={data} page={page} setPage={setPage} />
    </>
  );
}
