import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Tech Interview Solutions Archive",
  description: "Archived solutions for technical interview questions.",
  robots: "index, follow", // Allow LLM crawlers to index this
};

export default function ArchiveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

