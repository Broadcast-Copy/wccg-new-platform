-- ============================================================================
-- Migration 004: Seed directory_listings with community businesses
-- ============================================================================
-- Seeds all 73 businesses from the WCCG community page into the
-- directory_listings table. Uses ON CONFLICT (id) DO NOTHING so this
-- migration is idempotent and safe to re-run.
-- ============================================================================

INSERT INTO directory_listings (
  id, owner_id, name, slug, category, description,
  address, city, county, state, zip_code,
  phone, email, website, image_url,
  lat, lng, featured, status
) VALUES

-- ═══════════════════════════════════════════════════════════════════════════════
-- CUMBERLAND COUNTY  Fayetteville, Spring Lake, Hope Mills
-- ═══════════════════════════════════════════════════════════════════════════════

-- Restaurants
('1', NULL, 'Hilltop House Restaurant', 'hilltop-house-restaurant', 'Restaurants',
 'Southern comfort food made from scratch with locally sourced ingredients. A Fayetteville staple since 1998.',
 '1240 Fort Bragg Rd, Fayetteville, NC 28305', 'Fayetteville', 'Cumberland', 'NC', '28305',
 '(910) 484-6699', NULL, 'https://example.com/hilltop',
 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
 35.0474, -78.9120, true, 'ACTIVE'),

('11', NULL, 'Taste of Ethiopia', 'taste-of-ethiopia', 'Restaurants',
 'Authentic Ethiopian cuisine with traditional injera, spiced stews, and vegetarian platters. Dine-in and takeout.',
 '1475 Skibo Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 829-2222', NULL, 'https://example.com/tasteofethiopia',
 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
 35.0411, -78.9475, false, 'ACTIVE'),

('16', NULL, 'Pharaoh''s Village', 'pharaohs-village', 'Restaurants',
 'Mediterranean and Middle Eastern cuisine featuring lamb kabobs, hummus platters, and freshly baked pita.',
 '5804 Yadkin Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 864-5274', NULL, 'https://example.com/pharaohsvillage',
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
 35.0835, -78.9440, false, 'ACTIVE'),

('17', NULL, 'Mash House Brewing', 'mash-house-brewing', 'Restaurants',
 'Craft brewery and restaurant with house-brewed beers, wood-fired steaks, and a vibrant patio.',
 '4150 Sycamore Dairy Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 867-9223', NULL, 'https://example.com/mashhouse',
 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop',
 35.0770, -78.9220, true, 'ACTIVE'),

('18', NULL, 'Island Style Wings & Seafood', 'island-style-wings-and-seafood', 'Restaurants',
 'Caribbean-inspired wings, jerk seasonings, and fresh seafood combos. Quick service with bold island flavors.',
 '2055 Skibo Rd, Suite 105, Fayetteville, NC 28314', 'Fayetteville', 'Cumberland', 'NC', '28314',
 '(910) 423-9464', NULL, NULL,
 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop',
 35.0380, -78.9530, false, 'ACTIVE'),

('19', NULL, 'Luigi''s Italian Chophouse', 'luigis-italian-chophouse', 'Restaurants',
 'Upscale Italian dining with hand-cut steaks, homemade pasta, and an extensive wine list.',
 '4438 Legend Ave, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 223-1485', NULL, 'https://example.com/luigis',
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
 35.0760, -78.9350, false, 'ACTIVE'),

-- Auto Services
('2', NULL, 'Bragg Boulevard Auto Care', 'bragg-boulevard-auto-care', 'Auto Services',
 'Full-service auto repair and maintenance. ASE-certified technicians for domestic and import vehicles.',
 '3450 Bragg Blvd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 555-0102', NULL, 'https://example.com/braggauto',
 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop',
 35.0713, -78.9436, false, 'ACTIVE'),

('20', NULL, 'Sandhills Tire & Auto', 'sandhills-tire-and-auto', 'Auto Services',
 'New and used tires, brake service, oil changes, and alignment. Serving Fort Liberty families since 1992.',
 '5601 Yadkin Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 864-3030', NULL, 'https://example.com/sandhillstire',
 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop',
 35.0820, -78.9510, false, 'ACTIVE'),

