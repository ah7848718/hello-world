import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/rpc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { fn, data } = await request.json() as { fn: string; data: Record<string, unknown> };
          const authHeader = request.headers.get("authorization");
          const authToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
          const token = (data?.token as string) ?? authToken;

          const { verifyAdmin, verifyStaff, verifyAuth } = await import("@/lib/auth.server-helper");

          switch (fn) {
            case "impersonateStudent": {
              const input = data as { studentId?: string; token?: string };
              if (!input?.studentId) return Response.json({ error: "studentId مطلوب" });
              const auth = await verifyAdmin(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { data: studentUser, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(input.studentId);
              if (getUserErr || !studentUser?.user?.email) return Response.json({ error: "الطالب غير موجود" });
              const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: studentUser.user.email });
              if (linkErr || !linkData?.properties?.hashed_token) return Response.json({ error: linkErr?.message ?? "فشل إنشاء رابط الدخول" });
              await supabaseAdmin.from("admin_audit_log").insert({ admin_id: auth.userId, action: "impersonate_student", target_user_id: input.studentId, metadata: { email: studentUser.user.email } });
              return Response.json({ tokenHash: linkData.properties.hashed_token, studentName: studentUser.user.user_metadata?.full_name ?? studentUser.user.email, studentEmail: studentUser.user.email });
            }

            case "adminUpdateStudentPassword": {
              const input = data as { studentId?: string; password?: string; token?: string };
              if (!input?.studentId || !input?.password) return Response.json({ error: "studentId و password مطلوبان" });
              if (input.password.length < 8 || input.password.length > 72) return Response.json({ error: "كلمة المرور 8-72 حرف" });
              const auth = await verifyStaff(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(input.studentId, { password: input.password });
              if (updateErr) return Response.json({ error: "فشل تغيير كلمة المرور: " + updateErr.message });
              await supabaseAdmin.from("admin_audit_log").insert({ admin_id: auth.userId, action: "change_student_password", target_user_id: input.studentId }).maybeSingle();
              return Response.json({ success: true });
            }

            case "testPing":
              return Response.json({
                ok: true,
                time: Date.now(),
                hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
                hasApiKey: !!process.env.CLOUDINARY_API_KEY,
                hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
                hasSupaUrl: !!process.env.SUPABASE_URL,
                hasSupaKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                hasSupaPublishableKey: !!process.env.SUPABASE_PUBLISHABLE_KEY,
              });

            case "inviteAssistant": {
              const input = data as { email?: string; token?: string };
              if (!input?.email) return Response.json({ error: "البريد الإلكتروني مطلوب" });
              const auth = await verifyAdmin(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, { data: { role: "assistant" } });
              if (inviteErr) return Response.json({ error: "فشل دعوة المساعد: " + inviteErr.message });
              return Response.json({ success: true });
            }

            case "updateAssistant": {
              const input = data as { id?: string; full_name?: string; email?: string; token?: string };
              if (!input?.id) return Response.json({ error: "id مطلوب" });
              const auth = await verifyAdmin(token);
              if (auth.error) return Response.json({ error: auth.error });
              const updates: Record<string, unknown> = {};
              if (input.full_name) updates.full_name = input.full_name;
              if (input.email) updates.email = input.email;
              if (Object.keys(updates).length === 0) return Response.json({ error: "لا توجد بيانات للتحديث" });
              const { error: updateErr } = await supabaseAdmin.from("profiles").update(updates).eq("id", input.id);
              if (updateErr) return Response.json({ error: "فشل تحديث المساعد: " + updateErr.message });
              return Response.json({ success: true });
            }

            case "deleteAssistant": {
              const input = data as { id?: string; token?: string };
              if (!input?.id) return Response.json({ error: "id مطلوب" });
              const auth = await verifyAdmin(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(input.id);
              if (deleteErr) return Response.json({ error: "فشل حذف المساعد: " + deleteErr.message });
              return Response.json({ success: true });
            }

            case "createNotification": {
              const input = data as { title?: string; body?: string; target_role?: string; token?: string };
              if (!input?.title || !input?.body) return Response.json({ error: "title و body مطلوبان" });
              const auth = await verifyAdmin(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: insErr } = await supabaseAdmin.from("notifications").insert({ title: input.title, body: input.body, target_role: input.target_role ?? "student" });
              if (insErr) return Response.json({ error: "فشل إنشاء الإشعار: " + insErr.message });
              return Response.json({ success: true });
            }

            case "deleteNotification": {
              const input = data as { id?: string; token?: string };
              if (!input?.id) return Response.json({ error: "id مطلوب" });
              const auth = await verifyAdmin(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: delErr } = await supabaseAdmin.from("notifications").delete().eq("id", input.id);
              if (delErr) return Response.json({ error: "فشل حذف الإشعار: " + delErr.message });
              return Response.json({ success: true });
            }

            case "upsertSetting": {
              const input = data as { key?: string; value?: string; token?: string };
              if (!input?.key || input?.value === undefined) return Response.json({ error: "key و value مطلوبان" });
              const auth = await verifyAdmin(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: upsertErr } = await supabaseAdmin.from("platform_settings").upsert({ key: input.key, value: String(input.value) }, { onConflict: "key" });
              if (upsertErr) return Response.json({ error: "فشل حفظ الإعداد: " + upsertErr.message });
              return Response.json({ success: true });
            }

            case "replyToTicket": {
              const input = data as { ticketId?: string; message?: string; token?: string };
              if (!input?.ticketId || !input?.message) return Response.json({ error: "ticketId و message مطلوبان" });
              const auth = await verifyStaff(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: insErr } = await supabaseAdmin.from("support_messages").insert({ ticket_id: input.ticketId, sender_id: auth.userId, message: input.message });
              if (insErr) return Response.json({ error: "فشل إضافة الرد: " + insErr.message });
              return Response.json({ success: true });
            }

            case "updateTicket": {
              const input = data as { ticketId?: string; status?: string; token?: string };
              if (!input?.ticketId) return Response.json({ error: "ticketId مطلوب" });
              const auth = await verifyStaff(token);
              if (auth.error) return Response.json({ error: auth.error });
              const updates: Record<string, unknown> = {};
              if (input.status) updates.status = input.status;
              if (Object.keys(updates).length === 0) return Response.json({ error: "لا توجد بيانات للتحديث" });
              const { error: updErr } = await supabaseAdmin.from("support_tickets").update(updates).eq("id", input.ticketId);
              if (updErr) return Response.json({ error: "فشل تحديث التذكرة: " + updErr.message });
              return Response.json({ success: true });
            }

            case "replyToQuestion": {
              const input = data as { questionId?: string; reply?: string; token?: string };
              if (!input?.questionId || !input?.reply) return Response.json({ error: "questionId و reply مطلوبان" });
              const auth = await verifyStaff(token);
              if (auth.error) return Response.json({ error: auth.error });
              const { error: updErr } = await supabaseAdmin.from("qna").update({ reply: input.reply, replied_at: new Date().toISOString(), replied_by: auth.userId }).eq("id", input.questionId);
              if (updErr) return Response.json({ error: "فشل إضافة الرد: " + updErr.message });
              return Response.json({ success: true });
            }

            case "updateQuestionStatus": {
              const input = data as { questionId?: string; status?: string; token?: string };
              if (!input?.questionId) return Response.json({ error: "questionId مطلوب" });
              const auth = await verifyStaff(token);
              if (auth.error) return Response.json({ error: auth.error });
              const updates: Record<string, unknown> = {};
              if (input.status) updates.status = input.status;
              if (Object.keys(updates).length === 0) return Response.json({ error: "لا توجد بيانات للتحديث" });
              const { error: updErr } = await supabaseAdmin.from("qna").update(updates).eq("id", input.questionId);
              if (updErr) return Response.json({ error: "فشل تحديث السؤال: " + updErr.message });
              return Response.json({ success: true });
            }

            case "startExamAttempt": {
              const { startAttemptSchema } = await import("@/lib/schemas/exam.schema");
              const parsed = startAttemptSchema.safeParse(data);
              if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" });
              const { examId, token: _t } = parsed.data;
              const { data: { user } } = await supabaseAdmin.auth.getUser(token);
              if (!user) return Response.json({ error: "غير مصرح" });
              const { error: startErr, data: attempt } = await supabaseAdmin.from("exam_attempts").insert({ exam_id: examId, student_id: user.id, started_at: new Date().toISOString() }).select().maybeSingle();
              if (startErr) return Response.json({ error: "فشل بدء المحاولة: " + startErr.message });
              return Response.json(attempt);
            }

            case "submitExamAttempt": {
              const { submitAttemptSchema } = await import("@/lib/schemas/exam.schema");
              const parsed2 = submitAttemptSchema.safeParse(data);
              if (!parsed2.success) return Response.json({ error: parsed2.error.issues[0]?.message ?? "بيانات غير صحيحة" });
              const { attemptId } = parsed2.data;
              const { data: { user } } = await supabaseAdmin.auth.getUser(token);
              if (!user) return Response.json({ error: "غير مصرح" });
              const { data: attempt } = await supabaseAdmin.from("exam_attempts").select("id, status, exam_id, student_id").eq("id", attemptId).maybeSingle();
              if (!attempt) return Response.json({ error: "المحاولة غير موجودة" });
              if (attempt.student_id !== user.id) return Response.json({ error: "هذه المحاولة ليست لك" });
              if (attempt.status !== "in_progress") return Response.json({ error: "المحاولة منتهية بالفعل" });

              const [examRes, answersRes, questionsRes, optsRes] = await Promise.all([
                supabaseAdmin.from("exams").select("passing_score").eq("id", attempt.exam_id).maybeSingle(),
                supabaseAdmin.from("student_answers").select("question_id, selected_option_id").eq("attempt_id", attemptId),
                supabaseAdmin.from("questions").select("id, points, type").eq("exam_id", attempt.exam_id),
                supabaseAdmin.from("question_options").select("id, question_id, is_correct"),
              ]);
              if (!examRes.data) return Response.json({ error: "الامتحان غير موجود" });
              const exam = examRes.data;
              const studentAnswers = answersRes.data ?? [];
              const allQuestions = questionsRes.data ?? [];
              const allOpts = optsRes.data ?? [];
              const correctOptIds = new Set(allOpts.filter((o: any) => o.is_correct).map((o: any) => o.id));
              const answerMap = new Map(studentAnswers.map((a: any) => [a.question_id, a.selected_option_id]));

              let totalPoints = 0;
              let earnedPoints = 0;
              const answerUpdates: Array<{ question_id: string; is_correct: boolean }> = [];
              for (const q of allQuestions) {
                const pts = Number(q.points) || 1;
                totalPoints += pts;
                const selected = answerMap.get(q.id) ?? null;
                const isCorrect = selected !== null && correctOptIds.has(selected);
                if (isCorrect) earnedPoints += pts;
                answerUpdates.push({ question_id: q.id, is_correct: isCorrect });
              }
              for (const au of answerUpdates) {
                await supabaseAdmin.from("student_answers").update({ is_correct: au.is_correct }).eq("attempt_id", attemptId).eq("question_id", au.question_id);
              }

              const maxScore = totalPoints;
              const score = earnedPoints;
              const passThreshold = Number(exam.passing_score ?? Math.ceil(maxScore * 0.5));
              const passed = score >= passThreshold;
              const needsManual = allQuestions.some((q: any) => q.type === "essay");
              const newStatus = needsManual ? "submitted" : "graded";
              const { error: updateErr } = await supabaseAdmin.from("exam_attempts").update({
                status: newStatus, score, max_score: maxScore, submitted_at: new Date().toISOString(),
              }).eq("id", attemptId);
              if (updateErr) return Response.json({ error: "فشل حفظ النتيجة: " + updateErr.message });
              return Response.json({ status: newStatus, score, maxScore, passed });
            }

            case "validateCoupon": {
              const input = data as { code?: string; courseId?: string; token?: string };
              if (!input?.code || !input?.courseId) return Response.json({ error: "code و courseId مطلوبان" });
              const { data: coupon } = await supabaseAdmin.from("coupons").select("*").eq("code", input.code).maybeSingle();
              if (!coupon) return Response.json({ valid: false, error: "الكوبون غير صالح" });
              if (!coupon.is_active) return Response.json({ valid: false, error: "الكوبون غير نشط" });
              const now = new Date();
              if (coupon.starts_at && new Date(coupon.starts_at) > now) return Response.json({ valid: false, error: "الكوبون لم يبدأ بعد" });
              if (coupon.ends_at && new Date(coupon.ends_at) < now) return Response.json({ valid: false, error: "الكوبون منتهي الصلاحية" });
              if (coupon.max_uses != null && (coupon.used_count ?? 0) >= coupon.max_uses) return Response.json({ valid: false, error: "الكوبون استُنفذ" });
              const { data: ccRows } = await supabaseAdmin.from("coupon_courses").select("course_id").eq("coupon_id", coupon.id);
              if (ccRows && ccRows.length > 0 && !ccRows.some((r: { course_id: string }) => r.course_id === input.courseId)) return Response.json({ valid: false, error: "الكوبون غير صالح لهذا الكورس" });
              return Response.json({ valid: true, discountPercent: coupon.discount_percent, couponId: coupon.id });
            }

            case "cloudinaryUpload": {
              const input = data as { base64?: string; mime?: string; folder?: string };
              if (!input?.base64 || !input?.mime || !input?.folder) return Response.json({ error: "base64 و mime و folder مطلوبون" });
              const { uploadToCloudinary } = await import("@/lib/cloudinary.server");
              const result = await uploadToCloudinary(input.base64, input.mime, input.folder);
              return Response.json({ secure_url: result.secure_url, public_id: result.public_id });
            }

            case "enrollFreeCourse": {
              const input = data as { courseId?: string; token?: string };
              if (!input?.courseId) return Response.json({ error: "courseId مطلوب" });
              const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
              if (userErr || !user) return Response.json({ error: "غير مصرح" });
              const { data: course } = await supabaseAdmin.from("courses").select("id, is_free").eq("id", input.courseId).maybeSingle();
              if (!course) return Response.json({ error: "الكورس غير موجود" });
              if (!course.is_free) return Response.json({ error: "هذا الكورس غير مجاني" });
              const { data: existing } = await supabaseAdmin.from("enrollments").select("id").eq("course_id", input.courseId).eq("student_id", user.id).maybeSingle();
              if (existing) return Response.json({ error: "أنت مشترك بالفعل في هذا الكورس" });
              const { error: enrErr } = await supabaseAdmin.from("enrollments").insert({ course_id: input.courseId, student_id: user.id, enrolled_at: new Date().toISOString() });
              if (enrErr) return Response.json({ error: "فشل التسجيل: " + enrErr.message });
              return Response.json({ success: true });
            }

            default:
              return Response.json({ error: "دالة غير معروفة: " + fn }, { status: 400 });
          }
        } catch (e: any) {
          console.error("[rpc] Unhandled error:", e);
          return Response.json({ error: e?.message ?? "حدث خطأ غير متوقع" }, { status: 500 });
        }
      },
    },
  },
});
