import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import HeroBanner from '../components/HeroBanner';
import PromoStrip from '../components/PromoStrip';

export default function Home(){
  const [params] = useSearchParams();
  const q        = params.get('q') || '';
  const brand    = params.get('brand') || '';
  const category = params.get('category') || '';
  const min      = params.get('min') || '';
  const max      = params.get('max') || '';
  const in_stock = params.get('in_stock') || '';

  return (
    <>
      <HeroBanner />
      <PromoStrip />
      <section className="container-edge py-8">
        <ProductGrid
          q={q}
          brand={brand}
          category={category || (category === 'Todas' ? '' : category)}
          min={min}
          max={max}
          in_stock={in_stock}
        />
      </section>
    </>
  );
}

