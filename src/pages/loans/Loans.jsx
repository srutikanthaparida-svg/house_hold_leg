import { useState, useEffect, useMemo } from "react"
import { Pencil, Trash2, PlusCircle } from "lucide-react"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import AddLoanDialog from "../../components/forms/AddLoanDialog"
import { calculateEMI, calculateOutstanding, monthsElapsed, simulateActualOutstanding, remainingMonthsAtPayment } from "../../lib/loanMath"
import { Landmark, CalendarClock } from "lucide-react"

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
      const paid = monthsElapsed(loan.start_date, loan.tenure_months)
      const remaining = loan.tenure_months - paid
      const standardOutstanding = calculateOutstanding(
        Number(loan.principal_amount),
        Number(loan.interest_rate),
        loan.tenure_months,
        paid
      )
      const actualPayment = loan.actual_emi_amount ? Number(loan.actual_emi_amount) : emi
      const prepayment = Number(loan.prepayment_amount || 0)
      const hasCustomPayment = (!!loan.actual_emi_amount && Math.abs(actualPayment - emi) > 0.01) || prepayment > 0
      const outstandingBeforePrepayment = simulateActualOutstanding(
        Number(loan.principal_amount),
        Number(loan.interest_rate),
        actualPayment,
        paid
      )
      const actualOutstanding = Math.max(0, outstandingBeforePrepayment - prepayment)
      const monthsSavedOrLost =
        remainingMonthsAtPayment(actualOutstanding, Number(loan.interest_rate), actualPayment) !== null
          ? remaining - remainingMonthsAtPayment(actualOutstanding, Number(loan.interest_rate), actualPayment)
          : null
      const balanceImpact = standardOutstanding - actualOutstanding
      const remainingAtActualPace = remainingMonthsAtPayment(actualOutstanding, Number(loan.interest_rate), actualPayment)
      const effectiveRemaining = remainingAtActualPace !== null ? remainingAtActualPace : remaining
      const effectiveTotalMonths = paid + effectiveRemaining
      return { ...loan, emi, paid, remaining, effectiveRemaining, effectiveTotalMonths, outstanding: actualOutstanding, standardOutstanding, actualPayment, prepayment, hasCustomPayment, balanceImpact, monthsSavedOrLost }
    })
  }, [loans])

  const totalOutstanding = enrichedLoans.reduce((sum, l) => sum + l.outstanding, 0)
  const totalMonthlyEMI = enrichedLoans.reduce((sum, l) => (l.effectiveRemaining > 0 ? sum + l.actualPayment : sum), 0)
  const activeLoansCount = enrichedLoans.filter((l) => l.effectiveRemaining > 0).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Loans</h1>
          <p className="text-gray-500">Track loan EMIs and outstanding balances.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
        >
          <PlusCircle size={16} />
          Add Loan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard label="Total Outstanding" value={formatINR(totalOutstanding)} color="red" />
        <SummaryCard label="Total Actual Monthly Payment" value={formatINR(totalMonthlyEMI)} color="blue" />
        <SummaryCard label="Active Loans" value={String(activeLoansCount)} color="green" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Your Loans</h2>

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
                          <p className="text-blue-700/70 text-xs">Payoff timeline</p>
                          <p className="font-medium text-blue-900">
                            {loan.monthsSavedOrLost === null
                              ? "Payment won't cover interest"
                              : loan.monthsSavedOrLost > 0
                              ? `${loan.monthsSavedOrLost} months earlier`
                              : loan.monthsSavedOrLost < 0
                              ? `${Math.abs(loan.monthsSavedOrLost)} months later`
                              : "On schedule"}
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