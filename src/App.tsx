import React, { useState } from 'react';
import Login from './Login';
import Chat from './Chat';



const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [me, setMe] = useState<{ id: string; username: string; displayName?: string } | null>(() => {
    const raw = localStorage.getItem('me');
    return raw ? JSON.parse(raw) : null;
  });

  const onAuth = (t: string, user: { id: string; username: string; displayName?: string }) => {
    setToken(t);
    setMe(user);
    localStorage.setItem('token', t);
    localStorage.setItem('me', JSON.stringify(user));
  };

  if (!token || !me) return <Login onAuth={onAuth} />;
  return <Chat token={token} me={me} />;
};

export default App;