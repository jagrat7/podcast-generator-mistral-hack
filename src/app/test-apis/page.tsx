"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"

interface ApiStatus {
  status: string
  message: string
}

interface TestResults {
  mistral: ApiStatus
  elevenlabs: ApiStatus
  timestamp: string
}

export default function TestApisPage() {
  const [results, setResults] = useState<TestResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const runTests = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/test-apis")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runTests()
  }, [])

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "pending" || status === "loading") {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    }
    if (status === "connected") {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-12 border-b-2 border-border pb-6 flex items-end justify-between">
        <div>
          <span className="text-sm font-mono text-primary mb-2 block tracking-widest">SYSTEM // TEST</span>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">API Connectivity</h1>
        </div>
        <button
          onClick={runTests}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center bg-card border-2 border-border px-4 text-sm font-bold text-foreground shadow-[2px_2px_0px_0px_var(--color-mistral-orange)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_var(--color-mistral-orange)] disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Retest
        </button>
      </div>

      {error && (
        <div className="bg-card border-2 border-red-500/30 p-6 mb-8">
          <p className="text-red-500 font-mono text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Mistral API */}
        <div className="bg-card border-2 border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <StatusIcon status={results?.mistral.status ?? "loading"} />
              <h2 className="text-xl font-bold text-foreground">Mistral AI</h2>
            </div>
            <span
              className={`text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 border ${
                results?.mistral.status === "connected"
                  ? "border-green-500/30 bg-green-500/10 text-green-600"
                  : results?.mistral.status === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-600"
                    : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {results?.mistral.status ?? "loading"}
            </span>
          </div>
          {results?.mistral.message && (
            <p className="text-sm font-mono text-muted-foreground bg-secondary border border-border p-3">
              {results.mistral.message}
            </p>
          )}
        </div>

        {/* ElevenLabs API */}
        <div className="bg-card border-2 border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <StatusIcon status={results?.elevenlabs.status ?? "loading"} />
              <h2 className="text-xl font-bold text-foreground">ElevenLabs</h2>
            </div>
            <span
              className={`text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 border ${
                results?.elevenlabs.status === "connected"
                  ? "border-green-500/30 bg-green-500/10 text-green-600"
                  : results?.elevenlabs.status === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-600"
                    : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {results?.elevenlabs.status ?? "loading"}
            </span>
          </div>
          {results?.elevenlabs.message && (
            <p className="text-sm font-mono text-muted-foreground bg-secondary border border-border p-3">
              {results.elevenlabs.message}
            </p>
          )}
        </div>

        {/* Timestamp */}
        {results?.timestamp && (
          <p className="text-xs font-mono text-muted-foreground text-center">
            Last checked: {new Date(results.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
