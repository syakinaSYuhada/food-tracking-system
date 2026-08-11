import { useState } from 'react'

import { LogIn } from 'lucide-react'

import api from '../api/client'

import Button from '../components/Button'

import BrandLogo from '../components/BrandLogo'



const demoAccounts = [

  { username: 'nazhif', label: 'Nazhif (Manager)' },

  { username: 'siti_aminah', label: 'Siti Aminah (Worker)' },

  { username: 'hairul_nizam', label: 'Hairul Nizam (Worker)' }

]



function Login({ onLogin }) {

  const [username, setUsername] = useState('nazhif')

  const [password, setPassword] = useState('demo_password_only')

  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState('')



  async function handleSubmit(event) {

    event.preventDefault()

    setSubmitting(true)

    setError('')



    try {

      const res = await api.post('/auth/login', { username, password })

      const { token, user } = res.data.data

      localStorage.setItem('token', token)

      onLogin(user)

    } catch (loginError) {

      setError(loginError.response?.data?.message || 'Login failed. Please try again.')

    } finally {

      setSubmitting(false)

    }

  }



  return (

    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-softBg px-4">

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(31,143,115,0.10),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(234,88,12,0.06),transparent_45%)]" />



      <div className="relative w-full max-w-md animate-slide-up surface-card-accent p-8 shadow-float md:p-10">

        <div className="mb-8 text-center">

          <div className="mx-auto mb-6 flex justify-center">

            <BrandLogo showTagline />

          </div>

          <h1 className="typo-heading">Sign in to QDTS</h1>

          <p className="mt-2 text-body text-brand-muted">

            Quality defect tracking for Kak Norie production

          </p>

        </div>



        <form onSubmit={handleSubmit} className="space-y-5">

          <label className="block">

            <span className="field-label">Account</span>

            <select

              value={username}

              onChange={(e) => setUsername(e.target.value)}

              className="field-control"

            >

              {demoAccounts.map((account) => (

                <option key={account.username} value={account.username}>

                  {account.label}

                </option>

              ))}

            </select>

          </label>



          <label className="block">

            <span className="field-label">Password</span>

            <input

              type="password"

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              className="field-control"

              placeholder="Enter password"

            />

          </label>



          {error && (

            <div className="alert-error">{error}</div>

          )}



          <Button type="submit" color="brand" className="w-full justify-center" disabled={submitting}>

            <LogIn size={16} />

            {submitting ? 'Signing in...' : 'Sign In'}

          </Button>

        </form>



        <p className="mt-8 text-center text-caption text-brand-muted">

          Demo password: <span className="font-semibold text-brand-ink">demo_password_only</span>

        </p>

      </div>

    </div>

  )

}



export default Login

