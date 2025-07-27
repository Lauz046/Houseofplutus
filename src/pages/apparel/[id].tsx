import { GetServerSideProps } from 'next';
import { ProductPage } from '../../components/ProductPage/ProductPage';

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { id } = context.params!;
    
    console.log('🔍 Fetching apparel with ID:', id);
    
    // Use fetch instead of Apollo client for SSR to avoid module issues
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
      console.error('❌ GraphQL request failed:', response.status);
      return {
        notFound: true,
      };
    }

    const result = await response.json();
    console.log('📦 Apparel data received:', JSON.stringify(result, null, 2));

    // If no product found, return 404
    if (!result.data?.apparelItem) {
      console.log('❌ No apparel found for ID:', id);
      return {
        notFound: true,
      };
    }

    console.log('✅ Successfully processed apparel data');
    return {
      props: {
        apparel: result.data.apparelItem,
        productId: id,
        productType: 'apparel',
      },
    };
  } catch (error) {
    console.error('💥 Error in getServerSideProps:', error);
    return {
      notFound: true,
    };
  }
};

export default function ApparelProductSSRPage(props: any) {
  return <ProductPage {...props} />;
} 