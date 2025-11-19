import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Fixed Supabase values (hardcoded as requested)
const SUPABASE_URL = "https://gytnleabrjrbuogdgvhm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5dG5sZWFicmpyYnVvZ2RndmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjIyNDMsImV4cCI6MjA3OTEzODI0M30.G-CGwRQ4Y5D1QGLanfjxPcfog8P4AZKJ2_31lLRKluY";

// Helper to read env vars in multiple runtimes (Node, Deno, edge, bundlers)
function getEnv(key: string): string {
  // Node.js
  if (typeof process !== "undefined" && (process as any).env && (process as any).env[key]) {
    return (process as any).env[key];
  }

  // globalThis (some edge runtimes expose env on globalThis)
  if (typeof globalThis !== "undefined" && (globalThis as any)[key]) {
    return (globalThis as any)[key];
  }

  // Deno (kept as fallback for environments that still use it) - access via globalThis to avoid TS 'Deno' name error
  const deno = (globalThis as any).Deno;
  if (deno && deno.env && typeof deno.env.get === "function") {
    return deno.env.get(key) ?? "";
  }

  // bundlers / Vite-style
  if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }

  return "";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, preferredChocolate, dislikes } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ message: "Nome é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // // Validação básica de e-mail
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(email)) {
    //   return new Response(JSON.stringify({ message: "E-mail inválido" }), {
    //     status: 400,
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Gerar token único
    const { data: tokenData, error: tokenError } = await supabaseClient.rpc(
      "generate_unique_token"
    );

    if (tokenError) {
      throw tokenError;
    }

    const token = tokenData;

    // Inserir participante
    const { data: participant, error } = await supabaseClient
      .from("participants")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        token: token,
        preferred_chocolate: preferredChocolate?.trim() || null,
        dislikes: dislikes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique violation
        return new Response(
          JSON.stringify({ message: "Este nome já está cadastrado" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Construir link
    const frontendUrl = getEnv("FRONTEND_URL") || "http://localhost:3000";
    const link = `${frontendUrl}/participante/${token}`;

    return new Response(
      JSON.stringify({
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          token: participant.token,
          createdAt: participant.created_at,
          matchedWith: participant.matched_with,
        },
        link: link,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        message: error?.message || "Erro ao cadastrar participante",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
