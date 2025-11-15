import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "AvidiaTech App",
  description: "Product Data Automation SaaS Platform",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
