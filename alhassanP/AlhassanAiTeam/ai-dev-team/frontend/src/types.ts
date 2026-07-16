export interface User {
  id: number;
  name: string;
  arabic_name: string;
  role: 'backend' | 'frontend' | 'database' | 'testing' | 'scrum_master' | 'user';
}

export interface Message {
  user: User;
  message: string;
  timestamp: string;
  message_id?: string;
}