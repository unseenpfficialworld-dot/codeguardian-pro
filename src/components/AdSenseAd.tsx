import React, { useEffect, useRef, useState } from 'react';

interface AdSenseAdProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  adLayout?: 'in-article' | 'in-feed' | 'link';
  adLayoutKey?: string;
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const AdSenseAd: React.FC<AdSenseAdProps> = ({
  adSlot,
  adFormat = 'auto',
  adLayout,
  adLayoutKey,
  fullWidthResponsive = true,
  className = '',
  style = {}
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    // Check if AdSense is available (in production)
    const loadAd = () => {
      if (typeof window === 'undefined' || !window.adsbygoogle) {
        console.warn('AdSense not loaded');
        setAdError(true);
        return;
      }

      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      } catch (error) {
        console.error('AdSense error:', error);
        setAdError(true);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadAd, 100);

    return () => clearTimeout(timer);
  }, [adSlot, adFormat, adLayout, adLayoutKey]);

  // AdSense ad configuration
  const adConfig: any = {
    'data-ad-client': 'ca-pub-XXXXXXXXXXXXXXXX', // Replace with actual AdSense client ID
    'data-ad-slot': adSlot,
    'data-ad-format': adFormat,
    'data-full-width-responsive': fullWidthResponsive ? 'true' : 'false',
  };

  if (adLayout) {
    adConfig['data-ad-layout'] = adLayout;
  }

  if (adLayoutKey) {
    adConfig['data-ad-layout-key'] = adLayoutKey;
  }

  // Ad placeholder for development and error states
  const renderAdPlaceholder = () => {
    const formatDimensions = {
      auto: '300x250',
      rectangle: '300x250',
      vertical: '120x600',
      horizontal: '728x90'
    };

    return (
      <div className={`bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-center p-4 ${className}`} style={style}>
        <div className="text-2xl mb-2">📢</div>
        <div className="text-white font-semibold mb-1">Advertisement</div>
        <div className="text-gray-400 text-sm mb-2">
          {formatDimensions[adFormat]} Ad Unit
        </div>
        <div className="text-xs text-gray-500">
          Ad Slot: {adSlot}
        </div>
        {adError && (
          <div className="text-xs text-red-400 mt-2">
            Ad failed to load
          </div>
        )}
      </div>
    );
  };

  // Production AdSense ad
  const renderAdSenseAd = () => (
    <div ref={adRef} className={`adsense-ad ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        {...adConfig}
        data-adtest={process.env.NODE_ENV === 'development' ? 'on' : 'off'}
      />
    </div>
  );

  // In development or if ad fails to load, show placeholder
  if (process.env.NODE_ENV === 'development' || adError || !adLoaded) {
    return renderAdPlaceholder();
  }

  return renderAdSenseAd();
};

// Header Ad Component
export const HeaderAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="header_ad_slot"
    adFormat="horizontal"
    className={`w-full h-20 ${className}`}
    style={{ minHeight: '90px' }}
  />
);

// Sidebar Ad Component
export const SidebarAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="sidebar_ad_slot"
    adFormat="vertical"
    className={`w-full h-96 ${className}`}
    style={{ minHeight: '600px' }}
  />
);

// In-Content Ad Component
export const InContentAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="in_content_ad_slot"
    adFormat="rectangle"
    className={`w-full max-w-md mx-auto my-4 ${className}`}
    style={{ minHeight: '250px' }}
  />
);

// Footer Ad Component
export const FooterAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="footer_ad_slot"
    adFormat="horizontal"
    className={`w-full h-32 ${className}`}
    style={{ minHeight: '90px' }}
  />
);

// Responsive In-Feed Ad Component
export const InFeedAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="in_feed_ad_slot"
    adFormat="auto"
    adLayout="in-feed"
    adLayoutKey="-fb+5w+1e-db+5c"
    fullWidthResponsive={true}
    className={`w-full ${className}`}
    style={{ minHeight: '200px' }}
  />
);

// Link Ad Component
export const LinkAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="link_ad_slot"
    adFormat="link"
    className={`w-full ${className}`}
    style={{ minHeight: '50px' }}
  />
);

// Auto Ad Component (Google's auto placement)
export const AutoAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="auto_ad_slot"
    adFormat="auto"
    fullWidthResponsive={true}
    className={`w-full ${className}`}
    style={{ minHeight: '100px' }}
  />
);

// Native In-Article Ad Component
export const InArticleAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <AdSenseAd
    adSlot="in_article_ad_slot"
    adFormat="fluid"
    adLayout="in-article"
    fullWidthResponsive={true}
    className={`w-full ${className}`}
    style={{ minHeight: '200px' }}
  />
);

// Sticky Sidebar Ad Component
export const StickySidebarAd: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`sticky top-4 ${className}`}>
    <SidebarAd />
  </div>
);

// Multi-Size Responsive Ad Component
export const ResponsiveAd: React.FC<{ 
  className?: string;
  sizes?: [number, number][];
}> = ({ className = '', sizes = [[300, 250], [336, 280], [728, 90]] }) => (
  <div className={`responsive-ad-container ${className}`}>
    <AdSenseAd
      adSlot="responsive_ad_slot"
      adFormat="auto"
      fullWidthResponsive={true}
      className="w-full"
      style={{ minHeight: '250px' }}
    />
  </div>
);

// AdSense Script Loader Component (to be included in _app.tsx or layout)
export const AdSenseScript: React.FC<{ clientId: string }> = ({ clientId }) => (
  <script 
    async 
    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
    crossOrigin="anonymous"
  />
);

// AdSense Initialization Script (for _document.tsx)
export const AdSenseInitScript: React.FC<{ clientId: string }> = ({ clientId }) => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (adsbygoogle = window.adsbygoogle || []).push({
          google_ad_client: "${clientId}",
          enable_page_level_ads: true,
          overlays: {bottom: true}
        });
      `
    }}
  />
);

// AdSense Manager Component for managing multiple ads
export const AdSenseManager: React.FC<{
  ads: Array<{
    type: 'header' | 'sidebar' | 'in-content' | 'footer' | 'in-feed' | 'link' | 'auto' | 'in-article' | 'responsive';
    position: string;
    className?: string;
  }>;
}> = ({ ads }) => {
  return (
    <>
      {ads.map((ad, index) => {
        const adComponents = {
          header: HeaderAd,
          sidebar: SidebarAd,
          'in-content': InContentAd,
          footer: FooterAd,
          'in-feed': InFeedAd,
          link: LinkAd,
          auto: AutoAd,
          'in-article': InArticleAd,
          responsive: ResponsiveAd,
        };

        const AdComponent = adComponents[ad.type];
        
        return AdComponent ? (
          <div key={index} data-ad-position={ad.position} className={ad.className}>
            <AdComponent />
          </div>
        ) : null;
      })}
    </>
  );
};

export default AdSenseAd;