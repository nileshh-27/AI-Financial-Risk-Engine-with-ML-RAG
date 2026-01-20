import { AuthCard } from "@/components/AuthCard";

export default function AuthPage() {
  return (
    <div className="center-xy" style={{ 
      background: 'radial-gradient(circle at 50% 0%, #1a1a1a 0%, #050505 100%)' 
    }}>
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
