import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title:
    "Mydbportal Studio | Open Source Database Studio for MongoDB, MySQL & PostgreSQL",
  description:
    "Mydbportal Studio is an open-source database management tool for developers. Connect, explore, and manage MongoDB, MySQL, and PostgreSQL with a modern, fast, and easy-to-use interface. Free and self-hostable.",
  keywords: [
    "open source database studio",
    "MongoDB GUI",
    "MySQL client",
    "PostgreSQL tool",
    "database management",
    "SQL GUI",
    "Free database",
    "Free postgres",
    "Free mysql",
    "NoSQL GUI",
    "DB admin tool",
  ],
  openGraph: {
    title:
      "Mydbportal Studio — Open Source DB Management for MongoDB, MySQL & PostgreSQL",
    description:
      "A modern open-source database studio. Manage MongoDB, MySQL, and PostgreSQL with ease. Free, self-hostable, and built for developers.",
    url: "https://studio.mydbportal.com/",
    siteName: "Portal Studio",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
