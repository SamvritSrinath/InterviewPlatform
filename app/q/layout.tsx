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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

