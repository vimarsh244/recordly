export function CountdownOverlay({ value, onCancel }: { value: number; onCancel(): void }) {
  return (
    <div className="countdown" role="status" aria-live="assertive" onClick={onCancel} title="Click to cancel">
      {value}
    </div>
  )
}
