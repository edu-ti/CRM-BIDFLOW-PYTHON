import React from 'react';

export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  lastActivity: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'me' | 'contact';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image';
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: string;
  avatar?: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  contactName: string;
  stageId: string;
}

export interface FunnelStage {
  id: string;
  name: string;
  color: string;
}

export interface ChatbotNode {
  id: string;
  type: 'message' | 'question' | 'condition' | 'action';
  label: string;
  content: string;
  position: { x: number; y: number };
}

export interface ChatbotConnection {
  id: string;
  from: string;
  to: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}