('21', NULL, 'Precision Collision Center', 'precision-collision-center', 'Auto Services',
 'Expert collision repair, paintless dent removal, and insurance claims assistance.',
 '1826 Owen Dr, Fayetteville, NC 28304', 'Fayetteville', 'Cumberland', 'NC', '28304',
 '(910) 484-2080', NULL, 'https://example.com/precisioncollision',
 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=300&fit=crop',
 35.0555, -78.9305, false, 'ACTIVE'),

('22', NULL, 'Quick Lane Auto Detailing', 'quick-lane-auto-detailing', 'Auto Services',
 'Premium auto detailing including ceramic coating, paint correction, and interior deep cleaning.',
 '3210 Raeford Rd, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0122', NULL, NULL,
 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&h=300&fit=crop',
 35.0450, -78.9250, false, 'ACTIVE'),

-- Beauty & Barber
('3', NULL, 'Crown & Glory Barbershop', 'crown-and-glory-barbershop', 'Beauty & Barber',
 'Premier barbershop offering classic cuts, fades, and beard grooming. Walk-ins welcome.',
 '512 Murchison Rd, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0103', NULL, 'https://example.com/crownglory',
 'https://images.unsplash.com/photo-1585747860019-024a6d6de9b8?w=400&h=300&fit=crop',
 35.0620, -78.9075, false, 'ACTIVE'),

('12', NULL, 'Divine Beauty Studio', 'divine-beauty-studio', 'Beauty & Barber',
 'Full-service beauty salon specializing in natural hair care, braids, locs, and color treatments.',
 '2828 Raeford Rd, Suite 110, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0112', NULL, 'https://example.com/divinebeauty',
 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
 35.0460, -78.9200, true, 'ACTIVE'),

('23', NULL, 'Legends Barbershop', 'legends-barbershop', 'Beauty & Barber',
 'Old-school vibes with modern techniques. Straight razor shaves, line-ups, and hot towel treatments.',
 '4551 Yadkin Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 860-0025', NULL, 'https://example.com/legends',
 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop',
 35.0800, -78.9480, false, 'ACTIVE'),

('24', NULL, 'Polished Nail Bar & Spa', 'polished-nail-bar-and-spa', 'Beauty & Barber',
 'Luxury nail care, spa pedicures, and lash extensions in a relaxing atmosphere.',
 '1916 Skibo Rd, Suite 500, Fayetteville, NC 28314', 'Fayetteville', 'Cumberland', 'NC', '28314',
 '(910) 555-0124', NULL, 'https://example.com/polishednailbar',
 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
 35.0395, -78.9510, false, 'ACTIVE'),

-- Health & Wellness
('4', NULL, 'Cape Fear Valley Wellness Center', 'cape-fear-valley-wellness-center', 'Health & Wellness',
 'Comprehensive wellness services including chiropractic care, acupuncture, and nutritional counseling.',
 '1800 Owen Dr, Fayetteville, NC 28304', 'Fayetteville', 'Cumberland', 'NC', '28304',
 '(910) 555-0104', NULL, 'https://example.com/cfvwellness',
 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
 35.0552, -78.9311, true, 'ACTIVE'),

('14', NULL, 'Sandhills Pediatric Dentistry', 'sandhills-pediatric-dentistry', 'Health & Wellness',
 'Gentle, child-friendly dental care with a focus on preventive treatment.',
 '1960 Morganton Rd, Suite 5, Fayetteville, NC 28305', 'Fayetteville', 'Cumberland', 'NC', '28305',
 '(910) 555-0114', NULL, 'https://example.com/sandhillspediatric',
 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop',
 35.0500, -78.9400, false, 'ACTIVE'),

('25', NULL, 'Fort Liberty Family Pharmacy', 'fort-liberty-family-pharmacy', 'Health & Wellness',
 'Independent pharmacy with personalized service, free delivery, and compounding for military families.',
 '2870 Legion Rd, Fayetteville, NC 28306', 'Fayetteville', 'Cumberland', 'NC', '28306',
 '(910) 424-3355', NULL, 'https://example.com/fortlibertyrx',
 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=300&fit=crop',
 35.0310, -78.9080, false, 'ACTIVE'),

