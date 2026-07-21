
CREATE POLICY "Public can view published courses"
ON public.courses FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Public can view published bundles"
ON public.bundles FOR SELECT
TO anon, authenticated
USING (is_published = true);
