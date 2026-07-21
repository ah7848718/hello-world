import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/payment/submit")({
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

          const body = await request.json() as Record<string, unknown>;
          const { courseId, bundleId, method, transactionRef, receiptPath, couponCode } = body;

          if (!courseId && !bundleId) {
            return Response.json({ ok: false, error: "courseId or bundleId required" }, { status: 400 });
          }
          if (!method || !transactionRef || !receiptPath) {
            return Response.json({ ok: false, error: "method, transactionRef, receiptPath required" }, { status: 400 });
          }
          if (method !== "vcash" && method !== "instapay") {
            return Response.json({ ok: false, error: "method must be vcash or instapay" }, { status: 400 });
          }
          if (typeof transactionRef !== "string" || transactionRef.length > 200) {
            return Response.json({ ok: false, error: "invalid transactionRef" }, { status: 400 });
          }
          if (typeof receiptPath !== "string" || receiptPath.length > 500) {
            return Response.json({ ok: false, error: "invalid receiptPath" }, { status: 400 });
          }

          if (courseId) {
            const { data: existing } = await supabaseAdmin
              .from("enrollments").select("id").eq("student_id", userId).eq("course_id", courseId).eq("status", "active").maybeSingle();
            if (existing) {
              return Response.json({ ok: false, error: "أنت مشترك بالفعل في هذا الكورس" });
            }
          }

          let basePrice = 0;
          let discountPct = 0;
          if (courseId) {
            const { data: course, error: cErr } = await supabaseAdmin
              .from("courses").select("price, discount_percent, is_free").eq("id", courseId).maybeSingle();
            if (cErr) return Response.json({ ok: false, error: cErr.message });
            if (!course) return Response.json({ ok: false, error: "الكورس غير موجود" });
            if (course.is_free) return Response.json({ ok: false, error: "هذا الكورس مجاني، لا يمكن الدفع له" });
            basePrice = Number(course.price);
            discountPct = course.discount_percent ?? 0;
          } else if (bundleId) {
            const { data: bundle, error: bErr } = await supabaseAdmin
              .from("bundles").select("price, discount_percent").eq("id", bundleId).maybeSingle();
            if (bErr) return Response.json({ ok: false, error: bErr.message });
            if (!bundle) return Response.json({ ok: false, error: "الباقة غير موجودة" });
            basePrice = Number(bundle.price);
            discountPct = bundle.discount_percent ?? 0;
          }

          const afterDisc = basePrice * (1 - discountPct / 100);
          let couponId: string | null = null;
          let discountAmount = basePrice - afterDisc;
          let finalAmount = afterDisc;

          if (couponCode && typeof couponCode === "string" && courseId) {
            const { data: c } = await supabaseAdmin
              .from("coupons").select("*").eq("code", couponCode).maybeSingle();
            if (c && c.is_active) {
              const now = new Date();
              const validDate = (!c.starts_at || new Date(c.starts_at) <= now) && (!c.ends_at || new Date(c.ends_at) >= now);
              const validUses = c.max_uses == null || c.used_count < c.max_uses;
              if (validDate && validUses) {
                const { data: ccRows } = await supabaseAdmin
                  .from("coupon_courses").select("course_id").eq("coupon_id", c.id);
                const allowed = !ccRows || ccRows.length === 0 || ccRows.some((r: any) => r.course_id === courseId);
                if (allowed) {
                  couponId = c.id;
                  const couponDisc = afterDisc * (c.discount_percent / 100);
                  discountAmount += couponDisc;
                  finalAmount = afterDisc - couponDisc;
                }
              }
            }
          }

          const { error: insErr } = await supabaseAdmin.from("payments").insert({
            student_id: userId,
            course_id: courseId ?? null,
            bundle_id: bundleId ?? null,
            amount: finalAmount,
            method,
            receipt_url: receiptPath,
            transaction_ref: transactionRef,
            coupon_id: couponId,
            discount_amount: discountAmount,
            status: "pending",
          });
          if (insErr) return Response.json({ ok: false, error: insErr.message });
          return Response.json({ ok: true, finalAmount });
        } catch (err: any) {
          console.error("payment.submit error:", err);
          return Response.json({ ok: false, error: err?.message ?? "حدث خطأ غير متوقع" }, { status: 500 });
        }
      },
    },
  },
});