('26', NULL, 'Fayetteville Fitness Factory', 'fayetteville-fitness-factory', 'Health & Wellness',
 '24/7 gym with personal training, group fitness classes, and a full free-weight area. Military discounts.',
 '1725 Walter Reed Rd, Fayetteville, NC 28304', 'Fayetteville', 'Cumberland', 'NC', '28304',
 '(910) 555-0126', NULL, 'https://example.com/fitnessfactory',
 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
 35.0540, -78.9280, false, 'ACTIVE'),

-- Legal Services
('5', NULL, 'Williams & Associates Law Firm', 'williams-and-associates-law-firm', 'Legal Services',
 'Experienced attorneys handling family law, personal injury, and estate planning for Cumberland County.',
 '225 Green St, Suite 300, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0105', NULL, 'https://example.com/williamslaw',
 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop',
 35.0527, -78.8781, false, 'ACTIVE'),

('27', NULL, 'Sandhills Legal Aid', 'sandhills-legal-aid', 'Legal Services',
 'Free and low-cost legal assistance for qualifying residents. Housing disputes, family law, and consumer rights.',
 '315 Dick St, Suite 200, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 483-0400', NULL, 'https://example.com/sandhillslegal',
 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=300&fit=crop',
 35.0535, -78.8790, false, 'ACTIVE'),

('28', NULL, 'Cumberland County Mediation Services', 'cumberland-county-mediation-services', 'Legal Services',
 'Professional mediation and conflict resolution for family, business, and community disputes.',
 '130 Gillespie St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0128', NULL, NULL,
 NULL,
 35.0515, -78.8770, false, 'ACTIVE'),

-- Real Estate
('6', NULL, 'Sandhills Realty Group', 'sandhills-realty-group', 'Real Estate',
 'Helping families find their dream homes in the Fayetteville and Fort Liberty area for over 20 years.',
 '4920 Raeford Rd, Fayetteville, NC 28304', 'Fayetteville', 'Cumberland', 'NC', '28304',
 '(910) 555-0106', NULL, 'https://example.com/sandhillsrealty',
 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop',
 35.0393, -78.9563, false, 'ACTIVE'),

('29', NULL, 'Liberty Property Management', 'liberty-property-management', 'Real Estate',
 'Residential property management for landlords and tenants. Maintenance coordination and tenant screening.',
 '410 Hay St, Suite 100, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0129', NULL, 'https://example.com/libertyproperty',
 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400&h=300&fit=crop',
 35.0525, -78.8810, false, 'ACTIVE'),

('30', NULL, 'Cape Fear Homes Realty', 'cape-fear-homes-realty', 'Real Estate',
 'First-time homebuyer specialists with VA loan expertise. Free consultations for military families.',
 '3307 Raeford Rd, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 481-1900', NULL, 'https://example.com/capefearhomes',
 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop',
 35.0445, -78.9220, true, 'ACTIVE'),

-- Education
('7', NULL, 'Fayetteville Technical Community College', 'fayetteville-technical-community-college', 'Education',
 'Affordable higher education with over 200 degree, diploma, and certificate programs.',
 '2201 Hull Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 678-8400', NULL, 'https://www.faytechcc.edu',
 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
 35.0686, -78.9337, false, 'ACTIVE'),

('31', NULL, 'Fayetteville State University', 'fayetteville-state-university', 'Education',
 'Historically Black university offering undergraduate and graduate programs. Home of the Broncos since 1867.',
 '1200 Murchison Rd, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 672-1111', NULL, 'https://www.uncfsu.edu',
 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
 35.0680, -78.9070, true, 'ACTIVE'),

('32', NULL, 'Cross Creek Academy of Music', 'cross-creek-academy-of-music', 'Education',
 'Music lessons for all ages — piano, guitar, drums, and voice. Group and private sessions.',
 '135 Maxwell St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0132', NULL, 'https://example.com/crosscreekmusic',
 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop',
 35.0530, -78.8800, false, 'ACTIVE'),

