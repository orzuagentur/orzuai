# OrzuAI Database Schema v1

## users

Stores platform user accounts.

### Fields

* id
* email
* full_name
* avatar_url
* auth_provider
* created_at
* updated_at

---

## businesses

Stores business information for each user.

### Fields

* id
* user_id
* business_name
* business_description
* phone
* email
* address
* website
* logo_url
* created_at
* updated_at

### Relationship

businesses.user_id → users.id

---

## knowledge_base

Stores business knowledge used by the AI assistant.

### Fields

* id
* business_id
* title
* content
* category
* created_at
* updated_at

### Relationship

knowledge_base.business_id → businesses.id

### Example Categories

* Services
* Pricing
* FAQ
* Business Hours

---

## whatsapp_connections

Stores connected WhatsApp accounts.

### Fields

* id
* business_id
* phone_number
* whatsapp_status
* connected_at
* created_at

### Relationship

whatsapp_connections.business_id → businesses.id

---

## contacts

Stores customer contact information.

### Fields

* id
* business_id
* name
* phone_number
* last_message_at
* created_at

### Relationship

contacts.business_id → businesses.id

---

## conversations

Stores chat conversations.

### Fields

* id
* business_id
* contact_id
* status
* created_at
* updated_at

### Relationships

conversations.business_id → businesses.id

conversations.contact_id → contacts.id

---

## messages

Stores individual messages within conversations.

### Fields

* id
* conversation_id
* sender_type
* content
* ai_generated
* created_at

### Relationship

messages.conversation_id → conversations.id

### Sender Types

* user
* client
* ai

---

## ai_settings

Stores AI assistant configuration.

### Fields

* id
* business_id
* model
* language
* system_prompt
* ai_enabled
* created_at
* updated_at

### Relationship

ai_settings.business_id → businesses.id

---

## analytics

Stores business analytics and performance metrics.

### Fields

* id
* business_id
* total_messages
* total_contacts
* ai_replies
* updated_at

### Relationship

analytics.business_id → businesses.id

---

# MVP User Flow

User
↓
Create Account
↓
Create Business Profile
↓
Connect WhatsApp
↓
Add Knowledge Base Content
↓
Enable AI Assistant
↓
Receive Customer Messages
↓
AI Generates Responses
↓
Analytics Update Automatically

---

# Database Relationships Overview

users
↓
businesses
↓
├── knowledge_base
├── whatsapp_connections
├── contacts
├── conversations
├── ai_settings
└── analytics

conversations
↓
messages

contacts
↓
conversations
