-- ============================================================================
-- WCCG 104.5 FM — Real Data Migration
-- Replaces placeholder seed data with actual content from wccg1045fm.com
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CLEAR OLD SEED DATA (reverse dependency order)
-- ============================================================================
DELETE FROM schedule_blocks;
DELETE FROM stream_metadata;
DELETE FROM stream_sources;
DELETE FROM show_hosts;
DELETE FROM show_episodes;
DELETE FROM shows;
DELETE FROM hosts;
DELETE FROM streams;
DELETE FROM reward_catalog;
DELETE FROM points_rules;

-- ============================================================================
-- 2. STREAMS — Real WCCG channels
-- ============================================================================
INSERT INTO streams (id, name, slug, description, category, status, sort_order, image_url) VALUES
('stream_wccg', 'WCCG 104.5 FM', 'wccg-1045-fm',
 'Fayetteville''s First and Only Choice for Hip Hop and R&B. Live from 115 Gillespie Street, Fayetteville, NC — WCCG 104.5 FM delivers the hottest Hip-Hop and R&B, local news, community events, and cultural programming to the greater Fayetteville/Fort Liberty region.',
 'HIP_HOP', 'ACTIVE', 1,
 'https://wccg1045fm.com/wp-content/uploads/2025/09/wccglogo-1.png'),

('stream_soul', 'SOUL 104.5 FM', 'soul-1045-fm',
 'Home to timeless tracks and classic R&B favorites. A legacy streaming service featuring curated classic and contemporary R&B programming that honors soul music roots — designed for music enthusiasts who appreciate depth, melody, and meaning.',
 'RNB', 'ACTIVE', 2,
 'https://wccg1045fm.com/wp-content/uploads/2025/09/soul-1045-logo-rev2.png'),

('stream_hot', 'HOT 104.5 FM', 'hot-1045-fm',
 'Hot 104.5 FM brings you the hottest mix of hip-hop and R&B, from today''s chart-toppers to throwback anthems that defined the culture. Always live, always lit — Fayetteville''s home for real music and real energy.',
 'HIP_HOP', 'ACTIVE', 3,
 'https://wccg1045fm.com/wp-content/uploads/2025/09/hot-revised-new.png'),

('stream_vibe', '104.5 The VIBE', '1045-the-vibe',
 'Old School and Classic R&B. Timeless streams that carry the music, culture, and community that built our legacy — now available anytime, anywhere. Featuring The Gap Band, Stevie Wonder, Michael Jackson, Earth Wind & Fire, and more.',
 'RNB', 'ACTIVE', 4,
 'https://wccg1045fm.com/wp-content/uploads/2025/09/thevibelogo-rev1.png'),

('stream_yard', 'Yard & Riddim', 'yard-and-riddim',
 'Your destination for authentic island vibes, roots rhythms, and the heartbeat of the Caribbean. From reggae classics to dancehall anthems and soca vibes, Yard & Riddim celebrates the heartbeat of the Caribbean with music that uplifts, unites, and moves the soul.',
 'COMMUNITY', 'ACTIVE', 5,
 'https://wccg1045fm.com/wp-content/uploads/2025/09/YARDANDRIDDIM.png'),

('stream_mixsquad', 'Mix Squad Radio', 'mix-squad-radio',
 'Live Sets, Exclusive Remixes, and High-Energy Mixes. Featuring the largest collection of radio DJs in the region, covering hip-hop and R&B to reggae, gospel, and talk.',
 'HIP_HOP', 'ACTIVE', 6,
 'https://wccg1045fm.com/wp-content/uploads/2025/09/CHANNEL-3.png');

-- ============================================================================
-- 3. STREAM SOURCES
-- ============================================================================
INSERT INTO stream_sources (id, stream_id, primary_url, fallback_url, mount_point, format, bitrate) VALUES
(gen_random_uuid(), 'stream_wccg', 'https://rdo.to/WCCG', NULL, '/wccg', 'mp3', 128),
(gen_random_uuid(), 'stream_soul', 'https://rdo.to/WCCG', NULL, '/soul', 'mp3', 128),
(gen_random_uuid(), 'stream_hot', 'https://rdo.to/WCCG', NULL, '/hot', 'mp3', 128),
(gen_random_uuid(), 'stream_vibe', 'http://leopard.streemlion.com:7185/stream', NULL, '/vibe', 'mp3', 128),
(gen_random_uuid(), 'stream_yard', 'https://rdo.to/WCCG', NULL, '/yard', 'mp3', 128),
(gen_random_uuid(), 'stream_mixsquad', 'https://rdo.to/WCCG', NULL, '/mixsquad', 'mp3', 128);

