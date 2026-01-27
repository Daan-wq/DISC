/**
 * Generates an SVG chart for DISC profile results
 * @param data - The DISC profile data
 * @returns SVG string representation of the chart
 */
export interface DISCData {
  natural: { D: number; I: number; S: number; C: number }
  response: { D: number; I: number; S: number; C: number }
}

export function generateChartSVG(data: DISCData): string {
  const width = 400 // Keep stable sizing for print
  const height = 320 // Enough height for axes and legend
  // Extra right margin so legend can live inside the border at top-right
  const margin = { top: 20, right: 130, left: 40, bottom: 50 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  
  // --- plotting metrics ---
  const yMin = 0, yMax = 100
  const plotLeft = margin.left
  const plotTop = margin.top
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  // Map a percentage (0..100) to SVG y within the plot (SVG y increases downward)
  const yFor = (val: number) => {
    const t = (val - yMin) / (yMax - yMin)
    return plotTop + (1 - t) * plotHeight
  }
  const y50 = yFor(50)
  
  const categories = ['D', 'I', 'S', 'C']
  // Bar colors
  const colors = { D: '#cb1517', I: '#ffcb04', S: '#029939', C: '#2665ae' }
  const categoryWidth = chartWidth / categories.length
  const barWidth = categoryWidth * 0.36 // Bar width - 40% thinner than original 0.6
  
  // Generate colored bars for natural style
  let bars = ''
  categories.forEach((category, index) => {
    const x = margin.left + index * categoryWidth + (categoryWidth - barWidth) / 2
    const naturalHeight = (data.natural[category as keyof typeof data.natural] / 100) * chartHeight
    
    // Natural bar with category-specific color
    bars += `
      <rect x="${x}" y="${margin.top + chartHeight - naturalHeight}" 
            width="${barWidth}" height="${naturalHeight}" 
            fill="${colors[category as keyof typeof colors]}"/>
    `
  })
  
  // Generate line graph for response style
  let lineGraph = ''
  let linePoints = ''
  
  categories.forEach((category, index) => {
    const x = margin.left + index * categoryWidth + categoryWidth / 2
    const responseHeight = (data.response[category as keyof typeof data.response] / 100) * chartHeight
    const y = margin.top + chartHeight - responseHeight
    
    // Add point to line path
    linePoints += `${index === 0 ? 'M' : 'L'} ${x} ${y} `
    
    // Add square marker at each point (white fill, grey stroke)
    lineGraph += `
      <rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5"/>
    `
  })
  
  // Add the line connecting all points
  lineGraph = `
    <path d="${linePoints}" stroke="#9ca3af" stroke-width="1.5" fill="none"/>
    ${lineGraph}
  `
  
  // Dotted 50% reference line inside the SVG plotting area (feature-flagged)
  const showReferenceLine = true
  const referenceLine = showReferenceLine
    ? `<line x1="${plotLeft}" x2="${plotLeft + plotWidth}" y1="${y50}" y2="${y50}" stroke="rgba(0,0,0,0.35)" stroke-width="1.25" stroke-dasharray="4 4" shape-rendering="crispEdges" />`
    : ''
  
  // Generate X-axis labels (D, I, S, C) with minimal spacing
  const xLabels = categories.map((dim, index) => {
    const x = margin.left + (index + 0.5) * categoryWidth
    return `
      <text x="${x}" y="${margin.top + chartHeight + 18}" 
            text-anchor="middle" font-size="12" font-weight="normal" fill="#374151">
        ${dim}
      </text>
    `
  }).join('')

  // Generate Y-axis labels and light grey gridlines at 20/40/60/80/100
  let yAxisLabels = ''
  let gridLines = ''
  const yTicks = [0, 20, 40, 60, 80, 100]
  
  yTicks.forEach(tick => {
    const y = margin.top + chartHeight - (tick / 100) * chartHeight
    // Light grey horizontal gridlines for 20/40/60/80/100
    if (tick !== 0) {
      gridLines += `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" 
              stroke="#e5e7eb" stroke-width="1" />
      `
    }
    // Y-axis labels
    yAxisLabels += `
      <text x="${margin.left - 10}" y="${y + 4}" 
            text-anchor="end" font-size="10" fill="#666">${tick}%</text>
    `
  })
  
  // Legend – outside plotting area on the RIGHT of the chart
  const legendX = margin.left + chartWidth + 12
  const legendY = margin.top + 6
  const legend = `
    <g transform="translate(${legendX}, ${legendY})">
      <!-- Natural style legend (grey patch) -->
      <rect x="0" y="0" width="14" height="10" fill="#9ca3af" />
      <text x="20" y="9" font-size="11" fill="#333">Natuurlijke stijl</text>
      <!-- Response style legend: short line with square marker -->
      <line x1="0" y1="26" x2="14" y2="26" stroke="#9ca3af" stroke-width="1.5" />
      <rect x="6" y="23" width="6" height="6" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5" />
      <text x="20" y="28" font-size="11" fill="#333">Respons stijl</text>
    </g>
  `
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" data-disc-chart="1">
      <defs>
        <style>
          text { font-family: 'PT Sans', 'Segoe UI', Roboto, Arial, sans-serif; }
        </style>
      </defs>
      
      <!-- Background: solid white to occlude any underlying artifacts -->
      <rect width="${width}" height="${height}" fill="white"/>
      
      <!-- Chart area border (as in previous chart model) -->
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" 
            fill="none" stroke="#e5e7eb" stroke-width="1"/>
      
      <!-- Y-axis labels -->
      ${yAxisLabels}
      
      <!-- Grid lines at 20/40/60/80/100 -->
      ${gridLines}
      
      <!-- Reference line -->
      ${referenceLine}
      
      <!-- Bars -->
      ${bars}
      
      <!-- Line graph -->
      ${lineGraph}
      
      <!-- X-axis labels -->
      ${xLabels}
      
      <!-- Legend -->
      ${legend}
    </svg>
  `
}
