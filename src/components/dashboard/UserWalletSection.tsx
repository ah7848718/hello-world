import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import {
  User, Wallet, CreditCard, Link2, MapPin, Phone, Mail, GraduationCap,
  School, UserCheck, Loader2, ArrowUpCircle, Gift, Building2, ArrowLeft,
  Download, Clock, CheckCircle2, Ban, Filter, X, Percent, BookOpen, Key, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { validateCoupon } from "@/lib/payments-student.functions";
import * as XLSX from "xlsx";

type WalletData = { id: string; balance: number; updated_at: string };
type CenterData = { id: string; name: string; code: string; address: string | null; phone: string | null };
type CenterLinkData = { id: string; center_id: string; is_active: boolean };

type InvoiceItem = {
  id: string; amount: number; status: string; method: string;
  created_at: string; discount_amount: number; receipt_url: string | null;
  course_title: string | null; transaction_ref: string | null;
};

export function UserProfileCard({ onNavigateToWallet }: { onNavigateToWallet?: () => void }) {
  const { profile, user } = useAuth();
  const [fullProfile, setFullProfile] = useState<{ phone: string; email: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone, email")
        .eq("id", user.id)
        .maybeSingle();
      setFullProfile(data as any);
    })();
  }, [user?.id]);

  const handleCheckBalance = async () => {
    if (walletBalance !== null) {
      onNavigateToWallet?.();
      return;
    }
    setLoadingBalance(true);
    const { data: wal } = await supabase
      .from("wallets")
      .select("balance")
      .eq("student_id", user?.id)
      .maybeSingle();
    if (wal) {
      setWalletBalance((wal as any).balance);
    }
    setLoadingBalance(false);
    onNavigateToWallet?.();
  };

  if (!profile) return null;

  const displayPhone = fullProfile?.phone || profile.phone || "";
  const displayEmail = fullProfile?.email || user?.email || "";

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.full_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{profile.full_name}</h2>
                <Badge variant={profile.status === "approved" ? "secondary" : "outline"} className="shrink-0">
                  {profile.status === "approved" ? "مفعل" : profile.status === "pending" ? "قيد المراجعة" : "مرفوض"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {displayPhone || "—"}
                </span>
                <span className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {displayEmail || "—"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <button
        onClick={handleCheckBalance}
        className="w-full text-right"
      >
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-dashed border-2 border-emerald-200 hover:border-emerald-400">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-50 shrink-0">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">استعلام عن الرصيد</p>
              <p className="text-xs text-muted-foreground">
                إذا شحنت كود يمكنك استعلام عن الرصيد من هنا
              </p>
              {walletBalance !== null && (
                <p className="text-sm font-bold text-emerald-600 mt-1">
                  رصيدك: {walletBalance.toFixed(2)} ج.م
                </p>
              )}
            </div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </button>
    </div>
  );
}

export function WalletBalanceCard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("wallets").select("*").eq("student_id", user.id).maybeSingle();
      setWallet(data as any);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <Card><CardContent className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;
  if (!wallet) return null;

  return (
    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-elegant">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <span className="text-sm font-medium opacity-90">رصيدي</span>
          </div>
          <ArrowUpCircle className="h-5 w-5 opacity-70" />
        </div>
        <p className="text-3xl font-bold mt-3">{wallet.balance.toFixed(2)} <span className="text-lg font-normal opacity-80">ج.م</span></p>
        <p className="text-xs opacity-70 mt-1">آخر تحديث: {new Date(wallet.updated_at).toLocaleDateString("ar-EG")}</p>
      </CardContent>
    </Card>
  );
}

/* ───────── instant wallet top‑up ───────── */

