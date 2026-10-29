# Admin finalization plan

1. Product add/edit: explicit purchase type (weight, piece, pack, set/pair, hamper, custom quantity); relevant controls only; manual option tiers with exact prices; preserve saved tiers, URLs, images, videos and SEO when editing. Remove generated prices, misleading cake-only wording and fabricated starter data. Draft-first creation and clear validation.
2. Product validation: finite prices, sale price not above MRP, valid category references, valid option labels/amounts/defaults and media. Persist explicit type in the existing variations JSON, with legacy inference for older products. Use the same policy in storefront, checkout and inventory.
3. Categories: real database hierarchy, readable parent paths, safe parent choices, slug/media validation, truthful direct/pivot product counts, deletion guards and clear errors. Remove sample/reference architecture controls from operational admin.
4. Other sections: dashboard/reports, orders, payments, delivery, ingredients, reviews, marketing, media, hampers/festivals, staff and audit. Check loading/error/permission behavior and run existing regressions. Financial transactions and notifications use test validation; no real charge, refund or broadcast during audit.
5. Verification: private local database writes with rollback, browser create/edit/draft checks, category hierarchy checks, full regression suite, types and production build. Publish existing approved tvoflavours.com target and verify live read endpoints and UI. Preserve existing production records; record concrete outcomes and limitations.

## Initial findings
- Saving a product rebuilds weight/piece tiers using invented multipliers, overwriting configured prices.
- All non-weight units generate piece tiers, including hampers, sets and packs.
- Editor does not send videos_json and always regenerates slug/SEO.
- Creation defaults to published and fabricated prices/stock/tags rather than an intentional draft.
- Category admin includes obsolete sample architecture/reports; hierarchy needs clearer parent selection.

## Concrete category repair

13 missing categories will be added under the existing structure. 115 non-weight products will be linked to the appropriate hamper, pastry, pack, candle, rakhi or idol category. The 29 weight-based cake assignments remain intact. All 103 currently broken category references are covered. No product prices, stock, publication or order data will be changed by this repair.

