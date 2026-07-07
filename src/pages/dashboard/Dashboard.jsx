import { useState, useEffect } from "react"
import { Fab } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import QuickActions from "../../components/dashboard/QuickActions"
import RecentTransactions from "../../components/dashboard/RecentTransactions"
import ExpenseChart from "../../components/dashboard/ExpenseChart"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

function Dashboard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })

      if (error) throw error

      setTransactions(data || [])

      let income = 0
      let expenses = 0
      let invested = 0
      data?.forEach((transaction) => {
        if (transaction.type === "income") {
          income += transaction.amount
        } else if (transaction.type === "expense") {
          expenses += transaction.amount
        } else if (transaction.type === "investment") {
          invested += transaction.amount
        }
      })

      setTotalIncome(income)
      setTotalExpenses(expenses)
      setTotalInvested(invested)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (data) => {
    try {
      setDialogOpen(false)
      await fetchTransactions()
    } catch (error) {
      console.error("Error adding transaction:", error)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-6">Welcome back! Here's your financial overview.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard label="Total Income" value={`₹${totalIncome.toFixed(2)}`} color="green" />
        <SummaryCard label="Total Expenses" value={`₹${totalExpenses.toFixed(2)}`} color="red" />
        <SummaryCard label="Total Invested" value={`₹${totalInvested.toFixed(2)}`} color="blue" />
        <SummaryCard label="Net Balance" value={`₹${(totalIncome - totalExpenses).toFixed(2)}`} color="blue" />
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={transactions} loading={loading} />
        <ExpenseChart transactions={transactions} />
      </div>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: "fixed",
          bottom: 30,
          right: 30,
        }}
        onClick={() => setDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      <AddTransactionDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </div>
  )
}

export default Dashboard