import { useState } from 'react'
import { http } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../theme/ThemeContext'
import './Settings.css'

export default function Settings() {
  const { user, refreshMe } = useAuth()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountMsg, setAccountMsg] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState(null)

  async function saveAccount(e) {
    e.preventDefault()
    setSavingAccount(true)
    setAccountMsg(null)
    try {
      await http.put('/auth/account', { name, email })
      await refreshMe()
      setAccountMsg('Saved.')
    } catch {
      setAccountMsg('Failed to save.')
    } finally {
      setSavingAccount(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setSavingPassword(true)
    setPasswordMsg(null)
    try {
      await http.put('/auth/password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
      setPasswordMsg('Password updated.')
    } catch {
      setPasswordMsg('Failed to update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="page2">
      <div className="page2__header">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="p">Manage account, password, and appearance preferences.</p>
        </div>
      </div>

      <section className="card2 form2">
        <div className="h2">Appearance</div>
        <p className="p">Choose your preferred system theme.</p>
        <div className="themeSwitch" role="group" aria-label="Theme mode">
          <button
            type="button"
            className={`themeSwitch__btn ${theme === 'light' ? 'themeSwitch__btn--active' : ''}`}
            onClick={() => setTheme('light')}
          >
            Light mode
          </button>
          <button
            type="button"
            className={`themeSwitch__btn ${theme === 'dark' ? 'themeSwitch__btn--active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            Dark mode
          </button>
        </div>
      </section>

      <form className="card2 form2" onSubmit={saveAccount}>
        <div className="h2">Account</div>
        <div className="form2__grid">
          <label className="field2">
            <span className="field2__label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field2">
            <span className="field2__label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <div className="actions">
          <button className="btn btn--primary" disabled={savingAccount}>
            {savingAccount ? 'Saving…' : 'Save changes'}
          </button>
          {accountMsg ? <span className="muted">{accountMsg}</span> : null}
        </div>
      </form>

      <form className="card2 form2" onSubmit={savePassword}>
        <div className="h2">Password</div>
        <div className="form2__grid">
          <label className="field2">
            <span className="field2__label">Current password</span>
            <div className="passwordField">
              <input
                className="input"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="passwordToggle"
                onClick={() => setShowCurrentPassword((v) => !v)}
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                title={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
          <label className="field2">
            <span className="field2__label">New password</span>
            <div className="passwordField">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="passwordToggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                title={showPassword ? 'Hide new password' : 'Show new password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
          <label className="field2">
            <span className="field2__label">Confirm new password</span>
            <div className="passwordField">
              <input
                className="input"
                type={showPasswordConfirmation ? 'text' : 'password'}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
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
        </div>
        <div className="actions">
          <button className="btn btn--primary" disabled={savingPassword}>
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
          {passwordMsg ? <span className="muted">{passwordMsg}</span> : null}
        </div>
      </form>
    </div>
  )
}

