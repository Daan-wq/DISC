"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Download, Copy, Check, TrendingUp, Users, Target, Lightbulb, AlertCircle, Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { DiscChart } from "@/components/disc-chart"
import { Skeleton } from "@/components/ui/skeleton"

// Type definitions
type ProfileCode = "DI" | "DC" | "IS" | "SC" | "CD" | "SI" | "DS" | "IC" | "CI" | "SD" | "CS" | "ID"
type ViewMode = "both" | "natural" | "response"

interface DiscScores {
  D: number
  I: number
  S: number
  C: number
}

interface DiscReport {
  profileCode: ProfileCode
  natuurlijkeStijl: DiscScores
  responsStijl: DiscScores
  assessmentDate: string
  candidateName?: string
}

interface Insight {
  icon: typeof TrendingUp
  title: string
  description: string
}

// Insights templates per profile code
const INSIGHTS_BY_PROFILE: Record<ProfileCode, Insight[]> = {
  DI: [
    {
      icon: TrendingUp,
      title: "Resultaatgericht en enthousiast",
      description: "Je combineert een sterke drive voor resultaten met het vermogen om anderen te inspireren en mee te nemen.",
    },
    {
      icon: Users,
      title: "Dynamische leider",
      description: "Je neemt graag de leiding en inspireert teams met je energie en visie.",
    },
    {
      icon: Target,
      title: "Snel beslisser",
      description: "Je bent in staat om snel beslissingen te nemen en direct actie te ondernemen.",
    },
    {
      icon: Lightbulb,
      title: "Innovatief denken",
      description: "Je zoekt naar nieuwe mogelijkheden en bent niet bang om risico's te nemen.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: geduld",
      description: "Let op dat je voldoende tijd neemt voor details en anderen meeneemt in je tempo.",
    },
  ],
  DC: [
    {
      icon: TrendingUp,
      title: "Besluitvaardig en analytisch",
      description: "Je combineert doelgerichtheid met een scherp oog voor detail en kwaliteit.",
    },
    {
      icon: Target,
      title: "Hoge standaarden",
      description: "Je stelt hoge eisen aan jezelf en anderen en streeft naar perfectie.",
    },
    {
      icon: Users,
      title: "Onafhankelijk",
      description: "Je werkt het liefst zelfstandig en neemt graag de controle.",
    },
    {
      icon: Lightbulb,
      title: "Strategisch denker",
      description: "Je denkt op lange termijn en plant je stappen zorgvuldig.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: flexibiliteit",
      description: "Probeer open te staan voor andere meningen en werkwijzen.",
    },
  ],
  IS: [
    {
      icon: Users,
      title: "Sociaal en enthousiast",
      description: "Je bouwt gemakkelijk relaties en creëert een positieve sfeer.",
    },
    {
      icon: TrendingUp,
      title: "Teamspeler",
      description: "Je werkt graag samen en ondersteunt anderen met je optimisme.",
    },
    {
      icon: Lightbulb,
      title: "Creatief en harmonieus",
      description: "Je zoekt naar creatieve oplossingen die iedereen tevreden stellen.",
    },
    {
      icon: Target,
      title: "Goed luisteraar",
      description: "Je neemt de tijd voor anderen en voelt goed aan wat zij nodig hebben.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: assertiviteit",
      description: "Durf vaker je eigen mening te geven en grenzen te stellen.",
    },
  ],
  SC: [
    {
      icon: Target,
      title: "Betrouwbaar en nauwkeurig",
      description: "Je combineert stabiliteit met aandacht voor detail en kwaliteit.",
    },
    {
      icon: TrendingUp,
      title: "Methodisch werken",
      description: "Je werkt systematisch en zorgt voor consistente resultaten.",
    },
    {
      icon: Users,
      title: "Loyaal en geduldig",
      description: "Je bent een stabiele factor in het team en neemt de tijd voor anderen.",
    },
    {
      icon: Lightbulb,
      title: "Zorgvuldig plannen",
      description: "Je denkt vooruit en zorgt dat alles goed geregeld is.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: verandering",
      description: "Probeer opener te staan voor nieuwe ideeën en werkwijzen.",
    },
  ],
  CD: [
    {
      icon: Lightbulb,
      title: "Analytisch en gedreven",
      description: "Je combineert nauwkeurigheid met een sterke focus op resultaten.",
    },
    {
      icon: Target,
      title: "Hoge standaarden",
      description: "Je stelt hoge eisen aan jezelf en streeft naar excellentie.",
    },
    {
      icon: Users,
      title: "Zelfstandig",
      description: "Je werkt het liefst onafhankelijk en neemt graag de leiding.",
    },
    {
      icon: TrendingUp,
      title: "Strategisch en precies",
      description: "Je plant zorgvuldig en let op elk detail.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: samenwerking",
      description: "Let op dat je anderen meeneemt en open blijft voor andere perspectieven.",
    },
  ],
  SI: [
    {
      icon: Users,
      title: "Harmonieus en sociaal",
      description: "Je creëert een prettige sfeer en bent een echte teamspeler.",
    },
    {
      icon: TrendingUp,
      title: "Ondersteunend en positief",
      description: "Je helpt anderen graag en benadert uitdagingen met optimisme.",
    },
    {
      icon: Lightbulb,
      title: "Empathisch luisteren",
      description: "Je luistert goed naar anderen en voelt aan wat zij nodig hebben.",
    },
    {
      icon: Target,
      title: "Geduldig en stabiel",
      description: "Je bent een stabiele factor en behoudt de rust in drukke tijden.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: doorpakken",
      description: "Durf sneller beslissingen te nemen en initiatief te tonen.",
    },
  ],
  DS: [
    {
      icon: TrendingUp,
      title: "Gedreven en betrouwbaar",
      description: "Je combineert doelgerichtheid met stabiliteit en consistentie.",
    },
    {
      icon: Target,
      title: "Praktisch en efficiënt",
      description: "Je pakt dingen direct aan en werkt gestructureerd naar resultaten.",
    },
    {
      icon: Users,
      title: "Stevig en eerlijk",
      description: "Je bent direct in je communicatie en mensen weten waar ze aan toe zijn.",
    },
    {
      icon: Lightbulb,
      title: "Pragmatisch denker",
      description: "Je zoekt naar praktische oplossingen en houdt van duidelijkheid.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: aanpassingsvermogen",
      description: "Probeer flexibeler te zijn wanneer plannen wijzigen.",
    },
  ],
  IC: [
    {
      icon: Users,
      title: "Enthousiast en precies",
      description: "Je combineert sociale vaardigheden met aandacht voor detail.",
    },
    {
      icon: TrendingUp,
      title: "Creatief en analytisch",
      description: "Je denkt out-of-the-box maar behoudt ook oog voor kwaliteit.",
    },
    {
      icon: Lightbulb,
      title: "Goede communicator",
      description: "Je legt complexe zaken helder uit en inspireert anderen.",
    },
    {
      icon: Target,
      title: "Innovatief met structuur",
      description: "Je zoekt naar nieuwe ideeën maar werkt deze systematisch uit.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: focus",
      description: "Let op dat je niet te veel hooi op je vork neemt en prioriteiten stelt.",
    },
  ],
  CI: [
    {
      icon: Lightbulb,
      title: "Analytisch en sociaal",
      description: "Je combineert nauwkeurigheid met het vermogen om anderen te betrekken.",
    },
    {
      icon: Target,
      title: "Kwaliteitsgericht communiceren",
      description: "Je deelt informatie op een heldere en gestructureerde manier.",
    },
    {
      icon: Users,
      title: "Diplomatiek",
      description: "Je bent tactvol in je benadering en houdt rekening met anderen.",
    },
    {
      icon: TrendingUp,
      title: "Onderzoekend",
      description: "Je graaft graag dieper en deelt je bevindingen met enthousiasme.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: besluitvorming",
      description: "Probeer sneller te beslissen en niet te lang vast te houden aan perfectie.",
    },
  ],
  SD: [
    {
      icon: Target,
      title: "Stabiel en gedreven",
      description: "Je bent betrouwbaar maar neemt ook graag de leiding.",
    },
    {
      icon: TrendingUp,
      title: "Geduldig uitvoeren",
      description: "Je werkt gestaag naar resultaten en laat je niet afleiden.",
    },
    {
      icon: Users,
      title: "Loyaal teamlid",
      description: "Je bent een betrouwbare speler die teams vooruit helpt.",
    },
    {
      icon: Lightbulb,
      title: "Praktische oplossingen",
      description: "Je zoekt naar haalbare en effectieve manieren om doelen te bereiken.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: verandering omarmen",
      description: "Probeer opener te staan voor nieuwe werkwijzen en ideeën.",
    },
  ],
  CS: [
    {
      icon: Lightbulb,
      title: "Zorgvuldig en betrouwbaar",
      description: "Je combineert precisie met stabiliteit en consistentie.",
    },
    {
      icon: Target,
      title: "Methodisch werken",
      description: "Je volgt procedures en zorgt voor hoge kwaliteit.",
    },
    {
      icon: Users,
      title: "Ondersteunend en geduldig",
      description: "Je helpt anderen graag en neemt de tijd voor uitleg.",
    },
    {
      icon: TrendingUp,
      title: "Accuraat en grondig",
      description: "Je controleert je werk zorgvuldig en maakt weinig fouten.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: risico nemen",
      description: "Durf soms te vertrouwen op je gevoel en niet alles uit te zoeken.",
    },
  ],
  ID: [
    {
      icon: TrendingUp,
      title: "Enthousiast en direct",
      description: "Je combineert energie met een no-nonsense aanpak.",
    },
    {
      icon: Users,
      title: "Inspirerende leider",
      description: "Je motiveert anderen en neemt graag initiatief.",
    },
    {
      icon: Lightbulb,
      title: "Optimistisch en gedreven",
      description: "Je ziet kansen en zet snel stappen om deze te benutten.",
    },
    {
      icon: Target,
      title: "Flexibel en resultaatgericht",
      description: "Je past snel aan en blijft gefocust op de eindbestemming.",
    },
    {
      icon: AlertCircle,
      title: "Ontwikkelpunt: luisteren",
      description: "Neem de tijd om naar anderen te luisteren en details niet te missen.",
    },
  ],
}

