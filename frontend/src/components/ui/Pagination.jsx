export default function Pagination({ page, totalPages, total, pageSize = 10, onPageChange }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {start}–{end} of {total}
      </div>
      <div className="pagination-btns">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <i className="bi bi-chevron-left"></i>
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="pagination-btn" style={{ border: 'none', cursor: 'default' }}>
                ...
              </span>
            ) : (
              <button
                key={p}
                className={`pagination-btn ${p === page ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}
