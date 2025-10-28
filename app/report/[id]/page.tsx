interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const resolved = await searchParams
  const isPrint = resolved.print === '1'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        {isPrint && <link rel="stylesheet" href="/styles/report.css" />}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Rapportpagina niet beschikbaar
            </h1>
            <p className="text-gray-600 text-lg">
              Deze pagina is afgeschaft. Uw rapport is per e-mail verzonden en kan via de downloadknop worden opgehaald.
            </p>
            <p className="text-gray-500 mt-2">Referentie: {id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
