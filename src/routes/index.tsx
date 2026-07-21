import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Hero } from "@/components/Hero";
import { FeaturedCourses } from "@/components/FeaturedCourses";
import { Stats } from "@/components/Stats";
import { Features } from "@/components/Features";
import { Motivation } from "@/components/Motivation";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { AskMrHatem } from "@/components/AskMrHatem";

import { AnnouncementBanner } from "@/components/AnnouncementBanner";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Index,
});

function Index() {
  return (
    <>
      <AnnouncementBanner />
      <Hero />
      <section id="courses"><FeaturedCourses /></section>
      <section id="grades"><Stats /></section>
      <section id="why"><Features /></section>
      <Motivation />
      <section id="testimonials"><Testimonials /></section>
      <section id="faq"><FAQ /></section>
      <section id="contact"><AskMrHatem /></section>
    </>
  );
}
