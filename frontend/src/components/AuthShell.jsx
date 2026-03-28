import { Link } from 'react-router-dom'

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <header className="auth__header">
        <Link to="/" className="auth__brand">
          dpwh2
        </Link>
      </header>

      <main className="auth__card" role="main">
        <h1 className="auth__title">{title}</h1>
        {subtitle ? <p className="auth__subtitle">{subtitle}</p> : null}

        <div className="auth__content">{children}</div>
        {footer ? <div className="auth__footer">{footer}</div> : null}
      </main>
    </div>
  )
}

