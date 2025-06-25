
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../lib/supabase';
import { setLoading, setError } from '../redux/slices/authSlice';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(setLoading(true));

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;
    } catch (error) {
      dispatch(setError(error.message));
    }
  };

  const handleOAuth = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      dispatch(setError(error.message));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="title">Draw & Guess</h1>
        <p className="subtitle">Join the fun drawing game!</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />
          <button type="submit" className="btn-primary">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="oauth-section">
          <p>Or continue with:</p>
          <div className="oauth-buttons">
            <button
              onClick={() => handleOAuth('google')}
              className="btn-oauth google"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuth('github')}
              className="btn-oauth github"
            >
              GitHub
            </button>
          </div>
        </div>

        <p className="toggle-auth">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="link-button"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
