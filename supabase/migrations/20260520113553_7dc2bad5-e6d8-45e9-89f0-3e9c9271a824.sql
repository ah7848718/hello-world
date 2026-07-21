REVOKE EXECUTE ON FUNCTION public.is_approved_student(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_exam(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.exam_answers_unlocked(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;