// components/landing/Footer.tsx
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {currentYear} Mydbportal Database Studio. All rights reserved.
        </p>
        <div className="flex items-center gap-x-6 text-sm font-medium text-gray-600 dark:text-gray-300">
          <Link href="/studio" className="hover:text-blue-500">
            Studio
          </Link>
          <a
            href="https://github.com/bonheur15/master-database-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
