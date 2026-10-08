import { useCallback, useEffect, useState } from "react";
import { api, session } from "../api";
import { Avatar, Badge, Confirm, Empty, Icon, Modal, Pager, Skeleton, useToast } from "../ui.jsx";

const EMPTY = { name: "", specialization: "", email: "", phone: "", is_active: true };
const SIZE = 9;

export default function Doctors() {
  const toast = useToast();
  const staff = session.isStaff();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/doctors/?page=${page}&page_size=${SIZE}&search=${encodeURIComponent(q)}`).then(setData).catch((e) => toast(e.message, "err"));
  }, [page, q, toast]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await api(form.id ? `/doctors/${form.id}/` : "/doctors/", { method: form.id ? "PATCH" : "POST", body: form });
      toast(form.id ? "Doctor updated" : "Doctor added");
      setForm(null); load();
    } catch (err) { setError(err.message); }
  }

  async function toggle(d) {
    try {
      await api(`/doctors/${d.id}/`, { method: "PATCH", body: { is_active: !d.is_active } });
      toast(d.is_active ? `Dr. ${d.name} marked inactive` : `Dr. ${d.name} is active again`); load();
    } catch (err) { toast(err.message, "err"); }
  }

  async function remove() {
    try {
      await api(`/doctors/${del.id}/`, { method: "DELETE" });
      toast("Doctor deleted"); load();
    } catch (err) { toast(err.message, "err"); }
    setDel(null);
  }

  return (
    <>
      <div className="head">
        <div><h1>Doctors</h1><p className="muted">Everyone who can be booked for an appointment.</p></div>
        {staff && <button className="btn" onClick={() => { setForm(EMPTY); setError(""); }}><Icon name="plus" />Add doctor</button>}
      </div>
      {!staff && (
        <div className="notice"><Icon name="lock" />Only admin accounts can add or edit doctors. Ask an admin, or sign in with a staff account (see the README).</div>
      )}
      <div className="searchbox">
        <Icon name="search" />
        <input placeholder="Search by name or specialization" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      {!data ? <Skeleton /> : data.results.length === 0 ? (
        <div className="panel"><Empty icon="steth" title={q ? "No matches" : "No doctors yet"}>
          {staff ? <>Click <b>Add doctor</b> to create the first one.</> : "An admin needs to add doctors before appointments can be booked."}
        </Empty></div>
      ) : (
        <div className="cards">
          {data.results.map((d) => (
            <article key={d.id} className={`card ${d.is_active ? "" : "off"}`}>
              <div className="person">
                <Avatar name={d.name} tone={d.id} />
                <div><b>Dr. {d.name}</b><div className="muted">{d.specialization}</div></div>
                <Badge status={d.is_active ? "scheduled" : "cancelled"}>{d.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="meta"><Icon name="mail" size={15} />{d.email}</div>
              <div className="meta"><Icon name="phone" size={15} />{d.phone || "No phone"}</div>
              {staff && (
                <div className="card-actions">
                  <button className="link" onClick={() => { setForm(d); setError(""); }}>Edit</button>
                  <button className="link" onClick={() => toggle(d)}>{d.is_active ? "Mark inactive" : "Mark active"}</button>
                  <button className="link danger" onClick={() => setDel(d)}>Delete</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <Pager data={data} page={page} setPage={setPage} size={SIZE} />

      {form && (
        <Modal title={form.id ? "Edit doctor" : "Add doctor"} onClose={() => setForm(null)} footer={<>
          <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn" form="doctor-form">{form.id ? "Save changes" : "Add doctor"}</button>
        </>}>
          <form id="doctor-form" className="grid" onSubmit={save}>
            <label>Full name<input required autoFocus placeholder="Priya Rao" value={form.name} onChange={set("name")} /></label>
            <label>Specialization<input required placeholder="Cardiology" value={form.specialization} onChange={set("specialization")} /></label>
            <label>Email<input type="email" required value={form.email} onChange={set("email")} /></label>
            <label>Phone<input value={form.phone} onChange={set("phone")} /></label>
            {error && <div className="error wide" role="alert">{error}</div>}
          </form>
        </Modal>
      )}
      {del && <Confirm danger title="Delete doctor?" confirmLabel="Delete" onConfirm={remove} onClose={() => setDel(null)}>
        Dr. {del.name} will be removed. Doctors who already have appointments can't be deleted; mark them inactive instead.
      </Confirm>}
    </>
  );
}
