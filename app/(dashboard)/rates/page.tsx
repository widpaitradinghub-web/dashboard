import { query } from "@/lib/db"
import { RatesForm } from "./RatesForm"
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function RatesPage() {
  let buyRate = "0.00"
  let sellRate = "0.00"
  let dbError = false

  try {
    const result = await query("SELECT buy_rate_per_kes, sell_rate_per_kes FROM exchange_rates WHERE pair = 'KES_NGN' LIMIT 1")
    if (result.rows.length > 0) {
      buyRate = result.rows[0].buy_rate_per_kes
      sellRate = result.rows[0].sell_rate_per_kes
    } else {
      await query("INSERT INTO exchange_rates (pair, naira_per_kes, buy_rate_per_kes, sell_rate_per_kes) VALUES ('KES_NGN', 0, 0, 0)")
    }
  } catch (error) {
    console.error("Failed to fetch rates:", error)
    dbError = true
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="px-8 py-6 border-b border-border/50 bg-background/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Exchange Rate Manager</h1>
            <p className="text-sm text-muted-foreground">Configure live KES/NGN rates for the WhatsApp bot</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {dbError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm max-w-lg">
            <strong>Database Connection Error:</strong> Please ensure <code className="bg-destructive/10 px-1 rounded">DATABASE_URL</code> is set in <code className="bg-destructive/10 px-1 rounded">.env.local</code> and PostgreSQL is running.
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Current Rates Summary Cards */}
          {!dbError && (
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <div className="glass-card rounded-2xl p-5 animate-in" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Buy Rate</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-3xl font-bold tracking-tight">₦{parseFloat(buyRate).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">per 1 KES</div>
              </div>
              <div className="glass-card rounded-2xl p-5 animate-in" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Sell Rate</span>
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-3xl font-bold tracking-tight">₦{parseFloat(sellRate).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">per 1 KES</div>
              </div>
            </div>
          )}

          {/* Rate Update Form */}
          <RatesForm initialBuyRate={buyRate} initialSellRate={sellRate} />
        </div>
      </div>
    </div>
  )
}
