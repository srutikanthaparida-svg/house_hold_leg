import { useMemo, useState, useEffect } from "react"
import { ShoppingCart, TrendingDown, ArrowUpCircle, Receipt, Bell, Lightbulb } from "lucide-react"
import { supabase } from "../../services/supabase"
import KpiCard from "../../components/dashboard/KpiCard"
import DonutChart from "../../components/dashboard/DonutChart"
import CategoryOverviewChart from "../../components/dashboard/CategoryOverviewChart"
import { CategoryListCard } from "../../components/dashboard/CategoryListCard"
import TransactionTable from "../../components/dashboard/TransactionTable"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"
import ExcelImportExport from "../../components/dashboard/ExcelImportExport"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DONUT_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#06b6d4", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899"]

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

function Expenses() {
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

  const expenseTransactions = useMemo(() => allTransactions.filter((t) => t.type === "expense"), [allTransactions])

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

  const monthlyExpenseTrend = useMemo(() => {
    return months.map(({ year, month, label }) => {
      const value = expenseTransactions
        .filter((t) => {
          const d = new Date(t.transaction_date)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .reduce((s, t) => s + Number(t.amount), 0)
      return { label, value }
    })
  }, [expenseTransactions, months])

  const txInMonth = (year, month) =>
    expenseTransactions.filter((t) => {
      const d = new Date(t.transaction_date)
      return d.getFullYear() === year && d.getMonth() === month
    })

  const selectedMonthTx = txInMonth(selectedDate.getFullYear(), selectedDate.getMonth())
  const prevDate = monthsAgoDate(selectedDate, 1)
  const prevMonthTx = txInMonth(prevDate.getFullYear(), prevDate.getMonth())

  const thisMonthExpense = selectedMonthTx.reduce((s, t) => s + Number(t.amount), 0)
  const lastMonthExpense = prevMonthTx.reduce((s, t) => s + Number(t.amount), 0)
  const pctChange = lastMonthExpense > 0 ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0

  const categories = groupByCategory(selectedMonthTx)
  const prevCategoriesMap = groupByCategory(prevMonthTx).reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {})
  const topCategory = categories[0]
  const topCategoryLastMonth = topCategory ? prevCategoriesMap[topCategory.name] || 0 : 0
  const topCategoryChangePct =
    topCategory && topCategoryLastMonth > 0 ? ((topCategory.value - topCategoryLastMonth) / topCategoryLastMonth) * 100 : 0

  const highestTx = selectedMonthTx.reduce((max, t) => (Number(t.amount) > Number(max?.amount || 0) ? t : max), null)
  const avgMonthlyExpense = monthlyExpenseTrend.reduce((s, m) => s + m.value, 0) / (monthlyExpenseTrend.length || 1)

  const yearlyExpenseData = useMemo(() => {
    const map = {}
    expenseTransactions.forEach((t) => {
      const y = new Date(t.transaction_date).getFullYear()
      map[y] = (map[y] || 0) + Number(t.amount)
    })
    return Object.entries(map)
      .sort((a, b) => a[0] - b[0])
      .map(([label, value]) => ({ label, value }))
  }, [expenseTransactions])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
            <ShoppingCart size={20} className="text-rose-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 text-sm">Track all your expenses in one place</p>
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
          label="Total Expenses"
          value={formatINR(thisMonthExpense)}
          icon={ShoppingCart}
          tone="red"
          trendPct={pctChange}
          sparkline={monthlyExpenseTrend.map((m) => m.value)}
        />
        <KpiCard
          label="Average Monthly Expense"
          value={formatINR(avgMonthlyExpense)}
          icon={TrendingDown}
          tone="blue"
          trendLabel="6-month average"
          sparkline={monthlyExpenseTrend.map((m) => m.value)}
        />
        <KpiCard
          label="Highest Expense"
          value={highestTx ? formatINR(highestTx.amount) : formatINR(0)}
          icon={ArrowUpCircle}
          tone="purple"
          trendLabel={highestTx ? highestTx.category : "No data"}
        />
        <KpiCard
          label="Total Transactions"
          value={String(selectedMonthTx.length)}
          icon={Receipt}
          tone="amber"
          trendLabel="This month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CategoryOverviewChart monthlyData={monthlyExpenseTrend} yearlyData={yearlyExpenseData} color="#ef4444" label="Expense" />
        <DonutChart title="Expense by Category (This Month)" data={categories} colors={DONUT_COLORS} centerLabel="Total" />
      </div>

      <div className="mb-6">
        <TransactionTable
          title="All Expenses"
          transactions={expenseTransactions}
          loading={loading}
          onEdit={handleEdit}
          onDelete={deleteTx}
          onAddClick={handleAddNew}
          addLabel="Add Expense"
          accentColor="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CategoryListCard title="Category Summary (This Month)" tone="red" total={thisMonthExpense} items={categories} />

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Insights</h3>
          </div>
          <div className="space-y-3 text-sm">
            {lastMonthExpense > 0 && (
              <p className="text-gray-600">
                Your total expenses {thisMonthExpense >= lastMonthExpense ? "increased" : "decreased"} by{" "}
                <span className="font-semibold text-rose-600">
                  {formatINR(Math.abs(thisMonthExpense - lastMonthExpense))} ({Math.abs(pctChange).toFixed(1)}%)
                </span>{" "}
                compared to last month.
              </p>
            )}
            {topCategory && topCategoryLastMonth > 0 && (
              <p className="text-gray-600">
                <span className="font-semibold">{topCategory.name}</span> expenses are{" "}
                {topCategoryChangePct >= 0 ? "up" : "down"} by{" "}
                <span className="font-semibold text-rose-600">
                  {formatINR(Math.abs(topCategory.value - topCategoryLastMonth))} ({Math.abs(topCategoryChangePct).toFixed(1)}%)
                </span>{" "}
                this month.
              </p>
            )}
            {highestTx && (
              <p className="text-gray-600">
                Your biggest expense this month was <span className="font-semibold">{formatINR(highestTx.amount)}</span> for{" "}
                <span className="font-semibold">{highestTx.category}</span> on{" "}
                {new Date(highestTx.transaction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mb-3">
        <ExcelImportExport type="expense" transactions={expenseTransactions} onImported={fetchAll} />
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">All amounts are in INR (₹)</p>

      <AddTransactionDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingTx(null)
        }}
        onSubmit={handleSaved}
        defaultType="expense"
        editTransaction={editingTx}
      />
    </div>
  )
}

export default Expenses