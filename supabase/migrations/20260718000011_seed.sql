-- Demo product 1: Posture Pro Belt (live — renders at /p/posture-pro)
INSERT INTO public.products (
  slug, name, status, price, compare_at_price, theme, content, sections
) VALUES (
  'posture-pro',
  'Posture Pro Belt',
  'live',
  15000,
  25000,
  '{
    "primary":    "#1a6b3c",
    "accent":     "#f5a623",
    "background": "#ffffff",
    "text":       "#111111",
    "font":       "Inter"
  }',
  '{
    "announcementBar": "Pay on Delivery · Free Nationwide Shipping",
    "eyebrow":         "Fix Back Pain — For Good",
    "headline":        "Straighten Your Posture & Kill Back Pain in 30 Days",
    "subhead":         "The Posture Pro Belt gently realigns your spine while you go about your day. Worn by thousands across Nigeria.",
    "starRating":      4.9,
    "ctaText":         "Order Now — Pay on Delivery",
    "trustRow":        ["Secure Order", "Pay on Delivery", "Nationwide Delivery"],
    "problemText":     "Hunched over your phone or laptop all day? That nagging lower-back ache is not normal — and it gets worse over time. Painkillers only mask the symptom. The Posture Pro Belt corrects the cause.",
    "benefits": [
      {"icon": "✓", "text": "Instant posture correction — noticeable within hours"},
      {"icon": "✓", "text": "Reduces lower-back and shoulder pain by realigning the spine"},
      {"icon": "✓", "text": "Lightweight and discreet — wears under your clothes all day"},
      {"icon": "✓", "text": "One-size adjustable strap fits all body types"},
      {"icon": "✓", "text": "Medically inspired design approved by physiotherapists"}
    ],
    "howItWorksSteps": [
      {"title": "Order",       "description": "Fill the form below and tap Order — takes 30 seconds."},
      {"title": "We call you", "description": "Our team calls to confirm your address and delivery time."},
      {"title": "Pay on delivery", "description": "Rider brings your belt to your door. Pay cash — only when you receive it."}
    ],
    "featuresSpecs": [
      "Material: Premium breathable neoprene",
      "Sizes: Universal (waist 60–120 cm)",
      "Wash: Hand-wash, air-dry",
      "Includes: Belt + instruction card"
    ],
    "testimonials": [
      {"name": "Adaeze N.", "location": "Lagos",  "rating": 5, "text": "After two weeks I stopped waking up with back pain. Best ₦15,000 I ever spent."},
      {"name": "Emeka O.",  "location": "Abuja",  "rating": 5, "text": "I sit at a desk 10 hours a day. This belt changed everything. My posture is visibly better."},
      {"name": "Fatima A.", "location": "Kano",   "rating": 4, "text": "Took a few days to get used to wearing it but the results are real. Highly recommend."}
    ],
    "urgencyText":  "⚠ Only 37 units left in stock. We restock monthly — order now to avoid waiting.",
    "hasCountdown": false,
    "guaranteeText": "Not satisfied? Return within 7 days of delivery for a full refund. No questions asked.",
    "faq": [
      {"question": "When do I pay?",               "answer": "You pay cash to our delivery rider when the belt arrives at your door. Never online."},
      {"question": "How long does delivery take?", "answer": "Lagos: 1–2 working days. Other states: 2–4 working days."},
      {"question": "What if I do not like it?",    "answer": "Call us within 7 days of delivery and we will arrange a free pick-up and full refund."},
      {"question": "Can I order more than one?",   "answer": "Yes — select your quantity in the form. Each extra unit ships in the same delivery."},
      {"question": "Is this just for women?",      "answer": "No — the belt is unisex and adjustable to any body shape or size."}
    ],
    "footerText":           "DropDesk · Nationwide COD Delivery",
    "orderFormTitle":       "Order Your Posture Pro Belt — Pay on Delivery",
    "orderSuccessHeadline": "Order received!",
    "orderSuccessBody":     "We will call you shortly to confirm. Pay {total} to the rider on delivery — no online payment required."
  }',
  '[
    {"key":"announcementBar","enabled":true},
    {"key":"hero","enabled":true},
    {"key":"problem","enabled":true},
    {"key":"benefits","enabled":true},
    {"key":"mediaGallery","enabled":true},
    {"key":"howItWorks","enabled":true},
    {"key":"featuresSpecs","enabled":true},
    {"key":"socialProof","enabled":true},
    {"key":"urgency","enabled":true},
    {"key":"guarantee","enabled":true},
    {"key":"faq","enabled":true},
    {"key":"orderForm","enabled":true}
  ]'
) ON CONFLICT (slug) DO NOTHING;