('33', NULL, 'Sandhills Computer Training Center', 'sandhills-computer-training-center', 'Education',
 'IT certification courses, coding bootcamps, and digital literacy for workforce development.',
 '2600 Raeford Rd, Suite 210, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0133', NULL, 'https://example.com/sandhillstech',
 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop',
 35.0470, -78.9180, false, 'ACTIVE'),

-- Churches
('8', NULL, 'New Beginnings Christian Church', 'new-beginnings-christian-church', 'Churches',
 'A welcoming worship community with Sunday services, youth programs, and active outreach ministries.',
 '980 Cliffdale Rd, Fayetteville, NC 28314', 'Fayetteville', 'Cumberland', 'NC', '28314',
 '(910) 555-0108', NULL, NULL,
 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=300&fit=crop',
 35.0268, -78.9640, false, 'ACTIVE'),

('13', NULL, 'Grace Fellowship Baptist Church', 'grace-fellowship-baptist-church', 'Churches',
 'Family-oriented church with dynamic worship, Bible study groups, and community food pantry since 1975.',
 '450 Ramsey St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 555-0113', NULL, NULL,
 'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?w=400&h=300&fit=crop',
 35.0570, -78.8850, false, 'ACTIVE'),

('34', NULL, 'Greater Works Ministries', 'greater-works-ministries', 'Churches',
 'Vibrant multicultural ministry with Sunday worship, midweek Bible study, and youth mentorship.',
 '3100 Gillespie St, Fayetteville, NC 28306', 'Fayetteville', 'Cumberland', 'NC', '28306',
 '(910) 483-1234', NULL, NULL,
 NULL,
 35.0380, -78.8950, false, 'ACTIVE'),

('35', NULL, 'Mount Sinai Missionary Baptist Church', 'mount-sinai-missionary-baptist-church', 'Churches',
 'Historic congregation with a powerful gospel choir, children''s ministry, and annual revival events.',
 '716 Fisher St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 483-9911', NULL, NULL,
 NULL,
 35.0560, -78.8900, false, 'ACTIVE'),

-- Entertainment
('9', NULL, 'The Comedy Zone Fayetteville', 'the-comedy-zone-fayetteville', 'Entertainment',
 'Live comedy shows every weekend featuring nationally touring comedians and local talent.',
 '616 N Reilly Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 867-1950', NULL, 'https://example.com/comedyzone',
 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&h=300&fit=crop',
 35.0725, -78.9612, false, 'ACTIVE'),

('36', NULL, 'Crown Complex Arena', 'crown-complex-arena', 'Entertainment',
 'Multi-venue entertainment complex hosting concerts, sporting events, and community festivals.',
 '1960 Coliseum Dr, Fayetteville, NC 28306', 'Fayetteville', 'Cumberland', 'NC', '28306',
 '(910) 438-4100', NULL, 'https://example.com/crowncomplex',
 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=300&fit=crop',
 35.0330, -78.8980, true, 'ACTIVE'),

('37', NULL, 'Dirtbag Ales Brewing', 'dirtbag-ales-brewing', 'Entertainment',
 'Veteran-owned craft brewery with live music, trivia nights, and food trucks. Dog-friendly patio.',
 '5435 Corporation Dr, Hope Mills, NC 28348', 'Hope Mills', 'Cumberland', 'NC', '28348',
 '(910) 426-2537', NULL, 'https://example.com/dirtbagales',
 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400&h=300&fit=crop',
 35.0160, -78.9530, false, 'ACTIVE'),

('38', NULL, 'Cameo Theatre', 'cameo-theatre', 'Entertainment',
 'Historic downtown theater showcasing independent films and classic movie nights since 1928.',
 '225 Hay St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 486-3836', NULL, 'https://example.com/cameotheatre',
 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop',
 35.0525, -78.8820, false, 'ACTIVE'),

-- Home Services
('10', NULL, 'All-Pro Plumbing & HVAC', 'all-pro-plumbing-and-hvac', 'Home Services',
 'Licensed plumbing, heating, and cooling services. 24/7 emergency availability for Cumberland County.',
 '3712 Sycamore Dairy Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 555-0110', NULL, 'https://example.com/allproplumbing',
 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop',
 35.0780, -78.9200, false, 'ACTIVE'),

