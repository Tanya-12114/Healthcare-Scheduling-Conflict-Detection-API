import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Pager } from "../ui.jsx";

const EMPTY = { first_name: "", last_name: "", date_of_birth: "", gender: "F", phone: "", email: "", blood_group: "", allergies: "" };

export default function Patients() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/patients/?page=${page}&search=${encodeURIComponent(q)}`).then(setData).catch((e) => setError(e.message));
  }, [page, q]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await api(form.id ? `/patients/${form.id}/` : "/patients/", { method: form.id ? "PATCH" : "POST", body: form });
      setForm(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove(p) {
    if (!window.confirm(`Delete ${p.full_name} and all their appointments?`)) return;
    await api(`/patients/${p.id}/`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className="head">
        <h1>Patients</h1>
        <button className="btn" onClick={() => { setForm(EMPTY); setError(""); }}>Add patient</button>
      </div>
      {form && (
        <form className="panel grid" onSubmit={save}>
          <label>First name<input required value={form.first_name} onChange={set("first_name")} /></label>
          <label>Last name<input required value={form.last_name} onChange={set("last_name")} /></label>
          <label>Date of birth<input type="date" required value={form.date_of_birth} onChange={set("date_of_birth")} /></label>
          <label>Gender
            <select value={form.gender} onChange={set("gender")}><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></select>
          </label>
          <label>Phone<input required value={form.phone} onChange={set("phone")} /></label>
          <label>Email<input type="email" value={form.email} onChange={set("email")} /></label>
          <label>Blood group<input maxLength={3} value={form.blood_group} onChange={set("blood_group")} /></label>
          <label>Allergies<input value={form.allergies} onChange={set("allergies")} /></label>
          {error && <div className="error wide" role="alert">{error}</div>}
          <div className="wide row">
            <button className="btn">{form.id ? "Save changes" : "Add patient"}</button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}
      <input className="search" placeholder="Search by name, phone or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {!form && error && <div className="error">{error}</div>}
      <div className="panel flush">
        <table>
          <thead><tr><th>Name</th><th>Age</th><th>Phone</th><th>Blood group</th><th>Allergies</th><th></th></tr></thead>
          <tbody>
            {data?.results.map((p) => (
              <tr key={p.id}>
                <td><b>{p.full_name}</b></td><td>{p.age}</td><td>{p.phone}</td><td>{p.blood_group || "—"}</td><td>{p.allergies || "—"}</td>
                <td className="actions">
                  <button className="link" onClick={() => { setForm(p); setError(""); }}>Edit</button>
                  <button className="link danger" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
            {data?.results.length === 0 && <tr><td colSpan="6" className="muted">No patients found. Add your first patient to start booking.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager data={data} page={page} setPage={setPage} />
    </>
  );
}
