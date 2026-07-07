import { useState, useEffect } from "react"
import { Fab } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import RecentTransactions from "../../components/dashboard/RecentTransactions"
import CategoryBreakdownChart from "../../components/dashboard/CategoryBreakdownChart"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

function Expenses() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalExpenses, setTotalExpenses] = useState(0)

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
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
        .eq("type", "expense")
        .order("transaction_date", { ascending: false })

      if (error) throw error

      setTransactions(data || [])
      setTotalExpenses((data || []).reduce((sum, t) => sum + t.amount, 0))
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async () => {
    setDialogOpen(false)
    await fetchExpenses()
  }

  const biggestCategory = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})
  const topCategoryEntry = Object.entries(biggestCategory).sort((a, b) => b[1] - a[1])[0]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Expenses</h1>
      <p className="text-gray-500 mb-6">All expenses and spending categories.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SummaryCard label="Total Expenses" value={`$${totalExpenses.toFixed(2)}`} color="red" />
        <SummaryCard
          label="Biggest Category"
          value={topCategoryEntry ? `${topCategoryEntry[0]} - $${topCategoryEntry[1].toFixed(2)}` : "-"}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={transactions} loading={loading} />
        <CategoryBreakdownChart transactions={transactions} title="Spending by Category" />
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
        defaultType="expense"
      />
    </div>
  )
}

export default Expenses