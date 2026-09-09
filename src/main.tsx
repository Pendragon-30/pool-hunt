import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import ForDealers from './pages/ForDealers'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import AdminPage from './admin/AdminPage'
import AdminDealersPage from './admin/AdminDealersPage'
import AdminBlogPage from './admin/AdminBlogPage'
import AdminPhotosPage from './admin/AdminPhotosPage'
import AdminPhotosAboveGroundPage from './admin/AdminPhotosAboveGroundPage'
import AdminExtrasPage from './admin/AdminExtrasPage'
import AdminPhotosCoversPage from './admin/AdminPhotosCoversPage'
import AdminPhotosComponentsPage from './admin/AdminPhotosComponentsPage'
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
        {/* "Photos" groups five generated-image categories under one admin tab. */}
        <Route path="/admin/photos" element={<Navigate to="/admin/photos/inground" replace />} />
        <Route path="/admin/photos/inground" element={<AdminPhotosPage />} />
        <Route path="/admin/photos/above-ground" element={<AdminPhotosAboveGroundPage />} />
        <Route path="/admin/photos/extras" element={<AdminExtrasPage />} />
        <Route path="/admin/photos/covers" element={<AdminPhotosCoversPage />} />
        <Route path="/admin/photos/components" element={<AdminPhotosComponentsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
