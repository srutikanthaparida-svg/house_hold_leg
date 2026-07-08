import { useState, useEffect, useMemo } from "react"
import { Wallet, ShoppingCart, TrendingUp, Landmark } from "lucide-react"
import { supabase } from "../../services/supabase"
import KpiCard from "../../components/dashboard/KpiCard"
import DonutChart from "../../components/dashboard/DonutChart"
import IncomeExpenseBarChart from "../../components/dashboard/IncomeExpenseBarChart"
import LoanOverviewCard from "../../components/dashboard/LoanOverviewCard"
import { CategoryListCard, LoanDetailCard } from "../../components/dashboard/CategoryListCard"
import RecentTransactions from "../../components/dashboard/RecentTransactions"
import { calculateEMI, calculateOutstanding, monthsElapsed, simulateActualOutstanding } from "../../lib/loanMath"

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function lastNMonths(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] })
  }
  return out
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

function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

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

      const [txRes, loanRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
        supabase.from("loans").select("*").eq("user_id", user.id),
      ])

      if (txRes.error) throw txRes.error
      if (loanRes.error) throw loanRes.error

      setTransactions(txRes.data || [])
      setLoans(loanRes.data || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const months = useMemo(() => lastNMonths(6), [])

  const monthlyTrend = useMemo(() => {
    return months.map(({ year, month, label }) => {
      const monthTx = transactions.filter((t) => {
        const d = new Date(t.transaction_date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
      const expenses = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)
      return { month: label, income, expenses }
    })
  }, [transactions, months])

  const thisMonth = monthlyTrend[monthlyTrend.length - 1] || { income: 0, expenses: 0 }
  const lastMonth = monthlyTrend[monthlyTrend.length - 2] || { income: 0, expenses: 0 }
  const pctChange = (curr, prev) => (prev > 0 ? ((curr - prev) / prev) * 100 : 0)

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)
  const investmentTx = transactions.filter((t) => t.type === "investment")
  const totalInvested = investmentTx.reduce((s, t) => s + Number(t.amount), 0)
  const totalInvestmentValue = investmentTx.reduce((s, t) => s + Number(t.current_value ?? t.amount), 0)
  const investmentGrowthPct = totalInvested > 0 ? ((totalInvestmentValue - totalInvested) / totalInvested) * 100 : 0

  const enrichedLoans = useMemo(() => {
    return loans.map((loan) => {
      const scheduledEMI = calculateEMI(Number(loan.principal_amount), Number(loan.interest_rate), loan.tenure_months)
      const paid = monthsElapsed(loan.start_date, loan.tenure_months)
      const remaining = loan.tenure_months - paid
      const standardOutstanding = calculateOutstanding(
        Number(loan.principal_amount),
        Number(loan.interest_rate),
        loan.tenure_months,
        paid
      )
      const actualPayment = loan.actual_emi_amount ? Number(loan.actual_emi_amount) : scheduledEMI
      const hasCustomPayment = !!loan.actual_emi_amount && Math.abs(actualPayment - scheduledEMI) > 0.01
      const actualOutstanding = simulateActualOutstanding(
        Number(loan.principal_amount),
        Number(loan.interest_rate),
        actualPayment,
        paid
      )
      const balanceImpact = standardOutstanding - actualOutstanding
      return { ...loan, emi: scheduledEMI, paid, remaining, standardOutstanding, outstanding: actualOutstanding, actualPayment, hasCustomPayment, balanceImpact }
    })
  }, [loans])

  const totalOutstandingStandard = enrichedLoans.reduce((s, l) => s + l.standardOutstanding, 0)
  const adjustedOutstanding = enrichedLoans.reduce((s, l) => s + l.outstanding, 0)
  const totalActualEMI = enrichedLoans.reduce((s, l) => (l.remaining > 0 ? s + l.actualPayment : s), 0)
  const aheadBy = totalOutstandingStandard - adjustedOutstanding

  const loanTrend = useMemo(() => {
    return months.map(({ label }, idx) => {
      const monthsAgo = months.length - 1 - idx
      const total = enrichedLoans.reduce((sum, loan) => {
        const paidAtThatPoint = Math.max(0, loan.paid - monthsAgo)
        const val = calculateOutstanding(Number(loan.principal_amount), Number(loan.interest_rate), loan.tenure_months, paidAtThatPoint)
        return sum + val
      }, 0)
      return { month: label, outstanding: Math.round(total) }
    })
  }, [months, enrichedLoans])
  const expenseCategories = groupByCategory(transactions.filter((t) => t.type === "expense"))
  const incomeCategories = groupByCategory(transactions.filter((t) => t.type === "income"))
  const investmentCategories = groupByCategory(
    investmentTx.map((t) => ({ ...t, amount: Number(t.current_value ?? t.amount) }))
  )

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
  const topExpense = expenseCategories[0]
  const topExpensePct = topExpense && totalExpenses > 0 ? (topExpense.value / totalExpenses) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back! Here's your financial overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Income"
          value={formatINR(totalIncome)}
          icon={Wallet}
          tone="green"
          trendPct={pctChange(thisMonth.income, lastMonth.income)}
          sparkline={monthlyTrend.map((m) => m.income)}
        />
        <KpiCard
          label="Total Expenses"
          value={formatINR(totalExpenses)}
          icon={ShoppingCart}
          tone="red"
          trendPct={pctChange(thisMonth.expenses, lastMonth.expenses)}
          sparkline={monthlyTrend.map((m) => m.expenses)}
        />
        <KpiCard
          label="Total Investments"
          value={formatINR(totalInvestmentValue)}
          icon={TrendingUp}
          tone="blue"
          trendPct={investmentGrowthPct}
          trendLabel="overall growth"
          sparkline={investmentCategories.map((c) => c.value)}
        />
        <KpiCard
          label="Total Loans"
          value={formatINR(adjustedOutstanding)}
          icon={Landmark}
          tone="purple"
          trendPct={aheadBy > 0 ? -((aheadBy / (totalOutstandingStandard || 1)) * 100) : 0}
          trendLabel="vs standard schedule"
          sparkline={loanTrend.map((t) => t.outstanding)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <IncomeExpenseBarChart data={monthlyTrend} />
        <DonutChart title="Expense Breakdown" data={expenseCategories} centerLabel="Total" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DonutChart title="Investments Overview" data={investmentCategories} centerLabel="Total Value" />
        <LoanOverviewCard
          totalOutstanding={totalOutstandingStandard}
          totalActualEMI={totalActualEMI}
          adjustedOutstanding={adjustedOutstanding}
          aheadBy={aheadBy}
          trend={loanTrend}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CategoryListCard title="Income" tone="green" total={totalIncome} items={incomeCategories} />
        <CategoryListCard title="Expenses" tone="red" total={totalExpenses} items={expenseCategories} />
        <CategoryListCard title="Investments" tone="blue" total={totalInvestmentValue} items={investmentCategories} />
        <LoanDetailCard loans={enrichedLoans} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Insights</h3>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              Your savings rate is <span className="font-semibold text-green-600">{savingsRate.toFixed(1)}%</span>.{" "}
              {savingsRate >= 20 ? "Great job - you're saving well." : "Consider trimming discretionary spend."}
            </p>
            {topExpense && (
              <p className="text-gray-600">
                <span className="font-semibold">{topExpense.name}</span> is{" "}
                <span className="font-semibold text-orange-600">{topExpensePct.toFixed(1)}%</span> of total expenses.
              </p>
            )}
            {enrichedLoans.length > 0 && (
              <p className="text-gray-600">
                {aheadBy >= 0 ? (
                  <>
                    You are ahead on your loans by <span className="font-semibold text-green-600">{formatINR(aheadBy)}</span>. Keep it up!
                  </>
                ) : (
                  <>
                    You are behind on your loans by <span className="font-semibold text-red-600">{formatINR(Math.abs(aheadBy))}</span>.
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <RecentTransactions transactions={transactions} loading={loading} />
      </div>
    </div>
  )
}

export default Dashboard