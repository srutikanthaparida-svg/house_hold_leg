import { useMemo, useState, useEffect } from "react"
import { Wallet, TrendingUp, ArrowUpCircle, Users, Bell, Lightbulb } from "lucide-react"
import { supabase } from "../../services/supabase"
import KpiCard from "../../components/dashboard/KpiCard"
import DonutChart from "../../components/dashboard/DonutChart"
import CategoryOverviewChart from "../../components/dashboard/CategoryOverviewChart"
import CategorySourcesTable from "../../components/dashboard/CategorySourcesTable"
import TrendCard from "../../components/dashboard/TrendCard"
import EditableTransactionList from "../../components/dashboard/EditableTransactionList"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"
import ExcelImportExport from "../../components/dashboard/ExcelImportExport"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DONUT_COLORS = ["#22c55e", "#2563eb", "#f59e0b", "#7c3aed", "#0ea5e9", "#ec4899"]

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function monthsAgoDate(base, n) {
  return new Date(base.getFullYear(), base.getMonth() - n, 1)
}

function groupByCategory(txs) {
  const map = {}
  txs.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + Number(t.amount)
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function Income() {
  const [allTransactions, setAllTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [monthsAgo, setMonthsAgo] = useState(0)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
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
        .order("transaction_date", { ascending: false })

      if (error) throw error
      setAllTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setEditingTx(null)
    await fetchAll()
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
      await fetchAll()
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  const incomeTransactions = useMemo(() => allTransactions.filter((t) => t.type === "income"), [allTransactions])

  const now = new Date()
  const selectedDate = monthsAgoDate(now, monthsAgo)

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = monthsAgoDate(now, i)
    return { value: i, label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}` }
  })

  const months = useMemo(() => {
    const out = []
    for (let i = 5; i >= 0; i--) {
      const d = monthsAgoDate(selectedDate, i)
      out.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] })
    }
    return out
  }, [monthsAgo])

  const monthlyIncomeTrend = useMemo(() => {
    return months.map(({ year, month, label }) => {
      const value = incomeTransactions
        .filter((t) => {
          const d = new Date(t.transaction_date)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .reduce((s, t) => s + Number(t.amount), 0)
      return { label, value }
    })
  }, [incomeTransactions, months])

  const txInMonth = (year, month) =>
    incomeTransactions.filter((t) => {
      const d = new Date(t.transaction_date)
      return d.getFullYear() === year && d.getMonth() === month
    })

  const selectedMonthTx = txInMonth(selectedDate.getFullYear(), selectedDate.getMonth())
  const prevDate = monthsAgoDate(selectedDate, 1)
  const prevMonthTx = txInMonth(prevDate.getFullYear(), prevDate.getMonth())

  const thisMonthIncome = selectedMonthTx.reduce((s, t) => s + Number(t.amount), 0)
  const lastMonthIncome = prevMonthTx.reduce((s, t) => s + Number(t.amount), 0)
  const pctChange = lastMonthIncome > 0 ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0

  const thisMonthExpense = allTransactions
    .filter((t) => {
      const d = new Date(t.transaction_date)
      return t.type === "expense" && d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth()
    })
    .reduce((s, t) => s + Number(t.amount), 0)

  const categories = groupByCategory(selectedMonthTx)
  const prevCategoriesMap = groupByCategory(prevMonthTx).reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {})
  const sourcesRows = categories.map((c) => {
    const lastMonth = prevCategoriesMap[c.name] || 0
    const changePct = lastMonth > 0 ? ((c.value - lastMonth) / lastMonth) * 100 : 0
    return { name: c.name, thisMonth: c.value, lastMonth, changePct }
  })

  const totalSources = categories.length
  const topCategory = categories[0]
  const avgMonthlyIncome = monthlyIncomeTrend.reduce((s, m) => s + m.value, 0) / (monthlyIncomeTrend.length || 1)
  const quarterMonths = monthlyIncomeTrend.slice(-3)
  const quarterAvg = quarterMonths.reduce((s, m) => s + m.value, 0) / (quarterMonths.length || 1)

  const yearlyIncomeData = useMemo(() => {
    const map = {}
    incomeTransactions.forEach((t) => {
      const y = new Date(t.transaction_date).getFullYear()
      map[y] = (map[y] || 0) + Number(t.amount)
    })
    return Object.entries(map)
      .sort((a, b) => a[0] - b[0])
      .map(([label, value]) => ({ label, value }))
  }, [incomeTransactions])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Wallet size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Income</h1>
            <p className="text-gray-500 text-sm">Track all your income sources in one place</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={monthsAgo}
            onChange={(e) => setMonthsAgo(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500">
            <Bell size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Income"
          value={formatINR(thisMonthIncome)}
          icon={Wallet}
          tone="green"
          trendPct={pctChange}
          sparkline={monthlyIncomeTrend.map((m) => m.value)}
        />
        <KpiCard
          label="Average Monthly Income"
          value={formatINR(avgMonthlyIncome)}
          icon={TrendingUp}
          tone="blue"
          trendLabel="6-month average"
          sparkline={monthlyIncomeTrend.map((m) => m.value)}
        />
        <KpiCard
          label="Highest Income"
          value={topCategory ? formatINR(topCategory.value) : formatINR(0)}
          icon={ArrowUpCircle}
          tone="purple"
          trendLabel={topCategory ? topCategory.name : "No data"}
        />
        <KpiCard label="Total Sources" value={String(totalSources)} icon={Users} tone="amber" trendLabel="Active sources" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CategoryOverviewChart monthlyData={monthlyIncomeTrend} yearlyData={yearlyIncomeData} color="#16a34a" label="Income" />
        <DonutChart title="Income by Source (This Month)" data={categories} colors={DONUT_COLORS} centerLabel="Total" />
      </div>

      <div className="mb-6">
        <CategorySourcesTable
          title="Income Sources"
          rows={sourcesRows}
          totalThisMonth={thisMonthIncome}
          totalLastMonth={lastMonthIncome}
          onAddClick={handleAddNew}
          addLabel="Add Income Source"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TrendCard
          title="Income Trend"
          color="#16a34a"
          stats={[
            { label: "This Month", value: thisMonthIncome },
            { label: "Last Month", value: lastMonthIncome },
            { label: "This Quarter Average", value: quarterAvg },
            { label: "6-Month Average", value: avgMonthlyIncome },
          ]}
          chartData={monthlyIncomeTrend}
        />

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Insights</h3>
          </div>
          <div className="space-y-3 text-sm">
            {lastMonthIncome > 0 && (
              <p className="text-gray-600">
                Your total income {thisMonthIncome >= lastMonthIncome ? "increased" : "decreased"} by{" "}
                <span className="font-semibold text-green-600">
                  {formatINR(Math.abs(thisMonthIncome - lastMonthIncome))} ({Math.abs(pctChange).toFixed(1)}%)
                </span>{" "}
                compared to last month.
              </p>
            )}
            {topCategory && (
              <p className="text-gray-600">
                <span className="font-semibold">{topCategory.name}</span> contributes{" "}
                <span className="font-semibold text-blue-600">
                  {thisMonthIncome > 0 ? ((topCategory.value / thisMonthIncome) * 100).toFixed(0) : 0}%
                </span>{" "}
                of your total income this month.
              </p>
            )}
            <p className="text-gray-600">
              You have <span className="font-semibold">{totalSources}</span> income source
              {totalSources === 1 ? "" : "s"} this month.
            </p>
            <div
              className={`rounded-lg p-3 text-sm font-medium ${
                thisMonthIncome > thisMonthExpense ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {thisMonthIncome > thisMonthExpense
                ? "Great job! Your income is higher than your expenses this month."
                : "Your expenses are higher than your income this month."}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mb-3">
        <ExcelImportExport type="income" transactions={incomeTransactions} onImported={fetchAll} />
      </div>

      <EditableTransactionList
        title="All Income Entries"
        transactions={incomeTransactions}
        loading={loading}
        onEdit={handleEdit}
        onDelete={deleteTx}
      />

      <p className="text-xs text-gray-400 text-center mt-6">All income amounts are in INR (₹)</p>

      <AddTransactionDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingTx(null)
        }}
        onSubmit={handleSaved}
        defaultType="income"
        editTransaction={editingTx}
      />
    </div>
  )
}

export default Income