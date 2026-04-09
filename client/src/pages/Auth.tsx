import { AuthCard } from "@/components/AuthCard";

export default function AuthPage() {
  return (
    <div className="center-xy">
      <div className="container">
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 className="mono" style={{ fontSize: '2rem', letterSpacing: '-0.05em' }}>
            <span style={{ color: 'var(--accent-primary)' }}>RISK</span>.ENGINE
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Advanced Financial Fraud Detection System
          </p>
        </div>
        <AuthCard />
      </div>
    </div>
  );
}
