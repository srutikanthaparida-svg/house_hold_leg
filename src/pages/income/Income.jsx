import { useState, useEffect } from "react"
import { Fab } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import RecentTransactions from "../../components/dashboard/RecentTransactions"
import CategoryBreakdownChart from "../../components/dashboard/CategoryBreakdownChart"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

function Income() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalIncome, setTotalIncome] = useState(0)

  useEffect(() => {
    fetchIncome()
  }, [])

  const fetchIncome = async () => {
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
        .eq("type", "income")
        .order("transaction_date", { ascending: false })

      if (error) throw error

      setTransactions(data || [])
      setTotalIncome((data || []).reduce((sum, t) => sum + t.amount, 0))
    } catch (error) {
      console.error("Error fetching income:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async () => {
    setDialogOpen(false)
    await fetchIncome()
  }

  const avgPerEntry = transactions.length ? totalIncome / transactions.length : 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Income</h1>
      <p className="text-gray-500 mb-6">All income sources and entries.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SummaryCard label="Total Income" value={`₹${totalIncome.toFixed(2)}`} color="green" />
        <SummaryCard label="Average per Entry" value={`₹${avgPerEntry.toFixed(2)}`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={transactions} loading={loading} />
        <CategoryBreakdownChart transactions={transactions} title="Income by Source" />
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
        defaultType="income"
      />
    </div>
  )
}

export default Income