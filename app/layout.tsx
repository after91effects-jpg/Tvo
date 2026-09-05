import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { NotificationProvider } from '../context/NotificationContext';
import { WishlistProvider } from '../context/WishlistContext';

export const metadata: Metadata = {
  title: 'Tvo flavours | Artisan Cakes, Celebrations & Express Bakery Delivery',
  description: 'Full-stack artisan cake delivery platform and Chef Administrator dashboard with live orders, WooCommerce-compatible catalog management, CSV import/export, and real-time operations.',
  openGraph: {
    title: 'Tvo flavours | Artisan Cakes, Celebrations & Express Bakery Delivery',
    description: 'Full-stack artisan cake delivery platform and Chef Administrator dashboard with live orders, WooCommerce-compatible catalog management, CSV import/export, and real-time operations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tvo flavours | Artisan Cakes, Celebrations & Express Bakery Delivery',
    description: 'Full-stack artisan cake delivery platform and Chef Administrator dashboard with live orders, WooCommerce-compatible catalog management, CSV import/export, and real-time operations.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('confetto_theme');
                  var theme = (saved === 'light' || saved === 'dark') ? saved : 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] antialiased selection:bg-[var(--primary)]/25 selection:text-[var(--primary)]" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <WishlistProvider>
                <CartProvider>
                  {children}
                </CartProvider>
              </WishlistProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
