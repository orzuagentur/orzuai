import { SUPPORT_EMAIL } from "../../constants/app-origin";

import type { LegalPageRecord, LegalSection } from "./types";

export const LEGAL_COMPANY = {
  name: "OrzuX",
  contactEmail: SUPPORT_EMAIL,
  lastUpdated: "July 31, 2026",
} as const;

function withCompany(text: string): string {
  return text
    .replaceAll("{company}", LEGAL_COMPANY.name)
    .replaceAll("{email}", LEGAL_COMPANY.contactEmail)
    .replaceAll("{date}", LEGAL_COMPANY.lastUpdated);
}

function buildSections(sections: LegalSection[]): LegalSection[] {
  return sections.map((section) => ({
    ...section,
    paragraphs: section.paragraphs.map(withCompany),
    list: section.list?.map(withCompany),
  }));
}

const PRIVACY_SECTIONS = buildSections([
  {
    title: "Introduction",
    paragraphs: [
      "{company} (“we”, “us”, “our”) operates an AI-powered business communication platform that helps companies manage customer conversations, CRM, calendar bookings, and related workflows.",
      "This Privacy Policy describes how we collect, use, store, and protect personal information when you visit our website, create an account, or use our services as a business user. It also explains how we process data on behalf of businesses that use {company} to communicate with their customers.",
      "By registering for or using {company}, you acknowledge this Privacy Policy. If you use {company} on behalf of a business, you are responsible for ensuring that your use complies with applicable laws and that you have a lawful basis to process customer data in the platform.",
    ],
  },
  {
    title: "Roles and Scope",
    paragraphs: [
      "For account and billing data relating to business users, {company} acts as the data controller.",
      "For customer messages, contacts, and other data that a business uploads or receives through connected channels, the business is generally the data controller and {company} processes that data as a service provider on the business’s instructions, as configured in the account.",
    ],
  },
  {
    title: "Information We Collect",
    paragraphs: ["Depending on how you use {company}, we may collect:"],
    list: [
      "Account data: name, email address, authentication method, profile avatar, and account activity related to sign-in and security.",
      "Business profile data: business name, description, contact details, timezone, subscription plan, and uploaded logo.",
      "Messaging and inbox data: conversations, messages, attachments, delivery status, internal notes, conversation summaries, and channel metadata from connected integrations.",
      "CRM data: contacts, tags, pipeline stage, deal values, tasks, deals, and notes you or the AI assistant create in the platform.",
      "Knowledge base content: FAQs, service information, website-synced pages, and other materials you provide to train or inform the AI assistant.",
      "Calendar and booking data: events, tasks, bookable resources, booking page settings, appointment details, and customer information submitted through booking flows.",
      "Integration credentials and configuration: connection status and tokens required to operate WhatsApp, Telegram, Gmail, Google Calendar, Twilio Voice, website form webhooks, and related integrations. We store secrets using encryption and access controls.",
      "Voice interaction data: call metadata, transcripts or messages generated during voice sessions, and related logs when Twilio Voice is enabled.",
      "Usage and analytics data: message volumes, AI reply activity, agent run logs, and product usage metrics displayed in your dashboard.",
      "Transactional email data: verification, password reset, onboarding, booking confirmation, and other service emails sent to you or your customers when those features are used.",
      "Technical data: IP address, browser type, device information, and standard server logs collected for security, debugging, and performance.",
      "Push notification subscription data: browser push endpoints and related identifiers when you enable web push notifications.",
    ],
  },
  {
    title: "How We Use Information",
    paragraphs: ["We use personal information to:"],
    list: [
      "Provide, operate, maintain, and secure the {company} platform.",
      "Authenticate users, manage accounts, and prevent fraud or abuse.",
      "Connect and operate messaging, email, voice, calendar, and website form integrations you enable.",
      "Generate AI-assisted replies, routing, CRM updates, calendar actions, and related automations according to your settings.",
      "Send transactional communications such as account verification, password reset, booking confirmations, and service notifications.",
      "Process subscription and billing events when paid plans are offered through Stripe.",
      "Monitor reliability, troubleshoot issues, and improve product performance.",
      "Comply with legal obligations and respond to lawful requests.",
    ],
  },
  {
    title: "AI Processing",
    paragraphs: [
      "When AI features are enabled, message content and relevant business context may be sent to configured AI providers to generate replies, classify intent, update CRM records, or perform calendar actions. AI output is generated automatically based on your assistant settings, permissions, and knowledge base.",
      "You control whether AI replies are enabled per channel and which actions the assistant may perform. You remain responsible for reviewing AI-generated content and ensuring it is appropriate for your customers.",
      "AI features are provided through enterprise API tiers of our AI providers (currently Google Gemini API, OpenAI API, and Anthropic API). These providers do not use data submitted through their APIs to train or improve their generalized or foundational AI/ML models. {company} does not use, transfer, or sell user data — including raw, aggregated, or derived data — to create, train, or improve any generalized or foundational AI/ML models.",
    ],
  },
  {
    title: "Google User Data and Limited Use",
    paragraphs: [
      "{company}'s use and transfer of information received from Google APIs, including Gmail and Google Calendar, adheres to the Google API Services User Data Policy, including its Limited Use requirements.",
      "We request the minimum Google scopes required to operate the features you enable: Gmail read access (gmail.readonly) to display incoming customer emails in your inbox; Gmail send access (gmail.send) to send your email replies; Google Calendar read access (calendar.readonly) to check real availability for booking; and Google Calendar events access (calendar.events) to create, update, and cancel appointment events you book through {company}. We also use your basic account email (userinfo.email) to identify the connected account.",
      "Google Workspace data (Gmail and Calendar content) is used only to provide these user-facing features. It is never used to train, fine-tune, or improve generalized or foundational AI/ML models, and it is never sold or transferred to third parties for advertising or model-training purposes. When AI generates an email reply, the relevant message content is processed transiently through enterprise AI provider APIs that do not retain or train on that data, and the result is returned to your workspace.",
      "You can disconnect Gmail and Google Calendar at any time from Dashboard → Integrations, which revokes {company}'s stored access tokens. You can also revoke access directly from your Google Account security settings.",
    ],
  },
  {
    title: "Third-Party Service Providers",
    paragraphs: [
      "We rely on trusted infrastructure and integration partners to deliver the service, including Supabase (authentication, database, storage, and realtime), Resend (transactional email), Google (OAuth sign-in, Gemini AI, Gmail, Google Calendar, and website knowledge sync where enabled), OpenAI and Anthropic (optional fallback AI models when configured), Meta / 360dialog (WhatsApp Business messaging), Telegram (Bot API messaging), Twilio (voice and SMS when connected), ElevenLabs (optional text-to-speech for voice replies when enabled), Stripe (subscription billing when used), and hosting and queue providers that support application delivery.",
      "These providers process data according to their own terms and privacy policies and only as needed to provide the functionality you use. We do not sell personal information.",
    ],
  },
  {
    title: "Cookies and Similar Technologies",
    paragraphs: [
      "We use essential cookies and local storage required for authentication, session management, and security. We do not use third-party advertising cookies on the core application.",
    ],
  },
  {
    title: "Data Retention",
    paragraphs: [
      "We retain account and business data for as long as your account remains active or as needed to provide the service. When you delete your account, we delete associated application data from our systems, subject to limited retention required for security, fraud prevention, billing records, or legal compliance.",
    ],
  },
  {
    title: "International Transfers",
    paragraphs: [
      "Your information may be processed in countries other than your own, including where our service providers operate. We take steps designed to protect personal information in line with applicable law.",
    ],
  },
  {
    title: "Your Rights",
    paragraphs: [
      "Depending on your location, you may have the right to access, correct, delete, or restrict certain processing of your personal data, or to object to processing and request portability where applicable.",
      "You can delete your account in Dashboard → Settings or request assistance at {email}. We will respond to verified privacy requests within a reasonable timeframe.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We implement administrative, technical, and organizational safeguards designed to protect personal information, including encrypted connections, access controls, and row-level security in our database. No method of transmission or storage is completely secure.",
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "{company} is intended for business use and is not directed to children under 16. We do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The “Last updated” date at the top of this page indicates when it was last revised. Continued use of the service after changes become effective constitutes acceptance of the updated policy.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Privacy questions or requests: {email}.",
      "Last updated: {date}.",
    ],
  },
]);