-- ============================================================================
-- 4. STREAM METADATA (initial state)
-- ============================================================================
INSERT INTO stream_metadata (id, stream_id, current_title, current_artist, current_track, album_art, listener_count, is_live, last_updated) VALUES
(gen_random_uuid(), 'stream_wccg', NULL, NULL, NULL, NULL, 0, true, now()),
(gen_random_uuid(), 'stream_soul', NULL, NULL, NULL, NULL, 0, true, now()),
(gen_random_uuid(), 'stream_hot', NULL, NULL, NULL, NULL, 0, true, now()),
(gen_random_uuid(), 'stream_vibe', NULL, NULL, NULL, NULL, 0, true, now()),
(gen_random_uuid(), 'stream_yard', NULL, NULL, NULL, NULL, 0, true, now()),
(gen_random_uuid(), 'stream_mixsquad', NULL, NULL, NULL, NULL, 0, false, now());

-- ============================================================================
-- 5. HOSTS — Real personalities from wccg1045fm.com
-- ============================================================================

-- Main show hosts
INSERT INTO hosts (id, name, slug, bio, avatar_url, email, is_active) VALUES
('host_yung_joc', 'Yung Joc', 'yung-joc',
 'Host of North Carolina''s #1 Hip-Hop morning show "The Streetz Morning Takeover." Delivers a high-energy mix of the hottest Hip-Hop & R&B, celebrity gossip, viral trending topics, relationship drama, and non-stop laughs weekday mornings.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/joc-new-main.png',
 'programming@wccg1045fm.com', true),

('host_angela_yee', 'Angela Yee', 'angela-yee',
 'Brooklyn-native radio personality, podcast host, entrepreneur, and philanthropist. Former co-host of The Breakfast Club (2010-2022), inducted into the Radio Hall of Fame (2020). Now hosts "Way Up with Angela Yee" weekdays 10AM-2PM, featuring trending topics, relationship advice, and celebrity interviews.',
 'https://wccg1045fm.com/wp-content/uploads/2025/09/angela-yee-new-2.png',
 'programming@wccg1045fm.com', true),

('host_incognito', 'Incognito', 'incognito',
 'Born Jared McGriff in Columbus, Georgia. Radio personality whose "Play Hard, Work Harder" mantra drives the nationally syndicated "Posted on The Corner" show. Started at age 16 with frequent calls to local radio. Built career across Ohio Urban One stations before national syndication in 2020, now broadcasting to 20+ markets.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/incog-new-1.png',
 'programming@wccg1045fm.com', true),

('host_bootleg_kev', 'Bootleg Kev', 'bootleg-kev',
 'Kevin Diaz, born September 2, 1985, in Phoenix, Arizona. Eats, sleeps, and breathes the hip-hop lifestyle with 15+ years of radio experience across Phoenix, Vegas, Tampa, and Los Angeles. Known for securing exclusive artist interviews and freestyles with major acts. Delivers six straight hours of overnight content.',
 'https://wccg1045fm.com/wp-content/uploads/2025/09/bootleg-kev-new1.png',
 'programming@wccg1045fm.com', true),

('host_shorty_corleone', 'Shorty Corleone', 'shorty-corleone',
 'Charles "Shorty Corleone" Garris — born in Washington, D.C.''s Southeast neighborhood. Signed recording deal with Warner Bros. Records at age 14. Lead vocalist and frontman for legendary Go-Go band Rare Essence since 1993 (30+ years). Co-hosts nationally syndicated "Crank Radio" on Sirius XM.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/shorty-corleone.png',
 'programming@wccg1045fm.com', true),

('host_marvin_sapp', 'Marvin Sapp', 'marvin-sapp',
 'Grammy-nominated gospel legend and host of The Marvin Sapp Radio Show. Delivers an uplifting mix of inspiration, conversation, and music blending faith and contemporary gospel every Sunday morning.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/marvin-sapp12.jpg',
 'programming@wccg1045fm.com', true),

