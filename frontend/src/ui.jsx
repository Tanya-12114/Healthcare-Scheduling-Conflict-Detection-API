export const Badge = ({ status }) => <span className={`badge ${status}`}>{status}</span>;

export function Pager({ data, page, setPage }) {
  if (!data || (!data.next && !data.previous)) return null;
  return (
    <div className="pager">
      <button className="btn ghost" disabled={!data.previous} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {Math.ceil(data.count / 10)}</span>
      <button className="btn ghost" disabled={!data.next} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}
