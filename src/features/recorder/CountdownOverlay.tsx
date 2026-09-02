import { useEffect } from 'react'

export function CountdownOverlay({ value, onCancel }: { value: number; onCancel(): void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="countdown" role="status" aria-live="assertive" onClick={onCancel} title="Click to cancel">
      <span className="countdown-value">{value}</span>
      <span className="countdown-hint">Click anywhere to cancel</span>
    </div>
  )
}
