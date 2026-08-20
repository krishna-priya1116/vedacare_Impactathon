import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/client';
import { ArrowLeft } from 'lucide-react';

export default function Login() {
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ contact, password });
      if (response.success) {
        loginUser(response);
        navigate(response.redirect);
      } else {
        setError(response.error?.message || 'Login failed.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg p-6 fade-in">
      <Link to="/" className="inline-flex items-center text-text-secondary hover:text-primary mb-8">
        <ArrowLeft size={20} className="mr-1" /> Back
      </Link>
      
      <div className="max-w-md mx-auto card p-8">
        <div className="text-center mb-8">
          <h1 className="page-title mb-2">Welcome Back</h1>
          <p className="text-text-secondary">Log in to your VedaCare account</p>
        </div>

        {error && (
          <div className="bg-danger-50 text-danger p-3 rounded-md text-sm mb-6 border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="contact">Email or Phone Number</label>
            <input
              id="contact"
              type="text"
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. parthiv@email.com"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg mt-2 w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-text-secondary mt-8 text-sm">
          Don't have an account?{' '}
          <Link to="/" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
