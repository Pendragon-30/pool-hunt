import LeadForm from './components/LeadForm'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-sky-700 sm:text-xl">
            Design My Swimming Pool
          </span>
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
            Get matched with a pool builder you can trust.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Tell us what you're looking for and we'll connect you with a
            reputable local dealer — no pressure, just a straightforward
            quote.
          </p>
        </section>

        <section className="px-6 pb-16">
          <LeadForm />
        </section>

        <section
          id="for-dealers"
          className="border-t bg-white px-6 py-16 text-center"
        >
          <h2 className="text-2xl font-bold">Are you a pool dealer or builder?</h2>
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