('host_mz_shyneka', 'Mz Shyneka', 'mz-shyneka',
 'Co-host of "The Streetz Morning Takeover" alongside Yung Joc and Shawty Shawty. Brings energy, wit, and real talk to North Carolina''s #1 Hip-Hop morning show.',
 NULL, 'programming@wccg1045fm.com', true),

('host_shawty_shawty', 'Shawty Shawty', 'shawty-shawty',
 'Co-host of "The Streetz Morning Takeover." Known for Shawty''s Crazy Report — delivering wild news and non-stop laughs on the morning show.',
 NULL, 'programming@wccg1045fm.com', true),

('host_dj_misses', 'DJ Misses', 'dj-misses',
 'Atlanta-based DJ and radio personality. Co-host of "Posted on The Corner" with Incognito. Known for her distinctive style and mixing expertise, bringing infectious energy through celebrity interviews and cultural commentary.',
 NULL, 'programming@wccg1045fm.com', true),

-- Sunday Gospel hosts
('host_apostle_monds', 'Apostle Anthony Monds', 'apostle-anthony-monds',
 'Leader of Grace Plus Nothing Ministries. Delivers spirit-filled teachings that empower listeners to walk boldly in faith and embrace God''s grace every Sunday morning at 8AM.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/gpn-1-1024x743-1.png',
 NULL, true),

('host_dr_haire', 'Dr. Anthony Haire', 'dr-anthony-haire',
 'Host of "Encouraging Moments." Shares powerful insights, uplifting messages, and biblical encouragement every Sunday morning at 9AM on WCCG.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/thm-main-1024x743-1.png',
 NULL, true),

('host_pastor_davenport', 'Pastor Dr. T.L. Davenport', 'pastor-tl-davenport',
 'Leader of Family Fellowship Worship Center at 1014 Danbury Road, Fayetteville, NC. Broadcasts weekday services at noon on WCCG.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/ffwc-1024x743-1.png',
 NULL, true),

('host_rev_fuller', 'Reverend F. Bernard Fuller', 'reverend-f-bernard-fuller',
 'Leader of Progressive Missionary Baptist Church at Unity Chapel at Cliffdale, 1037 71st School Road, Fayetteville, NC. Broadcasts Sunday services at 1PM on WCCG.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/progressive-1024x743-1.png',
 NULL, true),

('host_pastor_stackhouse', 'Pastor Dr. Christopher Stackhouse Sr.', 'pastor-christopher-stackhouse',
 'Leader of Lewis Chapel Missionary Baptist Church at 5422 Raeford Road, Fayetteville, NC. Broadcasts Sunday services at 2PM on WCCG.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/lewis-chapel-1024x743-1.png',
 NULL, true),

-- DJ Mix Squad (key DJs)
('host_dj_ike_gda', 'DJ Ike GDA', 'dj-ike-gda',
 'Veteran turntablist and radio host from Fayetteville, NC — dubbed "The Carolina Trendsetter." Spinning since 1995 (age 15), three decades in the Southern hip-hop scene. NC DJ of the Year (2008), Jam Master Jay Award (2008), Radio DJ of the Year (2009). Co-host of Sunday Snacks and contributor to SiriusXM Shade 45.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/ike-gda-main.png',
 'programming@wccg1045fm.com', true),

('host_dj_izzynice', 'DJ IzzyNice', 'dj-izzynice',
 'High-octane mixer and hype man — a Fayetteville, NC staple with 20+ years experience. Co-host of Sunday Snacks. Known for razor-sharp transitions and crowd-reading prowess. Part of the "Wright Brothers" duo with DJ Ike GDA.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/izzynice.png',
 'programming@wccg1045fm.com', true),

('host_dj_tony_neal', 'DJ Tony Neal', 'dj-tony-neal',
 'Mix Squad DJ specializing in high-energy Hip-Hop and R&B sets.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/tony-neal-new.png',
 'programming@wccg1045fm.com', true),

('host_dj_chuck_t', 'DJ Chuck T', 'dj-chuck-t',
 'Mix Squad DJ known for his signature blends of Southern hip-hop and contemporary R&B.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/dj-chuck-t-NEW1.png',
 'programming@wccg1045fm.com', true),

('host_dj_ricoveli', 'DJ Ricoveli', 'dj-ricoveli',
 'Mix Squad DJ delivering live sets and exclusive remixes.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/rico-dj.png',
 'programming@wccg1045fm.com', true),

