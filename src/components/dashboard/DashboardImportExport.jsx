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

export default function DashboardImportExport({ transactions, loans, onImported }) {
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState("")

  const handleExport = () => {
    const workbook = XLSX.utils.book_new()

    const makeTxSheet = (type) => {
      const rows = transactions
        .filter((t) => t.type === type)
        .map((t) => ({
          Date: t.transaction_date,
          Category: t.category,
          Account: t.account,
          Amount: t.amount,
          Description: t.description || "",
          ...(type === "investment" ? { "Current Value": t.current_value ?? t.amount } : {}),
        }))
      return XLSX.utils.json_to_sheet(rows)
    }

    XLSX.utils.book_append_sheet(workbook, makeTxSheet("income"), "Income")
    XLSX.utils.book_append_sheet(workbook, makeTxSheet("expense"), "Expenses")
    XLSX.utils.book_append_sheet(workbook, makeTxSheet("investment"), "Investments")

    const loanRows = loans.map((l) => ({
      Lender: l.lender,
      "Principal Amount": l.principal_amount,
      "Interest Rate": l.interest_rate,
      "Tenure Months": l.tenure_months,
      "Start Date": l.start_date,
      Account: l.account || "",
      "Actual EMI": l.actual_emi_amount || "",
      Prepayment: l.prepayment_amount || "",
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(loanRows), "Loans")

    XLSX.writeFile(workbook, "household-ledger-export.xlsx")
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setMessage("")
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")

      let txCount = 0
      let loanCount = 0

      for (const sheetName of workbook.SheetNames) {
        const lower = sheetName.toLowerCase()
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet)
        if (rows.length === 0) continue

        if (lower.includes("loan")) {
          const payload = rows.map((r) => ({
            user_id: user.id,
            lender: r.Lender || r.lender || "Unknown",
            principal_amount: parseFloat(r["Principal Amount"] ?? r.principal_amount ?? 0),
            interest_rate: parseFloat(r["Interest Rate"] ?? r.interest_rate ?? 0),
            tenure_months: parseInt(r["Tenure Months"] ?? r.tenure_months ?? 0),
            start_date: excelDateToISO(r["Start Date"] ?? r.start_date),
            account: r.Account || r.account || null,
            actual_emi_amount: r["Actual EMI"] ? parseFloat(r["Actual EMI"]) : null,
            prepayment_amount: r.Prepayment ? parseFloat(r.Prepayment) : 0,
          }))
          const { error } = await supabase.from("loans").insert(payload)
          if (error) throw error
          loanCount += payload.length
        } else {
          let type = "expense"
          if (lower.includes("income")) type = "income"
          else if (lower.includes("invest")) type = "investment"
          else if (lower.includes("expense")) type = "expense"

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
          txCount += payload.length
        }
      }

      setMessage(`Imported ${txCount} transaction(s) and ${loanCount} loan(s).`)
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
        Export All
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