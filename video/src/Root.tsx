import { Composition } from 'remotion'
import { PerchDemo } from './PerchDemo'
import { DURATION, FPS, H, W } from './perch'

export function Root(): React.JSX.Element {
  return <Composition id="PerchDemo" component={PerchDemo} width={W} height={H} fps={FPS} durationInFrames={DURATION} />
}