('15', NULL, 'Carolina Custom Builders', 'carolina-custom-builders', 'Home Services',
 'Custom home building, renovations, and remodeling. Licensed general contractor serving the Sandhills.',
 '5500 Yadkin Rd, Fayetteville, NC 28303', 'Fayetteville', 'Cumberland', 'NC', '28303',
 '(910) 555-0115', NULL, 'https://example.com/carolinabuilders',
 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop',
 35.0830, -78.9530, false, 'ACTIVE'),

('39', NULL, 'Sandhills Lawn & Landscape', 'sandhills-lawn-and-landscape', 'Home Services',
 'Commercial and residential landscaping, lawn maintenance, hardscaping, and seasonal cleanup.',
 '2410 Hope Mills Rd, Fayetteville, NC 28306', 'Fayetteville', 'Cumberland', 'NC', '28306',
 '(910) 555-0139', NULL, 'https://example.com/sandhillslawn',
 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&h=300&fit=crop',
 35.0300, -78.9100, false, 'ACTIVE'),

('40', NULL, 'Cumberland Electrical Services', 'cumberland-electrical-services', 'Home Services',
 'Residential and commercial electrical work including panel upgrades, rewiring, and generators.',
 '4800 Raeford Rd, Fayetteville, NC 28304', 'Fayetteville', 'Cumberland', 'NC', '28304',
 '(910) 555-0140', NULL, 'https://example.com/cumberlandelectric',
 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop',
 35.0400, -78.9550, false, 'ACTIVE'),

-- Government & Services  Cumberland County
('41', NULL, 'Cumberland County Courthouse', 'cumberland-county-courthouse', 'Government & Services',
 'County courthouse handling civil and criminal cases, traffic court, and legal filings for Cumberland County.',
 '117 Dick St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 475-3000', NULL, 'https://www.co.cumberland.nc.us',
 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
 35.0520, -78.8780, true, 'ACTIVE'),

('42', NULL, 'Cumberland County Department of Social Services', 'cumberland-county-department-of-social-services', 'Government & Services',
 'Social services including food assistance, Medicaid, child welfare, and aging services for residents.',
 '1225 Ramsey St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 323-1540', NULL, 'https://www.co.cumberland.nc.us/dss',
 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop',
 35.0590, -78.8870, false, 'ACTIVE'),

('43', NULL, 'Fayetteville Public Library', 'fayetteville-public-library', 'Government & Services',
 'Public library system with free internet access, educational programs, children''s story time, and community meeting rooms.',
 '400 Maiden Ln, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 483-7727', NULL, 'https://www.cumberland.lib.nc.us',
 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=300&fit=crop',
 35.0550, -78.8830, false, 'ACTIVE'),

('44', NULL, 'Cumberland County Health Department', 'cumberland-county-health-department', 'Government & Services',
 'Public health services including immunizations, WIC, family planning, STD testing, and environmental health.',
 '1235 Ramsey St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 433-3600', NULL, 'https://co.cumberland.nc.us/health',
 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
 35.0593, -78.8865, false, 'ACTIVE'),

('45', NULL, 'City of Fayetteville — City Hall', 'city-of-fayetteville-city-hall', 'Government & Services',
 'Municipal government offices for permits, utility billing, code enforcement, and city council meetings.',
 '433 Hay St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 433-1990', NULL, 'https://www.fayettevillenc.gov',
 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop',
 35.0530, -78.8800, false, 'ACTIVE'),

('46', NULL, 'Veteran''s Affairs Medical Center', 'veterans-affairs-medical-center', 'Government & Services',
 'VA healthcare facility providing medical, mental health, and specialty care for veterans and their families.',
 '2300 Ramsey St, Fayetteville, NC 28301', 'Fayetteville', 'Cumberland', 'NC', '28301',
 '(910) 488-2120', NULL, 'https://www.va.gov/fayetteville-nc-health-care',
 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=300&fit=crop',
 35.0650, -78.8900, true, 'ACTIVE'),

