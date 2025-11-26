// ----- Types -----
export interface User {
  _id: string;
  username: string;
  displayName?: string | null;
  lastSeen?: string;
  online?: boolean;
  avatar?: string;
  lastMessage?: Message
}

export interface Message {
  _id: string;
  sender: string;
  receiver?: string;
  content: string;
  createdAt: string;
  delivered?: boolean;
  read?: boolean;
}

export interface AuthResponse {
  token: string;
  user: { id: string; username: string; displayName?: string };
}