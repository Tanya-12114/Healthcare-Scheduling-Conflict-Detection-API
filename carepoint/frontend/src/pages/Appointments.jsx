import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt } from "../api";
import { Avatar, Badge, Confirm, Empty, Icon, Modal, Pager, Skeleton, useToast } from "../ui.jsx";

const EMPTY = { patient: "", doctor: "", when: "", duration_minutes: 30, reason: "" };
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function Appointments() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [finish, setFinish] = useState(null);
  const [notes, setNotes] = useState("");
  const [cancel, setCancel] = useState(null);

  const load = useCallback(() => {
    api(`/appointments/?page=${page}&status=${status}`).then(setData).catch((e) => toast(e.message, "err"));
  }, [page, status, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api("/patients/?page_size=100").then((r) => setPatients(r.results));
    api("/doctors/?page_size=100&is_active=true").then((r) => setDoctors(r.results));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const ready = patients.length > 0 && doctors.length > 0;

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
      toast("Appointment booked");
      setForm(null); load();
    } catch (err) { setError(err.message); }
  }

  async function act(a, action, body = {}) {
    try {
      await api(`/appointments/${a.id}/${action}/`, { method: "POST", body });
      toast(action === "complete" ? "Marked as completed" : "Appointment cancelled");
      load();
    } catch (err) { toast(err.message, "err"); }
  }

  return (
    <>
      <div className="head">
        <div><h1>Appointments</h1><p className="muted">Booking a taken slot is blocked automatically.</p></div>
        <button className="btn" onClick={() => { setForm(EMPTY); setError(""); }}><Icon name="plus" />Book appointment</button>
      </div>
      <div className="row filters">
        {["", "scheduled", "completed", "cancelled"].map((s) => (
          <button key={s} className={`chip ${status === s ? "on" : ""}`} onClick={() => { setStatus(s); setPage(1); }}>{s || "All"}</button>
        ))}
      </div>
      {!data ? <Skeleton /> : (
        <div className="panel flush">
          {data.results.length === 0 ? (
            <Empty icon="calendar" title="No appointments here">Book one to see it listed.</Empty>
          ) : (
            <table>
              <thead><tr><th>When</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.results.map((a) => (
                  <tr key={a.id}>
                    <td>{fmt(a.scheduled_at)}<div className="muted">{a.duration_minutes} min</div></td>
                    <td><div className="person"><Avatar name={a.patient_name} tone={a.patient} /><b>{a.patient_name}</b></div></td>
                    <td>Dr. {a.doctor_name}</td>
                    <td>{a.reason}{a.notes && <div className="muted">Notes: {a.notes}</div>}</td>
                    <td><Badge status={a.status} /></td>
                    <td className="actions">
                      {a.status === "scheduled" && (<>
                        <button className="link" onClick={() => { setFinish(a); setNotes(""); }}>Complete</button>
                        <button className="link danger" onClick={() => setCancel(a)}>Cancel</button>
                      </>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <Pager data={data} page={page} setPage={setPage} />

      {form && (
        <Modal title="Book appointment" onClose={() => setForm(null)} footer={<>
          <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn" form="appt-form" disabled={!ready}>Book appointment</button>
        </>}>
          {!ready && (
            <div className="notice">
              {patients.length === 0 && <span>You have no patients yet. <Link to="/patients" onClick={() => setForm(null)}>Add a patient</Link>. </span>}
              {doctors.length === 0 && <span>No active doctors. <Link to="/doctors" onClick={() => setForm(null)}>Go to Doctors</Link> (admins can add them).</span>}
            </div>
          )}
          <form id="appt-form" className="grid" onSubmit={book}>
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
            <label>Date and time<input type="datetime-local" required min={localNow()} value={form.when} onChange={set("when")} /></label>
            <label>Duration (minutes)<input type="number" min="5" max="240" step="5" required value={form.duration_minutes} onChange={set("duration_minutes")} /></label>
            <label className="wide">Reason for visit<input required value={form.reason} onChange={set("reason")} /></label>
            {error && <div className="error wide" role="alert">{error}</div>}
          </form>
        </Modal>
      )}
      {finish && (
        <Modal title="Complete appointment" onClose={() => setFinish(null)} footer={<>
          <button className="btn ghost" onClick={() => setFinish(null)}>Back</button>
          <button className="btn" onClick={() => { act(finish, "complete", notes ? { notes } : {}); setFinish(null); }}>Mark completed</button>
        </>}>
          <label>Visit notes (optional)<textarea rows="4" autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </Modal>
      )}
      {cancel && <Confirm danger title="Cancel appointment?" confirmLabel="Cancel appointment" onClose={() => setCancel(null)}
        onConfirm={() => { act(cancel, "cancel"); setCancel(null); }}>
        {cancel.patient_name} with Dr. {cancel.doctor_name} on {fmt(cancel.scheduled_at)}. The slot becomes bookable again.
      </Confirm>}
    </>
  );
}
