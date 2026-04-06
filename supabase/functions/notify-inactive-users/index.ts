import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .eq("is_active", true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No active users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const cutoff = oneMonthAgo.toISOString();

    // For each user, check if they have any recent activity
    const inactiveUsers: string[] = [];

    for (const profile of profiles) {
      const userId = profile.user_id;

      // Check tasks, countdowns, dont_forget, written_notes, voice_notes
      const [tasks, countdowns, dontForget, writtenNotes, voiceNotes] = await Promise.all([
        supabase.from("tasks").select("id").eq("user_id", userId).gte("created_at", cutoff).limit(1),
        supabase.from("countdowns").select("id").eq("user_id", userId).gte("created_at", cutoff).limit(1),
        supabase.from("dont_forget").select("id").eq("user_id", userId).gte("created_at", cutoff).limit(1),
        supabase.from("written_notes").select("id").eq("user_id", userId).gte("created_at", cutoff).limit(1),
        supabase.from("voice_notes").select("id").eq("user_id", userId).gte("created_at", cutoff).limit(1),
      ]);

      const hasActivity = [tasks, countdowns, dontForget, writtenNotes, voiceNotes].some(
        (r) => r.data && r.data.length > 0
      );

      if (!hasActivity && profile.email) {
        inactiveUsers.push(profile.email);
        // Send email reminder via Supabase Auth admin
        // We create a support ticket as a system notification
        await supabase.from("support_tickets").insert({
          user_id: userId,
          message: `⏰ Recordatorio automático: Llevas más de un mes sin usar tu planificador. ¡Entra y organiza tus tareas!`,
          status: "closed",
          admin_reply: "Este es un recordatorio automático del sistema. ¡Te echamos de menos! Entra en tu planificador y organiza tus próximas tareas, exámenes y eventos. 📚",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${profiles.length} users. ${inactiveUsers.length} inactive users notified.`,
        inactive_users: inactiveUsers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