('host_dj_spinwiz', 'DJ SpinWiz', 'dj-spinwiz',
 'Mixshow Coordinator for WCCG 104.5 FM Mix Squad. Oversees the DJ rotation and curated mixshow programming.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djspinwiz.png',
 'programming@wccg1045fm.com', true),

('host_dj_yodo', 'DJ Yodo', 'dj-yodo',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/yodo.png',
 NULL, true),

('host_dj_rayn', 'DJ Rayn', 'dj-rayn',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djrayn.png',
 NULL, true),

('host_dj_daddyblack', 'DJ DaddyBlack', 'dj-daddyblack',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djdaddyblack.png',
 NULL, true),

('host_dj_wolf', 'DJ Wolf', 'dj-wolf',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djwolf.png',
 NULL, true),

('host_dj_whosane', 'DJ WhoSane', 'dj-whosane',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djwhosane.png',
 NULL, true),

('host_dj_swazzey', 'DJ Swazzey', 'dj-swazzey',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/SWAZZEY.png',
 NULL, true),

('host_dj_tommygeemixx', 'DJ TommyGeeMixx', 'dj-tommygeemixx',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/TOMMYGEEMIXX.png',
 NULL, true),

('host_dj_tonelo', 'DJ Tonelo', 'dj-tonelo',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/tonelo.png',
 NULL, true),

('host_dj_weezy', 'DJ Weezy', 'dj-weezy',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/DJWEEZY.png',
 NULL, true),

('host_dj_official', 'DJ Official', 'dj-official',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djofficial.png',
 NULL, true),

('host_dj_loudiamonds', 'DJ LouDiamonds', 'dj-loudiamonds',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/loudiamonds.png',
 NULL, true),

('host_dj_lj', 'DJ LJ', 'dj-lj',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djlj.png',
 NULL, true),

('host_dj_daffie', 'DJ Daffie', 'dj-daffie',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/daffie.png',
 NULL, true),

('host_dj_dane_dinero', 'DJ Dane Dinero', 'dj-dane-dinero',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djdanedinero.png',
 NULL, true),

('host_dj_itanist', 'DJ Itanist', 'dj-itanist',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djitanist.png',
 NULL, true),

('host_dj_jay_b', 'DJ Jay-B', 'dj-jay-b',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/DJ-JB-1.png',
 NULL, true),

('host_dj_juice', 'DJ Juice', 'dj-juice',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/Juice.png',
 NULL, true),

('host_dj_killako', 'DJ Killako', 'dj-killako',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/killako.png',
 NULL, true),

('host_dj_kingviv', 'DJ KingViv', 'dj-kingviv',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djkingviv.png',
 NULL, true),

('host_dj_yafeelme', 'DJ YaFeelMe', 'dj-yafeelme',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djyafeelme.png',
 NULL, true),

('host_dj_t_money', 'DJ T-Money', 'dj-t-money',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/djtmoney.png',
 NULL, true),

('host_dj_chuck', 'DJ Chuck', 'dj-chuck',
 'Mix Squad DJ.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/dj-chuck-370x370-1.jpg',
 NULL, true);

-- ============================================================================
-- 6. SHOWS — Real WCCG shows
-- ============================================================================
INSERT INTO shows (id, name, slug, description, image_url, is_active) VALUES
('show_streetz', 'The Streetz Morning Takeover', 'streetz-morning-takeover',
 'North Carolina''s #1 Hip-Hop morning show featuring a high-energy mix of the hottest Hip-Hop & R&B, celebrity gossip, viral trending topics, relationship drama (Date Dilemma), wild news (Shawty''s Crazy Report), and non-stop laughs. Mon-Fri 6AM-10AM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/attachment-thumbnail_new-streetz-pix.png', true),

('show_way_up', 'Way Up with Angela Yee', 'way-up-with-angela-yee',
 'Nationally syndicated show featuring trending topics, relationship advice, anonymous caller confessions ("Tell Us a Secret"), celebrity interviews, and motivational segments including "Shine a Light on ''Em" and "Rumor Report." Mon-Fri 10AM-3PM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/09/angela-yee-new-2.png', true),

