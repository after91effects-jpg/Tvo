type OccasionEvent = 'occasion_page_view' | 'occasion_hero_impression' | 'occasion_cta_click' | 'occasion_product_impression' | 'occasion_product_click' | 'occasion_add_to_cart' | 'occasion_checkout_start' | 'occasion_purchase';

type AnalyticsPayload = Record<string, unknown>;

class OccasionAnalytics {
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private isDev(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  track(event: OccasionEvent, payload: AnalyticsPayload = {}): void {
    if (!this.isClient() || this.isDev()) return;

    const eventData = {
      event,
      ...payload,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    };

    if ((window as any).dataLayer) {
      (window as any).dataLayer.push(eventData);
    } else if ((window as any).gtag) {
      (window as any).gtag('event', event, payload);
    }
  }

  trackOccasionPageView(slug: string, name: string): void {
    this.track('occasion_page_view', { occasionSlug: slug, occasionName: name });
  }

  trackOccasionHeroImpression(slug: string, name: string): void {
    this.track('occasion_hero_impression', { occasionSlug: slug, occasionName: name });
  }

  trackOccasionCtaClick(slug: string, name: string, destination: string): void {
    this.track('occasion_cta_click', { occasionSlug: slug, occasionName: name, ctaDestination: destination });
  }

  trackOccasionProductImpression(slug: string, productId: string | number, position: number): void {
    this.track('occasion_product_impression', { occasionSlug: slug, productId, position });
  }

  trackOccasionProductClick(slug: string, productId: string | number, position: number): void {
    this.track('occasion_product_click', { occasionSlug: slug, productId, position });
  }

  trackOccasionAddToCart(slug: string, productId: string | number): void {
    this.track('occasion_add_to_cart', { occasionSlug: slug, productId });
  }

  trackOccasionCheckoutStart(slug: string): void {
    this.track('occasion_checkout_start', { occasionSlug: slug });
  }

  trackOccasionPurchase(slug: string, orderId: string, value: number): void {
    this.track('occasion_purchase', { occasionSlug: slug, orderId, value });
  }

  private getSessionId(): string {
    if (!this.isClient()) return '';
    const key = '__tvo_session_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }
}

export const occasionAnalytics = new OccasionAnalytics();
