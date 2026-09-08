import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminNav from './AdminNav'

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function BlogDashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, cover_image_url, published_at, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPosts(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const startNewPost = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSlugTouched(false)
    setFormError(null)
    setShowForm(true)
  }

  const startEditPost = (post: Post) => {
    setEditingId(post.id)
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      cover_image_url: post.cover_image_url ?? '',
    })
    setSlugTouched(true)
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.title.trim() || !form.slug.trim()) {
      setFormError('Title and slug are required.')
      return
    }

    setSaving(true)

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt || null,
      content: form.content || null,
      cover_image_url: form.cover_image_url || null,
    }

    const { error } = editingId
      ? await supabase.from('blog_posts').update(payload).eq('id', editingId)
      : await supabase.from('blog_posts').insert(payload)

    setSaving(false)

    if (error) {
      setFormError(
        error.message.includes('duplicate')
          ? 'That slug is already in use — pick a different one.'
          : 'Could not save that post. Please try again.',
      )
      return
    }

    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    loadData()
  }

  const togglePublish = async (post: Post) => {
    const published_at = post.published_at ? null : new Date().toISOString()
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, published_at } : p)))
    await supabase.from('blog_posts').update({ published_at }).eq('id', post.id)
  }

  const deletePost = async (post: Post) => {
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return
    await supabase.from('blog_posts').delete().eq('id', post.id)
    loadData()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav onRefresh={loadData} />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Blog</h1>
          <button
            onClick={showForm ? () => setShowForm(false) : startNewPost}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            {showForm ? 'Cancel' : 'New post'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="mb-6 grid grid-cols-1 gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2"
          >
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Title *
              <input
                required
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: slugTouched ? f.slug : slugify(title),
                  }))
                }}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Slug *
              <input
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setForm({ ...form, slug: slugify(e.target.value) })
                }}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="mt-1 block text-xs text-slate-400">
                designmyswimmingpool.com/blog/{form.slug || '...'}
              </span>
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Cover image URL
              <input
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Excerpt
              <textarea
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="A short teaser shown on the blog list page."
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Content
              <textarea
                rows={12}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Write the post here. Leave a blank line between paragraphs."
              />
            </label>

            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save post'}
              </button>
              <span className="ml-3 text-xs text-slate-500">
                New posts save as drafts — publish them from the list below.
              </span>
            </div>
          </form>
        )}

        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="text-sm text-slate-500">No posts yet. Create your first one above.</p>
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{post.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        post.published_at
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {post.published_at ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">/blog/{post.slug}</div>
                  {post.excerpt && (
                    <div className="mt-1 text-sm text-slate-500">{post.excerpt}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePublish(post)}
                    className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    {post.published_at ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => startEditPost(post)}
                    className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePost(post)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
