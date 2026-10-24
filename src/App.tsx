import { lazy, Suspense } from 'react'
import { Navigate, Route } from 'react-router'
import { AnimatedRoutes } from './app/AnimatedRoutes'

// Each page is its own chunk, so Home doesn't wait on the lesson's physics and PDF code.
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const CreateTutorPage = lazy(() => import('./pages/CreateTutorPage').then((m) => ({ default: m.CreateTutorPage })))
const LessonPage = lazy(() => import('./pages/LessonPage').then((m) => ({ default: m.LessonPage })))
const DuelPage = lazy(() => import('./pages/DuelPage').then((m) => ({ default: m.DuelPage })))

const page = (el: React.ReactNode) => <Suspense fallback={null}>{el}</Suspense>

export default function App() {
  return (
    <AnimatedRoutes>
      <Route path="/" element={page(<HomePage />)} />
      <Route path="/new" element={page(<CreateTutorPage />)} />
      <Route path="/tutor/:id" element={page(<LessonPage />)} />
      <Route path="/duel" element={page(<DuelPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </AnimatedRoutes>
  )
}
