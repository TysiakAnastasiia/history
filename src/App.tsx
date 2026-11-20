import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useProfile } from './lib/profile'
import { Blitz } from './screens/Blitz'
import { Home } from './screens/Home'
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/topic/:n" element={<Topic />} />
        {/* key: новий запуск тренування при зміні режиму (усі / помилки) */}
        <Route path="/topic/:n/quiz" element={<TopicQuiz key={pathname + search} />} />
        <Route path="/topic/:n/theory/:section" element={<TheorySection />} />
        <Route path="/blitz" element={<Blitz />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MotionConfig>
  )
}
