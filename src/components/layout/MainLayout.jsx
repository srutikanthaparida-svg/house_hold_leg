import { Outlet } from "react-router-dom"
import AppNavBar from "./AppNavBar"

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavBar />
      <main className="px-6 pb-6">
        <Outlet />
      </main>
    </div>
  )
}