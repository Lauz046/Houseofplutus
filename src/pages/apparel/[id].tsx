import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ProductPage } from '../../components/ProductPage/ProductPage';

export default function ApparelProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchProduct = async () => {
      try {
        console.log('🔍 Fetching apparel with ID:', id);
        
        const response = await fetch('https://houseofplutus.onrender.com/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query ApparelItem($id: ID!) {
                apparelItem(id: $id) {
                  id
                  brand
                  productName
                  subcategory
                  gender
                  sizePrices { size price }
                  images
                  inStock
                  productLink
                  sellerName
                  sellerUrl
                }
              }
            `,
            variables: { id },
          }),
        });

        if (!response.ok) {
          throw new Error(`GraphQL request failed with status: ${response.status}`);
        }

        const result = await response.json();
        console.log('📦 Apparel data received:', result);

        if (!result.data?.apparelItem) {
          throw new Error('Product not found');
        }

        setProduct(result.data.apparelItem);
      } catch (err) {
        console.error('💥 Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        minHeight: '50vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <div style={{ fontSize: '1.2rem', color: '#666' }}>Loading product...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        minHeight: '50vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>Product Not Found</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>
          Sorry, the product you're looking for doesn't exist or has been removed.
        </p>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>
          Product ID: {id}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#999', maxWidth: '600px', wordBreak: 'break-word' }}>
          Error: {error}
        </p>
        <a 
          href="/apparel" 
          style={{ 
            marginTop: '2rem', 
            padding: '12px 24px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '6px',
            fontSize: '1rem'
          }}
        >
          Browse All Apparel
        </a>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        minHeight: '50vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>Product Not Found</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>
          Sorry, the product you're looking for doesn't exist or has been removed.
        </p>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>
          Product ID: {id}
        </p>
        <a 
          href="/apparel" 
          style={{ 
            marginTop: '2rem', 
            padding: '12px 24px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '6px',
            fontSize: '1rem'
          }}
        >
          Browse All Apparel
        </a>
      </div>
    );
  }

  return <ProductPage productId={typeof id === 'string' ? id : ''} productType="apparel" product={product} />;
} 