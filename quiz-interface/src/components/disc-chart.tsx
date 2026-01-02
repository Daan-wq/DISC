"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"

interface DiscChartProps {
  natuurlijk: { D: number; I: number; S: number; C: number }
  respons: { D: number; I: number; S: number; C: number }
  viewMode: "both" | "natural" | "response"
}

export function DiscChart({ natuurlijk, respons, viewMode }: DiscChartProps) {
  const [mounted, setMounted] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check for prefers-reduced-motion
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      setIsReducedMotion(mediaQuery.matches)

      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
      mediaQuery.addEventListener("change", listener)
      return () => mediaQuery.removeEventListener("change", listener)
    }
  }, [])

  // Clamp values for safe rendering (defensive)
  const clamp = (value: number) => Math.max(0, Math.min(100, value))

  const data = [
    {
      name: "D",
      fullName: "Dominantie",
      Natuurlijk: clamp(natuurlijk.D),
      Respons: clamp(respons.D),
      color: "var(--disc-d)",
      colorRgb: "204, 21, 27", // #cc151b
    },
    {
      name: "I",
      fullName: "Invloed",
      Natuurlijk: clamp(natuurlijk.I),
      Respons: clamp(respons.I),
      color: "var(--disc-i)",
      colorRgb: "255, 203, 4", // #ffcb04
    },
    {
      name: "S",
      fullName: "Stabiliteit",
      Natuurlijk: clamp(natuurlijk.S),
      Respons: clamp(respons.S),
      color: "var(--disc-s)",
      colorRgb: "2, 153, 57", // #029939
    },
    {
      name: "C",
      fullName: "Consciëntieusheid",
      Natuurlijk: clamp(natuurlijk.C),
      Respons: clamp(respons.C),
      color: "var(--disc-c)",
      colorRgb: "38, 101, 173", // #2665ad
    },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = data.find((d) => d.name === label)

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2" style={{ color: `rgb(${dataPoint?.colorRgb})` }}>
            {dataPoint?.fullName} ({label})
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium">
              <span className="opacity-70">{entry.name}:</span> <span className="font-bold">{entry.value}%</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (!mounted) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-muted-foreground">Chart laden...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-[400px] print:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--foreground))"
            tick={{ fill: "hsl(var(--foreground))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="hsl(var(--foreground))"
            tick={{ fill: "hsl(var(--foreground))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            label={{ value: "Score (%)", angle: -90, position: "insideLeft", offset: 0 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Legend 
            wrapperStyle={{ paddingTop: "20px" }} 
            iconType="circle"
            formatter={(value) => <span className="text-sm font-medium">{value} stijl</span>}
          />

          {(viewMode === "both" || viewMode === "natural") && (
            <Bar
              dataKey="Natuurlijk"
              radius={[4, 4, 0, 0]}
              animationDuration={isReducedMotion ? 0 : 900}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-natural-${index}`} fill={`rgb(${entry.colorRgb})`} />
              ))}
            </Bar>
          )}

          {(viewMode === "both" || viewMode === "response") && (
            <Bar
              dataKey="Respons"
              radius={[4, 4, 0, 0]}
              animationDuration={isReducedMotion ? 0 : 900}
              animationEasing="ease-out"
              animationBegin={isReducedMotion ? 0 : 100}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-response-${index}`} fill={`rgba(${entry.colorRgb}, 0.5)`} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
