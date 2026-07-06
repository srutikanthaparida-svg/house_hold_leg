import { useState } from "react"
import { Fab } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DashboardHeader from "../../components/dashboard/DashboardHeader"
import SummaryCard from "../../components/dashboard/SummaryCard"
import QuickActions from "../../components/dashboard/QuickActions"
import RecentTransactions from "../../components/dashboard/RecentTransactions"
import ExpenseChart from "../../components/dashboard/ExpenseChart"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

function Dashboard() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAddTransaction = async (data) => {
    try {
      setDialogOpen(false)
    } catch (error) {
      console.error("Error adding transaction:", error)
    }
  }

  return (
    <div>
      <DashboardHeader />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard label="Total Income" value="$0.00" color="green" />
        <SummaryCard label="Total Expenses" value="$0.00" color="red" />
        <SummaryCard label="Net Balance" value="$0.00" color="blue" />
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions />
        <ExpenseChart />
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
