import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PathoAtlas - 病理知识图谱",
  description: "全面、结构化、可交互的病理学个人学习平台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <input type="checkbox" id="theme-toggle" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var k='pathoatlas-theme',t=document.getElementById('theme-toggle');if(!t)return;var s=null;try{s=localStorage.getItem(k)}catch(e){}if(s==='light')t.checked=true;else if(s==='dark')t.checked=false;else t.checked=!(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches);t.addEventListener('change',function(){try{localStorage.setItem(k,this.checked?'light':'dark')}catch(e){}})})();` }} />
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
