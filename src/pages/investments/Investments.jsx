import { useState, useEffect } from "react"
import { Fab } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import CategoryBreakdownChart from "../../components/dashboard/CategoryBreakdownChart"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

function Investments() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCurrentValue, setTotalCurrentValue] = useState(0)

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
      setTotalInvested((data || []).reduce((sum, t) => sum + t.amount, 0))
      setTotalCurrentValue((data || []).reduce((sum, t) => sum + Number(t.current_value ?? t.amount), 0))
    } catch (error) {
      console.error("Error fetching investments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async () => {
    setDialogOpen(false)
    await fetchInvestments()
  }

  const growth = totalCurrentValue - totalInvested
  const growthPct = totalInvested > 0 ? ((growth / totalInvested) * 100).toFixed(1) : "0.0"

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Investments</h1>
      <p className="text-gray-500 mb-6">Your holdings, allocation, and growth.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard label="Total Invested" value={`₹${totalInvested.toFixed(2)}`} color="blue" />
        <SummaryCard label="Current Value" value={`₹${totalCurrentValue.toFixed(2)}`} color="blue" />
        <SummaryCard
          label="Growth"
          value={`${growth >= 0 ? "+" : ""}₹${growth.toFixed(2)} (${growthPct}%)`}
          color={growth >= 0 ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Holdings</h2>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No investments yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => {
                const g = Number(t.current_value ?? t.amount) - Number(t.amount)
                return (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{t.category}</p>
                      <p className="text-sm text-gray-500">
                        {t.account} · invested ₹{Number(t.amount).toFixed(2)}
                      </p>
                      {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₹{Number(t.current_value ?? t.amount).toFixed(2)}
                      </p>
                      <p className={`text-sm font-medium ${g >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {g >= 0 ? "+" : ""}₹{g.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <CategoryBreakdownChart
          transactions={transactions}
          title="Portfolio Allocation (Current Value)"
          valueKey="current_value"
        />
      </div>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: "fixed", bottom: 30, right: 30 }}
        onClick={() => setDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      <AddTransactionDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddTransaction}
        defaultType="investment"
      />
    </div>
  )
}

export default Investments