-- Demo product 2: Slim Waist Trainer (draft — for testing the editor)
INSERT INTO public.products (
  slug, name, status, price, compare_at_price, theme, content, sections
) VALUES (
  'slim-waist-trainer',
  'Slim Waist Trainer',
  'draft',
  12000,
  20000,
  '{
    "primary":    "#b5305a",
    "accent":     "#f7c948",
    "background": "#fff7f7",
    "text":       "#1a0a0e",
    "font":       "Inter"
  }',
  '{
    "announcementBar": "Pay on Delivery · Discreet Packaging",
    "eyebrow":         "Worn by 10,000+ Nigerian Women",
    "headline":        "Get a Snatched Waist in 4 Weeks — Without a Gym",
    "subhead":         "The Slim Waist Trainer compresses and sculpts your waist while you work, cook, and commute.",
    "starRating":      4.8,
    "ctaText":         "Order Now — Pay on Delivery",
    "trustRow":        ["Discreet Packaging", "Pay on Delivery", "Nationwide Delivery"],
    "problemText":     "Diets are hard and the gym is expensive. The Slim Waist Trainer gives you an hourglass silhouette you can wear every day.",
    "benefits": [
      {"icon": "✓", "text": "Instantly slims waist by 3–5 inches when worn"},
      {"icon": "✓", "text": "Thermogenic core compression accelerates fat loss"},
      {"icon": "✓", "text": "9 steel boning rods for firm, comfortable support"},
      {"icon": "✓", "text": "Available in sizes XS–4XL for all body types"},
      {"icon": "✓", "text": "Discreet under most Nigerian outfits"}
    ],
    "howItWorksSteps": [
      {"title": "Order",       "description": "Choose your size in the form below and tap Order."},
      {"title": "We confirm",  "description": "Our agent calls to confirm size and delivery address."},
      {"title": "Pay on delivery", "description": "Rider delivers to your door. Pay cash only when you receive."}
    ],
    "testimonials": [
      {"name": "Chisom B.",  "location": "Port Harcourt", "rating": 5, "text": "I ordered for my sister''s wedding and the photos came out amazing. So snatched!"},
      {"name": "Blessing T.", "location": "Enugu",        "rating": 5, "text": "Been wearing it 6 weeks — waist went from 36 to 32 inches. Incredible."}
    ],
    "urgencyText":   "Limited stock — sizes sell out fast. Order now to secure yours.",
    "hasCountdown":  false,
    "guaranteeText": "Wrong size? We exchange free of charge within 5 days of delivery.",
    "faq": [
      {"question": "When do I pay?",         "answer": "You pay the rider cash when your trainer arrives. No online payment."},
      {"question": "How do I choose my size?","answer": "Measure your natural waist: XS(24–26in), S(27–29in), M(30–32in), L(33–35in), XL(36–38in), 2XL(39–41in), 3XL(42–44in), 4XL(45+in)."},
      {"question": "How long to see results?","answer": "Instant slimming when worn. With 6–8 hours daily use, most customers see inch loss in 3–4 weeks."}
    ],
    "footerText":           "DropDesk · Nationwide COD Delivery",
    "orderFormTitle":       "Order Your Slim Waist Trainer — Pay on Delivery",
    "orderSuccessHeadline": "Order placed!",
    "orderSuccessBody":     "We will call to confirm your size and delivery. Pay {total} to our rider on delivery."
  }',
  '[
    {"key":"announcementBar","enabled":true},
    {"key":"hero","enabled":true},
    {"key":"problem","enabled":true},
    {"key":"benefits","enabled":true},
    {"key":"mediaGallery","enabled":false},
    {"key":"howItWorks","enabled":true},
    {"key":"featuresSpecs","enabled":false},
    {"key":"socialProof","enabled":true},
    {"key":"urgency","enabled":true},
    {"key":"guarantee","enabled":true},
    {"key":"faq","enabled":true},
    {"key":"orderForm","enabled":true}
  ]'
) ON CONFLICT (slug) DO NOTHING;
