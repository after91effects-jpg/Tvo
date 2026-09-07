import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { NotificationProvider } from '../context/NotificationContext';
import { WishlistProvider } from '../context/WishlistContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://tvoflavours.com'),
  title: {
    default: 'TVO Flavours | The All-in-one Bakery Shop',
    template: '%s | TVO Flavours',
  },
  description:
    'TVO Flavours is the all-in-one bakery shop in Gurugram, Haryana, offering artisan cakes, pastries, chocolates and celebration hampers. Call +91 76782 59522 or write to hello@tvoflavours.com.',
  applicationName: 'TVO Flavours',
  authors: [{ name: 'TVO Flavours' }],
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'TVO Flavours',
    title: 'TVO Flavours | The All-in-one Bakery Shop',
    description:
      'The all-in-one bakery shop in Gurugram, Haryana — artisan cakes, pastries, chocolates and celebration hampers for every occasion.',
    url: 'https://tvoflavours.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TVO Flavours | The All-in-one Bakery Shop',
    description:
      'The all-in-one bakery shop in Gurugram, Haryana — artisan cakes, pastries, chocolates and celebration hampers for every occasion.',
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Bakery',
              '@id': 'https://tvoflavours.com/#bakery',
              name: 'TVO Flavours',
              description: 'The All-in-one Bakery Shop.',
              url: 'https://tvoflavours.com',
              telephone: '+91 76782 59522',
              email: 'hello@tvoflavours.com',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Vipul World, Sector 48',
                addressLocality: 'Gurugram',
                addressRegion: 'Haryana',
                postalCode: '122001',
                addressCountry: 'IN',
              },
              fssai: '20824005005006',
            }),
          }}
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