export function RapportContent() {
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt_id')
  
  const [viewMode, setViewMode] = useState<ViewMode>("both")
  const [copied, setCopied] = useState(false)
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "opening" | "success" | "error">("idle")
  const [report, setReport] = useState<DiscReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fontsReady, setFontsReady] = useState(false)

  // Load data from localStorage
  useEffect(() => {
    const loadData = async () => {
      if (!attemptId) {
        setError('Geen rapport ID opgegeven')
        setLoading(false)
        return
      }

      try {
        const cachedData = localStorage.getItem(`quiz_result_${attemptId}`)
        
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

  // Handle auto-print from URL
  useEffect(() => {
    if (searchParams.get("print") === "1" && report && fontsReady) {
      const timer = setTimeout(() => {
        handleDownload()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, report, fontsReady])

  const handleCopyCode = async () => {
    if (!report) return

    try {
      await navigator.clipboard.writeText(report.profileCode)
      setCopied(true)
      toast({
        title: "Gekopieerd!",
        description: `Profielcode ${report.profileCode} gekopieerd naar klembord`,
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
      // Get auth token
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionRes } = await supabase.auth.getSession()
      const token = sessionRes.session?.access_token

      if (!token) {
        throw new Error('Niet geauthenticeerd')
      }

      // Generate print token
      const response = await fetch('/api/rapport/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ attempt_id: attemptId }),
      })

      if (!response.ok) {
        throw new Error('Kon geen print token genereren')
      }

      const { token: printToken } = await response.json()

      setDownloadState("opening")

      // Open print page in new window
      const printUrl = `/rapport/print?token=${printToken}`
      window.open(printUrl, '_blank')

      setDownloadState("success")
      setTimeout(() => setDownloadState("idle"), 3000)
    } catch (err) {
      console.error('Failed to generate print token:', err)
      setDownloadState("error")
      toast({
        title: "Fout",
        description: "Kon printvenster niet openen. Probeer het opnieuw.",
        variant: "destructive",
      })
      setTimeout(() => setDownloadState("idle"), 3000)
    }
  }

  const getTopTraits = (scores: DiscScores): [string, number][] => {
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2) as [string, number][]
  }

  const getBiggestDifference = (): { trait: string; natural: number; response: number; diff: number } | null => {
    if (!report) return null

    const diffs = (["D", "I", "S", "C"] as const).map((trait) => ({
      trait,
      natural: report.natuurlijkeStijl[trait],
      response: report.responsStijl[trait],
      diff: Math.abs(report.natuurlijkeStijl[trait] - report.responsStijl[trait]),
    }))

    return diffs.sort((a, b) => b.diff - a.diff)[0]
  }

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

  const insights = INSIGHTS_BY_PROFILE[report.profileCode]
  const topTraits = getTopTraits(report.natuurlijkeStijl)
  const biggestDiff = getBiggestDifference()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12 print:py-4">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-8 print:mb-4"
        >
          <div className="mb-4">
            <Badge className="mb-4 bg-[#2F6B4F] hover:bg-[#2F6B4F]/90 text-white text-xs print:text-[10px]">
              DISC Persoonlijkheidsanalyse
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-balance">Jouw DISC Rapport</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Analyse voltooid op{" "}
              {new Date(report.assessmentDate).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Profile Code Badge */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="inline-flex items-center gap-3 bg-[#E7F3ED] rounded-2xl px-6 py-4 print:py-2">
              <span className="text-sm font-medium text-[#2F6B4F]">Jouw profiel:</span>
              <span className="text-5xl md:text-6xl font-bold text-[#2F6B4F] print:text-4xl">{report.profileCode}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-2 print:hidden bg-transparent">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Kopieer code
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Top 2 Traits Chips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mb-8 print:mb-4"
        >
          <Card className="print:shadow-none">
            <CardContent className="pt-6 print:pt-3">
              <div className="grid md:grid-cols-2 gap-4 print:gap-2">
                <div className="space-y-2">
                  <h4 className="font-semibold mb-2 text-[#2F6B4F] print:text-sm">Natuurlijke stijl</h4>
                  <p className="text-sm text-muted-foreground print:text-xs">
                    Dit is hoe je van nature bent, zonder externe druk. Het weerspiegelt je authentieke zelf en
                    voorkeuren.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold mb-2 text-[#2F6B4F] print:text-sm">Responsstijl</h4>
                  <p className="text-sm text-muted-foreground print:text-xs">
                    Dit toont hoe je je aanpast aan uitdagende situaties of druk van buitenaf. Grote verschillen met je
                    natuurlijke stijl kunnen wijzen op stress of aanpassingsgedrag.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          id="scores"
        >
          <Card className="mb-8 print:mb-4 print:shadow-none">
            <CardHeader className="print:pb-2">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="print:text-lg">Jouw DISC-scores</CardTitle>
                  <CardDescription className="print:text-xs">
                    Vergelijk je natuurlijke en responsstijl per dimensie
                  </CardDescription>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button
                    variant={viewMode === "both" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("both")}
                    className={cn(viewMode === "both" && "bg-[#2F6B4F] hover:bg-[#2F6B4F]/90")}
                  >
                    Beide
                  </Button>
                  <Button
                    variant={viewMode === "natural" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("natural")}
                    className={cn(viewMode === "natural" && "bg-[#2F6B4F] hover:bg-[#2F6B4F]/90")}
                  >
                    Natuurlijk
                  </Button>
                  <Button
                    variant={viewMode === "response" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("response")}
                    className={cn(viewMode === "response" && "bg-[#2F6B4F] hover:bg-[#2F6B4F]/90")}
                  >
                    Respons
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="print:pt-2">
              {/* Mini summary */}
              {biggestDiff && (
                <div className="mb-6 p-4 bg-muted rounded-lg print:mb-3 print:p-2">
                  <div className="grid md:grid-cols-2 gap-4 text-sm print:text-xs print:gap-2">
                    <div>
                      <span className="font-medium">Hoogste natuurlijke stijl: </span>
                      <span className="text-[#2F6B4F] font-semibold">
                        {topTraits[0][0]} ({topTraits[0][1]}%)
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Grootste verschil: </span>
                      <span className="text-[#2F6B4F] font-semibold">
                        {biggestDiff.trait} ({biggestDiff.natural}% vs {biggestDiff.response}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <DiscChart natuurlijk={report.natuurlijkeStijl} respons={report.responsStijl} viewMode={viewMode} />

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground mt-4 text-center print:mt-2">
                Scores zijn indicatief en gebaseerd op je antwoorden op{" "}
                {new Date(report.assessmentDate).toLocaleDateString("nl-NL")}.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Insights Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          id="inzichten"
        >
          <div className="mb-8 print:mb-4">
            <h2 className="text-2xl font-bold mb-2 print:text-xl">Jouw inzichten</h2>
            <p className="text-muted-foreground text-sm mb-6 print:text-xs print:mb-3">
              Ontdek wat jouw {report.profileCode}-profiel betekent voor je werk en samenwerking.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:gap-2">
              {insights.map((insight, idx) => {
                const Icon = insight.icon
                const isDevPoint = insight.title.toLowerCase().includes("ontwikkelpunt")

                return (
                  <Card
                    key={idx}
                    className={cn(
                      "print:shadow-none print:break-inside-avoid",
                      isDevPoint && "border-amber-200 bg-amber-50/50",
                    )}
                  >
                    <CardHeader className="pb-3 print:pb-1">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0",
                            isDevPoint ? "bg-amber-100 text-amber-700" : "bg-[#E7F3ED] text-[#2F6B4F]",
                          )}
                        >
                          <Icon className="h-5 w-5 print:h-4 print:w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base print:text-sm">{insight.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="print:pt-0">
                      <p className="text-sm text-muted-foreground print:text-xs">{insight.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Download Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="print:hidden"
        >
          <Card className="border-[#2F6B4F] border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Download je rapport als PDF</CardTitle>
              <CardDescription>
                Bewaar je DISC-analyse voor later of deel deze met je team of coach.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={handleDownload}
                  size="lg"
                  disabled={downloadState !== "idle"}
                  className="bg-[#2F6B4F] hover:bg-[#2F6B4F]/90 gap-2"
                >
                  {downloadState === "idle" && (
                    <>
                      <Printer className="h-5 w-5" />
                      Download als PDF
                    </>
                  )}
                  {downloadState === "preparing" && "Rapport voorbereiden..."}
                  {downloadState === "opening" && "Printvenster openen..."}
                  {downloadState === "success" && (
                    <>
                      <Check className="h-5 w-5" />
                      Printvenster geopend!
                    </>
                  )}
                  {downloadState === "error" && "Fout opgetreden"}
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  Werkt het printvenster niet?{" "}
                  <a
                    href={`/rapport/print?code=${report.profileCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2F6B4F] hover:underline font-medium"
                  >
                    Open print pagina in nieuw tabblad
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Trust Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 text-center print:mt-4"
        >
          <p className="text-sm text-muted-foreground mb-2 print:text-xs">
            Je resultaten zijn privé. De PDF wordt lokaal voorbereid.
          </p>
          <p className="text-xs text-muted-foreground print:text-[10px]">
            Vragen over je rapport?{" "}
            <a href="mailto:support@disc.nl" className="text-[#2F6B4F] hover:underline">
              Neem contact op met support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
