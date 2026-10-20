import type { Metadata } from "next";
import "./globals.css";
import { DinoRoamer } from "@/components/dino-roamer";

export const metadata: Metadata = {
  title: "Nomi",
  description: "Team chat, projects, and tasks",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `try{if(localStorage.getItem("nomi-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <DinoRoamer />
      </body>
    </html>
  );
}
