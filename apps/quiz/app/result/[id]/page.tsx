interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ResultPage({ params }: PageProps) {
    // Await params for route stability; no DB access required in lean flow
    await params

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md mx-auto text-center">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Bedankt voor het invullen!
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Kijk in uw mail voor het resultaat!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
