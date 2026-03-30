import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
async function main() {
  const env = fs.readFileSync(".env.local", "utf8");
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim()!;
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1].trim()!;
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("staff").select("role");
  const distinct = [...new Set((data ?? []).map((r: any) => r.role))].sort();
  console.log("Distinct roles in staff table:", distinct);
  if (error) console.error(error);
}
main().catch(console.error);
