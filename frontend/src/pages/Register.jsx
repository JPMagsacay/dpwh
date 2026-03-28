import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../auth/AuthContext'

export default function Register() {
  const { register, error, setError } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate('/dashboard', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Register, then you’ll be logged in automatically"
      footer={
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">Name</span>
          <input
            className="field__input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="field__input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <div className="passwordField">
            <input
              className="field__input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="passwordToggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>

        <label className="field">
          <span className="field__label">Confirm password</span>
          <div className="passwordField">
            <input
              className="field__input"
              type={showPasswordConfirmation ? 'text' : 'password'}
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="passwordToggle"
              onClick={() => setShowPasswordConfirmation((v) => !v)}
              aria-label={showPasswordConfirmation ? 'Hide confirm password' : 'Show confirm password'}
              title={showPasswordConfirmation ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showPasswordConfirmation ? '🙈' : '👁️'}
            </button>
          </div>
        </label>

        {error ? <div className="form__error">{error.message}</div> : null}

        <button className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}

