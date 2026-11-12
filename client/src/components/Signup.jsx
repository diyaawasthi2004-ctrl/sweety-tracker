import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

function Signup({ switchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signup } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await signup(name, email, password);
      setSuccess('Account created successfully! You can now log in.');
      setTimeout(() => {
        switchToLogin();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign up');
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Sign up for Sweety</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Name:</label><br />
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label><br />
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label><br />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
          Sign Up
        </button>
      </form>
      <p style={{ marginTop: '15px', textAlign: 'center' }}>
        Already have an account? <button onClick={switchToLogin} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>Login</button>
      </p>
    </div>
  );
}

export default Signup;