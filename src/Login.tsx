import React, { useState } from 'react';
import axios from 'axios';
import type { AuthResponse } from './models';

const ENV = import.meta.env;
console.log('ENV:', ENV);

const API = ENV.VITE_APP_API_URL || 'http://localhost:3000';

console.log('API:', API);

// Resolve API base URL in a browser-safe way.
// Some build setups (CRA, Vite) inject environment variables at build time.
// But `process` may be undefined in certain runtimes (e.g. some bundlers or playgrounds).
// This code tries several safe fallbacks (in order):
// 1. `process.env.REACT_APP_API_URL` if `process` exists (CRA/webpack usual case)
// 2. `import.meta.env.REACT_APP_API_URL` (Vite-style)
// 3. `window.__REACT_APP_API_URL` (explicit global you can set in index.html)
// 4. Default to 'http://localhost:3001'



// ----- Login component -----
const Login: React.FC<{ onAuth: (token: string, user: { id: string; username: string; displayName?: string }) => void }> = ({ onAuth }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const doLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post<AuthResponse>(API + '/api/login', { username, password });
            onAuth(res.data.token, { id: res.data.user.id, username: res.data.user.username, displayName: res.data.user.displayName });
        } catch (err) {
            console.log(err);
            if (err instanceof Error && axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message || 'Login failed');
            } else {
                setError('Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const doRegister = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post<AuthResponse>(API + '/api/register', { username, password, displayName: username });
            onAuth(res.data.token, { id: res.data.user.id, username: res.data.user.username, displayName: res.data.user.displayName });
        } catch (err) {
            if (err instanceof Error && axios.isAxiosError(err)) {
                setError(err.response?.data?.error || err.message || 'Register failed');
            } else {
                setError('Register failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-wrapper">
                <h3 className='login-title'>Login / Register</h3>
                <div className='login-input'>
                    <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className='login-input'>
                    <input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                </div>
                {error && <div className='login-error'>{error}</div>}
                <div className='login-buttons'>
                    <button onClick={doLogin} disabled={loading}>Login</button>
                    <button onClick={doRegister} disabled={loading} style={{ marginLeft: 8 }}>Register</button>
                </div>
            </div>
        </div>
    );
};


export default Login;