('show_posted', 'Posted on The Corner', 'posted-on-the-corner',
 'Nationally syndicated evening show delivering high-energy vibes with fan-voted Top 7 Countdowns, interactive trivia, "Trending on the Timeline" segments, and exclusive celebrity interviews. Broadcasting to 20+ markets. Mon-Fri 7PM-Midnight ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/incog-new-1.png', true),

('show_bootleg_kev', 'The Bootleg Kev Show', 'bootleg-kev-show',
 'Six straight hours of exclusive artist interviews, viral freestyles, No Cap News, wild caller roasts, and non-stop bangers. Targeted at night-shift workers and the late-night crowd. Mon-Fri Midnight-6AM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/09/bootleg-kev-new1.png', true),

('show_crank', 'Crank with Shorty Corleone', 'crank-with-shorty-corleone',
 'High-energy mixshow delivering Go-Go, Hip-Hop, and R&B fusion that bridges D.C.''s legendary Go-Go scene with Carolina urban culture. Features live scratches, call-in shoutouts, and pocket-driven grooves. Sundays 5PM-6PM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/shorty-corleone-new.png', true),

('show_sunday_snacks', 'Sunday Snacks', 'sunday-snacks',
 'Five-hour Hip-Hop and R&B mixshow featuring throwback classics, current bangers, and exclusive mixtape drops with live scratching and hosting. Sundays 7PM-Midnight ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/09/cundaysnacks-new11.png', true),

('show_praise_mix', 'The Praise Mix at 6', 'the-praise-mix-at-6',
 'High-energy gospel remixes, uplifting anthems, and soul-stirring vibes featuring inspirational DJs. Part of The Sunday Gospel Caravan. Sundays 6AM-8AM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/praisemix-6.png', true),

('show_marvin_sapp', 'The Marvin Sapp Radio Show', 'marvin-sapp-radio-show',
 'An uplifting mix of inspiration, conversation, and music blending faith and contemporary gospel. Part of The Sunday Gospel Caravan. Sundays 10AM-12PM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/11/marvin-sapp-banner.png', true),

('show_grace_plus', 'Grace Plus Nothing Ministries', 'grace-plus-nothing',
 'Spirit-filled teachings that empower listeners to walk boldly in faith and embrace God''s grace. With Apostle Anthony Monds. Part of The Sunday Gospel Caravan. Sundays 8AM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/gpn-1-1024x743-1.png', true),

('show_encouraging', 'Encouraging Moments', 'encouraging-moments',
 'Powerful insights, uplifting messages, and biblical encouragement with Dr. Anthony Haire. Part of The Sunday Gospel Caravan. Sundays 9AM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/thm-main-1024x743-1.png', true),

('show_ffwc', 'Family Fellowship Worship Center', 'family-fellowship-worship-center',
 'Live broadcast from Family Fellowship Worship Center, 1014 Danbury Road, Fayetteville, NC. With Pastor Dr. T.L. Davenport. Weekdays 12PM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/ffwc-1024x743-1.png', true),

('show_progressive', 'Progressive Missionary Baptist Church', 'progressive-missionary-baptist',
 'Live broadcast from Progressive Missionary Baptist Church, Unity Chapel at Cliffdale. With Reverend F. Bernard Fuller. Part of The Sunday Gospel Caravan. Sundays 1PM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/progressive-1024x743-1.png', true),

('show_lewis_chapel', 'Lewis Chapel Missionary Baptist Church', 'lewis-chapel-missionary-baptist',
 'Live broadcast from Lewis Chapel Missionary Baptist Church, 5422 Raeford Road, Fayetteville, NC. With Pastor Dr. Christopher Stackhouse Sr. Part of The Sunday Gospel Caravan. Sundays 2PM ET.',
 'https://wccg1045fm.com/wp-content/uploads/2025/10/lewis-chapel-1024x743-1.png', true),

('show_island_freq', 'Island Frequency Podcast', 'island-frequency-podcast',
 'Caribbean culture podcast on mY1045TV featuring DJ Daiffie, DJ Itanist, DJ KingViv, and Slimm.',
 'https://wccg1045fm.com/wp-content/uploads/2026/02/island-freq.png', true),

('show_carolina_effect', 'The Carolina Effect', 'the-carolina-effect',
 'Local culture and community show on mY1045TV with J. Reid.',
 'https://wccg1045fm.com/wp-content/uploads/2026/02/j-reid-head.png', true),