const TERMS_SECTIONS = buildSections([
  {
    title: "Agreement",
    paragraphs: [
      "These Terms of Service (“Terms”) govern your access to and use of {company}, including our website, dashboard, APIs, integrations, and related services. By creating an account or using the service, you agree to these Terms and our Privacy Policy.",
    ],
  },
  {
    title: "Service Description",
    paragraphs: [
      "{company} provides a unified business communication workspace with AI-assisted messaging, CRM tools, knowledge management, calendar and booking features, analytics, and channel integrations such as WhatsApp, Telegram, Gmail, website forms, Google Calendar, and Twilio Voice where available.",
      "Features may evolve over time. We may add, modify, or discontinue functionality as the product develops.",
    ],
  },
  {
    title: "Eligibility and Account Responsibilities",
    paragraphs: ["You agree to:"],
    list: [
      "Provide accurate registration and business information and keep it up to date.",
      "Maintain the confidentiality of your login credentials and restrict access to authorized personnel.",
      "Use the service only for lawful business purposes.",
      "Comply with applicable messaging, telecom, email, privacy, and platform rules for each channel you connect, including Meta/WhatsApp, Telegram, Google, and Twilio policies.",
      "Ensure you have the legal right and any required consents to process customer data you upload, sync, or receive through {company}.",
      "Configure AI assistant permissions responsibly and review AI-generated output before relying on it for customer-facing decisions.",
    ],
  },
  {
    title: "Acceptable Use",
    paragraphs: ["You may not use {company} to:"],
    list: [
      "Send spam, unlawful, deceptive, harassing, or abusive communications.",
      "Infringe intellectual property, privacy, or other rights of third parties.",
      "Upload malware, attempt unauthorized access, or interfere with platform security or performance.",
      "Misuse API credentials, webhooks, or integrations.",
      "Use the service in a manner that violates applicable law or third-party platform terms.",
    ],
  },
  {
    title: "Customer Data and AI Content",
    paragraphs: [
      "You retain ownership of the business content and customer data you submit to the platform, subject to the rights needed for us to operate the service.",
      "AI responses are generated automatically based on your settings, knowledge base, and connected data. {company} does not guarantee that AI output will be accurate, complete, or suitable for every situation. You remain solely responsible for communications sent to your customers and for compliance with laws applicable to your business.",
    ],
  },
  {
    title: "Integrations and Third-Party Services",
    paragraphs: [
      "Certain features depend on third-party services you connect. We are not responsible for outages, policy changes, or acts of third-party providers. Your use of those services remains subject to their terms.",
    ],
  },
  {
    title: "Subscriptions and Billing",
    paragraphs: [
      "Free and paid plans may be offered. When paid plans are available, billing may be processed through Stripe according to the pricing shown in the product. Fees are non-refundable except where required by law or expressly stated otherwise.",
    ],
  },
  {
    title: "Availability and Support",
    paragraphs: [
      "We strive to maintain a reliable service but do not guarantee uninterrupted or error-free operation. Maintenance, updates, or events outside our control may affect availability.",
    ],
  },
  {
    title: "Termination",
    paragraphs: [
      "You may delete your account at any time from Dashboard → Settings or by following our User Data Deletion instructions. We may suspend or terminate access if you violate these Terms, create security or legal risk, or if required by law.",
      "Upon termination, your right to use the service ends. Provisions that by nature should survive termination will remain in effect.",
    ],
  },
  {
    title: "Disclaimer of Warranties",
    paragraphs: [
      "To the maximum extent permitted by law, {company} is provided on an “as is” and “as available” basis without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, {company} and its affiliates will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, or goodwill, arising from or related to your use of the service.",
      "Our aggregate liability for claims arising out of or relating to the service will not exceed the greater of (a) the amount you paid us for the service in the twelve months before the claim or (b) one hundred U.S. dollars, except where such limitation is prohibited by law.",
    ],
  },
  {
    title: "Governing Law",
    paragraphs: [
      "These Terms are governed by applicable law in the jurisdiction where {company} operates, without regard to conflict-of-law principles. Mandatory consumer protections in your country of residence remain unaffected where applicable.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Questions about these Terms: {email}.",
      "Last updated: {date}.",
    ],
  },
]);

