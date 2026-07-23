import { useMemo, useState, useEffect } from "react"
import { PiggyBank, TrendingUp, Wallet, Award, Bell, Lightbulb, Pencil, Trash2 } from "lucide-react"
import { supabase } from "../../services/supabase"
import KpiCard from "../../components/dashboard/KpiCard"
import DonutChart from "../../components/dashboard/DonutChart"
import CategoryOverviewChart from "../../components/dashboard/CategoryOverviewChart"
import { CategoryListCard } from "../../components/dashboard/CategoryListCard"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"
import ExcelImportExport from "../../components/dashboard/ExcelImportExport"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DONUT_COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#f59e0b", "#0ea5e9", "#ec4899"]

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function groupByCategory(txs, valueFn) {
  const map = {}
  txs.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + valueFn(t)
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function xirr(cashflows) {
  if (cashflows.length < 2) return null
  const oneYear = 1000 * 60 * 60 * 24 * 365
  const d0 = cashflows[0].date
  const npv = (rate) =>
    cashflows.reduce((sum, cf) => sum + cf.amount / Math.pow(1 + rate, (cf.date - d0) / oneYear), 0)
  const dnpv = (rate) =>
    cashflows.reduce(
      (sum, cf) => sum - (cf.amount * (cf.date - d0)) / oneYear / Math.pow(1 + rate, (cf.date - d0) / oneYear + 1),
      0
    )
  let rate = 0.1
  for (let i = 0; i < 50; i++) {
    const f = npv(rate)
    const fPrime = dnpv(rate)
    if (Math.abs(fPrime) < 1e-10) break
    const newRate = rate - f / fPrime
    if (Math.abs(newRate - rate) < 1e-6) {
      rate = newRate
      break
    }
    rate = newRate
  }
  return isFinite(rate) ? rate * 100 : null
}

function Investments() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

  useEffect(() => {
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "investment")
        .order("transaction_date", { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching investments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setEditingTx(null)
    await fetchInvestments()
  }

  const handleEdit = (t) => {
    setEditingTx(t)
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingTx(null)
    setDialogOpen(true)
  }

  const deleteTx = async (id) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id)
      if (error) throw error
      await fetchInvestments()
    } catch (error) {
      console.error("Error deleting investment:", error)
    }
  }

  const invested = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount), 0), [transactions])
  const currentValue = useMemo(
    () => transactions.reduce((s, t) => s + Number(t.current_value ?? t.amount), 0),
    [transactions]
  )
  const gain = currentValue - invested
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0

  const allocationByCategory = useMemo(
    () => groupByCategory(transactions, (t) => Number(t.current_value ?? t.amount)),
    [transactions]
  )

  const investedByCategory = useMemo(() => groupByCategory(transactions, (t) => Number(t.amount)), [transactions])

  const summaryRows = allocationByCategory.map((c) => {
    const investedAmt = investedByCategory.find((i) => i.name === c.name)?.value || 0
    const gainAmt = c.value - investedAmt
    const gainPctRow = investedAmt > 0 ? (gainAmt / investedAmt) * 100 : 0
    return { name: c.name, currentValue: c.value, invested: investedAmt, gain: gainAmt, gainPct: gainPctRow }
  })

  const bestCategory = summaryRows.reduce(
    (best, r) => (r.gainPct > (best?.gainPct ?? -Infinity) ? r : best),
    null
  )

  const overallXirr = useMemo(() => {
    const cashflows = transactions.map((t) => ({
      date: new Date(t.transaction_date),
      amount: -Number(t.amount),
    }))
    if (cashflows.length === 0) return null
    cashflows.push({ date: new Date(), amount: currentValue })
    cashflows.sort((a, b) => a.date - b.date)
    return xirr(cashflows)
  }, [transactions, currentValue])

  const now = new Date()
  const monthlyTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] })
    }
    let running = transactions
      .filter((t) => new Date(t.transaction_date) < new Date(months[0].year, months[0].month, 1))
      .reduce((s, t) => s + Number(t.amount), 0)
    return months.map(({ year, month, label }) => {
      const monthInvested = transactions
        .filter((t) => {
          const d = new Date(t.transaction_date)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .reduce((s, t) => s + Number(t.amount), 0)
      running += monthInvested
      return { label, value: running }
    })
  }, [transactions])

  const yearlyTrend = useMemo(() => {
    const map = {}
    transactions.forEach((t) => {
      const y = new Date(t.transaction_date).getFullYear()
      map[y] = (map[y] || 0) + Number(t.amount)
    })
    const years = Object.keys(map).sort()
    let running = 0
    return years.map((y) => {
      running += map[y]
      return { label: y, value: running }
    })
  }, [transactions])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
            <p className="text-gray-500 text-sm">Track and grow your wealth</p>
          </div>
        </div>
        <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500">
          <Bell size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Investment Value"
          value={formatINR(currentValue)}
          icon={PiggyBank}
          tone="green"
          trendPct={gainPct}
          trendLabel="all time"
          sparkline={monthlyTrend.map((m) => m.value)}
        />
        <KpiCard label="Total Invested Amount" value={formatINR(invested)} icon={Wallet} tone="blue" trendLabel="All time" />
        <KpiCard
          label="Total Gain / Loss"
          value={formatINR(gain)}
          icon={TrendingUp}
          tone="purple"
          trendPct={gainPct}
          trendLabel="all time"
        />
        <KpiCard
          label="XIRR (All Time)"
          value={overallXirr !== null ? `${overallXirr.toFixed(2)}%` : "N/A"}
          icon={Award}
          tone="amber"
          trendLabel="Annualized return"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DonutChart title="Portfolio Allocation" data={allocationByCategory} colors={DONUT_COLORS} centerLabel="Total Value" />
        <CategoryOverviewChart
          monthlyData={monthlyTrend}
          yearlyData={yearlyTrend}
          color="#16a34a"
          label="Cumulative Invested Capital"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Investments Summary</h3>
          <button
            onClick={handleAddNew}
            className="text-sm font-medium text-green-700 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition"
          >
            + Add Investment
          </button>
        </div>
        {summaryRows.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">No investments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2 font-medium">Investment Type</th>
                  <th className="pb-2 font-medium text-right">Current Value</th>
                  <th className="pb-2 font-medium text-right">Invested Amount</th>
                  <th className="pb-2 font-medium text-right">Gain / Loss</th>
                  <th className="pb-2 font-medium text-right">Gain / Loss %</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r) => (
                  <tr key={r.name} className="border-b last:border-0">
                    <td className="py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="py-3 text-right text-gray-900">{formatINR(r.currentValue)}</td>
                    <td className="py-3 text-right text-gray-500">{formatINR(r.invested)}</td>
                    <td className={`py-3 text-right font-medium ${r.gain >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {r.gain >= 0 ? "+" : ""}
                      {formatINR(r.gain)}
                    </td>
                    <td className={`py-3 text-right font-medium ${r.gainPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {r.gainPct >= 0 ? "+" : ""}
                      {r.gainPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-3 text-gray-900">Total</td>
                  <td className="py-3 text-right text-gray-900">{formatINR(currentValue)}</td>
                  <td className="py-3 text-right text-gray-500">{formatINR(invested)}</td>
                  <td className={`py-3 text-right ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {gain >= 0 ? "+" : ""}
                    {formatINR(gain)}
                  </td>
                  <td className={`py-3 text-right ${gainPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {gainPct >= 0 ? "+" : ""}
                    {gainPct.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Note: real-time daily price change isn't tracked in this app, so "1D Change" isn't shown here.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CategoryListCard
          title="Asset Class Performance"
          tone="green"
          total={currentValue}
          items={allocationByCategory}
        />

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Insights</h3>
          </div>
          <div className="space-y-3 text-sm">
            {invested > 0 && (
              <p className="text-gray-600">
                Your portfolio is {gain >= 0 ? "up" : "down"} by{" "}
                <span className={`font-semibold ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatINR(Math.abs(gain))} ({Math.abs(gainPct).toFixed(1)}%)
                </span>{" "}
                overall.
              </p>
            )}
            {allocationByCategory[0] && (
              <p className="text-gray-600">
                <span className="font-semibold">{allocationByCategory[0].name}</span> contributes{" "}
                <span className="font-semibold text-blue-600">
                  {currentValue > 0 ? ((allocationByCategory[0].value / currentValue) * 100).toFixed(0) : 0}%
                </span>{" "}
                to your total portfolio.
              </p>
            )}
            {bestCategory && (
              <p className="text-gray-600">
                Your best performing asset class is{" "}
                <span className="font-semibold text-green-600">
                  {bestCategory.name} ({bestCategory.gainPct >= 0 ? "+" : ""}
                  {bestCategory.gainPct.toFixed(1)}%)
                </span>
                .
              </p>
            )}
            <p className="text-gray-600">Consider reviewing your allocation periodically to stay aligned with your goals.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mb-3">
        <ExcelImportExport type="investment" transactions={transactions} onImported={fetchInvestments} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">All Holdings</h3>
        {loading ? (
          <p className="text-gray-400 text-center py-8 text-sm">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">No investments yet</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((t) => {
              const g = Number(t.current_value ?? t.amount) - Number(t.amount)
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.description || t.category}</p>
                    <p className="text-xs text-gray-400">
                      {t.category} - {t.account} - invested {formatINR(t.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatINR(t.current_value ?? t.amount)}</p>
                      <p className={`text-xs font-medium ${g >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {g >= 0 ? "+" : ""}
                        {formatINR(g)}
                      </p>
                    </div>
                    <button onClick={() => handleEdit(t)} className="text-gray-300 hover:text-blue-500 transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteTx(t.id)} className="text-gray-300 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">All amounts are in INR (₹)</p>

      <AddTransactionDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingTx(null)
        }}
        onSubmit={handleSaved}
        defaultType="investment"
        editTransaction={editingTx}
      />
    </div>
  )
}

export default Investments