('47', NULL, 'Spring Lake Town Hall', 'spring-lake-town-hall', 'Government & Services',
 'Municipal services for Spring Lake including water billing, permits, parks and recreation, and town council.',
 '300 Ruth St, Spring Lake, NC 28390', 'Spring Lake', 'Cumberland', 'NC', '28390',
 '(910) 436-0241', NULL, 'https://www.spring-lake.org',
 NULL,
 35.1730, -78.9720, false, 'ACTIVE'),

('48', NULL, 'Hope Mills Town Hall', 'hope-mills-town-hall', 'Government & Services',
 'Municipal government for Hope Mills — permits, utilities, parks programming, and community events.',
 '5770 Rockfish Rd, Hope Mills, NC 28348', 'Hope Mills', 'Cumberland', 'NC', '28348',
 '(910) 424-4555', NULL, 'https://www.townofhopemills.com',
 NULL,
 35.0100, -78.9500, false, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════════════════════════
-- HOKE COUNTY  Raeford
-- ═══════════════════════════════════════════════════════════════════════════════

('50', NULL, 'Hoke County Government Center', 'hoke-county-government-center', 'Government & Services',
 'County government offices for Hoke County including tax, permitting, register of deeds, and board meetings.',
 '227 N Main St, Raeford, NC 28376', 'Raeford', 'Hoke', 'NC', '28376',
 '(910) 875-8751', NULL, 'https://www.hokecounty.net',
 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop',
 35.0015, -79.2245, true, 'ACTIVE'),

('51', NULL, 'Raeford Family Diner', 'raeford-family-diner', 'Restaurants',
 'Down-home Southern cooking with breakfast all day, daily lunch specials, and homemade desserts.',
 '109 S Main St, Raeford, NC 28376', 'Raeford', 'Hoke', 'NC', '28376',
 '(910) 875-3200', NULL, NULL,
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
 35.0010, -79.2240, false, 'ACTIVE'),

('52', NULL, 'Hoke County Health Department', 'hoke-county-health-department', 'Government & Services',
 'Public health services for Hoke County — immunizations, prenatal care, WIC, and communicable disease testing.',
 '683 E Palmer St, Raeford, NC 28376', 'Raeford', 'Hoke', 'NC', '28376',
 '(910) 875-3717', NULL, NULL,
 NULL,
 35.0025, -79.2180, false, 'ACTIVE'),

('53', NULL, 'Hoke County Public Library', 'hoke-county-public-library', 'Government & Services',
 'Public library serving Hoke County with book lending, computer access, children''s programs, and meeting rooms.',
 '334 N Main St, Raeford, NC 28376', 'Raeford', 'Hoke', 'NC', '28376',
 '(910) 875-2502', NULL, NULL,
 NULL,
 35.0020, -79.2250, false, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROBESON COUNTY  Lumberton, Pembroke, St. Pauls
-- ═══════════════════════════════════════════════════════════════════════════════

('54', NULL, 'Robeson County Courthouse', 'robeson-county-courthouse', 'Government & Services',
 'County courthouse for civil and criminal proceedings, register of deeds, and county commissioners meetings.',
 '500 N Elm St, Lumberton, NC 28358', 'Lumberton', 'Robeson', 'NC', '28358',
 '(910) 671-3000', NULL, 'https://www.co.robeson.nc.us',
 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
 34.6182, -79.0066, true, 'ACTIVE'),

('55', NULL, 'UNC Pembroke', 'unc-pembroke', 'Education',
 'Public university offering 41 undergraduate and 18 graduate programs. Home of the Braves, proudly serving since 1887.',
 '1 University Dr, Pembroke, NC 28372', 'Pembroke', 'Robeson', 'NC', '28372',
 '(910) 521-6000', NULL, 'https://www.uncp.edu',
 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
 34.6815, -79.1902, true, 'ACTIVE'),

('56', NULL, 'Fuller''s Old-Fashioned BBQ', 'fullers-old-fashioned-bbq', 'Restaurants',
 'Eastern NC-style barbecue with vinegar-based sauce, slow-smoked pork, and homemade hushpuppies.',
 '3201 Roberts Ave, Lumberton, NC 28358', 'Lumberton', 'Robeson', 'NC', '28358',
 '(910) 738-8694', NULL, NULL,
 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop',
 34.6305, -79.0120, false, 'ACTIVE'),

('57', NULL, 'Robeson County Health Department', 'robeson-county-health-department', 'Government & Services',
 'Public health clinic with immunizations, dental care, prenatal services, and health education programs.',
 '460 Country Club Rd, Lumberton, NC 28360', 'Lumberton', 'Robeson', 'NC', '28360',
 '(910) 671-3200', NULL, NULL,
 NULL,
 34.6280, -79.0200, false, 'ACTIVE'),

('58', NULL, 'Town of St. Pauls', 'town-of-st-pauls', 'Government & Services',
 'Municipal government for St. Pauls — water and sewer billing, code enforcement, and community programs.',
 '207 W Blue St, St. Pauls, NC 28384', 'St. Pauls', 'Robeson', 'NC', '28384',
 '(910) 865-4178', NULL, NULL,
 NULL,
 34.8060, -78.9710, false, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════════════════════════
-- HARNETT COUNTY  Lillington, Dunn, Erwin
-- ═══════════════════════════════════════════════════════════════════════════════

('59', NULL, 'Harnett County Government Complex', 'harnett-county-government-complex', 'Government & Services',
 'County administrative offices including tax, permits, social services, and the board of commissioners.',
 '305 W Cornelius Harnett Blvd, Lillington, NC 27546', 'Lillington', 'Harnett', 'NC', '27546',
 '(910) 893-7555', NULL, 'https://www.harnett.org',
 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop',
 35.3960, -78.8110, true, 'ACTIVE'),

('60', NULL, 'Dunn Area Chamber of Commerce', 'dunn-area-chamber-of-commerce', 'Government & Services',
 'Business support and community development organization for the Dunn area and southern Harnett County.',
 '209 W Divine St, Dunn, NC 28334', 'Dunn', 'Harnett', 'NC', '28334',
 '(910) 892-4113', NULL, 'https://www.dunnchamber.com',
 NULL,
 35.3060, -78.6080, false, 'ACTIVE'),

('61', NULL, 'Sherry''s Bakery', 'sherrys-bakery', 'Restaurants',
 'Beloved local bakery known for fresh bread, pastries, custom cakes, and Southern-style lunch specials.',
 '113 E Broad St, Dunn, NC 28334', 'Dunn', 'Harnett', 'NC', '28334',
 '(910) 892-8825', NULL, NULL,
 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
 35.3070, -78.6070, false, 'ACTIVE'),

('62', NULL, 'Campbell University', 'campbell-university', 'Education',
 'Private university with programs in pharmacy, law, business, and divinity. Home of the Fighting Camels.',
 '143 Main St, Buies Creek, NC 27506', 'Buies Creek', 'Harnett', 'NC', '27506',
 '(910) 893-1200', NULL, 'https://www.campbell.edu',
 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop',
 35.3840, -78.7400, true, 'ACTIVE'),

('63', NULL, 'Harnett County Health Department', 'harnett-county-health-department', 'Government & Services',
 'Public health for Harnett County — immunizations, WIC, family planning, dental clinic, and health education.',
 '307 W Cornelius Harnett Blvd, Lillington, NC 27546', 'Lillington', 'Harnett', 'NC', '27546',
 '(910) 893-7550', NULL, NULL,
 NULL,
 35.3965, -78.8115, false, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPSON COUNTY  Clinton
-- ═══════════════════════════════════════════════════════════════════════════════

('64', NULL, 'Sampson County Courthouse', 'sampson-county-courthouse', 'Government & Services',
 'County courthouse for Sampson County — civil, criminal, and traffic courts plus the register of deeds.',
 '101 E Main St, Clinton, NC 28328', 'Clinton', 'Sampson', 'NC', '28328',
 '(910) 592-6308', NULL, 'https://www.sampsonnc.com',
 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
 35.0125, -78.3233, false, 'ACTIVE'),

('65', NULL, 'Sampson Regional Medical Center', 'sampson-regional-medical-center', 'Health & Wellness',
 'Full-service hospital with emergency care, surgery, imaging, and outpatient clinics serving Sampson County.',
 '607 Beaman St, Clinton, NC 28328', 'Clinton', 'Sampson', 'NC', '28328',
 '(910) 592-8511', NULL, 'https://www.sampsonrmc.org',
 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
 35.0140, -78.3200, true, 'ACTIVE'),

('66', NULL, 'Sampson County Health Department', 'sampson-county-health-department', 'Government & Services',
 'County health services including immunizations, WIC, prenatal care, and environmental health inspections.',
 '360 County Complex Rd, Clinton, NC 28328', 'Clinton', 'Sampson', 'NC', '28328',
 '(910) 592-1131', NULL, NULL,
 NULL,
 35.0110, -78.3250, false, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════════════════════════
-- BLADEN COUNTY  Elizabethtown
-- ═══════════════════════════════════════════════════════════════════════════════

('67', NULL, 'Bladen County Government', 'bladen-county-government', 'Government & Services',
 'Bladen County administrative offices — tax, planning, elections, and social services for residents.',
 '106 E Broad St, Elizabethtown, NC 28337', 'Elizabethtown', 'Bladen', 'NC', '28337',
 '(910) 862-6700', NULL, 'https://www.bladenco.org',
 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop',
 34.6295, -78.6050, false, 'ACTIVE'),

('68', NULL, 'Bladen Community College', 'bladen-community-college', 'Education',
 'Community college offering associate degrees, certificates, and continuing education for Bladen County.',
 '7418 NC-41 Hwy, Dublin, NC 28332', 'Dublin', 'Bladen', 'NC', '28332',
 '(910) 879-5500', NULL, 'https://www.bladencc.edu',
 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
 34.6650, -78.7290, false, 'ACTIVE'),

('69', NULL, 'Bladen County Health Department', 'bladen-county-health-department', 'Government & Services',
 'Public health services for Bladen County — vaccinations, family planning, dental, and environmental health.',
 '300 Mercer Mill Rd, Elizabethtown, NC 28337', 'Elizabethtown', 'Bladen', 'NC', '28337',
 '(910) 862-6900', NULL, NULL,
 NULL,
 34.6310, -78.6080, false, 'ACTIVE'),

-- ═══════════════════════════════════════════════════════════════════════════════
-- MOORE COUNTY  Southern Pines, Aberdeen, Carthage
-- ═══════════════════════════════════════════════════════════════════════════════

('70', NULL, 'Moore County Government Center', 'moore-county-government-center', 'Government & Services',
 'Moore County administrative offices — tax, permits, register of deeds, and county commissioners.',
 '1 Courthouse Square, Carthage, NC 28327', 'Carthage', 'Moore', 'NC', '28327',
 '(910) 947-6363', NULL, 'https://www.moorecountync.gov',
 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop',
 35.3447, -79.4170, true, 'ACTIVE'),

('71', NULL, 'Sandhills Community College', 'sandhills-community-college', 'Education',
 'Community college with academic transfer, career, and continuing education programs in the Sandhills region.',
 '3395 Airport Rd, Pinehurst, NC 28374', 'Pinehurst', 'Moore', 'NC', '28374',
 '(910) 692-6185', NULL, 'https://www.sandhills.edu',
 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
 35.2230, -79.4010, false, 'ACTIVE'),

('72', NULL, 'Southern Pines Brewing Company', 'southern-pines-brewing-company', 'Restaurants',
 'Local craft brewery serving handcrafted ales and lagers with a rotating food truck lineup and live music.',
 '170 NW Broad St, Southern Pines, NC 28387', 'Southern Pines', 'Moore', 'NC', '28387',
 '(910) 693-1767', NULL, 'https://example.com/southernpinesbrewing',
 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400&h=300&fit=crop',
 35.1740, -79.3940, false, 'ACTIVE'),

('73', NULL, 'Moore County Health Department', 'moore-county-health-department', 'Government & Services',
 'Public health services including clinical care, WIC, environmental health, and emergency preparedness.',
 '705 Pinehurst Ave, Carthage, NC 28327', 'Carthage', 'Moore', 'NC', '28327',
 '(910) 947-3300', NULL, NULL,
 NULL,
 35.3430, -79.4160, false, 'ACTIVE')

ON CONFLICT (id) DO NOTHING;
