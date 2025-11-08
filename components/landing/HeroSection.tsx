"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="container mx-auto flex h-[calc(100vh-20rem)]  md:h-[calc(100vh-30rem)] max-w-5xl flex-col items-center justify-center px-4 text-center">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
          Mydbportal Database Studio.
          <br />
          <span className="text-4xl text-gray-900 dark:text-white">
            Simple, Secure, and Open-Source.
          </span>
        </h1>
      </motion.div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 max-w-2xl text-lg leading-8 text-gray-700 dark:text-gray-300"
      >
        Connect, query, and manage any database with one sleek tool. Your
        credentials are encrypted and stored locally.{" "}
        <b className="font-semibold text-gray-900 dark:text-white">
          No servers, no tracking, completely free.
        </b>
      </motion.p>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-10 flex items-center justify-center gap-x-4"
      >
        <Button asChild size="lg" className="rounded-lg ">
          <Link href="/studio">
            Launch Studio <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-lg border-gray-300 text-gray-800 hover:text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Link
            href="https://github.com/bonheur15/master-database-studio"
            target="_blank"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-5 w-5 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1 2.2-.7 2.7-1.1.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.5.1-3 0 0 .9-.3 3 .1a10 10 0 0 1 5.5 0c2.1-.4 3-.1 3-.1.6 1.5.2 2.7.1 3 .7.8 1.1 1.8 1.1 3 0 4.4-2.7 5.4-5.3 5.7.4.3.8 1 .8 2v3c0 .4.2.7.8.6a10.9 10.9 0 0 0 7.9-10.9C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            View on GitHub
          </Link>
        </Button>
      </motion.div>
    </section>
  );
}
