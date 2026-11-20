import { motion } from 'motion/react'
import { Link, Route, Routes } from 'react-router-dom'

function Home() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-xl"
    >
      <h1 className="text-4xl font-thin tracking-tight sm:text-5xl">Тренажер НМТ</h1>
      <p className="mt-3 text-white/70">Історія України</p>
      <Link
        to="/about"
        className="mt-8 inline-block rounded-full bg-amber-400 px-6 py-3 font-medium text-slate-900"
      >
        Почати
      </Link>
    </motion.section>
  )
}

function About() {
  return (
    <section className="rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl">
      <p>Каркас працює. Тут з'явиться тренування за темами.</p>
      <Link to="/" className="mt-6 inline-block text-amber-300 underline">
        На головну
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-blue-950 px-4 text-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </main>
  )
}
