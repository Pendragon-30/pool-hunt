import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import Reveal from '../components/Reveal'

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
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <section className="bg-gradient-to-b from-navy-950 to-navy-900 px-6 py-16 text-center text-white">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pool buying guides</h1>
        <p className="mx-auto mt-3 max-w-xl text-navy-200">
          Straightforward advice on shapes, materials, features, and budgeting — so you know what to
          ask for before you talk to a builder.
        </p>
      </section>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        {!loading && posts.length === 0 && (
          <p className="text-sm text-slate-500">No posts published yet — check back soon.</p>
        )}

        <div className="divide-y divide-slate-200">
          {posts.map((post, i) => (
            <Reveal key={post.id} delay={Math.min(i, 4) * 80}>
              <article className="group py-8 first:pt-0 sm:flex sm:gap-6">
                {post.cover_image_url && (
                  <Link to={`/blog/${post.slug}`} className="block sm:w-48 sm:shrink-0">
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="aspect-video w-full rounded-md object-cover sm:aspect-square"
                    />
                  </Link>
                )}
                <div className="mt-4 sm:mt-0">
                  <p className="text-xs font-medium text-navy-500">
                    {new Date(post.published_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold text-navy-900">
                    <Link to={`/blog/${post.slug}`} className="transition-colors group-hover:text-navy-700">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && <p className="mt-2 text-slate-600">{post.excerpt}</p>}
                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-3 inline-block text-sm font-semibold text-navy-700 hover:text-navy-900"
                  >
                    Read more →
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
