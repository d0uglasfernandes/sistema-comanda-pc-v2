import { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Buscar dados do tenant para metadata
  let tenantName: string | undefined;
  
  try {
    const headersList = await headers();
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tenant`, {
      headers: {
        cookie: headersList.get('cookie') || '',
      },
      cache: 'no-store',
    });
    
    if (response.ok) {
      const tenantData = await response.json();
      tenantName = tenantData.name;
    }
  } catch (error) {
    console.error('Failed to fetch tenant data for metadata:', error);
  }
  
  const metadata: Metadata = {
    title: tenantName ? `${tenantName} - Sistema de Comandas` : "Sistema de Comandas de Bar",
    description: tenantName ? `Sistema completo para gerenciamento de comandas do ${tenantName}` : "Sistema completo para gerenciamento de comandas de bar com multi-tenant",
  };

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const finalTheme = theme || systemTheme;
                  document.documentElement.classList.add(finalTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}