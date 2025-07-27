import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gql, useQuery } from '@apollo/client';
import styles from './Footer.module.css';
import { useRouter } from 'next/router';

const ALL_SNEAKER_BRANDS = gql`
  query AllSneakerBrands {
    allSneakerBrands
  }
`;

const ALL_PERFUME_BRANDS = gql`
  query AllPerfumeBrands {
    allPerfumeBrands
  }
`;

const ALL_WATCH_BRANDS = gql`
  query AllWatchBrands {
    allWatchBrands
  }
`;

const ALL_APPAREL_BRANDS = gql`
  query AllApparelBrands {
    allApparelBrands
  }
`;

const Footer = () => {
  const { data: sneakerBrands } = useQuery(ALL_SNEAKER_BRANDS);
  const { data: perfumeBrands } = useQuery(ALL_PERFUME_BRANDS);
  const { data: watchBrands } = useQuery(ALL_WATCH_BRANDS);
  const { data: apparelBrands } = useQuery(ALL_APPAREL_BRANDS);

  const router = useRouter();
  // Detect product detail pages: /category/[id]
  const productDetailRegex = /^\/(accessories|apparel|perfume|sneaker|watch)\/[^/]+$/;

  // Get top brands for each category with fallbacks
  const topSneakerBrands = sneakerBrands?.allSneakerBrands?.slice(0, 4) || ['Balenciaga', 'New Balance', 'Air Jordan', 'Nike'];
  const topPerfumeBrands = perfumeBrands?.allPerfumeBrands?.slice(0, 4) || ['Dior', 'Chanel', 'Creed', 'Versace'];
  const topWatchBrands = watchBrands?.allWatchBrands?.slice(0, 2) || ['Rolex', 'Casio'];
  const topApparelBrands = apparelBrands?.allApparelBrands?.slice(0, 2) || ['Gucci', 'Prada'];

  const categories = [
    { name: 'Apparel', href: '/apparel' },
    { name: 'Accessories', href: '/accessories' },
    { name: 'Beyond Ordinary', href: '/beyond-ordinary' },
    { name: 'Handbags', href: '/handbags' },
    { name: 'Perfumes', href: '/perfume' },
    { name: 'Sneakers', href: '/sneaker' },
    { name: 'Watches', href: '/watch' },
  ];

  const quickLinks = [
    { name: 'Contact Us', href: '/contact' },
    { name: 'FAQs', href: '/faqs' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Privacy Policies', href: '/privacy' },
  ];

  const getBrandUrl = (brand: string, category: string) => {
    const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/${category}/brand/${normalizedBrand}`;
  };

  return (
    <footer className={styles.footer}>
      {/* Main Footer Content */}
      <div className={`${styles.mainFooter} ${styles.withDivider}`}>
        <div className={styles.footerContent}>
          {/* Column 1 - House of Plutus Information */}
          <div className={styles.brandColumn}>
            <div className={styles.brandInfo}>
              <div className={styles.brandLogo}>
                <Image 
                  src="/blue_nav_icons/Blue PLUTUS LOGO.svg" 
                  alt="House of Plutus" 
                  width={200} 
                  height={50}
                />
              </div>
              <p className={styles.tagline}>Because luxury isn&apos;t bought — it&apos;s chosen!</p>
              <p className={styles.brandDescription}>
                House of Plutus is your destination for rare luxury. Made for those who appreciate quality and style, we offer trust, authenticity, and timeless value in every piece.
              </p>
            </div>
            
            <div className={styles.socialMedia}>
              <a href="#" className={styles.socialIcon}>
                <Image src="/restof/Footer insta icon.svg" alt="Instagram" width={24} height={24} />
              </a>
              <a href="#" className={styles.socialIcon}>
                <Image src="/restof/Footer FB icon.svg" alt="Facebook" width={24} height={24} />
              </a>
              <a href="#" className={styles.socialIcon}>
                <Image src="/restof/Footer Gmail icon.svg" alt="Email" width={24} height={24} />
              </a>
            </div>
            
            <p className={styles.contactEmail}>support@houseofplutus.com</p>
          </div>

          {/* Column 2 - Most Viewed */}
          <div className={styles.footerColumn}>
            <h3>Most Viewed</h3>
            <ul>
              {topSneakerBrands.map((brand: string) => (
                <li key={brand}>
                  <Link href={getBrandUrl(brand, 'sneaker')}>
                    {brand}
                  </Link>
                </li>
              ))}
              {topPerfumeBrands.map((brand: string) => (
                <li key={brand}>
                  <Link href={getBrandUrl(brand, 'perfume')}>
                    {brand}
                  </Link>
                </li>
              ))}
              {topWatchBrands.map((brand: string) => (
                <li key={brand}>
                  <Link href={getBrandUrl(brand, 'watch')}>
                    {brand}
                  </Link>
                </li>
              ))}
              {topApparelBrands.map((brand: string) => (
                <li key={brand}>
                  <Link href={getBrandUrl(brand, 'apparel')}>
                    {brand}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Categories */}
          <div className={styles.footerColumn}>
            <h3>Categories</h3>
            <ul>
              {categories.map((category) => (
                <li key={category.name}>
                  <Link href={category.href}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Quick Links */}
          <div className={styles.footerColumn}>
            <h3>Quick Links</h3>
            <ul>
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p>© 2025 All Rights Reserved by House of Plutus India</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 