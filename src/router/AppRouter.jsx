import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import Dashboard from '../pages/dashboard/Dashboard'
import Income from '../pages/income/Income'
import Expenses from '../pages/expenses/Expenses'
import Investments from '../pages/investments/Investments'
import Loans from '../pages/loans/Loans'
import MainLayout from '../components/layout/MainLayout'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/income" element={<Income />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/loans" element={<Loans />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}