import React, { createContext, useState, useContext, useEffect } from 'react';

const SimulatedAuthContext = createContext(null);

const MOCK_USER = {
  id: 'mock-kakao-user-id',
  email: 'mock-kakao@example.com',
  nickname: 'Mock Kakao User',
};

export const SimulatedAuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
    localStorage.setItem('user', JSON.stringify(user));
  }, [isLoggedIn, user]);

  const login = () => {
    setIsLoggedIn(true);
    setUser({ id: 'mock-user-id', email: 'mock@example.com', nickname: 'Mock User' });
    // In a real app, you'd handle actual authentication here
  };

  const loginWithKakao = () => {
    // Simulate Kakao login success
    setIsLoggedIn(true);
    setUser(MOCK_USER);
    // In a real app, you'd integrate with Kakao SDK here
    // For now, it always succeeds for testing purposes
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    // In a real app, you'd handle actual logout here
  };

  const providerValue = {
    isLoggedIn,
    user,
    login,
    loginWithKakao, // Add new function
    logout,
  };

  return (
    <SimulatedAuthContext.Provider value={providerValue}>
      {children}
    </SimulatedAuthContext.Provider>
  );
};

export const useSimulatedAuth = () => useContext(SimulatedAuthContext);
