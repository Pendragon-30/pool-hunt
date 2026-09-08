import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import ForDealers from './pages/ForDealers'
import AdminPage from './admin/AdminPage'
import AdminDealersPage from './admin/AdminDealersPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/for-dealers" element={<ForDealers />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/dealers" element={<AdminDealersPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
