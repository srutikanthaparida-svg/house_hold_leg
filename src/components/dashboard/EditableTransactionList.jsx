import { Pencil, Trash2, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

const ICONS = { income: TrendingUp, expense: TrendingDown, investment: PiggyBank }
const TONES = {
  income: "bg-green-50 text-green-700",
  expense: "bg-red-50 text-red-700",
  investment: "bg-blue-50 text-blue-700",
}

export default function EditableTransactionList({ title, transactions = [], loading = false, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No entries yet</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {transactions.map((t) => {
            const Icon = ICONS[t.type] || TrendingUp
            return (
              <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${TONES[t.type]}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.description || t.category}</p>
                    <p className="text-xs text-gray-400">
                      {t.category} - {t.account} -{" "}
                      {new Date(t.transaction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{formatINR(t.amount)}</span>
                  <button onClick={() => onEdit(t)} className="text-gray-300 hover:text-blue-500 transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}