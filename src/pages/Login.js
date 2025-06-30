import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../lib/supabase';
import { setLoading, setError } from '../redux/slices/authSlice';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(setLoading(true));
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        
        setSuccessMsg('Sign up successful! Please check your email to verify your account and then log in.');
        setTimeout(() => {
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setSuccessMsg('');
        }, 3500);
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        // User profile will be handled automatically by App.js
      }
    } catch (error) {
      dispatch(setError(error.message));
      setErrorMsg(error.message);
    }
    dispatch(setLoading(false));
  };

  const handleOAuth = async (provider) => {
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      // User profile will be handled automatically by App.js
    } catch (error) {
      dispatch(setError(error.message));
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="title">Ckribble Labs</h1>
        <p className="subtitle">Join the fun drawing game!</p>
        {successMsg && <div className="success-msg">{successMsg}</div>}
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
            autoComplete={isSignUp ? "new-password" : "current-password"}
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
              type="button"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuth('github')}
              className="btn-oauth github"
              type="button"
            >
              GitHub
            </button>
          </div>
        </div>
        <p className="toggle-auth">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="btn-secondary"
            style={{ marginLeft: 8 }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
