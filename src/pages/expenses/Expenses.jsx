import { useMemo, useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingDown, Receipt, PlusCircle } from "lucide-react"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import EditableTransactionList from "../../components/dashboard/EditableTransactionList"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

const COLORS = {
  Rent: "#0f2a4a",
  Groceries: "#2563eb",
  Utilities: "#0891b2",
  Transport: "#7c3aed",
  "Dining out": "#db2777",
  Health: "#dc2626",
  Entertainment: "#ea580c",
  "Other expense": "#64748b",
}

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

function Expenses() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

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
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setEditingTx(null)
    await fetchExpenses()
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
      await fetchExpenses()
    } catch (error) {
      console.error("Error deleting expense:", error)
    }
  }

  const total = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount), 0), [transactions])

  const byCategory = useMemo(() => {
    const map = {}
    transactions.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const topCategory = byCategory[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Expenses</h1>
          <p className="text-gray-500">All expenses and spending categories.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition"
        >
          <PlusCircle size={16} />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard label="Total Expenses" value={formatINR(total)} icon={TrendingDown} accent="text-rose-700" bg="bg-rose-50" />
        <SummaryCard
          label="Biggest Category"
          value={topCategory ? `${topCategory.name} - ${formatINR(topCategory.value)}` : "-"}
          icon={Receipt}
          accent="text-blue-700"
          bg="bg-blue-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="font-semibold text-sm text-gray-700 mb-3">Spending by category</div>
          {byCategory.length === 0 ? (
            <p className="text-sm text-gray-400">{loading ? "Loading..." : "No expenses logged yet."}</p>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(v)} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <EditableTransactionList
          title="Expense entries"
          transactions={transactions}
          loading={loading}
          onEdit={handleEdit}
          onDelete={deleteTx}
        />
      </div>

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