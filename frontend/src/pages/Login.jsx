import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

export default function Login() {
  const { login, error, setError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const next = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login({ email, password })
      navigate(next, { replace: true })
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="loginPage">
      <main className="loginCard" role="main">
        <section className="loginFormPane">

          <p className="loginSubtitle">Login to continue</p>

          <form className="form" onSubmit={onSubmit}>
            {/* EMAIL */}
            <label className="field">
              <input
                className="field__input"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            {/* PASSWORD */}
            <label className="field">
              <div className="passwordField">
                <input
                  className="field__input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="passwordToggle"
                  onClick={() => setShowPassword(prev => !prev)}
                >
                  {showPassword ? (
                    // OPEN EYE
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12C1 12 5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  ) : (
                    // SLASHED EYE
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94C16.14 19.24 14.13 20 12 20C5 20 1 12 1 12C2.24 9.83 3.86 7.96 5.94 6.56" stroke="currentColor" strokeWidth="2"/>
                      <path d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42" stroke="currentColor" strokeWidth="2"/>
                      <path d="M1 1L23 23" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {/* ERROR */}
            {error && (
              <div className="form__error">
                {error?.message || 'Login failed'}
              </div>
            )}

            {/* BUTTON */}
            <button className="signInButton" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="loginFooter">
            No account? <Link to="/register">Create one</Link>
          </div>
        </section>

        <section className="loginLogoPane" aria-hidden="true">
          <img src="/dpwh-logo.png" alt="" className="loginLogoLarge" />
          <p className="loginLogoTagline">DPWH services profiling</p>
        </section>
      </main>
    </div>
  )
}