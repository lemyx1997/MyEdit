import TopBar from './components/TopBar'
import MediaPanel from './components/MediaPanel'
import Player from './components/Player'
import Inspector from './components/Inspector'
import Timeline from './components/Timeline'

export default function App() {
  return (
    <div className="flex h-full min-w-[1100px] flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <MediaPanel />
        <Player />
        <Inspector />
      </div>
      <Timeline />
    </div>
  )
}
