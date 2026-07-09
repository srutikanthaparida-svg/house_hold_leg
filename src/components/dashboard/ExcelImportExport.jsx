import { useRef, useState } from "react"
import { Download, Upload } from "lucide-react"
import * as XLSX from "xlsx"
import { supabase } from "../../services/supabase"

function excelDateToISO(value) {
  if (!value) return new Date().toISOString().split("T")[0]
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(excelEpoch.getTime() + value * 86400000)
    return d.toISOString().split("T")[0]
  }
  const d = new Date(value)
  if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0]
  return d.toISOString().split("T")[0]
}

export default function ExcelImportExport({ type, transactions, onImported }) {
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState("")

  const handleExport = () => {
    const rows = transactions.map((t) => ({
      Date: t.transaction_date,
      Category: t.category,
      Account: t.account,
      Amount: t.amount,
      Description: t.description || "",
      ...(type === "investment" ? { "Current Value": t.current_value ?? t.amount } : {}),
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, type)
    XLSX.writeFile(workbook, `${type}-export.xlsx`)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setMessage("")
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")

      const payload = rows.map((r) => ({
        user_id: user.id,
        type,
        category: r.Category || r.category || "Other",
        account: r.Account || r.account || "Imported",
        amount: parseFloat(r.Amount ?? r.amount ?? 0),
        description: r.Description || r.description || "",
        transaction_date: excelDateToISO(r.Date ?? r.date),
        current_value:
          type === "investment"
            ? parseFloat(r["Current Value"] ?? r.current_value ?? r.Amount ?? r.amount ?? 0)
            : null,
      }))

      const { error } = await supabase.from("transactions").insert(payload)
      if (error) throw error

      setMessage(`Imported ${payload.length} entries.`)
      onImported()
    } catch (err) {
      setMessage(err.message || "Import failed")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        <Download size={14} />
        Export
      </button>
      <button
        onClick={handleImportClick}
        disabled={importing}
        className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <Upload size={14} />
        {importing ? "Importing..." : "Import"}
      </button>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  )
}