const DATA_DELETION_SECTIONS = buildSections([
  {
    title: "Overview",
    paragraphs: [
      "This page explains how users of {company} can request deletion of their account and associated personal data. It is provided for account holders, platform reviewers, and integration partners such as Meta.",
      "If you are a customer of a business that uses {company}, contact that business directly to exercise rights relating to messages or bookings they hold about you.",
    ],
  },
  {
    title: "What Gets Deleted",
    paragraphs: [
      "When a business user deletes their {company} account, we delete the application data linked to that account, including:",
    ],
    list: [
      "User profile and authentication record.",
      "Business profile, logo files, and account settings.",
      "Knowledge base entries and website sync configuration.",
      "Contacts, conversations, messages, attachments, notes, and CRM deals.",
      "AI assistant settings, agent configuration, and related activity logs tied to the business.",
      "Calendar events, tasks, booking pages, bookable resources, and stored booking records.",
      "Connected integration credentials and configuration for WhatsApp, Telegram, Gmail, Google Calendar, Twilio, website forms, and similar channels.",
      "Voice call logs and related metadata associated with the business.",
      "Push notification subscriptions linked to the account.",
    ],
  },
  {
    title: "How to Delete Your Data in the App",
    paragraphs: ["To delete your account directly:"],
    list: [
      "Sign in to your {company} account.",
      "Open Dashboard → Settings.",
      "Go to the Delete Account section.",
      "Type DELETE to confirm and submit the request.",
      "You will be signed out and your application data will be permanently removed from our database, subject to the retention notes below.",
    ],
  },
  {
    title: "How to Request Deletion by Email",
    paragraphs: [
      "If you cannot access your account, email {email} from the address associated with your account. Include your full name, business name if applicable, and a clear request to delete your data. We may ask for additional verification before processing the request.",
    ],
  },
  {
    title: "Processing Time",
    paragraphs: [
      "In-app account deletion is processed immediately after successful confirmation. Email requests are typically completed within 30 days unless a longer period is required by law.",
    ],
  },
  {
    title: "Data Retained After Deletion",
    paragraphs: [
      "We may retain limited records where required for security, fraud prevention, billing disputes, tax compliance, or other legal obligations. Backup copies, if any, are purged according to our retention schedule.",
      "Deleting your {company} account does not automatically delete data held by third-party providers you connected (for example, messages already delivered through WhatsApp or email). Disconnect integrations before deletion where appropriate.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Data deletion questions: {email}.",
      "Last updated: {date}.",
    ],
  },
]);