('show_in_it', 'IN IT', 'in-it',
 'Entertainment and culture show on mY1045TV with Big A.',
 'https://wccg1045fm.com/wp-content/uploads/2026/02/init-withbiga.png', true),

('show_mix_squad', 'Mix Squad Radio', 'mix-squad-radio',
 'Curated DJ mixshows bringing together top DJs, exclusive blends, and genre-spanning sets that keep the energy moving. Featuring the largest collection of radio DJs in the region.',
 'https://wccg1045fm.com/wp-content/uploads/2025/09/CHANNEL-3.png', true),

('show_duke_football', 'Duke Football', 'duke-football',
 'Live play-by-play coverage of Duke Blue Devils football on WCCG 104.5 FM.',
 NULL, true),

('show_duke_basketball', 'Duke Basketball', 'duke-basketball',
 'Live play-by-play coverage of Duke Blue Devils basketball on WCCG 104.5 FM.',
 NULL, true);

-- ============================================================================
-- 7. SHOW-HOST RELATIONSHIPS
-- ============================================================================
INSERT INTO show_hosts (show_id, host_id, is_primary) VALUES
-- Streetz Morning Takeover
('show_streetz', 'host_yung_joc', true),
('show_streetz', 'host_mz_shyneka', false),
('show_streetz', 'host_shawty_shawty', false),
-- Way Up with Angela Yee
('show_way_up', 'host_angela_yee', true),
-- Posted on The Corner
('show_posted', 'host_incognito', true),
('show_posted', 'host_dj_misses', false),
-- Bootleg Kev Show
('show_bootleg_kev', 'host_bootleg_kev', true),
-- Crank with Shorty Corleone
('show_crank', 'host_shorty_corleone', true),
-- Sunday Snacks
('show_sunday_snacks', 'host_dj_ike_gda', true),
('show_sunday_snacks', 'host_dj_izzynice', false),
-- Sunday Gospel Caravan shows
('show_praise_mix', 'host_dj_spinwiz', true),
('show_marvin_sapp', 'host_marvin_sapp', true),
('show_grace_plus', 'host_apostle_monds', true),
('show_encouraging', 'host_dr_haire', true),
('show_ffwc', 'host_pastor_davenport', true),
('show_progressive', 'host_rev_fuller', true),
('show_lewis_chapel', 'host_pastor_stackhouse', true),
-- Island Frequency Podcast
('show_island_freq', 'host_dj_daffie', true),
('show_island_freq', 'host_dj_itanist', false),
('show_island_freq', 'host_dj_kingviv', false),
-- Mix Squad Radio (key DJs)
('show_mix_squad', 'host_dj_spinwiz', true),
('show_mix_squad', 'host_dj_ricoveli', false),
('show_mix_squad', 'host_dj_tony_neal', false),
('show_mix_squad', 'host_dj_chuck_t', false),
('show_mix_squad', 'host_dj_rayn', false),
('show_mix_squad', 'host_dj_yodo', false);

-- ============================================================================
-- 8. SCHEDULE BLOCKS — Real WCCG weekday schedule (stream_wccg)
-- ============================================================================

-- Monday-Friday schedule (dayOfWeek 1-5)
-- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

