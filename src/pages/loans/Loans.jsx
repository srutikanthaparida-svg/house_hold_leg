import { useState, useEffect, useMemo } from "react"
import { Pencil, Trash2, PlusCircle, Landmark, Wallet, CheckCircle, Bell, Lightbulb, CalendarClock } from "lucide-react"
import { supabase } from "../../services/supabase"
import KpiCard from "../../components/dashboard/KpiCard"
import DonutChart from "../../components/dashboard/DonutChart"
import LoanOverviewCard from "../../components/dashboard/LoanOverviewCard"
import AddLoanDialog from "../../components/forms/AddLoanDialog"
import { calculateEMI, calculateOutstanding, monthsElapsed, simulateActualOutstanding, remainingMonthsAtPayment } from "../../lib/loanMath"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DONUT_COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#f59e0b", "#ec4899"]

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

function Loans() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingLoan, setEditingLoan] = useState(null)

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })

      if (error) throw error

      setLoans(data || [])
    } catch (error) {
      console.error("Error fetching loans:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setEditingLoan(null)
    await fetchLoans()
  }

  const handleEdit = (loan) => {
    setEditingLoan(loan)
    setDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingLoan(null)
    setDialogOpen(true)
  }

  const deleteLoan = async (id) => {
    try {
      const { error } = await supabase.from("loans").delete().eq("id", id)
      if (error) throw error
      await fetchLoans()
    } catch (error) {
      console.error("Error deleting loan:", error)
    }
  }

  const enrichedLoans = useMemo(() => {
    return loans.map((loan) => {
      const emi = calculateEMI(Number(loan.principal_amount), Number(loan.interest_rate), loan.tenure_months)
      const paidNow = monthsElapsed(loan.start_date, loan.tenure_months)
      const remaining = loan.tenure_months - paidNow
      const standardOutstanding = calculateOutstanding(
        Number(loan.principal_amount),
        Number(loan.interest_rate),
        loan.tenure_months,
        paidNow
      )
      const actualPayment = loan.actual_emi_amount ? Number(loan.actual_emi_amount) : emi
      const prepayment = Number(loan.prepayment_amount || 0)
      const hasCustomPayment = (!!loan.actual_emi_amount && Math.abs(actualPayment - emi) > 0.01) || prepayment > 0
      const outstandingBeforePrepayment = simulateActualOutstanding(
        Number(loan.principal_amount),
        Number(loan.interest_rate),
        actualPayment,
        paidNow
      )
      const actualOutstanding = Math.max(0, outstandingBeforePrepayment - prepayment)
      const balanceImpact = standardOutstanding - actualOutstanding
      const remainingAtActualPace = remainingMonthsAtPayment(actualOutstanding, Number(loan.interest_rate), actualPayment)
      const effectiveRemaining = remainingAtActualPace !== null ? remainingAtActualPace : remaining
      const effectiveTotalMonths = paidNow + effectiveRemaining
      return {
        ...loan,
        emi,
        paid: paidNow,
        remaining,
        effectiveRemaining,
        effectiveTotalMonths,
        outstanding: actualOutstanding,
        standardOutstanding,
        actualPayment,
        prepayment,
        hasCustomPayment,
        balanceImpact,
      }
    })
  }, [loans])

  const totalOutstandingStandard = enrichedLoans.reduce((s, l) => s + l.standardOutstanding, 0)
  const totalOutstanding = enrichedLoans.reduce((s, l) => s + l.outstanding, 0)
  const totalActualEMI = enrichedLoans.reduce((s, l) => (l.effectiveRemaining > 0 ? s + l.actualPayment : s), 0)
  const totalPrepayment = enrichedLoans.reduce((s, l) => s + l.prepayment, 0)
  const activeLoansCount = enrichedLoans.filter((l) => l.effectiveRemaining > 0).length
  const aheadBy = totalOutstandingStandard - totalOutstanding

  const allocationByLender = enrichedLoans
    .map((l) => ({ name: l.lender, value: l.outstanding }))
    .filter((l) => l.value > 0)
    .sort((a, b) => b.value - a.value)

  const now = new Date()
  const loanTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(MONTH_LABELS[d.getMonth()])
    }
    return months.map((label, idx) => {
      const monthsAgoFromNow = months.length - 1 - idx
      const total = enrichedLoans.reduce((sum, loan) => {
        const paidAtThatPoint = Math.max(0, loan.paid - monthsAgoFromNow)
        const val = calculateOutstanding(Number(loan.principal_amount), Number(loan.interest_rate), loan.tenure_months, paidAtThatPoint)
        return sum + val
      }, 0)
      return { month: label, outstanding: Math.round(total) }
    })
  }, [enrichedLoans])

  const topLender = allocationByLender[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Landmark size={20} className="text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
            <p className="text-gray-500 text-sm">Track your loans and repayment progress</p>
          </div>
        </div>
        <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500">
          <Bell size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Outstanding"
          value={formatINR(totalOutstanding)}
          icon={Landmark}
          tone="red"
          trendPct={aheadBy > 0 ? -((aheadBy / (totalOutstandingStandard || 1)) * 100) : 0}
          trendLabel="vs standard schedule"
          sparkline={loanTrend.map((t) => t.outstanding)}
        />
        <KpiCard label="Total Actual Monthly Payment" value={formatINR(totalActualEMI)} icon={Wallet} tone="blue" trendLabel="Active loans" />
        <KpiCard label="Active Loans" value={String(activeLoansCount)} icon={CheckCircle} tone="green" trendLabel={`of ${enrichedLoans.length} total`} />
        <KpiCard label="Total Prepayment Made" value={formatINR(totalPrepayment)} icon={PlusCircle} tone="purple" trendLabel="Lump sum, all loans" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DonutChart title="Outstanding by Lender" data={allocationByLender} colors={DONUT_COLORS} centerLabel="Total Outstanding" />
        <LoanOverviewCard
          totalOutstanding={totalOutstandingStandard}
          totalActualEMI={totalActualEMI}
          adjustedOutstanding={totalOutstanding}
          aheadBy={aheadBy}
          trend={loanTrend}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Loans Summary</h3>
          <button
            onClick={handleAddNew}
            className="text-sm font-medium text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition"
          >
            + Add Loan
          </button>
        </div>
        {enrichedLoans.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">No loans added yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2 font-medium">Lender</th>
                  <th className="pb-2 font-medium text-right">Principal</th>
                  <th className="pb-2 font-medium text-right">Rate</th>
                  <th className="pb-2 font-medium text-right">Scheduled EMI</th>
                  <th className="pb-2 font-medium text-right">Actual EMI</th>
                  <th className="pb-2 font-medium text-right">Prepayment</th>
                  <th className="pb-2 font-medium text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {enrichedLoans.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-3 font-medium text-gray-900">{l.lender}</td>
                    <td className="py-3 text-right text-gray-500">{formatINR(l.principal_amount)}</td>
                    <td className="py-3 text-right text-gray-500">{l.interest_rate}%</td>
                    <td className="py-3 text-right text-gray-500">{formatINR(l.emi)}</td>
                    <td className="py-3 text-right text-gray-900">{formatINR(l.actualPayment)}</td>
                    <td className="py-3 text-right text-gray-500">{formatINR(l.prepayment)}</td>
                    <td className="py-3 text-right font-medium text-red-600">{formatINR(l.outstanding)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-3 text-gray-900">Total</td>
                  <td className="py-3 text-right text-gray-500">
                    {formatINR(enrichedLoans.reduce((s, l) => s + Number(l.principal_amount), 0))}
                  </td>
                  <td className="py-3"></td>
                  <td className="py-3 text-right text-gray-500">{formatINR(enrichedLoans.reduce((s, l) => s + l.emi, 0))}</td>
                  <td className="py-3 text-right text-gray-900">{formatINR(totalActualEMI)}</td>
                  <td className="py-3 text-right text-gray-500">{formatINR(totalPrepayment)}</td>
                  <td className="py-3 text-right text-red-600">{formatINR(totalOutstanding)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Insights</h3>
          </div>
          <div className="space-y-3 text-sm">
            {enrichedLoans.length > 0 && (
              <p className="text-gray-600">
                {aheadBy >= 0 ? (
                  <>
                    You are ahead of schedule by <span className="font-semibold text-green-600">{formatINR(aheadBy)}</span> across all loans.
                  </>
                ) : (
                  <>
                    You are behind schedule by <span className="font-semibold text-red-600">{formatINR(Math.abs(aheadBy))}</span> across all loans.
                  </>
                )}
              </p>
            )}
            {topLender && (
              <p className="text-gray-600">
                <span className="font-semibold">{topLender.name}</span> accounts for{" "}
                <span className="font-semibold text-blue-600">
                  {totalOutstanding > 0 ? ((topLender.value / totalOutstanding) * 100).toFixed(0) : 0}%
                </span>{" "}
                of your total outstanding.
              </p>
            )}
            {totalPrepayment > 0 && (
              <p className="text-gray-600">
                You've made total prepayments of <span className="font-semibold">{formatINR(totalPrepayment)}</span> across your loans.
              </p>
            )}
            <p className="text-gray-600">Consider making additional prepayments to reduce interest costs over time.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Repayment Progress</h3>
          <p className="text-xs text-gray-400 mb-4">EMIs paid vs adjusted total (accounting for prepayment)</p>
          <div className="space-y-4">
            {enrichedLoans.map((loan) => {
              const progressPct = Math.min((loan.paid / (loan.effectiveTotalMonths || loan.tenure_months)) * 100, 100)
              return (
                <div key={loan.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{loan.lender}</span>
                    <span className="text-gray-500">{progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${loan.effectiveRemaining > 0 ? "bg-blue-500" : "bg-green-500"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">All Loans</h2>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : enrichedLoans.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No loans added yet</p>
        ) : (
          <div className="space-y-4">
            {enrichedLoans.map((loan) => {
              const progressPct = Math.min((loan.paid / (loan.effectiveTotalMonths || loan.tenure_months)) * 100, 100)
              return (
                <div key={loan.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Landmark size={18} className="text-gray-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{loan.lender}</p>
                        {loan.account && <p className="text-xs text-gray-400">{loan.account}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleEdit(loan)} className="text-gray-300 hover:text-blue-500 transition">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => deleteLoan(loan.id)} className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-400">Principal</p>
                      <p className="font-medium text-gray-900">{formatINR(loan.principal_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Interest Rate</p>
                      <p className="font-medium text-gray-900">{loan.interest_rate}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Scheduled EMI (as per bank)</p>
                      <p className="font-medium text-gray-900">{formatINR(loan.emi)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Actual EMI (what you pay)</p>
                      <p className="font-medium text-gray-900">{formatINR(loan.actualPayment)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Prepayment Made</p>
                      <p className="font-medium text-gray-900">{formatINR(loan.prepayment)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Outstanding</p>
                      <p className="font-semibold text-red-600">{formatINR(loan.outstanding)}</p>
                    </div>
                  </div>

                  {loan.hasCustomPayment && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 text-sm">
                      <p className="font-medium text-blue-900 mb-2">Impact of actual EMI + prepayment</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-blue-700/70 text-xs">
                            {loan.balanceImpact >= 0 ? "Ahead of schedule by" : "Behind schedule by"}
                          </p>
                          <p className={`font-medium ${loan.balanceImpact >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {formatINR(Math.abs(loan.balanceImpact))}
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-700/70 text-xs">Adjusted timeline</p>
                          <p className="font-medium text-blue-900">
                            {loan.effectiveRemaining} of {loan.effectiveTotalMonths} months left
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <CalendarClock size={14} />
                    {loan.paid} of {loan.effectiveTotalMonths} EMIs paid
                    {loan.effectiveRemaining > 0 ? ` - ${loan.effectiveRemaining} remaining` : " - Fully paid"}
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${loan.effectiveRemaining > 0 ? "bg-blue-500" : "bg-green-500"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">All amounts are in INR (₹)</p>

      <AddLoanDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingLoan(null)
        }}
        onSubmit={handleSaved}
        editLoan={editingLoan}
      />
    </div>
  )
}

export default Loans