- Adorable Krishna Rakhi For Kids → rakhis
- Aroma Box → rakhi-gift-hampers
- Assorted Gourmet Dry Fruits → hampers-gifts
- Bakery Delight Hamper → rakhi-gift-hampers
- Besan Ladoo 200g → indian-sweets
- Black forest Pastry → pastries
- Blueberry Cheesecake Pastry → cheesecake-slices
- Book Lover Box → rakhi-gift-hampers
- Brother's Favorite Hamper → rakhi-gift-hampers
- Brownie Bliss Hamper → rakhi-gift-hampers
- Butterscotch Crunch Cake → pastries
- Butterscotch Pastry → pastries
- Celebration Bakery Box → rakhi-gift-hampers
- Center Filled Choco-Cookies 75g → cookies-biscuits
- Cheerful Bro Rakhi → rakhis
- Choco Chips Pastry → pastries
- Choco Cookie Delight → rakhi-gift-hampers
- Choco Fun Box → rakhi-gift-hampers
- Chocolate Heaven Hamper → rakhi-gift-hampers
- Chocolate Indulgence Hamper → rakhi-gift-hampers
- Chocolate Love Box → rakhi-gift-hampers
- Chocolate Paradise Box → rakhi-gift-hampers
- Classic Besan Ladoo Traditional Indian Sweet Delight → indian-sweets
- Coffee Break Box → rakhi-gift-hampers
- Coffee Chocolate Mousse → dessert-cups
- Coffee Lover Hamper → rakhi-gift-hampers
- Coffee Scented Candle single piece → festive-candles
- Colourful Peacock Rakhis With Delightful Treats → rakhi-gift-hampers
- Cookie Lover Hamper → rakhi-gift-hampers
- Creative Fun Box → rakhi-gift-hampers
- Custom Corporate Delight Box → corporate-gift-hampers
- Deluxe Gift Hamper → rakhi-gift-hampers
- Dessert Lover Hamper → rakhi-gift-hampers
- Dino Adventure Box → rakhi-gift-hampers
- Divine Diwali Gift Hamper → diwali-gift-hampers
- Divine Diwali Pooja & Sweet Gift Hamper Lakshmi Ganesh Edition → diwali-gift-hampers
- Diwali Candle Hamper of Light & Blessings → diwali-gift-hampers
- Dry Fruit Special Hamper → rakhi-gift-hampers
- Elegant Diwali Hamper with Daisy Candle & Festive Treats → diwali-gift-hampers
- Elegant Diwali Treat Box Potli, Cookies & Gourmet Dry Fruits → diwali-gift-hampers
- Elegant Rose Blossom Floating Candle Set Of (4 pcs) → festive-candles
- Family Celebration Box → rakhi-gift-hampers
- Family Rakhi Hamper → rakhi-gift-hampers
- Festive Diwali Hamper with Mug, Snacks & Diyas → diwali-gift-hampers
- Festive Essentials Bhai Bhabhi Rakhi Set → rakhis
- Festive Fusion Dry Fruit Chocolate Barfi Diwali Gift Tray → diwali-gift-hampers
- Firecracker Chocolates Box → hampers-gifts
- Fitness Rakhi Box → rakhi-gift-hampers
- Fusion Festive Treats Diwali Gift Box → diwali-gift-hampers
- Gaming Break Box → rakhi-gift-hampers
- Golden Bliss Diwali Hamper → diwali-gift-hampers
- Gourmet Bakery Hamper → rakhi-gift-hampers
- Grand Chocolate Feast → rakhi-gift-hampers
- Grooming Box → rakhi-gift-hampers
- Happiness Inside Diwali Gourmet Treats & Sweets Gift Box → diwali-gift-hampers
- Healthy Living Box → rakhi-gift-hampers
- Healthy Rakhi Hamper → rakhi-gift-hampers
- Healthy Snacking Box → rakhi-gift-hampers
- Kids Mega Fun Box → rakhi-gift-hampers
- Kitkat chocolate Pastry → pastries
- Luxury Aroma Box → rakhi-gift-hampers
- Luxury Aromatherapy & Gourmet Indulgence Gift Set → hampers-gifts
- Luxury Celebration Hamper → rakhi-gift-hampers
- Luxury Diwali Chocolate Hamper → diwali-gift-hampers
- Luxury Rakhi Box → rakhi-gift-hampers
- Luxury Rakhi Hamper → rakhi-gift-hampers
- Luxury Tea Celebration Box → rakhi-gift-hampers
- Mini Dry Fruit Box → rakhi-gift-hampers
- Mini Rakhi Box → rakhi-gift-hampers
- Modern Bubble Cube Candles Set of 2 → festive-candles
- Morning Bliss Box → rakhi-gift-hampers
- Movie Night Box → rakhi-gift-hampers
- Muffin Magic Hamper → rakhi-gift-hampers
- New Year Gourmet Delight Box → hampers-gifts
- Nutella Cheesecake Slice → cheesecake-slices
- Office Essentials Box → rakhi-gift-hampers
- Oreo Cheesecake Slice → cheesecake-slices
- Personalized Rakhi Hamper → rakhi-gift-hampers
- Premium Bakery Box → rakhi-gift-hampers
- Premium Celebration Box → rakhi-gift-hampers
- Premium Coffee & Cookies Box → rakhi-gift-hampers
- Premium Diwali Gift Hamper with Dry Fruits & Sweets | Online Diwali Gift → diwali-gift-hampers
- Premium Dry Fruit Hamper → rakhi-gift-hampers
- Premium Pillar Candle Set Of 4 → festive-candles
- Premium Sibling Box → rakhi-gift-hampers
- Premium Triple Candle Hamper → hampers-gifts
- Protein Snack Box → rakhi-gift-hampers
- Red Velvet Choco Truffle Cake → pastries
- Red Velvet Pastry → pastries
- Relax &amp; Unwind Box → rakhi-gift-hampers
- Royal Celebration Hamper → rakhi-gift-hampers
- Royal Chocolate Hamper → rakhi-gift-hampers
- Royal Dry Fruit Diwali Gift Box Velvet Edition → diwali-gift-hampers
- Rustic Candle with Floral Wreath → festive-candles
- Sacred Bhaiya Bhabhi Rakhi And Sweets Hamper → rakhi-gift-hampers
- Scented Jar Candle Set of 3 → festive-candles
- Self-Care Box → rakhi-gift-hampers
- Shubh Diwali Hamper → diwali-gift-hampers
- Signature Luxury Rakhi Hamper → rakhi-gift-hampers
- Sister's Delight Hamper → rakhi-gift-hampers
- Slime Surprise Box → rakhi-gift-hampers
- Space Explorer Rakhi Set Of 2 → rakhis
- Sweet Bond Box → rakhi-gift-hampers
- Sweet Memories Hamper → rakhi-gift-hampers
- Sweet Treat Hamper → rakhi-gift-hampers
- Tea &amp; Treat Box → rakhi-gift-hampers
- Tea Lover Box → rakhi-gift-hampers
- Tea Time Hamper → rakhi-gift-hampers
- Tea Time Premium Hamper → rakhi-gift-hampers
- Traditional Ganesh Laxmi Idols → pooja-idols
- Ultimate Bakery Collection → rakhi-gift-hampers
- Unicorn Magic Box → rakhi-gift-hampers
- Vibrant Diwali Hamper with Rainbow Candle & Treats → diwali-gift-hampers
- Wishing Tree Rakhi With Besan Laddoo → rakhi-gift-hampers
- Zen Rakhi Box → rakhi-gift-hampers
