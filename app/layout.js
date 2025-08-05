import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PagesProvider } from "./Components/utils/context/PagesContext";
import { AuthProvider } from "../contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Glowww",
  description: "Powered byGlowww",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PagesProvider>
            {children}
          </PagesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
