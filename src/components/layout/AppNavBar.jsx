import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, TrendingUp, TrendingDown, PiggyBank, Landmark } from "lucide-react"
import { supabase } from "../../services/supabase"
import { useAuth } from "../../context/AuthContext"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/income", label: "Income", icon: TrendingUp },
  { to: "/expenses", label: "Expenses", icon: TrendingDown },
  { to: "/investments", label: "Investments", icon: PiggyBank },
  { to: "/loans", label: "Loans", icon: Landmark },
]

export default function AppNavBar() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const email = session?.user?.email || ""
  const initials = email ? email.slice(0, 2).toUpperCase() : "HL"

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <div className="bg-[#0B2545] text-white px-6 pt-4 mb-6">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm">
            HL
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Household Ledger</div>
            <div className="text-xs text-blue-200">Income - Expenses - Investments - Loans</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 bg-emerald-400/15 text-emerald-300 text-xs font-medium px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Live
          </span>

          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full pl-1 pr-3 py-1">
            <div className="w-6 h-6 rounded-full bg-blue-400/30 flex items-center justify-center text-[11px] font-semibold">
              {initials}
            </div>
            <span className="text-xs text-blue-100 max-w-[160px] truncate">{email}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs font-medium border border-white/20 rounded-full px-3 py-1.5 text-blue-100 hover:bg-white/10 transition"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex gap-2 pb-3 overflow-x-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition whitespace-nowrap ${
                isActive ? "bg-white text-[#0B2545]" : "text-blue-100 hover:bg-white/10"
              }`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}