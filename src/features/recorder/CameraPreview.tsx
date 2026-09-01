import { useApp } from '../../app/store'
import { useCameraStream, useStreamRef } from './useEngine'

const SIZES = { small: 92, medium: 132, large: 180 }
const RADIUS = { circle: '50%', rounded: '12px', square: '2px' }

/** Floating preview of the camera, positioned the way it is stored. */
export function CameraPreview() {
  const stream = useCameraStream()
  const settings = useApp((state) => state.settings)
  const ref = useStreamRef(stream)
  if (!stream) return null

  const size = SIZES[settings.cameraSize]
  const [vertical, horizontal] = settings.cameraPosition.split('-')
  const style: React.CSSProperties = {
    position: 'fixed',
    width: size,
    height: size,
    borderRadius: RADIUS[settings.cameraShape],
    overflow: 'hidden',
    background: '#000',
    boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
    zIndex: 20,
    [vertical === 'top' ? 'top' : 'bottom']: 20,
    [horizontal === 'left' ? 'left' : 'right']: 20,
  }

  return (
    <div style={style}>
      <video
        ref={ref}
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />
    </div>
  )
}
