import { useState, useEffect, useMemo } from "react"
import { Fab } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { Trash2 } from "lucide-react"
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

  const handleAddLoan = async () => {
    setDialogOpen(false)
    await fetchLoans()
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
      const monthsSavedOrLost =
        remainingMonthsAtPayment(actualOutstanding, Number(loan.interest_rate), actualPayment) !== null
          ? remaining -
            remainingMonthsAtPayment(actualOutstanding, Number(loan.interest_rate), actualPayment)
          : null
      const balanceImpact = standardOutstanding - actualOutstanding // positive = ahead of schedule

      return {
        ...loan,
        emi: scheduledEMI,
        paid,
        remaining,
        outstanding: actualOutstanding,
        standardOutstanding,
        actualPayment,
        hasCustomPayment,
        balanceImpact,
        monthsSavedOrLost,
      }
    })
  }, [loans])

  const totalOutstanding = enrichedLoans.reduce((sum, l) => sum + l.outstanding, 0)
  const totalMonthlyEMI = enrichedLoans.reduce((sum, l) => (l.remaining > 0 ? sum + l.actualPayment : sum), 0)
  const activeLoansCount = enrichedLoans.filter((l) => l.remaining > 0).length

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Loans</h1>
      <p className="text-gray-500 mb-6">Track loan EMIs and outstanding balances.</p>

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
              const progressPct = Math.min((loan.paid / loan.tenure_months) * 100, 100)
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
                    <button onClick={() => deleteLoan(loan.id)} className="text-gray-300 hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-400">Principal</p>
                      <p className="font-medium text-gray-900">{formatINR(loan.principal_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Interest Rate</p>
                      <p className="font-medium text-gray-900">{loan.interest_rate}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Scheduled EMI</p>
                      <p className="font-medium text-gray-900">{formatINR(loan.emi)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Outstanding</p>
                      <p className="font-semibold text-red-600">{formatINR(loan.outstanding)}</p>
                    </div>
                  </div>

                  {loan.hasCustomPayment && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 text-sm">
                      <p className="font-medium text-blue-900 mb-2">Actual payment impact</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-blue-700/70 text-xs">Actual monthly payment</p>
                          <p className="font-medium text-blue-900">{formatINR(loan.actualPayment)}</p>
                        </div>
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
                    {loan.paid} of {loan.tenure_months} EMIs paid
                    {loan.remaining > 0 ? ` - ${loan.remaining} remaining` : " - Fully paid"}
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${loan.remaining > 0 ? "bg-blue-500" : "bg-green-500"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: "fixed", bottom: 30, right: 30 }}
        onClick={() => setDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      <AddLoanDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={handleAddLoan} />
    </div>
  )
}

export default Loans