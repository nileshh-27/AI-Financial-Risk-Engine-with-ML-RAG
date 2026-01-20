import type { RiskAssessment } from "@shared/schema";
import { format } from "date-fns";

interface HistoryTableProps {
  history: RiskAssessment[] | undefined;
  isLoading: boolean;
}

export function HistoryTable({ history, isLoading }: HistoryTableProps) {
  if (isLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading history...</div>;
  }

  if (!history || history.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No assessments recorded yet.</div>;
  }

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <h3 style={{ marginBottom: '16px' }}>Recent Assessments</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Merchant</th>
            <th>Risk Level</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => {
             // Safe parsing of inputData
             const input = item.inputData as { transactionAmount?: number; merchantCategory?: string };
             
             return (
              <tr key={item.id}>
                <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                  {item.createdAt ? format(new Date(item.createdAt), 'MMM d, HH:mm') : '-'}
                </td>
                <td className="mono">${input.transactionAmount?.toFixed(2) ?? "0.00"}</td>
                <td>{input.merchantCategory ?? "Unknown"}</td>
                <td>
                  <span className={`risk-badge risk-${item.riskLevel.toLowerCase()}`}>
                    {item.riskLevel}
                  </span>
                </td>
                <td className="mono" style={{ fontWeight: 600 }}>{item.riskScore}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
