import { GetServerSideProps } from 'next';
import { ProductPage } from '../../components/ProductPage/ProductPage';

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    console.log('🚀 Starting getServerSideProps for sneaker page');
    console.log('📝 Params:', context.params);
    
    const { id } = context.params!;
    
    // Debug environment variables
    console.log('🔧 Environment variables:', {
      NEXT_PUBLIC_GRAPHQL_ENDPOINT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
      NODE_ENV: process.env.NODE_ENV,
    });
    
    console.log('🔍 Fetching sneaker with ID:', id);
    
    // Use fetch instead of Apollo client for SSR to avoid module issues
    const response = await fetch('https://houseofplutus.onrender.com/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query Sneaker($id: ID!) {
            sneaker(id: $id) {
              id
              brand
              productName
              sizePrices { size price }
              images
              soldOut
              sellerName
              sellerUrl
              productLink
            }
          }
        `,
        variables: { id },
      }),
    });

    if (!response.ok) {
      console.error('❌ GraphQL request failed:', response.status);
      return {
        props: {
          error: `GraphQL request failed with status: ${response.status}`,
          productId: id,
          productType: 'sneaker',
        },
      };
    }

    const result = await response.json();
    console.log('📦 Sneaker data received:', JSON.stringify(result, null, 2));

    // If no product found, return 404
    if (!result.data?.sneaker) {
      console.log('❌ No sneaker found for ID:', id);
      return {
        notFound: true,
      };
    }

    console.log('✅ Successfully processed sneaker data');
    return {
      props: {
        sneaker: result.data.sneaker,
        productId: id,
        productType: 'sneaker',
      },
    };
  } catch (error) {
    console.error('💥 Error in getServerSideProps:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a more graceful error response
    return {
      props: {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: context.params?.id,
        productType: 'sneaker',
        errorDetails: error instanceof Error ? error.stack : 'No stack trace',
      },
    };
  }
};

export default function SneakerProductSSRPage(props: any) {
  // Handle SSR error
  if (props.error) {
    console.error('💥 SSR Error:', props.error);
    console.error('💥 Error Details:', props.errorDetails);
    return (
      <div style={{ padding: '20px', textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>Product Not Found</h1>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>
          Sorry, the product you're looking for doesn't exist or has been removed.
        </p>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>
          Product ID: {props.productId}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#999', maxWidth: '600px', wordBreak: 'break-word' }}>
          Error: {props.error}
        </p>
        <a 
          href="/sneaker" 
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
          Browse All Sneakers
        </a>
      </div>
    );
  }
  
  return <ProductPage {...props} />;
} 