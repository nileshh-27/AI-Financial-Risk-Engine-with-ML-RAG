import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { riskInputSchema, type RiskInput } from "@shared/schema";
import { Loader2, ShieldCheck } from "lucide-react";

interface RiskFormProps {
  onSubmit: (data: RiskInput) => void;
  isLoading: boolean;
}

export function RiskForm({ onSubmit, isLoading }: RiskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RiskInput>({
    resolver: zodResolver(riskInputSchema),
    defaultValues: {
      transactionAmount: 0,
      merchantCategory: "Retail",
      isInternational: false,
      previousChargebacks: 0,
    },
  });

  return (
    <div className="card animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck className="text-primary" />
          New Assessment
        </h2>
        <p className="text-secondary" style={{ marginTop: '8px' }}>
          Enter transaction details to calculate risk score.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid-cols-2">
          <div className="form-group">
            <label className="form-label">Transaction Amount ($)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              {...register("transactionAmount", { valueAsNumber: true })}
            />
            {errors.transactionAmount && (
              <span className="text-danger text-sm">{errors.transactionAmount.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Merchant Category</label>
            <select className="form-input" {...register("merchantCategory")}>
              <option value="Retail">Retail</option>
              <option value="Electronics">Electronics</option>
              <option value="Travel">Travel</option>
              <option value="Digital Goods">Digital Goods</option>
              <option value="Gambling">Gambling</option>
              <option value="Jewelry">Jewelry</option>
            </select>
          </div>
        </div>

        <div className="grid-cols-2">
          <div className="form-group">
            <label className="form-label">Previous Chargebacks</label>
            <input
              type="number"
              className="form-input"
              {...register("previousChargebacks", { valueAsNumber: true })}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '24px' }}>
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                className="checkbox-input"
                {...register("isInternational")}
              />
              <span className="form-label" style={{ marginBottom: 0 }}>International Transaction</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing Risk...
              </>
            ) : (
              "Run Risk Analysis"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
