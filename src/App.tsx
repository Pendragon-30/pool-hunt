import { useState } from 'react'

function App() {
  const [zip, setZip] = useState('')
  const [poolType, setPoolType] = useState('any')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: query Supabase for dealers/listings near `zip` matching `poolType`
    alert(`Searching near ${zip || '(no zip entered)'} for: ${poolType}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-sky-700">Pool Hunt</span>
          <nav className="text-sm text-slate-600">
            <a href="#for-dealers" className="hover:text-sky-700">
              For Dealers
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find the right pool, from a dealer you can trust.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            The unbiased, exhaustive guide to buying a pool — matched with
            reputable dealers near you.
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row"
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter your zip code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="flex-1 rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500"
            />
            <select
              value={poolType}
              onChange={(e) => setPoolType(e.target.value)}
              className="rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="any">Any pool type</option>
              <option value="inground">Inground</option>
              <option value="above-ground">Above-ground</option>
              <option value="fiberglass">Fiberglass</option>
              <option value="vinyl">Vinyl liner</option>
              <option value="concrete">Concrete / gunite</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-sky-700 px-6 py-2 font-medium text-white hover:bg-sky-800"
            >
              Search
            </button>
          </form>
        </section>

        <section
          id="for-dealers"
          className="border-t bg-white px-6 py-16 text-center"
        >
          <h2 className="text-2xl font-bold">Are you a pool dealer?</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            Get matched with buyers actively searching in your area.
          </p>
          <button className="mt-6 rounded-lg border border-sky-700 px-6 py-2 font-medium text-sky-700 hover:bg-sky-50">
            Learn more
          </button>
        </section>
      </main>
    </div>
  )
}

export default App
