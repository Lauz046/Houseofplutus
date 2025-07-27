import { GetServerSideProps } from 'next';
import { initializeApollo } from '../../lib/apolloClient';
import { ProductPage } from '../../components/ProductPage/ProductPage';
import { gql } from '@apollo/client';

const SNEAKER_QUERY = gql`
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
`;

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    console.log('🚀 Starting getServerSideProps for sneaker page');
    console.log('📝 Params:', context.params);
    
    const apolloClient = initializeApollo();
    const { id } = context.params!;
    
    // Debug environment variables
    console.log('🔧 Environment variables:', {
      NEXT_PUBLIC_GRAPHQL_ENDPOINT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
      NODE_ENV: process.env.NODE_ENV,
    });
    
    console.log('🔍 Fetching sneaker with ID:', id);
    
    // Test the Apollo client connection first
    try {
      const testQuery = await apolloClient.query({
        query: gql`{ __typename }`,
      });
      console.log('✅ Apollo client connection test successful');
    } catch (testError) {
      console.error('❌ Apollo client connection test failed:', testError);
      throw testError;
    }
    
    const { data } = await apolloClient.query({
      query: SNEAKER_QUERY,
      variables: { id },
    });

    console.log('📦 Sneaker data received:', JSON.stringify(data, null, 2));

    // If no product found, return 404
    if (!data.sneaker) {
      console.log('❌ No sneaker found for ID:', id);
      return {
        notFound: true,
      };
    }

    console.log('✅ Successfully processed sneaker data');
    return {
      props: {
        sneaker: data.sneaker,
        productId: id,
        productType: 'sneaker',
        initialApolloState: apolloClient.cache.extract(),
      },
    };
  } catch (error) {
    console.error('💥 Error in getServerSideProps:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Check if it's a "not found" error
    if (error instanceof Error && error.message.includes('not found')) {
      console.log('📝 Returning 404 for not found error');
      return {
        notFound: true,
      };
    }
    
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