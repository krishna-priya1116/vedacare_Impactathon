import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 fade-in">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight">
          VedaCare
        </h1>
        <p className="text-text-secondary text-lg mb-10">
          Simplifying medication for everyone.
        </p>

        <div className="flex flex-col gap-4 mb-8">
          <Link
            to="/signup"
            className="btn btn-xl btn-primary shadow-sm hover:shadow-md transition-shadow"
          >
            Sign up as Caregiver
          </Link>
          <Link
            to="/join"
            className="btn btn-xl btn-secondary shadow-sm hover:shadow-md transition-shadow"
          >
            Join as Patient
          </Link>
        </div>

        <p className="text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
