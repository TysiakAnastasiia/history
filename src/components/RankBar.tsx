import { useProfile } from '../lib/profile'
import { rankOf } from '../lib/xp'
import { ProgressBar } from './ui'

export function RankBar() {
  const { profile } = useProfile()
  const r = rankOf(profile.xp)
  return (
    <div
      className="glass flex items-center gap-3 rounded-full px-5 py-3"
      title={
        r.next ? `До звання «${r.next.name}»: ${r.next.from - profile.xp} XP` : 'Найвище звання'
      }
    >
      <span aria-hidden>{r.icon}</span>
      <span className="text-lg">{r.name}</span>
      <ProgressBar value={r.progress} />
      <span className="text-muted text-sm">{profile.xp} XP</span>
    </div>
  )
}
