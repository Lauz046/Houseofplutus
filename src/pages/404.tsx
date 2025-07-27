import Link from 'next/link';

export default function Custom404() {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f8f9fa'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#333' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>Page Not Found</h2>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem', maxWidth: '500px' }}>
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{ 
          padding: '12px 24px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '6px',
          fontSize: '1rem'
        }}>
          Go Home
        </Link>
        <Link href="/sneaker" style={{ 
          padding: '12px 24px', 
          backgroundColor: '#28a745', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '6px',
          fontSize: '1rem'
        }}>
          Browse Sneakers
        </Link>
      </div>
    </div>
  );
} 