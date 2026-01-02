interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ResultPage({ params }: PageProps) {
  // Await params for route stability; no DB access required in lean flow
  await params

  // Scores and percentage calculator commented out (unused in current implementation)
  // const scores = {
  //   natural: {
  //     D: result.natural_d,
  //     I: result.natural_i,
  //     S: result.natural_s,
  //     C: result.natural_c
  //   },
  //   response: {
  //     D: result.response_d,
  //     I: result.response_i,
  //     S: result.response_s,
  //     C: result.response_c
  //   }
  // }

  // const calculatePercentage = (score: number): number => {
  //   let percentage = score * 6.25
  //   percentage = Math.round(percentage)
  //   if (percentage < 1) percentage = 1
  //   if (percentage > 99) percentage = 99
  //   return percentage
  // }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-[#46915f] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Bedankt voor het invullen!
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Kijk in uw mail voor het resultaat!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
