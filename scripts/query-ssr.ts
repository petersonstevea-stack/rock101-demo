import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

async function main() {
  const env = fs.readFileSync(".env.local", "utf8");
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim()!;
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1].trim()!;
  const supabase = createClient(url, key);

  const { data: sampleRow } = await supabase.from("staff_school_roles").select("*").limit(1);
  console.log("=== Sample staff_school_roles row (reveals columns) ===");
  console.log(JSON.stringify(sampleRow, null, 2));

  const { data: staff } = await supabase.from("staff").select("id, email, school_slug");
  const { data: ssr } = await supabase.from("staff_school_roles").select("staff_id");
  const ssrIds = new Set((ssr ?? []).map((r: any) => r.staff_id));
  const missing = (staff ?? []).filter((s: any) => !ssrIds.has(s.id));
  console.log("\n=== Staff missing staff_school_roles entry ===");
  console.log(JSON.stringify(missing, null, 2));
  console.log(`Total staff: ${(staff ?? []).length} | With SSR: ${ssrIds.size} | Missing: ${missing.length}`);
}

main().catch(console.error);
