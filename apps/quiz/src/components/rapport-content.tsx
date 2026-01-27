"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Check,
  TrendingUp,
  Users,
  Target,
  Lightbulb,
  AlertCircle,
  Printer,
  LayoutGrid,
  Info,
  ArrowRight,
  Share2,
  Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { PROFILE_CONTENT, type ProfileCode } from "@/lib/data/profile-content"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { DiscChart } from "@/components/disc-chart"
import { Skeleton } from "@/components/ui/skeleton"

// Type definitions
type ViewMode = "both" | "natural" | "response"

export interface DiscScores {
  D: number
  I: number
  S: number
  C: number
}

export interface DiscReport {
  profileCode: ProfileCode
  natuurlijkeStijl: DiscScores
  responsStijl: DiscScores
  assessmentDate: string
  candidateName?: string
}

export interface RapportContentProps {
  initialReport?: DiscReport;
  isPrintMode?: boolean;
}

export function RapportContent({ initialReport, isPrintMode = false }: RapportContentProps) {
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt_id')

  const [viewMode, setViewMode] = useState<ViewMode>("both")
  const [copied, setCopied] = useState(false)
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "opening" | "success" | "error">("idle")
  const [report, setReport] = useState<DiscReport | null>(initialReport || null)
  const [loading, setLoading] = useState(!initialReport)
  const [error, setError] = useState<string | null>(null)
  const [fontsReady, setFontsReady] = useState(false)

  // Load data from localStorage if not provided
  useEffect(() => {
    if (initialReport) return;

    const loadData = async () => {
      if (!attemptId) {
        setError('Geen rapport ID opgegeven')
        setLoading(false)
        return
      }

      try {
        const cachedData = localStorage.getItem('quiz_result_' + attemptId)

        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          const reportData: DiscReport = {
            profileCode: parsed.profileCode,
            natuurlijkeStijl: parsed.percentages.natural,
            responsStijl: parsed.percentages.response,
            assessmentDate: new Date().toISOString(),
            candidateName: parsed.candidateName || 'Deelnemer',
          }
          setReport(reportData)
        } else {
          setError('Geen resultaten gevonden. Mogelijk is de sessie verlopen.')
        }
      } catch (err) {
        console.error('Failed to load rapport data:', err)
        setError('Er is een fout opgetreden bij het laden van je resultaten.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [attemptId])

  // Check if fonts are ready
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.fonts.ready.then(() => {
        setFontsReady(true)
      })
    }
  }, [])

  const handleCopyCode = async () => {
    if (!report) return

    try {
      await navigator.clipboard.writeText(report.profileCode)
      setCopied(true)
      toast({
        title: "Gekopieerd!",
        description: "Profielcode " + report.profileCode + " gekopieerd naar klembord",
        duration: 2000,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon profielcode niet kopiëren",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async () => {
    if (!attemptId) return

    setDownloadState("preparing")

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionRes } = await supabase.auth.getSession()
      const token = sessionRes.session?.access_token

      if (!token) {
        throw new Error('Niet geauthenticeerd')
      }

      const response = await fetch('/api/rapport/download-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + token,
        },
        body: JSON.stringify({ attempt_id: attemptId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any))
        const userMessage = (errorData as any)?.user_message
        const msg =
          (typeof userMessage === 'string' && userMessage)
            ? userMessage
            : (errorData as any)?.error ||
              'Het rapport kon op dit moment niet gedownload worden. Neem contact op met support; die heeft uw rapport.'
        throw new Error(msg)
      }

      const contentDisposition = response.headers.get('content-disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
      const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : 'DISC-Rapport.pdf'

      setDownloadState("opening")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      try {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
      } finally {
        window.URL.revokeObjectURL(url)
      }

      setDownloadState("success")
      setTimeout(() => setDownloadState("idle"), 3000)
    } catch (err) {
      console.error('Failed to download PDF:', err)
      setDownloadState("error")
      toast({
        title: "Fout",
        description:
          err instanceof Error
            ? err.message
            : 'Het rapport kon op dit moment niet gedownload worden. Neem contact op met support; die heeft uw rapport.',
        variant: "destructive",
      })
      setTimeout(() => setDownloadState("idle"), 3000)
    }
  }

  const content = report ? PROFILE_CONTENT[report.profileCode] : null

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <Skeleton className="h-12 w-48 mb-4" />
          <Skeleton className="h-32 w-full mb-8" />
          <Skeleton className="h-96 w-full mb-8" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Rapport niet gevonden</CardTitle>
            <CardDescription>
              {error || 'We konden je DISC-rapport niet laden. Controleer je link en probeer het opnieuw.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Opnieuw proberen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const discColorMap: Record<string, string> = {
    D: "text-disc-d",
    I: "text-disc-i",
    S: "text-disc-s",
    C: "text-disc-c",
  }

  const discBgMap: Record<string, string> = {
    D: "bg-disc-d",
    I: "bg-disc-i",
    S: "bg-disc-s",
    C: "bg-disc-c",
  }

  return (
    <div className="min-h-screen bg-background">
      <style jsx global>{`
        @media print {
          @page {
            margin: 20mm;
            size: A4;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\:hidden {
            display: none !important;
          }
          .shadow-apple-lg {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          section, .motion-div, .Card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          h1, h2, h3 {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
      `}</style>
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12 print:py-4">
        {/* 1. Hero / Introductiesectie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-12 print:mb-8"
        >
          <div className="mb-6">
            <Badge className="mb-4 bg-tlc-green hover:bg-tlc-green/90 text-white px-3 py-1 text-xs font-semibold tracking-wider uppercase border-none rounded-full">
              Persoonlijk Communicatieprofiel
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-balance tracking-tight">
              Jouw persoonlijke communicatieprofiel
            </h1>
            <h2 className="text-xl md:text-2xl text-muted-foreground font-medium mb-8">
              Basisprofiel Plus – The Lean Communication
            </h2>

            <div className="flex flex-col gap-2 border-l-4 border-tlc-green pl-6 py-2">
              <p className="text-2xl font-bold text-foreground italic">
                {report.candidateName}
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Afgerond op{" "}
                {new Date(report.assessmentDate).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-lg font-semibold mt-2">
                Hoofdstijl: <span className={discColorMap[report.profileCode[0]]}>{content?.hoofdstijl} ({report.profileCode[0]})</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* 2. Korte samenvatting (Executive Summary) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mb-12 print:mb-8"
        >
          <Card className="border-none shadow-apple-lg bg-muted/30 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-tlc-green">Samenvatting</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {content?.samenvatting.map((line, idx) => (
                  <li key={idx} className="flex gap-3 items-start text-lg leading-relaxed">
                    <div className="mt-2.5 h-2 w-2 rounded-full bg-tlc-green shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Jouw profiel in één oogopslag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mb-12 print:mb-8"
          id="scores"
        >
          <Card className="shadow-apple-lg border-none overflow-hidden rounded-3xl">
            <CardHeader className="bg-muted/50 pb-8 px-8 pt-8">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold text-tlc-green mb-2">Jouw profiel in één oogopslag</CardTitle>
                  <CardDescription className="text-base max-w-2xl text-muted-foreground">
                    In deze grafiek zie je hoe jouw natuurlijke stijl en responsstijl zich tot elkaar verhouden.
                    De natuurlijke stijl is hoe je van nature bent, de responsstijl hoe je je aanpast onder druk.
                  </CardDescription>
                </div>
                <div className="flex bg-background rounded-xl p-1 border shadow-sm print:hidden">
                  {(["both", "natural", "response"] as ViewMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        "px-4 py-2 text-xs font-semibold transition-all rounded-lg",
                        viewMode === mode ? "bg-tlc-green text-white shadow-sm hover:bg-tlc-green/90" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {mode === "both" ? "Beide" : mode === "natural" ? "Natuurlijk" : "Respons"}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <DiscChart natuurlijk={report.natuurlijkeStijl} respons={report.responsStijl} viewMode={viewMode} />

              <div className="mt-12 grid md:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl bg-muted/30 border border-muted-foreground/10">
                  <h4 className="font-bold text-tlc-green mb-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-tlc-green" />
                    Natuurlijke stijl
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dit is je authentieke zelf, je voorkeursgedrag zonder druk. Het kost je de minste energie om vanuit deze stijl te handelen.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-muted/30 border border-muted-foreground/10">
                  <h4 className="font-bold text-tlc-green/70 mb-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-tlc-green/50" />
                    Responsstijl
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dit toont hoe je je aanpast aan je omgeving, verwachtingen of druk. Grote verschillen kunnen wijzen op bewuste aanpassing of stress.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. Persoonlijke beschrijving */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mb-12 print:mb-8"
        >
          <div className="space-y-8 max-w-4xl px-2">
            <h2 className="text-3xl font-bold text-tlc-green text-balance">Persoonlijke beschrijving</h2>
            <div className="space-y-6">
              {content?.persoonlijkeBeschrijving.map((p, idx) => (
                <p key={idx} className="text-lg leading-relaxed text-foreground/90 first-letter:text-4xl first-letter:font-bold first-letter:text-tlc-green first-letter:mr-2 first-letter:float-left first-letter:mt-1">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </motion.div>

        <Separator className="my-16 opacity-50" />

        <div className="grid md:grid-cols-2 gap-12 mb-16 print:gap-8 print:mb-8">
          {/* 5. Jouw taakgerichte kwaliteiten */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="h-full border-none shadow-apple-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-tlc-green/5 pb-6">
                <CardTitle className="text-xl font-bold text-tlc-green flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-tlc-green/10">
                    <Target className="h-6 w-6 text-tlc-green" />
                  </div>
                  Taakgerichte kwaliteiten
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-6">
                  {content?.taakgerichteKwaliteiten.map((q, idx) => {
                    const parts = q.split(': ')
                    const title = parts[0]
                    const desc = parts[1] || ""
                    return (
                      <li key={idx}>
                        <div className="font-bold text-foreground mb-1">{title}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* 6. Jouw mensgerichte kwaliteiten */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="h-full border-none shadow-apple-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-tlc-green/5 pb-6">
                <CardTitle className="text-xl font-bold text-tlc-green flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-tlc-green/10">
                    <Users className="h-6 w-6 text-tlc-green" />
                  </div>
                  Mensgerichte kwaliteiten
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-6">
                  {content?.mensgerichteKwaliteiten.map((q, idx) => {
                    const parts = q.split(': ')
                    const title = parts[0]
                    const desc = parts[1] || ""
                    return (
                      <li key={idx}>
                        <div className="font-bold text-foreground mb-1">{title}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* 7. Mogelijke valkuilen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 print:mb-8"
        >
          <Card className="border-none shadow-apple-lg bg-amber-50/30 rounded-3xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-amber-700 flex items-center gap-3">
                <AlertCircle className="h-7 w-7" />
                Mogelijke valkuilen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 mb-8">
                {content?.valkuilen.map((v, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="mt-2.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-lg leading-tight">{v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-100/50 p-6 rounded-2xl border border-amber-200/50">
                <p className="text-sm font-medium text-amber-800 italic">
                  Bewustzijn van deze valkuilen helpt je om ze tijdig te herkennen en bij te sturen.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 8. Communicatiestijl: wat heb jij nodig? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 print:mb-8"
        >
          <h2 className="text-3xl font-bold text-tlc-green mb-8 px-2">Communicatiestijl: wat heb jij nodig?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-none shadow-apple-lg rounded-3xl p-8 space-y-6 text-card-foreground bg-card">
              <div className="h-14 w-14 rounded-2xl bg-tlc-green/10 flex items-center justify-center text-tlc-green">
                <Info className="h-7 w-7" />
              </div>
              <div className="space-y-4">
                <h4 className="font-bold uppercase tracking-widest text-muted-foreground text-xs">Wat belangrijk is</h4>
                <p className="text-xl font-bold leading-snug">{content?.behoeften.belangrijk}</p>
              </div>
            </Card>

            <Card className="border-none shadow-apple-lg rounded-3xl p-8 space-y-6 text-card-foreground bg-card">
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div className="space-y-4">
                <h4 className="font-bold uppercase tracking-widest text-muted-foreground text-xs">Wat energie kost</h4>
                <ul className="space-y-3">
                  {content?.behoeften.energieKost.map((item, idx) => (
                    <li key={idx} className="text-foreground/80 font-semibold flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-red-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="border-none shadow-apple-lg rounded-3xl p-8 space-y-6 text-card-foreground bg-card">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Share2 className="h-7 w-7" />
              </div>
              <div className="space-y-4">
                <h4 className="font-bold uppercase tracking-widest text-muted-foreground text-xs">Beste benadering</h4>
                <ul className="space-y-3">
                  {content?.behoeften.benadering.map((item, idx) => (
                    <li key={idx} className="text-foreground/80 font-semibold flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-blue-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* 9. Jouw stijl binnen DISC */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 print:mb-8"
        >
          <Card className="border-none shadow-apple-lg overflow-hidden rounded-3xl">
            <div className="grid md:grid-cols-3">
              <div className={cn("p-12 text-white flex flex-col justify-center items-center text-center", discBgMap[report.profileCode[0]])}>
                <span className="text-xs font-bold uppercase tracking-[0.2em] mb-4 opacity-80">Hoofdstijl</span>
                <span className="text-9xl font-black mb-4 tracking-tighter">{report.profileCode[0]}</span>
                <span className="text-2xl font-bold uppercase tracking-wider">{content?.hoofdstijl}</span>
              </div>
              <div className="md:col-span-2 p-12 flex flex-col justify-center bg-card">
                <h3 className="text-2xl font-bold mb-8 text-tlc-green">Positionering binnen DISC</h3>
                <div className="space-y-8">
                  {content?.steunstijlen && content.steunstijlen.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-4">Steunstijlen</span>
                      <div className="flex flex-wrap gap-3">
                        {content.steunstijlen.map((style, idx) => (
                          <Badge key={idx} variant="outline" className="text-lg px-6 py-2 font-bold border-2 rounded-xl">
                            {style}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-4">Kenmerken</span>
                    <div className="flex flex-wrap gap-3">
                      {content?.samenvatting.slice(0, 4).map((feat, idx) => (
                        <div key={idx} className="bg-muted px-5 py-2.5 rounded-2xl text-sm font-bold text-foreground/80">
                          {feat.replace(/^[.\s]*Je bent\s/i, '').replace(/^[.\s]*Je\s/i, '')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 10. Korte uitleg van het model (Accordion) */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 print:hidden"
        >
          <Accordion type="single" className="w-full">
            <AccordionItem value="model-explanation" className="border-none shadow-apple-lg rounded-3xl px-8 bg-muted/20">
              <AccordionTrigger className="text-xl font-bold text-tlc-green hover:no-underline py-8">
                Uitleg van het DISC-model
              </AccordionTrigger>
              <AccordionContent className="pb-10 text-base leading-relaxed text-muted-foreground">
                <div className="grid md:grid-cols-2 gap-12 pt-4">
                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground text-lg text-balance">Wat meten we wel?</h4>
                    <p>We meten gedragsvoorkeuren: hoe je geneigd bent te reageren op situaties, hoe je communiceert en waar je energie van krijgt. Het model is gebaseerd op het werk van William Moulton Marston en Carl Jung.</p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground text-lg text-balance">Wat meten we niet?</h4>
                    <p>DISC meet geen competenties, vaardigheden, intelligentie of waarden. Het is een beschrijving van hoe je dingen doet, niet hoe goed je ergens in bent. Competenties kun je ontwikkelen, je DISC-stijl is je basisvoorkeur.</p>
                  </div>
                </div>
                <Separator className="my-10 opacity-30" />
                <p className="italic text-sm text-center">DISC is een hulpmiddel voor zelfinzicht en betere samenwerking, geen label of oordeel.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* 11. Toepassing: wat kan je met dit profiel? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 print:mb-8"
        >
          <div className="bg-tlc-green text-white rounded-[2.5rem] p-12 md:p-16 shadow-apple-lg">
            <h2 className="text-3xl font-bold mb-10">Wat kun je met dit profiel?</h2>
            <div className="grid md:grid-cols-3 gap-10 text-white/90">
              <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/10">
                <h4 className="font-bold text-xl mb-4">Persoonlijke groei</h4>
                <p className="text-sm leading-relaxed">Gebruik de inzichten over je valkuilen om bewuster keuzes te maken in je dagelijkse communicatie en professionele interacties.</p>
              </div>
              <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/10">
                <h4 className="font-bold text-xl mb-4">Teamontwikkeling</h4>
                <p className="text-sm leading-relaxed">Deel je profiel met collega's om wederzijds begrip te vergroten, irritaties te verminderen en samenwerking te versoepelen.</p>
              </div>
              <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/10">
                <h4 className="font-bold text-xl mb-4">Effectief leiderschap</h4>
                <p className="text-sm leading-relaxed">Stem je managementstijl af op de gedragsvoorkeuren van anderen voor meer impact, betere resultaten en minder weerstand.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 12. Afsluiting & Call-to-Action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center py-20 px-4"
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-8 tracking-tight max-w-3xl mx-auto leading-tight">
            "Dit profiel geeft inzicht. De echte kracht zit in wat je ermee doet."
          </h3>
          <div className="flex flex-wrap justify-center gap-6 mt-12 print:hidden">
            <Button
              onClick={handleDownload}
              size="lg"
              disabled={downloadState !== "idle"}
              className="bg-tlc-green hover:bg-tlc-green/90 text-white h-auto px-10 py-5 text-xl font-bold rounded-2xl shadow-apple-lg transition-all hover:scale-105"
            >
              {downloadState === "idle" && (
                <>
                  <Printer className="mr-3 h-6 w-6" />
                  Download PDF
                </>
              )}
              {downloadState === "preparing" && "Voorbereiden..."}
              {downloadState === "opening" && "Bezig..."}
              {downloadState === "success" && "Gelukt!"}
              {downloadState === "error" && "Fout opgetreden"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-auto px-10 py-5 text-xl font-bold rounded-2xl border-2 transition-all hover:bg-muted"
              onClick={() => {
                toast({
                  title: "In ontwikkeling",
                  description: "De deelfunctie wordt binnenkort toegevoegd.",
                })
              }}
            >
              <Share2 className="mr-3 h-6 w-6" />
              Deel resultaat
            </Button>

            <Button
              variant="link"
              size="lg"
              className="text-tlc-green font-black text-xl h-auto py-5 group"
              onClick={() => window.open('https://tlcprofielen.nl', '_blank')}
            >
              Meer over TLC Profielen
              <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="mt-16 pt-12 border-t text-center text-muted-foreground text-sm print:mt-8 font-medium">
          <p>© {new Date().getFullYear()} TLC Profielen - Alle rechten voorbehouden</p>
          <div className="flex justify-center gap-8 mt-6 print:hidden">
            <a href="https://tlcprofielen.nl/privacybeleid/" className="hover:text-tlc-green transition-colors">Privacy</a>
            <a href="https://tlcprofielen.nl/contact/" className="hover:text-tlc-green transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}
