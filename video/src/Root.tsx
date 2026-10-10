import { Composition } from 'remotion'
import { LAYOUTS } from './layout'
import { PerchDemo } from './PerchDemo'
import { DURATION, FPS } from './perch'

export function Root(): React.JSX.Element {
  return (
    <>
      <Composition
        id="PerchDemo"
        component={PerchDemo}
        width={LAYOUTS.portrait.W}
        height={LAYOUTS.portrait.H}
        fps={FPS}
        durationInFrames={DURATION}
        defaultProps={{ variant: 'portrait' as const }}
      />
      <Composition
        id="PerchDemoWide"
        component={PerchDemo}
        width={LAYOUTS.wide.W}
        height={LAYOUTS.wide.H}
        fps={FPS}
        durationInFrames={DURATION}
        defaultProps={{ variant: 'wide' as const }}
      />
    </>
  )
}
