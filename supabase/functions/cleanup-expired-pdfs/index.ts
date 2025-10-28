import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req: Request) => {
  try {
    // Verify this is a cron request (optional: check authorization header)
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.includes("Bearer")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[cleanup-expired-pdfs] Starting cleanup job")

    // Find all expired PDFs
    const now = new Date().toISOString()
    const { data: expiredAttempts, error: queryErr } = await supabase
      .from("quiz_attempts")
      .select("id, pdf_path, pdf_filename")
      .lt("pdf_expires_at", now)
      .not("pdf_path", "is", null)

    if (queryErr) {
      console.error("[cleanup-expired-pdfs] Query error:", queryErr)
      return new Response(
        JSON.stringify({ error: "Database query failed", details: queryErr }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!expiredAttempts || expiredAttempts.length === 0) {
      console.log("[cleanup-expired-pdfs] No expired PDFs found")
      return new Response(
        JSON.stringify({ success: true, cleaned: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    console.log(
      `[cleanup-expired-pdfs] Found ${expiredAttempts.length} expired PDFs`
    )

    let deletedCount = 0
    let errorCount = 0

    // Delete each expired PDF from storage
    for (const attempt of expiredAttempts) {
      try {
        const { error: deleteErr } = await supabase.storage
          .from("quiz-docs")
          .remove([attempt.pdf_path])

        if (deleteErr) {
          console.error(
            `[cleanup-expired-pdfs] Failed to delete ${attempt.pdf_path}:`,
            deleteErr
          )
          errorCount++
          continue
        }

        // Clear the pdf_path and pdf_expires_at from database
        const { error: updateErr } = await supabase
          .from("quiz_attempts")
          .update({
            pdf_path: null,
            pdf_expires_at: null,
            pdf_filename: null,
          })
          .eq("id", attempt.id)

        if (updateErr) {
          console.error(
            `[cleanup-expired-pdfs] Failed to update attempt ${attempt.id}:`,
            updateErr
          )
          errorCount++
          continue
        }

        deletedCount++
        console.log(
          `[cleanup-expired-pdfs] Deleted: ${attempt.pdf_filename || attempt.pdf_path}`
        )
      } catch (e) {
        console.error(
          `[cleanup-expired-pdfs] Exception deleting ${attempt.pdf_path}:`,
          e
        )
        errorCount++
      }
    }

    console.log(
      `[cleanup-expired-pdfs] Cleanup complete: ${deletedCount} deleted, ${errorCount} errors`
    )

    return new Response(
      JSON.stringify({
        success: true,
        cleaned: deletedCount,
        errors: errorCount,
        total: expiredAttempts.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[cleanup-expired-pdfs] Unhandled error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
