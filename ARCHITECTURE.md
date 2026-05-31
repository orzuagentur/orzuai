# ARCHITECTURE.md

## Application Structure

src/

├── app/

├── components/

├── features/

├── lib/

├── services/

├── hooks/

├── types/

├── constants/

└── utils/

---

## Features

features/

├── auth/

├── dashboard/

├── business/

├── knowledge-base/

├── whatsapp/

├── chats/

├── settings/

└── analytics/

---

## Components

components/

├── ui/

├── layout/

├── auth/

├── dashboard/

├── chats/

└── knowledge/

---

## Services

services/

├── gemini.service.ts

├── auth.service.ts

├── business.service.ts

├── whatsapp.service.ts

├── knowledge.service.ts

└── analytics.service.ts

---

## Database

Supabase PostgreSQL

Tables:

* users
* businesses
* knowledge_base
* whatsapp_connections
* contacts
* conversations
* messages
* ai_settings
* analytics

---

## Main Flow

Landing Page
↓
Authentication
↓
Dashboard
↓
Business Setup
↓
Connect WhatsApp
↓
Add Knowledge Base
↓
Enable AI
↓
Receive Messages
↓
AI Responds

---

## Future Features

* AI Calls
* Booking System
* Website Generator
* Instagram AI
* Telegram AI
* CRM
* Mobile App
