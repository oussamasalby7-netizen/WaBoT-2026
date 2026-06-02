export function Table({ children, className }) {
  return (
    <div className={`table-wrapper ${className || ""}`}>
      <table className="data-table">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="table-head">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody className="table-body">{children}</tbody>;
}

export function TH({ children, className }) {
  return (
    <th className={`table-th ${className || ""}`}>{children}</th>
  );
}

export function TR({ children, className }) {
  return (
    <tr className={`table-tr ${className || ""}`}>{children}</tr>
  );
}

export function TD({ children, className }) {
  return (
    <td className={`table-td ${className || ""}`}>{children}</td>
  );
}