-- Weekday schedule for WCCG main stream
INSERT INTO schedule_blocks (id, stream_id, show_id, title, day_of_week, start_time, end_time, is_override, is_active, color) VALUES
-- Monday
(gen_random_uuid(), 'stream_wccg', 'show_streetz', 'The Streetz Morning Takeover', 1, '06:00', '10:00', false, true, '#ef4444'),
(gen_random_uuid(), 'stream_wccg', 'show_way_up', 'Way Up with Angela Yee', 1, '10:00', '15:00', false, true, '#f59e0b'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Afternoon Drive', 1, '15:00', '19:00', false, true, '#3b82f6'),
(gen_random_uuid(), 'stream_wccg', 'show_posted', 'Posted on The Corner', 1, '19:00', '23:59', false, true, '#8b5cf6'),
(gen_random_uuid(), 'stream_wccg', 'show_bootleg_kev', 'The Bootleg Kev Show', 1, '00:00', '06:00', false, true, '#6366f1'),
-- Tuesday
(gen_random_uuid(), 'stream_wccg', 'show_streetz', 'The Streetz Morning Takeover', 2, '06:00', '10:00', false, true, '#ef4444'),
(gen_random_uuid(), 'stream_wccg', 'show_way_up', 'Way Up with Angela Yee', 2, '10:00', '15:00', false, true, '#f59e0b'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Afternoon Drive', 2, '15:00', '19:00', false, true, '#3b82f6'),
(gen_random_uuid(), 'stream_wccg', 'show_posted', 'Posted on The Corner', 2, '19:00', '23:59', false, true, '#8b5cf6'),
(gen_random_uuid(), 'stream_wccg', 'show_bootleg_kev', 'The Bootleg Kev Show', 2, '00:00', '06:00', false, true, '#6366f1'),
-- Wednesday
(gen_random_uuid(), 'stream_wccg', 'show_streetz', 'The Streetz Morning Takeover', 3, '06:00', '10:00', false, true, '#ef4444'),
(gen_random_uuid(), 'stream_wccg', 'show_way_up', 'Way Up with Angela Yee', 3, '10:00', '15:00', false, true, '#f59e0b'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Afternoon Drive', 3, '15:00', '19:00', false, true, '#3b82f6'),
(gen_random_uuid(), 'stream_wccg', 'show_posted', 'Posted on The Corner', 3, '19:00', '23:59', false, true, '#8b5cf6'),
(gen_random_uuid(), 'stream_wccg', 'show_bootleg_kev', 'The Bootleg Kev Show', 3, '00:00', '06:00', false, true, '#6366f1'),
-- Thursday
(gen_random_uuid(), 'stream_wccg', 'show_streetz', 'The Streetz Morning Takeover', 4, '06:00', '10:00', false, true, '#ef4444'),
(gen_random_uuid(), 'stream_wccg', 'show_way_up', 'Way Up with Angela Yee', 4, '10:00', '15:00', false, true, '#f59e0b'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Afternoon Drive', 4, '15:00', '19:00', false, true, '#3b82f6'),
(gen_random_uuid(), 'stream_wccg', 'show_posted', 'Posted on The Corner', 4, '19:00', '23:59', false, true, '#8b5cf6'),
(gen_random_uuid(), 'stream_wccg', 'show_bootleg_kev', 'The Bootleg Kev Show', 4, '00:00', '06:00', false, true, '#6366f1'),
-- Friday
(gen_random_uuid(), 'stream_wccg', 'show_streetz', 'The Streetz Morning Takeover', 5, '06:00', '10:00', false, true, '#ef4444'),
(gen_random_uuid(), 'stream_wccg', 'show_way_up', 'Way Up with Angela Yee', 5, '10:00', '15:00', false, true, '#f59e0b'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Afternoon Drive', 5, '15:00', '19:00', false, true, '#3b82f6'),
(gen_random_uuid(), 'stream_wccg', 'show_posted', 'Posted on The Corner', 5, '19:00', '23:59', false, true, '#8b5cf6'),
(gen_random_uuid(), 'stream_wccg', 'show_bootleg_kev', 'The Bootleg Kev Show', 5, '00:00', '06:00', false, true, '#6366f1'),

-- Sunday Gospel Caravan (dayOfWeek = 0)
(gen_random_uuid(), 'stream_wccg', 'show_praise_mix', 'The Praise Mix at 6', 0, '06:00', '08:00', false, true, '#10b981'),
(gen_random_uuid(), 'stream_wccg', 'show_grace_plus', 'Grace Plus Nothing Ministries', 0, '08:00', '09:00', false, true, '#10b981'),
(gen_random_uuid(), 'stream_wccg', 'show_encouraging', 'Encouraging Moments', 0, '09:00', '10:00', false, true, '#10b981'),
(gen_random_uuid(), 'stream_wccg', 'show_marvin_sapp', 'The Marvin Sapp Radio Show', 0, '10:00', '12:00', false, true, '#10b981'),
(gen_random_uuid(), 'stream_wccg', 'show_progressive', 'Progressive Missionary Baptist Church', 0, '13:00', '14:00', false, true, '#10b981'),
(gen_random_uuid(), 'stream_wccg', 'show_lewis_chapel', 'Lewis Chapel Missionary Baptist Church', 0, '14:00', '15:00', false, true, '#10b981'),
(gen_random_uuid(), 'stream_wccg', 'show_crank', 'Crank with Shorty Corleone', 0, '17:00', '18:00', false, true, '#ec4899'),
(gen_random_uuid(), 'stream_wccg', 'show_sunday_snacks', 'Sunday Snacks', 0, '19:00', '23:59', false, true, '#8b5cf6'),

-- Saturday schedule (dayOfWeek = 6)
(gen_random_uuid(), 'stream_wccg', 'show_mix_squad', 'Weekend Mix Sessions', 6, '08:00', '12:00', false, true, '#f97316'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Weekend Countdown', 6, '12:00', '15:00', false, true, '#3b82f6'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Day Party Radio', 6, '15:00', '19:00', false, true, '#ec4899'),
(gen_random_uuid(), 'stream_wccg', NULL, 'Mixtape Radio', 6, '19:00', '23:59', false, true, '#8b5cf6');

-- ============================================================================
-- 9. POINTS RULES — Based on mY1045 Perks system
-- ============================================================================
INSERT INTO points_rules (id, name, trigger_type, points_amount, threshold, is_active, cooldown_minutes) VALUES
(gen_random_uuid(), 'Streaming Reward', 'LISTEN_MINUTES', 10, 30, true, 60),
(gen_random_uuid(), 'Event Check-In', 'EVENT_ATTENDANCE', 50, 1, true, 0),
(gen_random_uuid(), 'New Member Bonus', 'SIGNUP', 100, 1, true, 0),
(gen_random_uuid(), 'Marketplace Purchase', 'PURCHASE', 25, 1, true, 0),
(gen_random_uuid(), 'Daily Stream Bonus', 'LISTEN_MINUTES', 5, 10, true, 1440),
(gen_random_uuid(), 'Power Listener (1hr)', 'LISTEN_MINUTES', 25, 60, true, 360);

-- ============================================================================
-- 10. REWARD CATALOG — Based on mY1045 Perks
-- ============================================================================
INSERT INTO reward_catalog (id, name, description, image_url, points_cost, category, stock_count, is_active) VALUES
(gen_random_uuid(), 'WCCG T-Shirt', 'Official WCCG 104.5 FM branded t-shirt', 'https://wccg1045fm.com/wp-content/uploads/2025/09/wccglogo-1.png', 500, 'MERCHANDISE', 50, true),
(gen_random_uuid(), 'Power Listener Badge', 'Digital badge for your mY1045 profile — Power Listener rank', NULL, 200, 'DIGITAL', NULL, true),
(gen_random_uuid(), 'Super Listener Badge', 'Digital badge for your mY1045 profile — Super Listener rank', NULL, 500, 'DIGITAL', NULL, true),
(gen_random_uuid(), 'VIP Superfan Badge', 'Digital badge for your mY1045 profile — VIP Superfan rank', NULL, 1000, 'DIGITAL', NULL, true),
(gen_random_uuid(), 'Broadcast Royalty Badge', 'Ultimate digital badge for your mY1045 profile — Broadcast Royalty rank', NULL, 2500, 'DIGITAL', NULL, true),
(gen_random_uuid(), 'Free Event Ticket', 'One free general admission ticket to any WCCG community event', NULL, 750, 'EXPERIENCE', 20, true),
(gen_random_uuid(), 'Local Restaurant Gift Card ($10)', 'Gift card redeemable at partner restaurants in the Fayetteville area', NULL, 1000, 'LOCAL', 25, true),
(gen_random_uuid(), 'Exclusive Stream Access', 'Early access to new premium streams and bonus stations', NULL, 300, 'DIGITAL', NULL, true),
(gen_random_uuid(), 'Behind-the-Scenes Pass', 'Access to exclusive behind-the-scenes content and artist releases', NULL, 1500, 'EXPERIENCE', 10, true),
(gen_random_uuid(), 'WCCG Sticker Pack', 'Set of WCCG 104.5 FM branded stickers and collectibles', NULL, 150, 'MERCHANDISE', 100, true),
(gen_random_uuid(), 'Creator Ad Credit ($25)', 'Ad credit for creators and marketplace vendors', NULL, 2000, 'CREATOR', 15, true),
(gen_random_uuid(), 'Profile Boost', 'Sponsored profile boost for your creator or marketplace listing', NULL, 500, 'CREATOR', NULL, true);

COMMIT;