export const DEFAULT_LEGAL_PAGES: Omit<LegalPageRecord, "id" | "updatedAt">[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: `Last updated: ${LEGAL_COMPANY.lastUpdated}`,
    footerLabel: "Privacy Policy",
    sections: PRIVACY_SECTIONS,
    sortOrder: 10,
    published: true,
    showInFooter: true,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    description: `Last updated: ${LEGAL_COMPANY.lastUpdated}`,
    footerLabel: "Terms of Service",
    sections: TERMS_SECTIONS,
    sortOrder: 20,
    published: true,
    showInFooter: true,
  },
  {
    slug: "data-deletion",
    title: "User Data Deletion",
    description: `How to request deletion of your account and data. Last updated: ${LEGAL_COMPANY.lastUpdated}`,
    footerLabel: "Data Deletion",
    sections: DATA_DELETION_SECTIONS,
    sortOrder: 30,
    published: true,
    showInFooter: true,
  },
];

export const RESERVED_LEGAL_SLUGS = new Set([
  "api",
  "auth",
  "book",
  "dashboard",
  "docs",
  "login",
  "logout",
  "register",
  "robots.txt",
  "sitemap.xml",
  "_next",
]);

export function isReservedLegalSlug(slug: string): boolean {
  return RESERVED_LEGAL_SLUGS.has(slug.toLowerCase());
}

export function legalPagePath(slug: string): string {
  return `/${slug}`;
}
