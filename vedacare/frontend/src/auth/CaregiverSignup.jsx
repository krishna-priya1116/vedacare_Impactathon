import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup } from '../api/client';
import { ArrowLeft } from 'lucide-react';

export default function CaregiverSignup() {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await signup(formData);
      if (response.success) {
        // Log them in automatically
        loginUser({
          token: response.token,
          role: 'caregiver',
          redirect: '/caregiver/patients?action=add',
          name: formData.name,
          caregiver_id: response.caregiver_id
        });
        navigate('/caregiver/patients?action=add');
      } else {
        setError(response.error?.message || 'Signup failed.');
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
          <h1 className="page-title mb-2">Create Account</h1>
          <p className="text-text-secondary">Sign up as a Caregiver to manage medications</p>
        </div>

        {error && (
          <div className="bg-danger-50 text-danger p-3 rounded-md text-sm mb-6 border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="input"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Hirva Dave"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="contact">Email or Phone Number</label>
            <input
              id="contact"
              type="text"
              className="input"
              value={formData.contact}
              onChange={handleChange}
              placeholder="e.g. hirva@email.com"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg mt-2 w-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-text-secondary mt-8 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
