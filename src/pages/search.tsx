import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { gql, useQuery } from '@apollo/client';
import UniversalProductGrid from '../components/UniversalProductGrid';
import Pagination from '../components/apparel/Pagination';
import { Breadcrumbs } from '../components/ProductPage/Breadcrumbs';
import CategoryMobileFilterOverlay from '../components/CategoryMobileFilterOverlay';
import Navbar from '../components/nav/Navbar';
import SearchOverlay from '../components/SearchOverlay';
import { getBrandUrl } from '../utils/brandUtils';

// Remove console.log for professional deployment
// console.log('SEARCH PAGE FILE LOADED');

const ALL_SNEAKER_BRANDS = gql`
  query AllSneakerBrands {
    allSneakerBrands
  }
`;

const SNEAKERS_QUERY = gql`
  query Sneakers($search: String, $limit: Int, $offset: Int) {
    sneakers(search: $search, limit: $limit, offset: $offset) {
      id
      brand
      productName
      images
      productLink
      sizePrices { size price }
      soldOut
      sellerName
      sellerUrl
    }
  }
`;
const WATCHES_QUERY = gql`
  query Watches($search: String, $limit: Int, $offset: Int) {
    watches(search: $search, limit: $limit, offset: $offset) {
      id
      brand
      name
      images
      link
      color
      gender
      salePrice
      marketPrice
      sellerName
      sellerUrl
    }
  }
`;
const PERFUMES_QUERY = gql`
  query Perfumes($search: String, $limit: Int, $offset: Int) {
    perfumes(search: $search, limit: $limit, offset: $offset) {
      id
      brand
      title
      images
      url
      fragranceFamily
      concentration
      subcategory
      variants { size price }
      sellerName
      sellerUrl
    }
  }
`;
const ACCESSORIES_QUERY = gql`
  query Accessories($search: String, $limit: Int, $offset: Int) {
    accessories(search: $search, limit: $limit, offset: $offset) {
      id
      brand
      productName
      images
      productLink
      subcategory
      gender
      sizePrices { size price }
      inStock
      sellerName
      sellerUrl
    }
  }
`;
const APPAREL_QUERY = gql`
  query Apparel($search: String, $limit: Int, $offset: Int) {
    apparel(search: $search, limit: $limit, offset: $offset) {
      id
      brand
      productName
      images
      productLink
      subcategory
      gender
      sizePrices { size price }
      inStock
      sellerName
      sellerUrl
    }
  }
`;

const PAGE_SIZE = 16;

interface Product {
  id: string;
  brand: string;
  productName?: string;
  name?: string;
  title?: string;
  images?: string[];
  type?: string;
  subcategory?: string;
  gender?: string;
  fragranceFamily?: string;
  color?: string;
}

