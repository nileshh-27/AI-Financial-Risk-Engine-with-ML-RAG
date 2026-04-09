import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { hasSupabaseEnv, requireSupabase } from "@/lib/supabase";
import { useRiskHistory } from "@/hooks/use-risk";
import { useAnalysisHistory } from "@/hooks/use-analysis";
import { toast } from "@/hooks/use-toast";
import { Building2, FileCheck2, Landmark, Pencil, Save, Shield, X, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RiskTolerance = "Conservative" | "Balanced" | "Growth" | "Aggressive";
type IncomeRange =
  | "<25k"
  | "25k-50k"
  | "50k-100k"
  | "100k-250k"
  | "250k+";
type Horizon = "<1y" | "1-3y" | "3-7y" | "7y+";
type Experience = "Beginner" | "Intermediate" | "Advanced";

type BankerProfile = {
  fullName: string;
  phone: string;
  preferredName: string;
  role: string;

  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  dateOfBirth: string;
  nationality: string;
  taxResidence: string;
  taxIdLast4: string;

  employmentStatus: string;
  employer: string;
  jobTitle: string;
  annualIncomeRange: IncomeRange;
  sourceOfFunds: string;

  baseCurrency: string;
  preferredAccount: string;
  primaryBank: string;
  ibanLast4: string;
  swiftBic: string;

  investmentHorizon: Horizon;
  riskTolerance: RiskTolerance;
  liquidityNeeds: string;
  experienceLevel: Experience;

  kycStatus: "Pending" | "Verified" | "Rejected";
  pepStatus: "No" | "Yes";

  notifyEmail: boolean;
  notifySms: boolean;
  statementPaperless: boolean;
  notes: string;

  updatedAt: string;
};

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function displayText(value: string) {
  const v = value.trim();
  return v ? v : "—";
}

function ReadOnlyValue({ value, mono, style }: { value: string; mono?: boolean; style?: CSSProperties }) {
  return (
    <div
      className={`flex items-center min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground shadow-sm ${mono ? "font-mono text-xs " : ""}`}
      style={{ ...style }}
      aria-readonly="true"
    >
      {displayText(value)}
    </div>
  );
}

const defaultProfile: BankerProfile = {
  fullName: "",
  phone: "",
  preferredName: "",
  role: "Customer",

  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",

  dateOfBirth: "",
  nationality: "Indian",
  taxResidence: "India",
  taxIdLast4: "",

  employmentStatus: "Employed",
  employer: "",
  jobTitle: "",
  annualIncomeRange: "50k-100k",
  sourceOfFunds: "Salary",

  baseCurrency: "INR",
  preferredAccount: "Savings Account",
  primaryBank: "",
  ibanLast4: "",
  swiftBic: "",

  investmentHorizon: "3-7y",
  riskTolerance: "Balanced",
  liquidityNeeds: "Medium",
  experienceLevel: "Intermediate",

  kycStatus: "Pending",
  pepStatus: "No",

  notifyEmail: true,
  notifySms: false,
  statementPaperless: true,
  notes: "",

  updatedAt: "",
};

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, profile, storedPhone, loading, lastUpdated } = useBankerProfile();

  const { data: riskHistory, isLoading: isLoadingRisk } = useRiskHistory();
  const { data: pdfHistory, isLoading: isLoadingPdf } = useAnalysisHistory();

  const historyLogs = useMemo(() => {
    const h1 = (riskHistory || []).map(r => ({
      id: r.id,
      type: "Manual Assessment",
      date: new Date(r.createdAt || 0),
      summary: `Amount: ₹${(r.inputData as any)?.transactionAmount || 0}`,
      level: r.riskLevel
    }));
    const h2 = (pdfHistory || []).map(p => ({
      id: p.id,
      type: "PDF Analytics",
      date: new Date(p.created_at || 0),
      summary: `${p.summary?.total_transactions || 0} Transactions`,
      level: "Aggregated"
    }));
    return [...h1, ...h2].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [riskHistory, pdfHistory]);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Profile</h1>
          <p className="text-muted-foreground">Your client profile (read-only). Use Edit to update details.</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span>Email: <span className="font-mono">{user?.email ?? ""}</span></span>
            {lastUpdated ? (
              <>
                <span className="text-white/20">•</span>
                <span>Last updated: <span className="font-mono">{lastUpdated.toLocaleString()}</span></span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button variant="secondary" onClick={() => setLocation("/profile/edit")}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit profile
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="mb-8 p-8 flex justify-center items-center bg-card/40 backdrop-blur-xl border-white/5">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading profile from Supabase…</span>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h3 style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <Building2 size={18} />
            Personal & Contact
          </h3>

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Legal full name</label>
              <ReadOnlyValue value={profile.fullName} />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred name</label>
              <ReadOnlyValue value={profile.preferredName} />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <ReadOnlyValue value={storedPhone || profile.phone} mono />
              {storedPhone ? (
                <div className="text-secondary" style={{ marginTop: 6, fontSize: "0.85rem" }}>
                  Phone number is locked after signup.
                </div>
              ) : null}
            </div>
            <div className="form-group">
              <label className="form-label">Client role</label>
              <ReadOnlyValue value={profile.role} />
            </div>
          </div>

          <div className="divider" />

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Address line 1</label>
              <ReadOnlyValue value={profile.addressLine1} />
            </div>
            <div className="form-group">
              <label className="form-label">Address line 2</label>
              <ReadOnlyValue value={profile.addressLine2} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <ReadOnlyValue value={profile.city} />
            </div>
            <div className="form-group">
              <label className="form-label">State / Region</label>
              <ReadOnlyValue value={profile.state} />
            </div>
            <div className="form-group">
              <label className="form-label">PIN code</label>
              <ReadOnlyValue value={profile.postalCode} mono />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <ReadOnlyValue value={profile.country} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <FileCheck2 size={18} />
            Identity & Compliance
          </h3>

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Date of birth</label>
              <ReadOnlyValue value={profile.dateOfBirth} mono />
            </div>
            <div className="form-group">
              <label className="form-label">Nationality</label>
              <ReadOnlyValue value={profile.nationality} />
            </div>
            <div className="form-group">
              <label className="form-label">Tax residence</label>
              <ReadOnlyValue value={profile.taxResidence} />
            </div>
            <div className="form-group">
              <label className="form-label">PAN last 4</label>
              <ReadOnlyValue value={profile.taxIdLast4} mono />
            </div>
          </div>

          <div className="divider" />

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">KYC status</label>
              <ReadOnlyValue value={profile.kycStatus} />
            </div>
            <div className="form-group">
              <label className="form-label">PEP status</label>
              <ReadOnlyValue value={profile.pepStatus} />
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Badge variant={profile.kycStatus === "Verified" ? "default" : profile.kycStatus === "Pending" ? "outline" : "destructive"}>
              KYC: {profile.kycStatus}
            </Badge>
            <Badge variant={profile.pepStatus === "Yes" ? "destructive" : "secondary"}>
              PEP: {profile.pepStatus}
            </Badge>
          </div>
        </div>

        <div className="card">
          <h3 style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <Landmark size={18} />
            Employment & Source of Funds
          </h3>

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Employment status</label>
              <ReadOnlyValue value={profile.employmentStatus} />
            </div>
            <div className="form-group">
              <label className="form-label">Job title</label>
              <ReadOnlyValue value={profile.jobTitle} />
            </div>
            <div className="form-group">
              <label className="form-label">Employer</label>
              <ReadOnlyValue value={profile.employer} />
            </div>
            <div className="form-group">
              <label className="form-label">Annual income range</label>
              <ReadOnlyValue value={profile.annualIncomeRange} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Primary source of funds</label>
              <ReadOnlyValue value={profile.sourceOfFunds} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <Shield size={18} />
            Suitability & Preferences
          </h3>

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Risk tolerance</label>
              <ReadOnlyValue value={profile.riskTolerance} />
            </div>
            <div className="form-group">
              <label className="form-label">Investment horizon</label>
              <ReadOnlyValue value={profile.investmentHorizon} />
            </div>
            <div className="form-group">
              <label className="form-label">Liquidity needs</label>
              <ReadOnlyValue value={profile.liquidityNeeds} />
            </div>
            <div className="form-group">
              <label className="form-label">Experience level</label>
              <ReadOnlyValue value={profile.experienceLevel} />
            </div>
          </div>

          <div className="divider" />

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Base currency</label>
              <ReadOnlyValue value={profile.baseCurrency} mono />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred account</label>
              <ReadOnlyValue value={profile.preferredAccount} />
            </div>
          </div>

          <div className="divider" />

          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Paperless statements</label>
              <ReadOnlyValue value={profile.statementPaperless ? "Enabled" : "Disabled"} />
            </div>
            <div className="form-group">
              <label className="form-label">Notifications</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ReadOnlyValue value={profile.notifyEmail ? "Email: On" : "Email: Off"} />
                <ReadOnlyValue value={profile.notifySms ? "SMS: On" : "SMS: Off"} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ marginBottom: 12 }}>Banking Rails (optional)</h3>
          <div className="grid-cols-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Primary bank</label>
              <ReadOnlyValue value={profile.primaryBank} />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC code</label>
              <ReadOnlyValue value={profile.swiftBic} mono />
            </div>
            <div className="form-group">
              <label className="form-label">Account number (last 4)</label>
              <ReadOnlyValue value={profile.ibanLast4} mono />
            </div>
          </div>

        </div>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Unified Assessment History
          </CardTitle>
          <CardDescription>Comprehensive log of PDF uploads and manual form risk assessments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRisk || isLoadingPdf ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No assessments recorded yet.</div>
          ) : (
            <div className="rounded-md border border-white/10 bg-black/20">
              <div className="w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b border-white/10">
                    <tr className="border-b transition-colors hover:bg-transparent border-white/10 text-muted-foreground">
                      <th className="h-10 px-4 text-left font-medium">Date</th>
                      <th className="h-10 px-4 text-left font-medium">Type</th>
                      <th className="h-10 px-4 text-left font-medium">Summary</th>
                      <th className="h-10 px-4 text-center font-medium">Risk Flag</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0 text-white">
                    {historyLogs.map(log => (
                      <tr key={log.id} className="border-b hover:bg-white/5 border-white/5 transition-colors">
                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">{format(log.date, 'MMM d, yyyy HH:mm')}</td>
                        <td className="p-4 align-middle">{log.type}</td>
                        <td className="p-4 align-middle">{log.summary}</td>
                        <td className="p-4 align-middle text-center">
                          <Badge variant={log.level === 'High' ? 'destructive' : log.level === 'Medium' ? 'warning' : 'default'} className="shadow-sm">
                            {log.level}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

export function ProfileEditPage() {
  const { user, profile, storedPhone, loading, setStoredProfile, setStoredUpdatedAt, lastUpdated } = useBankerProfile();
  const [, setLocation] = useLocation();
  const [saving, setSaving] = useState(false);

  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState<BankerProfile>(profile);

  useEffect(() => {
    if (touched) return;
    setForm(profile);
  }, [profile, touched]);

  const update = (patch: Partial<BankerProfile>) => {
    setTouched(true);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const onSave = async () => {
    if (!hasSupabaseEnv) {
      toast({
        title: "Supabase not configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Not signed in",
        description: "Sign in to save your profile.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const supabase = requireSupabase();
      const lockedPhone = storedPhone || form.phone;
      const payload: BankerProfile = {
        ...form,
        phone: lockedPhone,
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            banker_profile: payload,
          },
          { onConflict: "id" },
        )
        .select("banker_profile,updated_at")
        .single();

      if (error) throw error;

      const bp = (data?.banker_profile ?? null) as unknown;
      setStoredProfile(bp && typeof bp === "object" ? (bp as Record<string, unknown>) : null);
      setStoredUpdatedAt(typeof data?.updated_at === "string" ? data.updated_at : "");

      toast({ title: "Profile saved", description: "Your profile and preferences were updated." });
      setLocation("/profile");
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message ?? "Unable to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Edit Profile</h1>
          <p className="text-muted-foreground">Modify your settings and onboarding details.</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span>Email: <span className="font-mono">{user?.email ?? ""}</span></span>
            {lastUpdated ? (
              <>
                <span className="text-white/20">•</span>
                <span>Last updated: <span className="font-mono">{lastUpdated.toLocaleString()}</span></span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => setLocation("/profile")} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="mb-8 p-8 flex justify-center items-center bg-card/40 backdrop-blur-xl border-white/5">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading profile from Supabase…</span>
        </Card>
      )}

      <div className="flex flex-col gap-8 max-w-4xl">
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Personal & Contact Information
            </CardTitle>
            <CardDescription>Basic details required for compliance and account verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Legal full name</label>
                <Input value={form.fullName} onChange={(e) => update({ fullName: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred name</label>
                <Input value={form.preferredName} onChange={(e) => update({ preferredName: e.target.value })} placeholder="Johnny" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={storedPhone || form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  disabled={Boolean(storedPhone)}
                  placeholder="+91XXXXXXXXXX"
                />
                {storedPhone && (
                  <p className="text-xs text-muted-foreground">Phone number is locked after signup.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Role</label>
                <Select value={form.role} onValueChange={(value) => update({ role: value })}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Priority Customer">Priority Customer</SelectItem>
                    <SelectItem value="Business Customer">Business Customer</SelectItem>
                    <SelectItem value="Internal Analyst">Internal Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address line 1</label>
                <Input value={form.addressLine1} onChange={(e) => update({ addressLine1: e.target.value })} placeholder="123 Example Street" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address line 2</label>
                <Input value={form.addressLine2} onChange={(e) => update({ addressLine2: e.target.value })} placeholder="Apt 4B" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input value={form.city} onChange={(e) => update({ city: e.target.value })} placeholder="Mumbai" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State / Region</label>
                <Input value={form.state} onChange={(e) => update({ state: e.target.value })} placeholder="Maharashtra" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN code</label>
                <Input value={form.postalCode} onChange={(e) => update({ postalCode: e.target.value })} placeholder="400001" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Input value={form.country} onChange={(e) => update({ country: e.target.value })} placeholder="India" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Identity & Compliance Data
            </CardTitle>
            <CardDescription>Regulatory fields necessary for background checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date of birth</label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => update({ dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nationality</label>
                <Input value={form.nationality} onChange={(e) => update({ nationality: e.target.value })} placeholder="Indian" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tax residence</label>
                <Input value={form.taxResidence} onChange={(e) => update({ taxResidence: e.target.value })} placeholder="India" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PAN last 4 digits</label>
                <Input value={form.taxIdLast4} onChange={(e) => update({ taxIdLast4: e.target.value })} placeholder="1234" maxLength={4} />
              </div>
            </div>

            <div className="h-px bg-white/10 w-full my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">KYC status</label>
                <Select value={form.kycStatus} onValueChange={(value: any) => update({ kycStatus: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PEP status</label>
                <Select value={form.pepStatus} onValueChange={(value: any) => update({ pepStatus: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Is this person a Politically Exposed Person?</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5 text-primary" />
              Employment & Source of Funds
            </CardTitle>
            <CardDescription>Financial profiling for AML models.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employment status</label>
                <Select value={form.employmentStatus} onValueChange={(value) => update({ employmentStatus: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employed">Employed</SelectItem>
                    <SelectItem value="Self-employed">Self-employed</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Unemployed">Unemployed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job title</label>
                <Input value={form.jobTitle} onChange={(e) => update({ jobTitle: e.target.value })} placeholder="Software Engineer" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Employer</label>
                <Input value={form.employer} onChange={(e) => update({ employer: e.target.value })} placeholder="Tech Corp" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Annual income range</label>
                <Select value={form.annualIncomeRange} onValueChange={(value: any) => update({ annualIncomeRange: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<25k">&lt; ₹5L</SelectItem>
                    <SelectItem value="25k-50k">₹5L - ₹10L</SelectItem>
                    <SelectItem value="50k-100k">₹10L - ₹25L</SelectItem>
                    <SelectItem value="100k-250k">₹25L - ₹1Cr</SelectItem>
                    <SelectItem value="250k+">₹1Cr+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Primary source of funds</label>
                <Select value={form.sourceOfFunds} onValueChange={(value) => update({ sourceOfFunds: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salary">Salary</SelectItem>
                    <SelectItem value="Business income">Business income</SelectItem>
                    <SelectItem value="Investments">Investments</SelectItem>
                    <SelectItem value="Inheritance">Inheritance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Suitability & Profile Preferences
            </CardTitle>
            <CardDescription>System behaviour and portfolio settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Risk tolerance</label>
                <Select value={form.riskTolerance} onValueChange={(value: any) => update({ riskTolerance: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conservative">Conservative</SelectItem>
                    <SelectItem value="Balanced">Balanced</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Investment horizon</label>
                <Select value={form.investmentHorizon} onValueChange={(value: any) => update({ investmentHorizon: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<1y">&lt;1y</SelectItem>
                    <SelectItem value="1-3y">1-3y</SelectItem>
                    <SelectItem value="3-7y">3-7y</SelectItem>
                    <SelectItem value="7y+">7y+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Liquidity needs</label>
                <Select value={form.liquidityNeeds} onValueChange={(value) => update({ liquidityNeeds: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Experience level</label>
                <Select value={form.experienceLevel} onValueChange={(value: any) => update({ experienceLevel: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Base currency</label>
                <Select value={form.baseCurrency} onValueChange={(value) => update({ baseCurrency: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred account type</label>
                <Select value={form.preferredAccount} onValueChange={(value) => update({ preferredAccount: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Savings Account">Savings Account</SelectItem>
                    <SelectItem value="Current Account">Current Account</SelectItem>
                    <SelectItem value="Salary Account">Salary Account</SelectItem>
                    <SelectItem value="NRE / NRO Account">NRE / NRO Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-sm font-medium">Delivery Preferences</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="paperless"
                    checked={form.statementPaperless}
                    onCheckedChange={(checked) => update({ statementPaperless: checked === true })}
                  />
                  <label htmlFor="paperless" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Enable paperless statements
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-sm font-medium">Communications</label>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="emailNotif" checked={form.notifyEmail} onCheckedChange={(c) => update({ notifyEmail: c === true })} />
                    <label htmlFor="emailNotif" className="text-sm font-medium">Email Alerts</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="smsNotif" checked={form.notifySms} onCheckedChange={(c) => update({ notifySms: c === true })} />
                    <label htmlFor="smsNotif" className="text-sm font-medium">SMS Verification & Alerts</label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Banking Rails & Internal Notes</CardTitle>
            <CardDescription>Optional core banking routing details and analyst comments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary bank</label>
                <Input value={form.primaryBank} onChange={(e) => update({ primaryBank: e.target.value })} placeholder="HDFC Bank" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">IFSC code</label>
                <Input value={form.swiftBic} onChange={(e) => update({ swiftBic: e.target.value })} placeholder="HDFC0001234" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account No. (Last 4)</label>
                <Input value={form.ibanLast4} onChange={(e) => update({ ibanLast4: e.target.value })} placeholder="1234" maxLength={4} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Banker & Compliance Notes</label>
              <Textarea
                className="min-h-[140px] resize-y bg-background"
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Enter suitability notes, policy exceptions, KYC timeline, screening caveats…"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Stored in <code className="text-[10px] bg-white/10 px-1 py-0.5 rounded">banker_profile</code> JSON blob. Do not enter secure secrets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function useBankerProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [storedProfile, setStoredProfile] = useState<Record<string, unknown> | null>(null);
  const [storedUpdatedAt, setStoredUpdatedAt] = useState<string>("");

  // Load the profile from the Supabase `profiles` table.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user?.id) {
        setStoredProfile(null);
        setStoredUpdatedAt("");
        return;
      }

      setLoading(true);
      try {
        const supabase = requireSupabase();
        const { data, error } = await supabase
          .from("profiles")
          .select("banker_profile,updated_at")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        const bp = (data?.banker_profile ?? null) as unknown;
        setStoredProfile(bp && typeof bp === "object" ? (bp as Record<string, unknown>) : null);
        setStoredUpdatedAt(typeof data?.updated_at === "string" ? data.updated_at : "");
      } catch (err: any) {
        if (cancelled) return;
        setStoredProfile(null);
        setStoredUpdatedAt("");
        toast({
          title: "Profile load failed",
          description: err?.message ?? "Unable to load profile from Supabase.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const storedPhone = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaPhone = getString(meta.phone);
    const profilePhone = getString((storedProfile as any)?.phone);
    return (profilePhone || metaPhone || "").trim();
  }, [storedProfile, user?.user_metadata]);

  const profile = useMemo<BankerProfile>(() => {
    // One-time fallback for users who previously stored this in auth metadata.
    // If `profiles.banker_profile` exists, it is the source of truth.
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaSaved = (meta.bankerProfile ?? {}) as Record<string, unknown>;
    const saved = storedProfile ?? metaSaved;

    return {
      ...defaultProfile,
      fullName: getString(saved.fullName || meta.fullName),
      phone: getString(saved.phone || meta.phone),
      preferredName: getString(saved.preferredName),
      role: getString(saved.role) || defaultProfile.role,

      addressLine1: getString(saved.addressLine1),
      addressLine2: getString(saved.addressLine2),
      city: getString(saved.city),
      state: getString(saved.state),
      postalCode: getString(saved.postalCode),
      country: getString(saved.country),

      dateOfBirth: getString(saved.dateOfBirth),
      nationality: getString(saved.nationality),
      taxResidence: getString(saved.taxResidence),
      taxIdLast4: getString(saved.taxIdLast4),

      employmentStatus: getString(saved.employmentStatus) || defaultProfile.employmentStatus,
      employer: getString(saved.employer),
      jobTitle: getString(saved.jobTitle),
      annualIncomeRange: (getString(saved.annualIncomeRange) as IncomeRange) || defaultProfile.annualIncomeRange,
      sourceOfFunds: getString(saved.sourceOfFunds) || defaultProfile.sourceOfFunds,

      baseCurrency: getString(saved.baseCurrency) || defaultProfile.baseCurrency,
      preferredAccount: getString(saved.preferredAccount) || defaultProfile.preferredAccount,
      primaryBank: getString(saved.primaryBank),
      ibanLast4: getString(saved.ibanLast4),
      swiftBic: getString(saved.swiftBic),

      investmentHorizon: (getString(saved.investmentHorizon) as Horizon) || defaultProfile.investmentHorizon,
      riskTolerance: (getString(saved.riskTolerance) as RiskTolerance) || defaultProfile.riskTolerance,
      liquidityNeeds: getString(saved.liquidityNeeds) || defaultProfile.liquidityNeeds,
      experienceLevel: (getString(saved.experienceLevel) as Experience) || defaultProfile.experienceLevel,

      kycStatus: (getString(saved.kycStatus) as BankerProfile["kycStatus"]) || defaultProfile.kycStatus,
      pepStatus: (getString(saved.pepStatus) as BankerProfile["pepStatus"]) || defaultProfile.pepStatus,

      notifyEmail: getBool(saved.notifyEmail, defaultProfile.notifyEmail),
      notifySms: getBool(saved.notifySms, defaultProfile.notifySms),
      statementPaperless: getBool(saved.statementPaperless, defaultProfile.statementPaperless),
      notes: getString(saved.notes),

      updatedAt: getString(saved.updatedAt) || storedUpdatedAt,
    };
  }, [storedProfile, storedUpdatedAt, user?.user_metadata]);

  const lastUpdated = storedUpdatedAt ? new Date(storedUpdatedAt) : profile.updatedAt ? new Date(profile.updatedAt) : null;

  return {
    user,
    profile,
    storedPhone,
    loading,
    lastUpdated,
    setStoredProfile,
    setStoredUpdatedAt,
  };
}
