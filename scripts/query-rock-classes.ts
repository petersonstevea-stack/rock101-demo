import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

async function main() {
  const env = fs.readFileSync(".env.local", "utf8");
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim()!;
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1].trim()!;
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("rock_classes")
    .select("id, name, student_names, student_ids")
    .limit(5);

  console.log("rock_classes sample:", JSON.stringify({ data, error }, null, 2));
}

main().catch(console.error);
