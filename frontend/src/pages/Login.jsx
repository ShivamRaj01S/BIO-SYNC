import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BRAND_NAME, BRAND_PROMISE } from '../constants/brand.js';

const REGISTER_ROLES = [
  {
    value: 'patient',
    label: 'Patient',
    description: 'Request help and track your blood or organ support needs.',
  },
  {
    value: 'donor',
    label: 'Donor',
    description: 'Offer blood or organ donation and manage your availability.',
  },
  {
    value: 'hospital',
    label: 'Hospital',
    description: 'Join as a hospital and wait for admin verification after signup.',
  },
];

const NEW_USER_ROLE_MESSAGE = 'New users must choose donor, patient, or hospital as their role.';

export default function Login({ mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState('');
  const [pendingCredential, setPendingCredential] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(initialMode);
    setPendingCredential(location.state?.pendingCredential || null);
    setError(location.state?.error || '');
    if (initialMode === 'login') {
      setRole('');
    }
  }, [initialMode, location.state]);

  const navigateByRole = (userRole) => {
    if (userRole === 'donor') navigate('/donor');
    else if (userRole === 'patient') navigate('/patient');
    else if (userRole === 'hospital') navigate('/hospital');
    else if (userRole === 'admin') navigate('/admin');
    else navigate('/');
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setPendingCredential(null);
    setError('');
    if (nextMode === 'login') {
      setRole('');
    }
    navigate(nextMode === 'register' ? '/register' : '/login');
  };

  const sendToken = async (idToken, selectedRole) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', { idToken, role: selectedRole || undefined });
      login(data.token, data.user);
      navigateByRole(data.user.role);
    } catch (err) {
      const message = err.response?.data?.message || 'Authentication failed.';
      const requiresRegistration =
        err.response?.data?.requireRole || message === NEW_USER_ROLE_MESSAGE;

      if (mode === 'login' && requiresRegistration) {
        navigate('/register', {
          state: {
            pendingCredential: idToken,
            error: 'This Google account is new here. Choose patient, donor, or hospital to finish registration.',
          },
        });
        return;
      }

      if (mode === 'register' && !selectedRole) {
        setPendingCredential(idToken);
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = (res) => {
    setError('');
    if (!res?.credential) return;

    if (mode === 'register' && !role) {
      setPendingCredential(res.credential);
      setError('Choose patient, donor, or hospital before continuing.');
      return;
    }

    sendToken(res.credential, mode === 'register' ? role : undefined);
  };

  const useCredential = (cred) => {
    if (!cred) return;
    sendToken(cred, role);
  };

  return (
    <div className="page-shell max-w-5xl py-12">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card hidden lg:block">
          <div className="brand-pill mb-4">{BRAND_NAME}</div>
          <h1 className="font-display text-4xl font-bold leading-tight text-blood-dark">
            One sign-in point for urgent medical coordination.
          </h1>
          <p className="mt-4 text-base leading-7 text-medical-gray">{BRAND_PROMISE}</p>
          <div className="mt-8 space-y-3">
            <div className="interactive-card">
              <p className="font-display text-lg font-semibold text-blood-dark">Role-aware onboarding</p>
              <p className="mt-2 text-sm text-medical-gray">Choose donor, patient, or hospital during registration and land in the right workspace immediately.</p>
            </div>
            <div className="interactive-card">
              <p className="font-display text-lg font-semibold text-blood-dark">Trusted hospital lane</p>
              <p className="mt-2 text-sm text-medical-gray">Hospitals are still gated behind admin verification before organ requests can go live.</p>
            </div>
            <div className="interactive-card">
              <p className="font-display text-lg font-semibold text-blood-dark">Google-first auth</p>
              <p className="mt-2 text-sm text-medical-gray">Fewer passwords, faster access, and a cleaner handoff between devices.</p>
            </div>
          </div>
        </section>

        <section className="card space-y-6">
          <div>
          <div className="inline-flex rounded-full border border-red-100 bg-red-50/80 p-1 mb-5">
            <button
              type="button"
              onClick={() => changeMode('login')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'login'
                  ? 'bg-white text-blood-red shadow-sm'
                  : 'text-medical-gray hover:text-blood-red'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => changeMode('register')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'register'
                  ? 'bg-white text-blood-red shadow-sm'
                  : 'text-medical-gray hover:text-blood-red'
              }`}
            >
              Register
            </button>
          </div>

          <div className="brand-pill mb-4">{BRAND_NAME} access</div>
          <h1 className="font-display text-3xl font-bold text-blood-dark mb-2">
            {mode === 'register' ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="text-medical-gray">
            {mode === 'register'
              ? 'Choose your role first, then continue with Google. Admin accounts are created from the CLI only.'
              : 'Use your Google account to continue. Admins can sign in here after their account is created from the CLI.'}
          </p>
        </div>

        {error && <p className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">{error}</p>}

        {mode === 'register' && (
          <div className="rounded-[24px] border border-red-100 bg-red-50/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-blood-dark">Register as</p>
            <div className="space-y-2">
              {REGISTER_ROLES.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer transition ${
                    role === option.value
                      ? 'border-blood-red bg-white shadow-sm'
                      : 'border-transparent bg-white/70 hover:-translate-y-0.5 hover:border-red-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="mt-1 text-blood-red focus:ring-blood-red"
                  />
                  <span>
                    <span className="block font-medium text-blood-dark">{option.label}</span>
                    <span className="block text-sm text-medical-gray">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-medical-gray">
              Admin is not available here. Create admin accounts from the CLI with `npm run seed:admin`, then sign in from the login tab.
            </p>
          </div>
        )}

        {pendingCredential && mode === 'register' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => useCredential(pendingCredential)}
              disabled={!role || loading}
              className="btn-primary w-full"
            >
              {loading ? 'Continuing...' : 'Continue registration'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingCredential(null);
                setError('');
              }}
              disabled={loading}
              className="btn-secondary w-full"
            >
              Use another Google account
            </button>
          </div>
        ) : import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div className="flex justify-center rounded-[24px] border border-white/70 bg-white/70 p-6">
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={() => setError('Google sign-in failed.')}
              useOneTap={false}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
            />
          </div>
        ) : (
          <p className="text-amber-600 text-sm">Set `VITE_GOOGLE_CLIENT_ID` in `.env` to enable Google login.</p>
        )}
        </section>
      </div>
    </div>
  );
}
