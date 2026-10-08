import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Avatar, Confirm, Empty, Icon, Modal, Pager, Skeleton, useToast } from "../ui.jsx";

const EMPTY = { first_name: "", last_name: "", date_of_birth: "", gender: "F", phone: "", email: "", address: "", blood_group: "", allergies: "" };
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Patients() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/patients/?page=${page}&search=${encodeURIComponent(q)}`).then(setData).catch((e) => toast(e.message, "err"));
  }, [page, q, toast]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const open = (p) => { setForm(p || EMPTY); setError(""); };

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await api(form.id ? `/patients/${form.id}/` : "/patients/", { method: form.id ? "PATCH" : "POST", body: form });
      toast(form.id ? "Patient updated" : "Patient added");
      setForm(null); load();
    } catch (err) { setError(err.message); }
  }

  async function remove() {
    try {
      await api(`/patients/${del.id}/`, { method: "DELETE" });
      toast("Patient deleted"); setDel(null); load();
    } catch (err) { toast(err.message, "err"); setDel(null); }
  }

  return (
    <>
      <div className="head">
        <div><h1>Patients</h1><p className="muted">Your patient records. Only you can see these.</p></div>
        <button className="btn" onClick={() => open()}><Icon name="plus" />Add patient</button>
      </div>
      <div className="searchbox">
        <Icon name="search" />
        <input placeholder="Search by name, phone or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      {!data ? <Skeleton /> : (
        <div className="panel flush">
          {data.results.length === 0 ? (
            <Empty icon="users" title={q ? "No matches" : "No patients yet"}>
              {q ? "Try a different name or phone number." : <>Click <b>Add patient</b> to create your first record.</>}
            </Empty>
          ) : (
            <table>
              <thead><tr><th>Patient</th><th>Age</th><th>Phone</th><th>Blood</th><th>Allergies</th><th></th></tr></thead>
              <tbody>
                {data.results.map((p) => (
                  <tr key={p.id}>
                    <td><div className="person"><Avatar name={p.full_name} tone={p.id} /><div><b>{p.full_name}</b><div className="muted">{p.email || "No email"}</div></div></div></td>
                    <td>{p.age}</td><td>{p.phone}</td><td>{p.blood_group || "—"}</td><td>{p.allergies || "—"}</td>
                    <td className="actions">
                      <button className="link" onClick={() => open(p)}>Edit</button>
                      <button className="link danger" onClick={() => setDel(p)}>Delete</button>
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
        <Modal title={form.id ? "Edit patient" : "Add patient"} onClose={() => setForm(null)} footer={<>
          <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn" form="patient-form">{form.id ? "Save changes" : "Add patient"}</button>
        </>}>
          <form id="patient-form" className="grid" onSubmit={save}>
            <label>First name<input required autoFocus value={form.first_name} onChange={set("first_name")} /></label>
            <label>Last name<input required value={form.last_name} onChange={set("last_name")} /></label>
            <label>Date of birth<input type="date" required max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={set("date_of_birth")} /></label>
            <label>Gender
              <select value={form.gender} onChange={set("gender")}><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></select>
            </label>
            <label>Phone<input required value={form.phone} onChange={set("phone")} /></label>
            <label>Email<input type="email" value={form.email} onChange={set("email")} /></label>
            <label>Blood group
              <select value={form.blood_group} onChange={set("blood_group")}><option value="">Unknown</option>{BLOOD.map((b) => <option key={b}>{b}</option>)}</select>
            </label>
            <label>Allergies<input placeholder="e.g. Penicillin" value={form.allergies} onChange={set("allergies")} /></label>
            <label className="wide">Address<textarea rows="2" value={form.address} onChange={set("address")} /></label>
            {error && <div className="error wide" role="alert">{error}</div>}
          </form>
        </Modal>
      )}
      {del && <Confirm danger title="Delete patient?" confirmLabel="Delete" onConfirm={remove} onClose={() => setDel(null)}>
        This permanently removes {del.full_name} and all of their appointments.
      </Confirm>}
    </>
  );
}
