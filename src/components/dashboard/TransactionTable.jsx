import { useState } from "react"
import { Search, Pencil, Trash2 } from "lucide-react"

function formatINR(n) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

export default function TransactionTable({ title, transactions = [], loading = false, onEdit, onDelete, onAddClick, addLabel, accentColor = "red" }) {
  const [search, setSearch] = useState("")
  const [visibleCount, setVisibleCount] = useState(8)

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase()
    return (
      t.category?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.account?.toLowerCase().includes(q)
    )
  })

  const visible = filtered.slice(0, visibleCount)
  const btnColor = accentColor === "red" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-40 sm:w-56"
            />
          </div>
          {onAddClick && (
            <button
              onClick={onAddClick}
              className={`text-white text-sm font-medium px-3 py-2 rounded-lg transition ${btnColor}`}
            >
              + {addLabel || "Add"}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-8 text-sm">No entries found</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Account</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-3 text-gray-500 whitespace-nowrap">
                      {new Date(t.transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 font-medium text-gray-900">{t.category}</td>
                    <td className="py-3 text-gray-500">{t.description || "-"}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatINR(t.amount)}</td>
                    <td className="py-3 text-gray-500">{t.account}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onEdit(t)} className="text-gray-300 hover:text-blue-500 transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-500 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > visibleCount && (
            <div className="text-center mt-4">
              <button onClick={() => setVisibleCount((c) => c + 8)} className="text-sm text-gray-500 hover:text-gray-700">
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}