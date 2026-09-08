import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image_url: string | null
  published_at: string
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image_url, published_at')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setPosts((data ?? []) as Post[])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-bold text-sky-700 sm:text-xl">
            Design My Swimming Pool
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link to="/blog" className="text-sky-700">
              Blog
            </Link>
            <Link to="/for-dealers" className="hover:text-sky-700">
              For Dealers
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pool buying guides</h1>
        <p className="mt-3 text-slate-600">
          Straightforward advice on shapes, materials, features, and budgeting —
          so you know what to ask for before you talk to a builder.
        </p>

        {loading && <p className="mt-8 text-sm text-slate-500">Loading…</p>}

        {!loading && posts.length === 0 && (
          <p className="mt-8 text-sm text-slate-500">
            No posts published yet — check back soon.
          </p>
        )}

        <div className="mt-10 space-y-8">
          {posts.map((post) => (
            <article key={post.id} className="border-b pb-8">
              {post.cover_image_url && (
                <img
                  src={post.cover_image_url}
                  alt=""
                  className="mb-4 aspect-video w-full rounded-xl object-cover"
                />
              )}
              <h2 className="text-xl font-semibold">
                <Link to={`/blog/${post.slug}`} className="hover:text-sky-700">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {new Date(post.published_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {post.excerpt && <p className="mt-2 text-slate-600">{post.excerpt}</p>}
              <Link
                to={`/blog/${post.slug}`}
                className="mt-3 inline-block text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
