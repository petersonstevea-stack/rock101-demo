import Rock101App from "@/components/Rock101App";
import { supabase } from "@/lib/supabaseClient";

export default async function Page() {
  const { data, error } = await supabase.from("students").select("*");

  console.log("STUDENTS FROM SUPABASE:", { data, error });

  return <Rock101App />;
}