export default function SearchPage() {
  const router = useRouter();
  const queryParam = typeof router.query.query === 'string' ? router.query.query : '';
  const [search, setSearch] = useState(queryParam);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilter, setShowFilter] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Filter state
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedFragranceFamilies, setSelectedFragranceFamilies] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('New In');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOverlayTab, setMobileOverlayTab] = useState<'filter' | 'sort'>('filter');
  const [inStockOnly, setInStockOnly] = useState(false);
  const brandScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update search when query param changes
  useEffect(() => {
    setSearch(queryParam);
    setCurrentPage(1);
  }, [queryParam]);

  // Fetch all data for live search and counts (pass search to all queries)
  const { data: sneakersData } = useQuery(SNEAKERS_QUERY, { 
    variables: { 
      search: search || undefined,
      limit: 1000, // Show more products
      offset: 0
    } 
  });
  const { data: watchesData } = useQuery(WATCHES_QUERY, { 
    variables: { 
      search: search || undefined,
      limit: 1000,
      offset: 0
    } 
  });
  const { data: perfumesData } = useQuery(PERFUMES_QUERY, { 
    variables: { 
      search: search || undefined,
      limit: 1000,
      offset: 0
    } 
  });
  const { data: accessoriesData } = useQuery(ACCESSORIES_QUERY, { 
    variables: { 
      search: search || undefined,
      limit: 1000,
      offset: 0
    } 
  });
  const { data: apparelData } = useQuery(APPAREL_QUERY, { 
    variables: { 
      search: search || undefined,
      limit: 1000,
      offset: 0
    } 
  });
  const { data: brandsData } = useQuery(ALL_SNEAKER_BRANDS);

  // Build filter options from results
  const allProducts = useMemo(() => {
    let all: Product[] = [];
    all = all.concat((sneakersData?.sneakers || []).map((p: Product) => ({ ...p, type: 'Sneaker' })));
    all = all.concat((apparelData?.apparel || []).map((p: Product) => ({ ...p, type: 'Apparel' })));
    all = all.concat((accessoriesData?.accessories || []).map((p: Product) => ({ ...p, type: 'Accessory' })));
    all = all.concat((perfumesData?.perfumes || []).map((p: Product) => ({ ...p, type: 'Perfume' })));
    all = all.concat((watchesData?.watches || []).map((p: Product) => ({ ...p, type: 'Watch' })));
    return all;
  }, [sneakersData, apparelData, accessoriesData, perfumesData, watchesData]);

  // Extract unique filter values
  const brands = brandsData?.allSneakerBrands || [];
  
  // Auto-scroll brand ticker
  useEffect(() => {
    const startAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      
      autoScrollIntervalRef.current = setInterval(() => {
        const el = brandScrollRef.current;
        if (el) {
          el.scrollBy({ left: 200, behavior: 'smooth' });
          
          // Reset to beginning when reaching the end
          if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) {
            setTimeout(() => {
              el.scrollTo({ left: 0, behavior: 'smooth' });
            }, 1000);
          }
        }
      }, 3000); // Scroll every 3 seconds
    };

    startAutoScroll();

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [brands]);
  
  const subcategories = useMemo(() => {
    const values = allProducts.map(p => p.subcategory).filter((s): s is string => Boolean(s));
    return Array.from(new Set(values));
  }, [allProducts]);
  const genders = useMemo(() => {
    const values = allProducts.map(p => p.gender).filter((g): g is string => Boolean(g));
    return Array.from(new Set(values));
  }, [allProducts]);
  const fragranceFamilies = useMemo(() => {
    const values = allProducts.filter(p => p.type === 'Perfume').map(p => p.fragranceFamily).filter((f): f is string => Boolean(f));
    return Array.from(new Set(values));
  }, [allProducts]);
  const colors = useMemo(() => {
    const values = allProducts.filter(p => p.type === 'Watch').map(p => p.color).filter((c): c is string => Boolean(c));
    return Array.from(new Set(values));
  }, [allProducts]);

  // Filter products based on selected filters
  const filteredResults = useMemo(() => {
    return allProducts.filter(product => {
      if (selectedBrands.length && !selectedBrands.includes(product.brand)) return false;
      if (selectedSubcategories.length && product.subcategory && !selectedSubcategories.includes(product.subcategory)) return false;
      if (selectedGenders.length && product.gender && !selectedGenders.includes(product.gender)) return false;
      if (selectedFragranceFamilies.length && product.type === 'Perfume' && product.fragranceFamily && !selectedFragranceFamilies.includes(product.fragranceFamily)) return false;
      if (selectedColors.length && product.type === 'Watch' && product.color && !selectedColors.includes(product.color)) return false;
      return true;
    });
  }, [allProducts, selectedBrands, selectedSubcategories, selectedGenders, selectedFragranceFamilies, selectedColors]);

  // Pagination logic
  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);
  const paginatedResults = filteredResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Handlers for filter changes
  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
    setCurrentPage(1);
  };
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategories(prev => prev.includes(subcategory) ? prev.filter(s => s !== subcategory) : [...prev, subcategory]);
    setCurrentPage(1);
  };
  const handleGenderChange = (gender: string) => {
    setSelectedGenders(prev => prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]);
    setCurrentPage(1);
  };
  const handleFragranceFamilyChange = (fam: string) => {
    setSelectedFragranceFamilies(prev => prev.includes(fam) ? prev.filter(f => f !== fam) : [...prev, fam]);
    setCurrentPage(1);
  };
  const handleColorChange = (color: string) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
    setCurrentPage(1);
  };

  // Debug: Log what's happening
  useEffect(() => {
    // console.log('Search term:', search);
    // console.log('Sneakers data:', sneakersData?.sneakers?.length);
    // console.log('Perfumes data:', perfumesData?.perfumes?.length);
    // console.log('Watches data:', watchesData?.watches?.length);
    // console.log('Accessories data:', accessoriesData?.accessories?.length);
    // console.log('Apparel data:', apparelData?.apparel?.length);
  }, [search, sneakersData, perfumesData, watchesData, accessoriesData, apparelData]);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' },
    { label: search ? `"${search}"` : 'All' }
  ];

  return (
    <>
      {/* Navbar with blue icons and menu functionality */}
      <Navbar onSearchClick={() => setIsSearchOpen(true)} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Mobile UI */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f1f1', paddingTop: 2, overflowX: 'hidden' }}>
          <div style={{ padding: '0 16px', marginTop: 16 }}>
            <Breadcrumbs items={breadcrumbItems} />
          </div>
          
          {/* Mobile Brand Selector - Auto-moving */}
          <div style={{
            margin: '16px auto 0 auto',
            padding: '4px 16px 0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            overflowX: 'visible',
            minHeight: 48,
            marginBottom: 8,
            maxWidth: '100%',
          }}>
            {/* Brand buttons row with arrows - mobile optimized */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none', minHeight: 48, position: 'relative', maxWidth: '85vw' }}>
              <button
                aria-label="Scroll left"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 40,
                  marginRight: 2,
                }}
                onClick={() => {
                  const el = document.getElementById('brand-scroll-row-mobile');
                  if (el) el.scrollBy({ left: -120, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div id="brand-scroll-row-mobile" style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 'none', scrollbarWidth: 'none', msOverflowStyle: 'none', minHeight: 40, maxWidth: '75vw' }}>
                {brands.map((b: string) => (
                  <button
                    key={b}
                    onClick={() => handleBrandChange(b)}
                    style={{
                      border: selectedBrands.includes(b) ? '2px solid #22304a' : '2px solid #bfc9d1',
                      background: '#fff',
                      color: '#22304a',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontWeight: 500,
                      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      boxShadow: selectedBrands.includes(b) ? '0 2px 8px rgba(30,167,253,0.08)' : 'none',
                      borderBottom: selectedBrands.includes(b) ? '2.5px solid #0a2230' : '2.5px solid #bfc9d1',
                      minWidth: 100,
                      maxWidth: 160,
                      outline: 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                      height: 40,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={b}
                  >
                    <span style={{ display: 'block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b}</span>
                  </button>
                ))}
              </div>
              <button
                aria-label="Scroll right"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 40,
                  marginLeft: 2,
                }}
                onClick={() => {
                  const el = document.getElementById('brand-scroll-row-mobile');
                  if (el) el.scrollBy({ left: 120, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile Results Summary */}
          <div style={{
            padding: '16px 16px 8px 16px',
            background: '#f1f1f1',
            borderBottom: '1px solid #e0e0e0',
          }}>
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#22304a',
              textAlign: 'center',
              lineHeight: 1.4,
            }}>
              {search ? (
                <>
                  <span style={{ color: '#666' }}>Search results for </span>
                  <span style={{ color: '#22304a' }}>"{search}"</span>
                </>
              ) : (
                <span>All Products</span>
              )}
            </div>
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#666',
              textAlign: 'center',
              marginTop: 4,
            }}>
              {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'} found
            </div>
          </div>
          
          {/* Mobile Filter Button */}
          <div style={{
            position: 'sticky',
            top: 62,
            zIndex: 50,
            background: '#f1f1f1',
            width: '100%',
            maxWidth: '100vw',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 0 0 0',
            minHeight: 54,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '0 2px 8px rgba(30,167,253,0.04)'
          }}>
            <button
              style={{
                background: 'none',
                border: '1px solid #22304a',
                color: '#22304a',
                fontSize: '1.13rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'Montserrat',
                padding: '10px 16px',
                borderRadius: 8,
              }}
              onClick={() => setShowFilter(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              Sort & Filter
            </button>
          </div>
          
          {/* Mobile Filter Overlay */}
          <CategoryMobileFilterOverlay
            show={showFilter}
            onClose={() => setShowFilter(false)}
            tab={mobileOverlayTab}
            setTab={setMobileOverlayTab}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            brands={brands}
            selectedBrands={selectedBrands}
            onBrandChange={handleBrandChange}
            subcategories={subcategories}
            selectedSubcategories={selectedSubcategories}
            onSubcategoryChange={handleSubcategoryChange}
            genders={genders}
            selectedGenders={selectedGenders}
            onGenderChange={handleGenderChange}
            fragranceFamilies={fragranceFamilies}
            selectedFragranceFamilies={selectedFragranceFamilies}
            onFragranceFamilyChange={handleFragranceFamilyChange}
            colors={colors}
            selectedColors={selectedColors}
            onColorChange={handleColorChange}
            inStockOnly={inStockOnly}
            onInStockChange={setInStockOnly}
          />
          
          {/* Mobile Product Grid */}
          <div style={{ width: '100%', padding: '0 8px', marginTop: 0 }}>
            <UniversalProductGrid 
              products={paginatedResults}
              loading={
                sneakersData === undefined || watchesData === undefined || perfumesData === undefined || accessoriesData === undefined || apparelData === undefined
              }
              isMobile={true}
            />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      ) : (
        <>
          {/* Desktop UI */}
          {/* Add a large top margin so nothing is hidden behind the fixed Navbar */}
          <div style={{ maxWidth: 1500, margin: '0 auto', padding: '104px 32px 0 32px' }}>
            <Breadcrumbs items={breadcrumbItems} />
          </div>
          {/* Brand bar with arrows and Hide Filter, matching SneakerBrandProductPage */}
          <div style={{
            maxWidth: 1500,
            margin: '0 auto',
            padding: '12px 32px 0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            overflowX: 'visible',
            minHeight: 56,
            marginBottom: 18,
          }}>
            {/* Brand buttons row with arrows */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none', minHeight: 56, position: 'relative', maxWidth: '80vw' }}>
              <button
                aria-label="Scroll left"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 48,
                  marginRight: 4,
                }}
                onClick={() => {
                  const el = brandScrollRef.current;
                  if (el) el.scrollBy({ left: -180, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 28, height: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div ref={brandScrollRef} id="brand-scroll-row" style={{ display: 'flex', gap: 14, overflowX: 'auto', flex: 'none', scrollbarWidth: 'none', msOverflowStyle: 'none', minHeight: 48, maxWidth: '70vw' }}>
                {brands.map((b: string) => (
                  <button
                    key={b}
                    onClick={() => {
                      // On search page, filter by brand (toggle in selectedBrands)
                      handleBrandChange(b);
                    }}
                    style={{
                      border: selectedBrands.includes(b) ? '2px solid #22304a' : '2px solid #bfc9d1',
                      background: '#fff',
                      color: '#22304a',
                      borderRadius: 8,
                      padding: '8px 18px',
                      fontWeight: 500,
                      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: selectedBrands.includes(b) ? '0 2px 8px rgba(30,167,253,0.08)' : 'none',
                      borderBottom: selectedBrands.includes(b) ? '2.5px solid #0a2230' : '2.5px solid #bfc9d1',
                      minWidth: 200,
                      maxWidth: 400,
                      outline: 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                      height: 48,
                      margin: 0,
                      marginBottom: 0,
                      marginTop: 0,
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={b}
                  >
                    <span style={{ display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b}</span>
                  </button>
                ))}
              </div>
              <button
                aria-label="Scroll right"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 48,
                  marginLeft: 4,
                }}
                onClick={() => {
                  const el = brandScrollRef.current;
                  if (el) el.scrollBy({ left: 180, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 28, height: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
            {/* Hide Filter button, fixed at end */}
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#22304a',
                fontSize: '1.13rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'Montserrat',
                marginLeft: 16,
                whiteSpace: 'nowrap',
                height: 40,
                flex: 'none',
              }}
              onClick={() => setShowFilter(f => !f)}
              aria-label={showFilter ? 'Hide Filters' : 'Show Filters'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24, marginRight: 2 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              Hide Filters
            </button>
          </div>
          {/* Main content row: filter + cards grid */}
          <div style={{ display: 'flex', width: '100%', maxWidth: '100%', margin: 0, alignItems: 'flex-start', paddingTop: 0, position: 'relative' }}>
            <div style={{ position: 'sticky', top: 117, alignSelf: 'flex-start', zIndex: 20, height: 'calc(100vh - 117px)', overflowY: 'auto', marginTop: 0, marginLeft: 14, paddingTop: 0, background: '#f8f9fa' }}>
              <CategoryMobileFilterOverlay
                show={showFilter}
                onClose={() => setShowFilter(false)}
                tab={mobileOverlayTab}
                setTab={setMobileOverlayTab}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                brands={brands}
                selectedBrands={selectedBrands}
                onBrandChange={handleBrandChange}
                subcategories={subcategories}
                selectedSubcategories={selectedSubcategories}
                onSubcategoryChange={handleSubcategoryChange}
                genders={genders}
                selectedGenders={selectedGenders}
                onGenderChange={handleGenderChange}
                fragranceFamilies={fragranceFamilies}
                selectedFragranceFamilies={selectedFragranceFamilies}
                onFragranceFamilyChange={handleFragranceFamilyChange}
                colors={colors}
                selectedColors={selectedColors}
                onColorChange={handleColorChange}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
              />
            </div>
            <div style={{ flex: 1, padding: '0 32px', marginTop: -30 }}>
              <UniversalProductGrid 
                products={paginatedResults}
                loading={
                  sneakersData === undefined || watchesData === undefined || perfumesData === undefined || accessoriesData === undefined || apparelData === undefined
                }
                isMobile={false}
              />
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        </>
      )}
    </>
  );
} 