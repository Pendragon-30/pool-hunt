import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import ForDealers from './pages/ForDealers'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import AdminPage from './admin/AdminPage'
import AdminDealersPage from './admin/AdminDealersPage'
import AdminBlogPage from './admin/AdminBlogPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/for-dealers" element={<ForDealers />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/dealers" element={<AdminDealersPage />} />
        <Route path="/admin/blog" element={<AdminBlogPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
