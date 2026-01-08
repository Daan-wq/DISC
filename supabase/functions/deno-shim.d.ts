declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: unknown
  ): void
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(...args: any[]): any
}

declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined
  }
}
