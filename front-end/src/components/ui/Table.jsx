export function Table({ children, className }) { // NOSONAR
  return (
    <div className={`table-wrapper ${className || ""}`}>
      <table className="data-table">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }) { // NOSONAR
  return <thead className="table-head">{children}</thead>;
}

export function TBody({ children }) { // NOSONAR
  return <tbody className="table-body">{children}</tbody>;
}

export function TH({ children, className }) { // NOSONAR
  return (
    <th className={`table-th ${className || ""}`}>{children}</th>
  );
}

export function TR({ children, className }) { // NOSONAR
  return (
    <tr className={`table-tr ${className || ""}`}>{children}</tr>
  );
}

export function TD({ children, className }) { // NOSONAR
  return (
    <td className={`table-td ${className || ""}`}>{children}</td>
  );
}

