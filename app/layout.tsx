import type { Metadata } from "next";
import "./globals.css";

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME?.trim();

export const metadata: Metadata = {
  title: companyName ? `${companyName} — Resume Shortlisting` : "Resume Shortlisting",
  description:
    "Score and shortlist resumes against a role's skills, experience and education criteria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
