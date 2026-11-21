import { MotionConfig } from 'motion/react'
import { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loading } from './components/Loading'
import { Battleship } from './games/Battleship'
import { Chronology } from './games/Chronology'
import { Crossword } from './games/Crossword'
import { FillGap } from './games/FillGap'
import { Fortress } from './games/Fortress'
import { Hangman } from './games/Hangman'
import { Journey } from './games/Journey'
import { WhoAmI } from './games/WhoAmI'
import { WhoSaid } from './games/WhoSaid'
import { Memory } from './games/Memory'
import { useProfile } from './lib/profile'
import { Blitz } from './screens/Blitz'
import { Exam } from './screens/Exam'
import { Facts } from './screens/Facts'
import { Games } from './screens/Games'
import { Home } from './screens/Home'
import { Mistakes } from './screens/Mistakes'
import { Mix } from './screens/Mix'
import { TheorySection } from './screens/TheorySection'
import { Topic } from './screens/Topic'
import { TopicQuiz } from './screens/TopicQuiz'
import { Topics } from './screens/Topics'

export default function App() {
  const { profile } = useProfile()
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    // «Анімації: вимк.» або системне «зменшити рух» вимикають рух в усьому застосунку
    <MotionConfig reducedMotion={profile.animations ? 'user' : 'always'}>
      <Suspense fallback={<Loading text="Завантажуємо тему…" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topic/:n" element={<Topic />} />
          {/* key: новий запуск тренування при зміні режиму (усі / помилки) */}
          <Route path="/topic/:n/quiz" element={<TopicQuiz key={pathname + search} />} />
          <Route path="/topic/:n/theory/:section" element={<TheorySection />} />
          <Route path="/blitz" element={<Blitz />} />
          <Route path="/mix" element={<Mix />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/mistakes" element={<Mistakes />} />
          <Route path="/facts" element={<Facts />} />
          <Route path="/games/memory" element={<Memory />} />
          <Route path="/games/hangman" element={<Hangman />} />
          <Route path="/games/chronology" element={<Chronology />} />
          <Route path="/games/whoami" element={<WhoAmI />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/fillgap" element={<FillGap />} />
          <Route path="/games/crossword" element={<Crossword />} />
          <Route path="/games/battleship" element={<Battleship />} />
          <Route path="/games/fortress" element={<Fortress />} />
          <Route path="/games/whosaid" element={<WhoSaid />} />
          <Route path="/games/journey" element={<Journey />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MotionConfig>
  )
}
