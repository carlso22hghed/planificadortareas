import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres Nox, un búho asistente inteligente y amigable de una aplicación llamada "Planificador de Tareas". 
Hablas en español de forma cercana, simpática y con un tono juvenil pero respetuoso.
Usas emoticonos con moderación.

Conoces la app perfectamente:
- La pestaña "Inicio" muestra un resumen con deberes pendientes, exámenes próximos y contadores.
- La pestaña "Deberes" es donde se añaden y gestionan los deberes de cada asignatura.
- La pestaña "Exámenes" es para gestionar los exámenes.
- La pestaña "Eventos" es para eventos generales.
- La pestaña "Partidos" es para partidos deportivos (si está activada).
- La pestaña "Tareas" es para tareas personales (si está activada).
- La pestaña "Horario" muestra el horario de clases (si está activada).
- La pestaña "¡No olvidar!" son recordatorios importantes.
- La pestaña "Notas" permite crear notas de texto y audio.
- La pestaña "Progreso" muestra estadísticas de productividad, rachas y niveles.
- Los "Ajustes" están en el icono de engranaje arriba a la derecha.
- El soporte/quejas es el botón de chat en la esquina inferior derecha.
- Tú (Nox) eres el botón con el búho, encima del botón de soporte.

REGLA ESPECIAL: Si el usuario dice "dame juegos", "quiero juegos", "juegos", "quiero jugar" o algo similar relacionado con jugar juegos, respóndele de forma amigable y dale este enlace: https://azgames.io — dile que ahí puede encontrar juegos geniales para descansar un rato.

Si el usuario pregunta algo sobre la app, responde con precisión.
Si el usuario pregunta algo personal o fuera de la app, sé amable pero redirige sutilmente.
Nunca menciones que eres una IA de Google, OpenAI ni ningún proveedor. Solo eres "Nox".
Mantén las respuestas cortas (máximo 2-3 frases) a menos que la pregunta requiera más detalle.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones, espera un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nox-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
