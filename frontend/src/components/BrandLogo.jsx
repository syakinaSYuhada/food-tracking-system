export default function BrandLogo({ compact = false, inverted = false, showTagline = true }) {

  const titleClass = inverted ? 'text-white' : 'text-brand-ink'

  const taglineClass = inverted ? 'text-brand-300' : 'text-brand-muted'

  const markClass = inverted

    ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-card'

    : 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-card shadow-brand-500/20'



  return (

    <div className={`flex items-center gap-3 ${compact ? '' : ''}`}>

      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${markClass}`}>

        <span className="text-sm font-extrabold tracking-tight">KN</span>

      </div>

      {!compact && (

        <div className="min-w-0">

          <div className={`text-body font-bold leading-tight ${titleClass}`}>Kak Norie</div>

          {showTagline && (

            <div className={`text-micro uppercase ${taglineClass}`}>

              Quality Defect Tracking

            </div>

          )}

        </div>

      )}

    </div>

  )

}

