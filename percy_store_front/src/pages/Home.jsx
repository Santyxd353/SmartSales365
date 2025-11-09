import React, { useState } from 'react';
import ProductGrid from '../components/ProductGrid';
import HeroBanner from '../components/HeroBanner';
import PromoStrip from '../components/PromoStrip';

export default function Home(){
  const [q, setQ] = useState('');

  return (
    <>
      <HeroBanner />
      <PromoStrip />
      <section className="container-edge py-8">
        <div className="flex items-center gap-2 mb-4">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar en el catálogo…"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none"
          />
        </div>
        <ProductGrid q={q} />
      </section>
    </>
  );
}
