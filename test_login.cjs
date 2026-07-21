const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://pkkmyarpimznfjrnbbmj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBra215YXJwaW16bmZqcm5iYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQzMjQsImV4cCI6MjA5NDg0MDMyNH0.6jQ3fcMUuuVgKkskqcf21hxpBlux3bUu72YQT2yn3m0"
);
async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({ email: "test@hatemsimika.com", password: "Ahmed@123Bup" });
  if (error) console.log("LOGIN FAIL:", error.message);
  else console.log("LOGIN OK:", data.user.email, "| session:", !!data.session);
}
main();
