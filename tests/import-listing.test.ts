import { parseListingHtml } from "@/lib/services/import-listing";

describe("parseListingHtml", () => {
  it("pulls address, rent, beds, and baths from JSON-LD and metadata", async () => {
    const html = `
      <html>
        <head>
          <title>Sunny Gilroy Rental</title>
          <meta property="og:title" content="Sunny Gilroy Rental" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Residence",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "7550 Princevalle Street",
                "addressLocality": "Gilroy",
                "addressRegion": "CA",
                "postalCode": "95020"
              },
              "offers": {
                "@type": "Offer",
                "price": 2895
              }
            }
          </script>
        </head>
        <body>
          <div data-testid="bed-bath-beyond">2 bd | 1.5 ba</div>
        </body>
      </html>
    `;

    const result = await parseListingHtml("https://www.zillow.com/demo", html);

    expect(result.sourceSite).toBe("zillow");
    expect(result.address?.city).toBe("Gilroy");
    expect(result.price).toBe(2895);
    expect(result.beds).toBe(2);
    expect(result.baths).toBe(1.5);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns warnings when the listing is incomplete", async () => {
    const html = `
      <html>
        <head><title>Partial listing</title></head>
        <body><span class="price">Call for rent</span></body>
      </html>
    `;

    const result = await parseListingHtml("https://www.redfin.com/demo", html);

    expect(result.address).toBeNull();
    expect(result.price).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("prefers the visible Craigslist listing address and BR/BA details", async () => {
    const html = `
      <html>
        <head>
          <title>2/BD, Upgraded landscape, Balcony - craigslist</title>
          <meta
            name="description"
            content="766 First St, Gilroy, CA 95020 Mission Park Apartments is nestled on five acres."
          />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Residence",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "766 First St",
                "addressLocality": "San Juan Bautista",
                "addressRegion": "CA",
                "postalCode": "95045"
              }
            }
          </script>
        </head>
        <body>
          <span class="price">$2,943</span>
          <div data-latitude="36.848287" data-longitude="-121.539360"></div>
          <h2 class="street-address">766 First St, Gilroy, CA 95020</h2>
          <p class="attrgroup">
            <span class="attr important">2BR / 1.5Ba</span>
          </p>
        </body>
      </html>
    `;

    const result = await parseListingHtml(
      "https://sfbay.craigslist.org/demo",
      html,
    );

    expect(result.sourceSite).toBe("craigslist");
    expect(result.address?.normalizedAddress).toBe("766 First St, Gilroy, CA 95020");
    expect(result.price).toBe(2943);
    expect(result.beds).toBe(2);
    expect(result.baths).toBe(1.5);
    expect(result.coordinates).toEqual({
      latitude: 36.848287,
      longitude: -121.53936,
    });
  });
});