export function WalletTopUpCard() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"vcash" | "instapay">("vcash");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  const handleTopUp = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !user?.id) return;
    setStatus("loading");
    setMsg("");

    const { error } = await supabase.from("payments").insert({
      student_id: user.id,
      course_id: null,
      amount: amt,
      method,
      status: "pending",
      discount_amount: 0,
      notes: "شحن محفظة فوري",
    });

    if (error) {
      console.error("Payment insert error:", error);
      setStatus("error");
      setMsg(error.message || "حدث خطأ أثناء إنشاء الفاتورة");
      return;
    }
    setStatus("success");
    setMsg("تم إنشاء فاتورة الشحن بنجاح! سيتم مراجعتها من الإدارة قريباً.");
    setAmount("");
  };

  return (
    <Card className="border-2 border-emerald-200 shadow-elegant">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-emerald-50">
            <Wallet className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">شحن المحفظة فوري</h3>
            <p className="text-sm text-muted-foreground">
              أدخل المبلغ اللي عايز تشحن بيه المحفظة
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <div className="flex-1 space-y-2">
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="المبلغ (ج.م)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-center text-lg h-12"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMethod("vcash")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  method === "vcash"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-muted text-muted-foreground hover:bg-muted/50"
                }`}
              >
                فودافون كاش
              </button>
              <button
                type="button"
                onClick={() => setMethod("instapay")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  method === "instapay"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-muted text-muted-foreground hover:bg-muted/50"
                }`}
              >
                انستاباي
              </button>
            </div>
          </div>
          <Button
            onClick={handleTopUp}
            disabled={status === "loading" || !amount || parseFloat(amount) <= 0}
            className="h-12 px-8 text-base font-semibold shrink-0"
          >
            {status === "loading" ? <Loader2 className="h-5 w-5 animate-spin ml-1" /> : null}
            {status === "loading" ? "جاري..." : "شحن"}
          </Button>
        </div>

        {msg && (
          <div className={`p-3 rounded-lg text-sm text-center font-medium ${
            status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            {msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── recharge centre code ───────── */

export function RechargeCodeCard() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [redeemedCourse, setRedeemedCourse] = useState<{ title: string } | null>(null);

  const handleRecharge = async () => {
    if (!code.trim() || !user?.id) return;
    setStatus("loading");
    setMsg("");
    setRedeemedCourse(null);
    const trimmed = code.trim().toUpperCase();
    const { data: found, error: findErr } = await supabase
      .from("center_codes")
      .select("id, amount, course_id")
      .eq("code", trimmed)
      .eq("is_used", false)
      .maybeSingle();
    if (findErr || !found) { setStatus("error"); setMsg("الكود غير صحيح أو تم استخدامه من قبل"); setCode(""); return; }
    const { error: updErr } = await supabase
      .from("center_codes")
      .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
      .eq("id", found.id);
    if (updErr) { setStatus("error"); setMsg("حدث خطأ أثناء الشحن"); return; }

      const { data: wal } = await supabase.from("wallets").select("id").eq("student_id", user.id).maybeSingle();
    let courseTitle = "";
    if (found.course_id) {
      const { data: course } = await supabase.from("courses").select("title").eq("id", found.course_id).single();
      if (course) courseTitle = (course as any).title;
      await supabase.from("enrollments").upsert(
        { student_id: user.id, course_id: found.course_id, status: "active", started_at: new Date().toISOString() },
        { onConflict: "student_id,course_id" } as any
      );
    }
    if (wal) {
      await supabase.from("wallet_transactions").insert({
        wallet_id: wal.id,
        amount: found.amount,
        type: "credit",
        description: `شحن كود سنتر: ${trimmed}${courseTitle ? ` - ${courseTitle}` : ""}`,
      });
      if (found.amount > 0) {
        await supabase.rpc("add_wallet_balance", { p_student_id: user.id, p_amount: found.amount });
      }
    }
    if (courseTitle) setRedeemedCourse({ title: courseTitle });
    setStatus("success");
    setMsg(`تم الشحن بنجاح!${found.amount > 0 ? ` رصيدك: ${found.amount} ج.م` : ""}${courseTitle ? ` وتم تسجيلك في ${courseTitle}` : ""}`);
    setCode("");
  };

  return (
    <Card className="border-2 border-amber-200 shadow-elegant">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-600 shrink-0" />
          <h3 className="font-bold text-base">أو شحن كود سنتر</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          دي بتدوي عليها لو انت اشتريت كود من السنتر وهتشحنه
        </p>
        <div className="space-y-2">
          <Input
            placeholder="XXXX-XXXX-XXXX-XXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            className="text-center text-lg font-mono tracking-wider h-11"
            maxLength={19}
          />
          <Button
            onClick={handleRecharge}
            disabled={status === "loading" || code.replace(/-/g, "").length < 15}
            className="w-full h-11 text-base font-semibold"
          >
            {status === "loading" ? <Loader2 className="h-5 w-5 animate-spin ml-1" /> : null}
            {status === "loading" ? "جاري الشحن..." : "شحن الكود"}
          </Button>
        </div>
        {msg && (
          <div className={`p-3 rounded-lg text-sm text-center font-medium ${
            status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            {msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── coupon discount ───────── */

export function CouponDiscountCard() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ discount?: number; reason?: string } | null>(null);
  
  const handleCheck = async () => {
    if (!code.trim()) return;
    setStatus("loading");
    setResult(null);
    try {
      const res = await validateFn({ data: { code: code.trim() } });
      if (res.ok) {
        setResult({ discount: res.discountPercent });
        setStatus("success");
      } else {
        setResult({ reason: res.reason });
        setStatus("error");
      }
    } catch {
      setResult({ reason: "حدث خطأ أثناء التحقق" });
      setStatus("error");
    }
  };

  return (
    <Card className="border-2 border-purple-200 shadow-elegant">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-purple-600 shrink-0" />
          <h3 className="font-bold text-base">كوبون خصم</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          أدخل كود الكوبون لمعرفة قيمة الخصم
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="أدخل كود الكوبون"
            value={code}
            onChange={(e) => { setCode(e.target.value); setResult(null); }}
            className="flex-1 h-11 text-center text-lg font-mono tracking-wider"
            maxLength={60}
          />
          <Button
            onClick={handleCheck}
            disabled={status === "loading" || !code.trim()}
            className="h-11 px-6 shrink-0"
          >
            {status === "loading" ? <Loader2 className="h-5 w-5 animate-spin ml-1" /> : null}
            {status === "loading" ? "جاري..." : "تحقق"}
          </Button>
        </div>
        {result && (
          <div className={`p-3 rounded-lg text-sm text-center font-medium ${
            status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            {result.discount ? `خصم ${result.discount}%` : result.reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── invoices table ───────── */

export function WalletInvoiceTable() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      setInvoices(((data ?? []) as any[]).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.method,
        created_at: p.created_at,
        discount_amount: p.discount_amount ?? 0,
        receipt_url: p.receipt_url ?? null,
        course_title: null,
        transaction_ref: p.transaction_ref ?? null,
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-green-600 text-xs"><CheckCircle2 className="h-3 w-3 ml-1" />تم الدفع</Badge>;
    if (s === "pending") return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 ml-1" />قيد المراجعة</Badge>;
    return <Badge variant="outline" className="text-xs text-red-500"><Ban className="h-3 w-3 ml-1" />مرفوض</Badge>;
  };

  const exportToExcel = useCallback(() => {
    const rows = invoices.map((inv, i) => ({
      "#": i + 1,
      "إجمالي السعر": inv.amount,
      "حالة الدفع":
        inv.status === "approved" ? "تم الدفع" :
        inv.status === "pending" ? "قيد المراجعة" : "مرفوض",
      "وقت الدفع": new Date(inv.created_at).toLocaleString("ar-EG"),
      "طريقة الدفع": inv.method === "instapay" ? "انستاباي" : "فودافون كاش",
      "رقم الفاتورة": inv.id,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الفواتير");
    XLSX.writeFile(wb, `فواتيري_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [invoices]);

  if (loading) return <Card><CardContent className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          الفواتير ال شحنتها قبل كدا
        </h3>
        {invoices.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={exportToExcel}>
            <Download className="h-4 w-4" />
            تحميل Excel
          </Button>
        )}
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد فواتير بعد</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                <th className="p-3 text-center">#</th>
                <th className="p-3 text-center whitespace-nowrap">إجمالي سعر الفاتوره</th>
                <th className="p-3 text-center whitespace-nowrap">حاله الدفع</th>
                <th className="p-3 text-center whitespace-nowrap">وقت الدفع</th>
                <th className="p-3 text-center whitespace-nowrap">طريقه الدفع</th>
                <th className="p-3 text-center whitespace-nowrap">رقم الفاتوره</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-3 text-center font-semibold whitespace-nowrap">{inv.amount.toFixed(2)} ج.م</td>
                  <td className="p-3 text-center">{statusBadge(inv.status)}</td>
                  <td className="p-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(inv.created_at).toLocaleString("ar-EG")}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    {inv.method === "instapay" ? "انستاباي" : "فودافون كاش"}
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded" title={inv.id}>
                      {inv.id.slice(0, 8)}…
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ───────── main wallet section ───────── */

export function WalletSection() {
  return (
    <div className="space-y-6">
      <WalletBalanceCard />
      <WalletTopUpCard />
      <RechargeCodeCard />
      <CouponDiscountCard />
      <WalletInvoiceTable />
    </div>
  );
}

/* ───────── centre link (unrelated, kept here) ───────── */

export function CenterLinkCard() {
  const { user } = useAuth();
  const [centers, setCenters] = useState<CenterData[]>([]);
  const [myLink, setMyLink] = useState<CenterLinkData | null>(null);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [linking, setLinking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [cRes, lRes] = await Promise.all([
        supabase.from("centers").select("*").eq("is_active", true),
        supabase.from("center_students").select("*").eq("student_id", user.id).maybeSingle(),
      ]);
      setCenters((cRes.data as any) ?? []);
      setMyLink(lRes.data as any);
      setLoading(false);
    })();
  }, [user?.id]);

  const handleLink = async () => {
    if (!selectedCenter || !user?.id) return;
    setLinking(true);
    if (myLink) {
      await supabase.from("center_students").update({ center_id: selectedCenter }).eq("id", myLink.id);
    } else {
      await supabase.from("center_students").insert({ student_id: user.id, center_id: selectedCenter });
    }
    const { data } = await supabase.from("center_students").select("*").eq("student_id", user.id).single();
    setMyLink(data as any);
    setLinking(false);
  };

  if (loading) return <Card><CardContent className="p-5 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;
  const linkedCenter = myLink ? centers.find((c) => c.id === myLink.center_id) : null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-5 w-5 text-blue-500" />
          <h3 className="font-bold">ربط id السنتر</h3>
        </div>
        {linkedCenter ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="font-medium">{linkedCenter.name}</span>
              <Badge variant="secondary" className="text-xs">متصل</Badge>
            </div>
            {linkedCenter.address && <p className="text-xs text-muted-foreground">{linkedCenter.address}</p>}
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <a href="#" onClick={(e) => { e.preventDefault(); setMyLink(null); }}>تغيير السنتر</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">اختر سنترك لربط حسابك:</p>
            {centers.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد سناتر متاحة حالياً</p>
            ) : (
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={selectedCenter}
                  onChange={(e) => setSelectedCenter(e.target.value)}
                >
                  <option value="">اختر سنتر...</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button size="sm" onClick={handleLink} disabled={!selectedCenter || linking}>
                  {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "ربط"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────── Combined Center Section (link + code courses) ───────── */

type CourseData = {
  id: string; title: string; description: string | null;
  cover_url: string | null; grade: string | null; term: string | null;
  month: string | null; price: number; discount_percent: number;
};

const CENTER_CODE_KEY = "center_code_verified";

export function CenterSection() {
  const { user } = useAuth();
  const [verified, setVerified] = useState(() => localStorage.getItem(CENTER_CODE_KEY) === "true");
  const [codeInput, setCodeInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [courses, setCourses] = useState<CourseData[] | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (!verified) return;
    setLoadingCourses(true);
    supabase
      .from("courses")
      .select("id,title,description,cover_url,grade,term,month,price,discount_percent")
      .eq("is_published", true)
      .eq("is_center_only", true)
      .order("order_index")
      .then(({ data }) => { setCourses(data ?? []); setLoadingCourses(false); });
  }, [verified]);

  const handleVerify = async () => {
    if (!codeInput.trim()) return;
    setChecking(true);
    const { data } = await supabase
      .from("center_course_codes")
      .select("id")
      .eq("code", codeInput.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    setChecking(false);
    if (!data) { toast.error("الكود غير صحيح"); return; }
    localStorage.setItem(CENTER_CODE_KEY, "true");
    setVerified(true);
  };

  const handleReset = () => {
    localStorage.removeItem(CENTER_CODE_KEY);
    setVerified(false);
    setCourses(null);
  };

  return (
    <div className="space-y-6">
      <CenterLinkCard />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-500" />
            <h3 className="font-bold">كورسات السنتر</h3>
          </div>
          {!verified ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">أدخل الكود المقدم من السنتر للوصول إلى الكورسات الخاصة:</p>
              <div className="flex gap-2">
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="أدخل الكود"
                  className="font-mono w-48"
                />
                <Button onClick={handleVerify} disabled={!codeInput.trim() || checking}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "دخول"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                  <span>تم التحقق من الكود</span>
                </div>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleReset}>
                  إدخال كود آخر
                </Button>
              </div>
              {loadingCourses ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : courses?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد كورسات خاصة بالسنتر حالياً.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {courses?.map((course) => (
                    <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        {course.cover_url && (
                          <img src={course.cover_url} alt={course.title} className="w-full h-32 object-cover" />
                        )}
                        <CardContent className="p-4 space-y-2">
                          <h4 className="font-bold text-sm leading-tight">{course.title}</h4>
                          <div className="flex flex-wrap gap-1">
                            {course.grade && <Badge variant="secondary" className="text-xs">{course.grade}</Badge>}
                            {course.term && <Badge variant="outline" className="text-xs">{course.term}</Badge>}
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-bold text-primary">{course.price} ج</span>
                            <Button asChild size="sm">
                              <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                                <BookOpen className="h-3.5 w-3.5 ml-1" /> عرض
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
