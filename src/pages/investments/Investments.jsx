import { useMemo, useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { PiggyBank, TrendingUp, PlusCircle, Pencil, Trash2 } from "lucide-react"
import { supabase } from "../../services/supabase"
import SummaryCard from "../../components/dashboard/SummaryCard"
import AddTransactionDialog from "../../components/forms/AddTransactionDialog"

const COLORS = ["#0f2a4a", "#2563eb", "#0891b2", "#7c3aed", "#059669", "#ea580c", "#64748b"]

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

function Investments() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

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
    } catch (error) {
      console.error("Error fetching investments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setEditingTx(null)
    await fetchInvestments()
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
      await fetchInvestments()
    } catch (error) {
      console.error("Error deleting investment:", error)
    }
  }

  const invested = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount), 0), [transactions])
  const currentValue = useMemo(
    () => transactions.reduce((s, t) => s + Number(t.current_value ?? t.amount), 0),
    [transactions]
  )
  const growth = currentValue - invested
  const growthPct = invested > 0 ? Math.round((growth / invested) * 1000) / 10 : 0

  const byAsset = useMemo(() => {
    const map = {}
    transactions.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.current_value ?? t.amount)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Investments</h1>
          <p className="text-gray-500">Your holdings, allocation, and growth.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <PlusCircle size={16} />
          Add Investment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Invested" value={formatINR(invested)} icon={PiggyBank} accent="text-blue-700" bg="bg-blue-50" />
        <SummaryCard label="Current Value" value={formatINR(currentValue)} icon={PiggyBank} accent="text-gray-700" bg="bg-gray-100" />
        <SummaryCard
          label="Growth"
          value={`${growth >= 0 ? "+" : ""}${formatINR(growth)} (${growthPct}%)`}
          icon={TrendingUp}
          accent={growth >= 0 ? "text-emerald-700" : "text-rose-700"}
          bg={growth >= 0 ? "bg-emerald-50" : "bg-rose-50"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="font-semibold text-sm text-gray-700 mb-3">Portfolio allocation (current value)</div>
          {byAsset.length === 0 ? (
            <p className="text-sm text-gray-400">{loading ? "Loading..." : "No investments logged yet."}</p>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byAsset} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {byAsset.map((entry, i) => (
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

        <div className="bg-white rounded-lg shadow p-6">
          <div className="font-semibold text-sm text-gray-700 mb-3">Holdings</div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-400">{loading ? "Loading..." : "Nothing here yet."}</p>
            ) : (
              transactions.map((t) => {
                const g = Number(t.current_value ?? t.amount) - Number(t.amount)
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.description || t.category}</p>
                      <p className="text-xs text-gray-400">
                        {t.category} - {t.account} - invested {formatINR(t.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatINR(t.current_value ?? t.amount)}</p>
                        <p className={`text-xs font-medium ${g >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {g >= 0 ? "+" : ""}
                          {formatINR(g)}
                        </p>
                      </div>
                      <button onClick={() => handleEdit(t)} className="text-gray-300 hover:text-blue-500 transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteTx(t.id)} className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <AddTransactionDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingTx(null)
        }}
        onSubmit={handleSaved}
        defaultType="investment"
        editTransaction={editingTx}
      />
    </div>
  )
}

export default Investments