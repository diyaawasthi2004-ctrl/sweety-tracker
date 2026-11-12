import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';

function App() {
  const { user, loading } = useContext(AuthContext);
  const [isLoginView, setIsLoginView] = useState(true);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  if (user) {
    return <Dashboard />;
  }

  return isLoginView ? (
    <Login switchToSignup={() => setIsLoginView(false)} />
  ) : (
    <Signup switchToLogin={() => setIsLoginView(true)} />
  );
}

export default App;