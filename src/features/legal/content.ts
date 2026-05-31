import { LEGAL_COMPANY } from "@/features/legal/constants";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

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

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = buildSections([
  {
    title: "Introduction",
    paragraphs: [
      "{company} (“we”, “us”, “our”) provides an AI-powered WhatsApp assistant platform for small businesses. This Privacy Policy explains how we collect, use, store, and protect personal information when you use our website and services.",
      "By creating an account or using {company}, you agree to this Privacy Policy.",
    ],
  },
  {
    title: "Information We Collect",
    paragraphs: ["We may collect the following categories of information:"],
    list: [
      "Account information such as name, email address, authentication provider, and profile avatar.",
      "Business profile information including business name, description, contact details, and uploaded logo.",
      "WhatsApp integration data such as connected phone numbers and message metadata required to deliver the service.",
      "Customer conversation data including contacts, messages, and AI-generated replies processed on your behalf.",
      "Knowledge base content you upload to train your AI assistant.",
      "Usage and analytics data such as message counts, contact counts, and AI response metrics.",
      "Technical data such as IP address, browser type, and device information collected through standard web logs.",
    ],
  },
  {
    title: "How We Use Information",
    paragraphs: ["We use personal information to:"],
    list: [
      "Provide, operate, and maintain the {company} platform.",
      "Authenticate users and secure accounts.",
      "Connect and manage WhatsApp integrations.",
      "Generate AI-assisted replies using your business knowledge base.",
      "Send transactional emails such as verification and password reset messages.",
      "Improve product performance, reliability, and security.",
      "Comply with legal obligations and respond to lawful requests.",
    ],
  },
  {
    title: "Third-Party Services",
    paragraphs: [
      "We use trusted third-party providers to deliver core functionality, including Supabase (database and authentication), Resend (email delivery), Google Gemini (AI responses), Meta WhatsApp Cloud API (messaging), and Google OAuth (sign-in). These providers process data according to their own privacy policies and our data processing agreements where applicable.",
    ],
  },
  {
    title: "Data Retention",
    paragraphs: [
      "We retain account and business data for as long as your account remains active or as needed to provide the service. When you delete your account, we delete associated personal data from our systems, subject to limited retention required for security, fraud prevention, or legal compliance.",
    ],
  },
  {
    title: "Your Rights",
    paragraphs: ["Depending on your location, you may have the right to:"],
    list: [
      "Access the personal data we hold about you.",
      "Request correction of inaccurate data.",
      "Request deletion of your account and associated data.",
      "Withdraw consent where processing is based on consent.",
      "Contact us at {email} for privacy-related requests.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We implement administrative, technical, and organizational measures designed to protect personal information, including encrypted connections, access controls, and row-level security in our database. No method of transmission or storage is completely secure.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "If you have questions about this Privacy Policy, contact us at {email}.",
      "Last updated: {date}.",
    ],
  },
]);

export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = buildSections([
  {
    title: "Agreement",
    paragraphs: [
      "These Terms of Service (“Terms”) govern your access to and use of {company}. By creating an account or using our services, you agree to these Terms and our Privacy Policy.",
    ],
  },
  {
    title: "Service Description",
    paragraphs: [
      "{company} helps businesses manage WhatsApp conversations using AI-assisted replies trained on business-provided knowledge. Features may change over time as we improve the platform.",
    ],
  },
  {
    title: "Account Responsibilities",
    paragraphs: ["You agree to:"],
    list: [
      "Provide accurate account and business information.",
      "Maintain the confidentiality of your login credentials.",
      "Use the service only for lawful business purposes.",
      "Comply with WhatsApp, Meta, and applicable messaging regulations.",
      "Ensure you have the right to process customer data you upload or connect.",
    ],
  },
  {
    title: "Acceptable Use",
    paragraphs: ["You may not use {company} to:"],
    list: [
      "Send spam, unlawful, abusive, or deceptive messages.",
      "Violate intellectual property or privacy rights.",
      "Attempt to bypass security controls or access unauthorized data.",
      "Reverse engineer or misuse API credentials or integrations.",
    ],
  },
  {
    title: "AI-Generated Content",
    paragraphs: [
      "AI responses are generated automatically based on your settings and knowledge base. You remain responsible for reviewing AI output and ensuring it is appropriate for your customers and compliant with applicable laws.",
    ],
  },
  {
    title: "Subscription and Availability",
    paragraphs: [
      "We may offer free or paid plans in the future. We strive to maintain reliable service but do not guarantee uninterrupted availability.",
    ],
  },
  {
    title: "Termination",
    paragraphs: [
      "You may delete your account at any time from Settings or by following our User Data Deletion instructions. We may suspend or terminate access if you violate these Terms or if required by law.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, {company} is provided “as is” without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from use of the service.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Questions about these Terms may be sent to {email}.",
      "Last updated: {date}.",
    ],
  },
]);

export const DATA_DELETION_SECTIONS: LegalSection[] = buildSections([
  {
    title: "Overview",
    paragraphs: [
      "This page explains how users of {company} can request deletion of their account and associated personal data. This information is provided for users, platform reviewers, and integration partners such as Meta.",
    ],
  },
  {
    title: "What Gets Deleted",
    paragraphs: ["When you delete your account, we remove:"],
    list: [
      "Your user profile and authentication record.",
      "Your business profile and uploaded logo.",
      "Knowledge base entries, contacts, conversations, and messages.",
      "WhatsApp connection credentials stored for your business.",
      "AI assistant settings and analytics associated with your business.",
    ],
  },
  {
    title: "How to Delete Your Data In the App",
    paragraphs: ["To delete your account directly:"],
    list: [
      "Sign in to your {company} account.",
      "Open Dashboard → Settings.",
      "Scroll to the Delete Account section.",
      "Type DELETE to confirm and submit the request.",
      "You will be signed out and your data will be permanently removed from our application database.",
    ],
  },
  {
    title: "How to Request Deletion by Email",
    paragraphs: [
      "If you cannot access your account, email {email} from the address associated with your account. Include your full name, business name if applicable, and a request to delete your data. We may ask for additional verification before processing the request.",
    ],
  },
  {
    title: "Processing Time",
    paragraphs: [
      "In-app account deletion is processed immediately. Email requests are typically completed within 30 days unless a longer period is required by law.",
    ],
  },
  {
    title: "Data Retained After Deletion",
    paragraphs: [
      "We may retain limited records where required for security, fraud prevention, billing disputes, or legal compliance. Backup copies, if any, are purged according to our retention schedule.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "For data deletion questions, contact {email}.",
      "Last updated: {date}.",
    ],
  },
]);
