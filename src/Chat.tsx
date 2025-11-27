import React, { useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";
import type { Message, User } from "./models";

import userAvatar from './assets/user-avatar.jpg';

import { useState } from "react";

const ENV = import.meta.env;
const API = ENV.VITE_APP_API_URL || 'http://localhost:3000';


const Chat: React.FC<{ token: string; me: { id: string; username: string; displayName?: string } }> = ({ token, me }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const [usersLoaded, setUsersLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;
        console.log(token);

        // fetch users
        axios.get<User[]>(API + '/api/users', { headers: { Authorization: 'Bearer ' + token } })
            .then((r: { data: User[] }) => {
                if (mounted) {
                    setUsers(r.data);
                    setUsersLoaded(true);
                }
            })
            .catch(console.error);
        return () => { mounted = false; };
    }, [token]);

    useEffect(() => {
        if (!usersLoaded) return;
        let mounted = true;
        // setup socket
        const socket = io(API, {
            auth: { token }
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        socket.on('message', (message: Message) => {
            console.log('Received message:', message);
            if (mounted) {
                setMessages(prev => [...prev, message]);
            }
        });
        socket.on('connect_error', (err: unknown) => console.error('Socket error', (err as Error)?.message || err));

        socket.on('presence', (p: { userId: string; userName: string; online: boolean; lastSeen?: string }) => {
            console.log('presence', p);
            setUsers(prev => prev.map(u => u._id === p.userId ? { ...u, online: p.online, lastSeen: p.lastSeen } : u));
        });

        socket.on('onlineUsers', (onlineUserIds: string[]) => {
            console.log('onlineUsers', onlineUserIds);
            console.log('before setUsers', users);

            setUsers(prev => {
                const updatedUsers = [...prev];

                if (updatedUsers.length === 0 && prev.length === 0) {
                    // This means users haven't been loaded yet, so we should wait.
                    // This scenario is handled by the initial fetchUsers call.
                    return prev;
                }

                updatedUsers.forEach(u => {
                    if (onlineUserIds.includes(u._id)) {
                        u.online = true;
                    } else {
                        u.online = false;
                    }
                });
                console.log('after setUsers', updatedUsers);

                return updatedUsers;
            });
        });

        socket.on('message:read', ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, read: true } : m));
        });

        socket.on('connect', () => {
            socket.emit('fetchUndelivered');
        });



        return () => {
            mounted = false;
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, usersLoaded]);

    useEffect(() => {
        if (!selected) return;
        let mounted = true;
        axios.get<Message[]>(`${API}/api/messages/${selected._id}`, { headers: { Authorization: 'Bearer ' + token } })
            .then((r: { data: Message[] }) => { if (mounted) setMessages(r.data); })
            .catch(console.error);
        return () => { mounted = false; };
    }, [selected, token]);

    const send = () => {
        console.log('send', text);
        console.log(selected);

        if (!text.trim() || !selected || !socketRef.current) return;
        socketRef.current.emit('message', { receiver: selected._id, text });
        setMessages(prev => [...prev, {
            _id: 'temp-' + Date.now(),
            sender: me.id,
            receiver: selected._id,
            content: text,
            createdAt: new Date().toISOString(),
            delivered: false,
            read: false,
        }]);
        setText('');
    };

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('e.target.value', e.target.value);
        setText(e.target.value);
    };

    const handleOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        console.log('e.key', e.key);
        if (e.key === 'Enter') send();
    };

    const logOut = (userId: string) => {
        socketRef.current?.emit('logout', userId);
        localStorage.removeItem('token');
        localStorage.removeItem('me');
        window.location.reload();
    };

    return (
        <div className="chat-container">
            <div className="chat-wrapper">
                <div className="header">
                    <h2>Nano Chat</h2>
                    <button onClick={() => logOut(me.id)} style={{ float: 'right' }}>Log Out</button>
                </div>
                <p>Welcome <b>{me.displayName || me.username}</b>!</p>
                <div className="users-list">
                    {users.filter(u => u._id !== me.id).map(u => {
                        // console.log(u);
                        return (
                            <div
                                key={u._id}
                                onClick={() => setSelected(u)}
                                className="user-item"
                                style={{ padding: 8, cursor: 'pointer', background: selected?._id === u._id ? '#eee' : 'white' }}
                            >
                                <div className="left">
                                    <img className="avatar" src={u.avatar || userAvatar} alt="user avatar" height={32} width={32} />
                                    <div className="user-info">
                                        <span>{u.displayName || u.username}</span>
                                        <span>{u.lastMessage && (u.lastMessage.sender === me.id || u.lastMessage?.receiver === me.id) ? `${u.lastMessage?.content}` : ''}</span>
                                    </div>
                                </div>
                                <div className="right">
                                    <span style={{ color: u.online ? 'green' : 'gray', fontWeight: 'bold' }}>
                                        {u.online ? 'Online' : 'Offline'}
                                    </span>
                                    <span>{u.lastSeen ? `${new Date(u.lastSeen).toLocaleString()}` : ''}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="chat-window">
                    <h4>Chat with {selected ? (selected.displayName || selected.username) : '...'}</h4>

                    <div className="messages-list">
                        {messages.map(m => (
                            <div key={m._id} className={`message ${m.sender === me.id ? 'sent' : 'received'}`}>
                                <div className="message-content">
                                    <div>{m.content}</div>
                                    <small>{new Date(m.createdAt).toLocaleTimeString()}</small>
                                    {m.read && <span> ✓</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="message-input-container">
                    <input
                        className="message-input"
                        type="text"
                        placeholder="Type a message..."
                        value={text}
                        onChange={handleOnChange}
                        onKeyDown={handleOnKeyDown}
                        disabled={!selected}
                    />
                    <button className="send-button" onClick={send} disabled={!selected || !text.trim()}>Send</button>
                </div>
            </div>
        </div>
    );
};


export default Chat;