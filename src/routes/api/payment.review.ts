import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/payment/review")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return Response.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
          }

          const authHeader = request.headers.get("Authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
          }
          const token = authHeader.slice(7);
          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: userData, error: authErr } = await supabase.auth.getUser(token);
          if (authErr || !userData?.user) {
            return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
          }
          const userId = userData.user.id;

          const adminEmails = (process.env.ADMIN_EMAILS ?? "admin@gmail.com")
            .split(",").map((e) => e.trim().toLowerCase());
          let isAdmin = false;
          if (adminEmails.length > 0) {
            try {
              const { data: au } = await supabaseAdmin.auth.admin.getUserById(userId);
              const email = au?.user?.email;
              if (email && adminEmails.includes(email.toLowerCase())) isAdmin = true;
            } catch { /* fall through */ }
          }
          if (!isAdmin) {
            const { data: roles } = await supabaseAdmin
              .from("user_roles").select("role").eq("user_id", userId);
            if ((roles ?? []).some((r: any) => r.role === "admin")) isAdmin = true;
          }
          if (!isAdmin) {
            return Response.json({ ok: false, error: "Forbidden: admin role required" }, { status: 403 });
          }

          const body = await request.json() as Record<string, unknown>;
          const { paymentId, action, notes } = body;
          if (typeof paymentId !== "string" || !paymentId) {
            return Response.json({ ok: false, error: "paymentId required" }, { status: 400 });
          }
          if (action !== "approve" && action !== "reject") {
            return Response.json({ ok: false, error: "action must be approve or reject" }, { status: 400 });
          }

          const { data: payment, error: pErr } = await supabaseAdmin
            .from("payments").select("*").eq("id", paymentId).single();
          if (pErr || !payment) {
            return Response.json({ ok: false, error: pErr?.message ?? "Payment not found" }, { status: 404 });
          }
          if (payment.status !== "pending") {
            return Response.json({ ok: false, error: "Payment already reviewed" });
          }

          if (!payment.course_id && !payment.bundle_id) {
            return Response.json({ ok: false, error: "لا يمكن اعتماد الدفع دون تحديد كورس أو باقة" });
          }

          const newStatus = action === "approve" ? "approved" : "rejected";
          const { error: updErr } = await supabaseAdmin
            .from("payments").update({
              status: newStatus, reviewed_by: userId,
              reviewed_at: new Date().toISOString(), notes: notes ?? null,
            }).eq("id", paymentId);
          if (updErr) {
            return Response.json({ ok: false, error: updErr.message });
          }

          if (action === "approve") {
            const courseIds: string[] = [];
            if (payment.course_id) courseIds.push(payment.course_id);
            if (payment.bundle_id) {
              const { data: bc, error: bcErr } = await supabaseAdmin
                .from("bundle_courses").select("course_id").eq("bundle_id", payment.bundle_id);
              if (bcErr) return Response.json({ ok: false, error: bcErr.message });
              for (const row of bc ?? []) courseIds.push(row.course_id);
            }
            if (courseIds.length > 0) {
              const rows = courseIds.map((cid: string) => ({
                student_id: payment.student_id, course_id: cid,
                bundle_id: payment.bundle_id ?? null, status: "active" as const,
              }));
              const { error: enrErr } = await supabaseAdmin
                .from("enrollments").upsert(rows, { onConflict: "student_id,course_id" });
              if (enrErr) return Response.json({ ok: false, error: enrErr.message });
            }
            if (payment.coupon_id) {
              const { data: c } = await supabaseAdmin
                .from("coupons").select("used_count").eq("id", payment.coupon_id).single();
              if (c) {
                await supabaseAdmin.from("coupons")
                  .update({ used_count: (c.used_count ?? 0) + 1 }).eq("id", payment.coupon_id);
              }
            }
          }

          return Response.json({ ok: true });
        } catch (err: any) {
          console.error("payment.review error:", err);
          return Response.json({ ok: false, error: err?.message ?? "حدث خطأ غير متوقع" }, { status: 500 });
        }
      },
    },
  },
});
