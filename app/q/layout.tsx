import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Problem Solution",
  description: "View detailed solution for this technical interview problem.",
  robots: "index, follow",
};

export default function QuestionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-800">Tech Interview Solutions Archive</h1>
        </div>
      </header>
      <main className="flex-grow max-w-4xl mx-auto w-full p-6">
        {children}
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Tech Interview Solutions Archive. All rights reserved.</p>
      </footer>
    </div>
  );
}

