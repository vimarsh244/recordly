export function Progress({ ratio }: { ratio: number | null }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={ratio === null ? undefined : Math.round(ratio * 100)}>
      <div
        className={`progress-fill${ratio === null ? ' indeterminate' : ''}`}
        style={ratio === null ? undefined : { width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  )
}
