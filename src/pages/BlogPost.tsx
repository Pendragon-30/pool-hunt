import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

type Post = {
  id: string
  title: string
  slug: string
  content: string | null
  cover_image_url: string | null
  published_at: string
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)

    supabase
      .from('blog_posts')
      .select('id, title, slug, content, cover_image_url, published_at')
      .eq('slug', slug)
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPost(data as Post)
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
  }, [slug])

  const paragraphs = (post?.content ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        {!loading && notFound && (
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Post not found</h1>
            <p className="mt-2 text-slate-600">
              This post may have been unpublished or the link is out of date.
            </p>
            <Link to="/blog" className="mt-4 inline-block font-medium text-sky-600 hover:text-navy-800">
              ← Back to the blog
            </Link>
          </div>
        )}

        {!loading && post && (
          <article className="animate-fade-in-up">
            <Link to="/blog" className="text-sm font-medium text-sky-600 hover:text-navy-800">
              ← Back to the blog
            </Link>

            {post.cover_image_url && (
              <img
                src={post.cover_image_url}
                alt=""
                className="my-6 aspect-video w-full rounded-2xl object-cover shadow-sm"
              />
            )}

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-2 text-sm text-navy-500">
              {new Date(post.published_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            <div className="mt-8">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <p key={i} className="mb-4 leading-relaxed text-slate-700">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-slate-500">This post doesn't have any content yet.</p>
              )}
            </div>
          </article>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
