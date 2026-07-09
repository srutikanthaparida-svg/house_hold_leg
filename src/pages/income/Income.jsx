import { useMemo, useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, Wallet, PlusCircle } from "lucide-react"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import EditableTransactionList from "../../components/dashboard/EditableTransactionList"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

const COLORS = ["#0f2a4a", "#2563eb", "#0891b2", "#7c3aed", "#059669", "#64748b"]

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

function Income() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

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
    } catch (error) {
      console.error("Error fetching income:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setEditingTx(null)
    await fetchIncome()
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
      await fetchIncome()
    } catch (error) {
      console.error("Error deleting income:", error)
    }
  }

  const total = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount), 0), [transactions])
  const avgPerEntry = transactions.length ? total / transactions.length : 0

  const bySource = useMemo(() => {
    const map = {}
    transactions.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Income</h1>
          <p className="text-gray-500">All income sources and entries.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          <PlusCircle size={16} />
          Add Income
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard label="Total Income" value={formatINR(total)} icon={TrendingUp} accent="text-emerald-700" bg="bg-emerald-50" />
        <SummaryCard label="Average per Entry" value={formatINR(avgPerEntry)} icon={Wallet} accent="text-blue-700" bg="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="font-semibold text-sm text-gray-700 mb-3">Income by source</div>
          {bySource.length === 0 ? (
            <p className="text-sm text-gray-400">{loading ? "Loading..." : "No income logged yet."}</p>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {bySource.map((entry, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
          title="Income entries"
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
        defaultType="income"
        editTransaction={editingTx}
      />
    </div>
  )
}

export default Income