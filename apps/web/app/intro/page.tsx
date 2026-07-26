"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";

const CustomDatabase = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L2 8L12 13L22 8L12 3Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 13L12 18L22 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 18L12 23L22 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CustomNetwork = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="19" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="5" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M17.5 7.5L14 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6.5 8.5L9.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16.5 17.5L13.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7.5 16.5L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CustomCube = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7V17L12 22V12L2 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 7V17L12 22V12L22 7Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CustomScan = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 7V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 11H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -15 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    rotate: 0,
    transition: { type: "spring", stiffness: 200, damping: 10 }
  },
};

export default function IntroPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-['Inter',sans-serif] overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full flex items-center justify-between px-8 py-6 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Image 
            src="/dox.svg" 
            alt="Dox Logo" 
            width={40} 
            height={40} 
            className="w-10 h-10 object-contain shadow-sm rounded-lg"
          />
          <span className="font-semibold text-2xl tracking-tight">Dox</span>
        </div>
        <div>
          <SignInButton forceRedirectUrl="/">
            <Button variant="ghost" className="font-medium hover:bg-accent text-foreground mr-2">
              Log in
            </Button>
          </SignInButton>
          <SignUpButton forceRedirectUrl="/">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-medium">
              Get Started
            </Button>
          </SignUpButton>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32 flex flex-col items-center justify-center min-h-[80vh]">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl w-full relative z-10"
        >
          <motion.div variants={itemVariants} className="mb-6 flex justify-center">
            <span className="px-4 py-1.5 rounded-full bg-card border border-border text-xs font-semibold text-primary tracking-wider uppercase shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Welcome to the future of context
            </span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-8"
          >
            Your ultimate <span className="text-primary relative inline-block">
              knowledge
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
                className="absolute w-full h-3 -bottom-2 left-0 text-primary/30"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
              </motion.svg>
            </span> engine.
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto font-light"
          >
            Seamlessly connect your documents, research notes, and creative thoughts. Build an intelligent graph of everything that matters.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignUpButton forceRedirectUrl="/">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all group">
                Start Building Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </SignUpButton>
          </motion.div>
        </motion.div>

        {/* Floating Abstract Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          {/* Decorative lines/circles in background */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/5 rounded-full"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.5, ease: "easeOut", delay: 0.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-primary/5 rounded-full"
          />

          {/* Floating Icons */}
          <motion.div 
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="absolute top-[20%] left-[15%] w-16 h-16 bg-card shadow-xl border border-border rounded-2xl flex items-center justify-center text-primary"
            style={{ y: typeof window !== 'undefined' ? 0 : 0 }} // Simple way to ensure hydration matches
          >
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <CustomDatabase />
            </motion.div>
          </motion.div>

          <motion.div 
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="absolute top-[30%] right-[15%] w-20 h-20 bg-primary shadow-xl shadow-primary/20 rounded-2xl flex items-center justify-center text-primary-foreground"
          >
            <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
              <CustomNetwork />
            </motion.div>
          </motion.div>

          <motion.div 
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="absolute bottom-[25%] left-[25%] w-14 h-14 bg-card shadow-lg border border-border rounded-xl flex items-center justify-center text-muted-foreground"
          >
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
              <CustomCube />
            </motion.div>
          </motion.div>

          <motion.div 
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="absolute bottom-[20%] right-[25%] w-16 h-16 bg-card shadow-lg border border-border rounded-full flex items-center justify-center text-primary"
          >
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
              <CustomScan />
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
