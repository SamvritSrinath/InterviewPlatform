import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "API documentation for technical interview problems.",
  robots: "index, follow",
};

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

