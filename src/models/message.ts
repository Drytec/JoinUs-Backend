
export interface OnlineUser {
  socketId: string;
  userId: string;
}


export interface Message {
  senderId: string;
  text: string;
  timestamp: number;
}

export interface StoredMessage extends Message {
  id?: string;
}

export interface SendMessagePayload {
  senderId: string;
  text: string;
}

export interface ReceiveMessagePayload extends Message {
  id?: string;
}


export interface ServerToClientEvents {
  usersOnline: (users: OnlineUser[]) => void;
  receiveMessage: (message: ReceiveMessagePayload) => void;
  newMessage: (message: ReceiveMessagePayload) => void; 
}

export interface ClientToServerEvents {
  newUser: (userId: string) => void;
  sendMessage: (payload: SendMessagePayload) => void;
  disconnect: () => void;
}