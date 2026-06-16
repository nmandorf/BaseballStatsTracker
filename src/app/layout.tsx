import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "firebaseui/dist/firebaseui.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baseball Stat Tracker",
  description: "Mobile-first baseball stat tracking app scaffold.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
