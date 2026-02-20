/**
 * WCCG 104.5 FM — Real Data Migration
 * Replaces placeholder seed data with actual content from wccg1045fm.com
 *
 * Run: node scripts/migrate-real-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lmoqvvkhibfiwudgdopb.supabase.co';
const SUPABASE_SECRET_KEY = 'sb_secret_MhWj7-Rl3Gs-Ps7g2m3yTQ_LlFkkNSf';

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function deleteAll(table) {
  // Supabase REST API needs a filter for delete — use neq on id to match all
  const { error } = await supabase.from(table).delete().neq('id', '___none___');
  if (error) console.error(`  ✗ DELETE ${table}:`, error.message);
  else console.log(`  ✓ Cleared ${table}`);
}

async function insertRows(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select('id');
  if (error) {
    console.error(`  ✗ INSERT ${table}:`, error.message);
    // Try one by one to find the bad row
    if (rows.length > 1) {
      for (let i = 0; i < rows.length; i++) {
        const { error: e2 } = await supabase.from(table).insert(rows[i]);
        if (e2) console.error(`    ✗ Row ${i} (${rows[i].id || rows[i].name || '?'}):`, e2.message);
      }
    }
    return 0;
  }
  console.log(`  ✓ Inserted ${data.length} rows into ${table}`);
  return data.length;
}

async function main() {
  console.log('=== WCCG Real Data Migration ===\n');

  // 1. CLEAR OLD DATA (reverse dependency order)
  console.log('1. Clearing old data...');
  await deleteAll('schedule_blocks');
  await deleteAll('stream_metadata');
  await deleteAll('stream_sources');
  await deleteAll('show_hosts');
  await deleteAll('show_episodes');
  await deleteAll('shows');
  await deleteAll('hosts');
  await deleteAll('streams');
  await deleteAll('reward_catalog');
  await deleteAll('points_rules');

  // 2. STREAMS
  console.log('\n2. Inserting streams...');
  await insertRows('streams', [
    {
      id: 'stream_wccg', name: 'WCCG 104.5 FM', slug: 'wccg-1045-fm',
      description: "Fayetteville's First and Only Choice for Hip Hop and R&B. Live from 115 Gillespie Street, Fayetteville, NC — WCCG 104.5 FM delivers the hottest Hip-Hop and R&B, local news, community events, and cultural programming to the greater Fayetteville/Fort Liberty region.",
      category: 'HIP_HOP', status: 'ACTIVE', sort_order: 1,
      image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/wccglogo-1.png',
    },
    {
      id: 'stream_soul', name: 'SOUL 104.5 FM', slug: 'soul-1045-fm',
      description: 'Home to timeless tracks and classic R&B favorites. A legacy streaming service featuring curated classic and contemporary R&B programming that honors soul music roots.',
      category: 'RNB', status: 'ACTIVE', sort_order: 2,
      image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/soul-1045-logo-rev2.png',
    },
    {
      id: 'stream_hot', name: 'HOT 104.5 FM', slug: 'hot-1045-fm',
      description: "Hot 104.5 FM brings you the hottest mix of hip-hop and R&B, from today's chart-toppers to throwback anthems that defined the culture. Always live, always lit.",
      category: 'HIP_HOP', status: 'ACTIVE', sort_order: 3,
      image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/hot-revised-new.png',
    },
    {
      id: 'stream_vibe', name: '104.5 The VIBE', slug: '1045-the-vibe',
      description: 'Old School and Classic R&B. Timeless streams that carry the music, culture, and community that built our legacy — now available anytime, anywhere.',
      category: 'RNB', status: 'ACTIVE', sort_order: 4,
      image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/thevibelogo-rev1.png',
    },
    {
      id: 'stream_yard', name: 'Yard & Riddim', slug: 'yard-and-riddim',
      description: 'Your destination for authentic island vibes, roots rhythms, and the heartbeat of the Caribbean. From reggae classics to dancehall anthems and soca vibes.',
      category: 'COMMUNITY', status: 'ACTIVE', sort_order: 5,
      image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/YARDANDRIDDIM.png',
    },
    {
      id: 'stream_mixsquad', name: 'Mix Squad Radio', slug: 'mix-squad-radio',
      description: 'Live Sets, Exclusive Remixes, and High-Energy Mixes. Featuring the largest collection of radio DJs in the region.',
      category: 'HIP_HOP', status: 'ACTIVE', sort_order: 6,
      image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/CHANNEL-3.png',
    },
  ]);

  // 3. STREAM SOURCES
  console.log('\n3. Inserting stream sources...');
  await insertRows('stream_sources', [
    { stream_id: 'stream_wccg', primary_url: 'https://rdo.to/WCCG', mount_point: '/wccg', format: 'mp3', bitrate: 128 },
    { stream_id: 'stream_soul', primary_url: 'https://rdo.to/WCCG', mount_point: '/soul', format: 'mp3', bitrate: 128 },
    { stream_id: 'stream_hot', primary_url: 'https://rdo.to/WCCG', mount_point: '/hot', format: 'mp3', bitrate: 128 },
    { stream_id: 'stream_vibe', primary_url: 'http://leopard.streemlion.com:7185/stream', mount_point: '/vibe', format: 'mp3', bitrate: 128 },
    { stream_id: 'stream_yard', primary_url: 'https://rdo.to/WCCG', mount_point: '/yard', format: 'mp3', bitrate: 128 },
    { stream_id: 'stream_mixsquad', primary_url: 'https://rdo.to/WCCG', mount_point: '/mixsquad', format: 'mp3', bitrate: 128 },
  ]);

  // 4. STREAM METADATA
  console.log('\n4. Inserting stream metadata...');
  await insertRows('stream_metadata', [
    { stream_id: 'stream_wccg', listener_count: 0, is_live: true },
    { stream_id: 'stream_soul', listener_count: 0, is_live: true },
    { stream_id: 'stream_hot', listener_count: 0, is_live: true },
    { stream_id: 'stream_vibe', listener_count: 0, is_live: true },
    { stream_id: 'stream_yard', listener_count: 0, is_live: true },
    { stream_id: 'stream_mixsquad', listener_count: 0, is_live: false },
  ]);

  // 5. HOSTS
  console.log('\n5. Inserting hosts...');
  const hosts = [
    // Main show hosts
    { id: 'host_yung_joc', name: 'Yung Joc', slug: 'yung-joc', bio: 'Host of North Carolina\'s #1 Hip-Hop morning show "The Streetz Morning Takeover." Delivers a high-energy mix of the hottest Hip-Hop & R&B, celebrity gossip, viral trending topics, and non-stop laughs.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/joc-new-main.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_angela_yee', name: 'Angela Yee', slug: 'angela-yee', bio: 'Brooklyn-native radio personality, podcast host, entrepreneur, and philanthropist. Former co-host of The Breakfast Club (2010-2022), inducted into the Radio Hall of Fame (2020). Hosts "Way Up with Angela Yee" weekdays 10AM-2PM.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/angela-yee-new-2.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_incognito', name: 'Incognito', slug: 'incognito', bio: 'Born Jared McGriff in Columbus, Georgia. "Play Hard, Work Harder." Hosts the nationally syndicated "Posted on The Corner" broadcasting to 20+ markets including Atlanta, Houston, Dallas, and more.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/incog-new-1.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_bootleg_kev', name: 'Bootleg Kev', slug: 'bootleg-kev', bio: 'Kevin Diaz — eats, sleeps, and breathes the hip-hop lifestyle with 15+ years of radio experience. Known for securing exclusive artist interviews and freestyles. Delivers six straight hours of overnight content.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/bootleg-kev-new1.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_shorty_corleone', name: 'Shorty Corleone', slug: 'shorty-corleone', bio: 'Charles "Shorty Corleone" Garris — lead vocalist for legendary Go-Go band Rare Essence since 1993. Signed with Warner Bros. Records at age 14. Co-hosts "Crank Radio" on Sirius XM.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/shorty-corleone.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_marvin_sapp', name: 'Marvin Sapp', slug: 'marvin-sapp', bio: 'Grammy-nominated gospel legend. Delivers an uplifting mix of inspiration, conversation, and music blending faith and contemporary gospel every Sunday morning.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/marvin-sapp12.jpg', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_mz_shyneka', name: 'Mz Shyneka', slug: 'mz-shyneka', bio: 'Co-host of "The Streetz Morning Takeover" alongside Yung Joc and Shawty Shawty.', avatar_url: null, email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_shawty_shawty', name: 'Shawty Shawty', slug: 'shawty-shawty', bio: 'Co-host of "The Streetz Morning Takeover." Known for Shawty\'s Crazy Report.', avatar_url: null, email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_dj_misses', name: 'DJ Misses', slug: 'dj-misses', bio: 'Atlanta-based DJ and radio personality. Co-host of "Posted on The Corner" with Incognito.', avatar_url: null, email: 'programming@wccg1045fm.com', is_active: true },
    // Sunday Gospel hosts
    { id: 'host_apostle_monds', name: 'Apostle Anthony Monds', slug: 'apostle-anthony-monds', bio: 'Leader of Grace Plus Nothing Ministries. Delivers spirit-filled teachings every Sunday morning at 8AM.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/gpn-1-1024x743-1.png', email: null, is_active: true },
    { id: 'host_dr_haire', name: 'Dr. Anthony Haire', slug: 'dr-anthony-haire', bio: 'Host of "Encouraging Moments." Shares powerful insights and biblical encouragement Sundays at 9AM.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/thm-main-1024x743-1.png', email: null, is_active: true },
    { id: 'host_pastor_davenport', name: 'Pastor Dr. T.L. Davenport', slug: 'pastor-tl-davenport', bio: 'Leader of Family Fellowship Worship Center, 1014 Danbury Road, Fayetteville, NC.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/ffwc-1024x743-1.png', email: null, is_active: true },
    { id: 'host_rev_fuller', name: 'Reverend F. Bernard Fuller', slug: 'reverend-f-bernard-fuller', bio: 'Leader of Progressive Missionary Baptist Church, Fayetteville, NC.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/progressive-1024x743-1.png', email: null, is_active: true },
    { id: 'host_pastor_stackhouse', name: 'Pastor Dr. Christopher Stackhouse Sr.', slug: 'pastor-christopher-stackhouse', bio: 'Leader of Lewis Chapel Missionary Baptist Church, 5422 Raeford Road, Fayetteville, NC.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/lewis-chapel-1024x743-1.png', email: null, is_active: true },
    // Key Mix Squad DJs
    { id: 'host_dj_ike_gda', name: 'DJ Ike GDA', slug: 'dj-ike-gda', bio: '"The Carolina Trendsetter" — veteran turntablist from Fayetteville, NC. Spinning since 1995. NC DJ of the Year (2008), Jam Master Jay Award (2008), Radio DJ of the Year (2009). Co-host of Sunday Snacks.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/ike-gda-main.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_dj_izzynice', name: 'DJ IzzyNice', slug: 'dj-izzynice', bio: 'High-octane mixer and hype man — a Fayetteville staple with 20+ years experience. Co-host of Sunday Snacks. Part of the "Wright Brothers" duo with DJ Ike GDA.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/izzynice.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_dj_tony_neal', name: 'DJ Tony Neal', slug: 'dj-tony-neal', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/tony-neal-new.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_dj_chuck_t', name: 'DJ Chuck T', slug: 'dj-chuck-t', bio: 'Mix Squad DJ known for signature blends of Southern hip-hop and contemporary R&B.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/dj-chuck-t-NEW1.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_dj_ricoveli', name: 'DJ Ricoveli', slug: 'dj-ricoveli', bio: 'Mix Squad DJ delivering live sets and exclusive remixes.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/rico-dj.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_dj_spinwiz', name: 'DJ SpinWiz', slug: 'dj-spinwiz', bio: 'Mixshow Coordinator for WCCG 104.5 FM Mix Squad.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djspinwiz.png', email: 'programming@wccg1045fm.com', is_active: true },
    { id: 'host_dj_yodo', name: 'DJ Yodo', slug: 'dj-yodo', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/yodo.png', email: null, is_active: true },
    { id: 'host_dj_rayn', name: 'DJ Rayn', slug: 'dj-rayn', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djrayn.png', email: null, is_active: true },
    { id: 'host_dj_daddyblack', name: 'DJ DaddyBlack', slug: 'dj-daddyblack', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djdaddyblack.png', email: null, is_active: true },
    { id: 'host_dj_wolf', name: 'DJ Wolf', slug: 'dj-wolf', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djwolf.png', email: null, is_active: true },
    { id: 'host_dj_whosane', name: 'DJ WhoSane', slug: 'dj-whosane', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djwhosane.png', email: null, is_active: true },
    { id: 'host_dj_swazzey', name: 'DJ Swazzey', slug: 'dj-swazzey', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/SWAZZEY.png', email: null, is_active: true },
    { id: 'host_dj_tommygeemixx', name: 'DJ TommyGeeMixx', slug: 'dj-tommygeemixx', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/TOMMYGEEMIXX.png', email: null, is_active: true },
    { id: 'host_dj_tonelo', name: 'DJ Tonelo', slug: 'dj-tonelo', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/tonelo.png', email: null, is_active: true },
    { id: 'host_dj_weezy', name: 'DJ Weezy', slug: 'dj-weezy', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/DJWEEZY.png', email: null, is_active: true },
    { id: 'host_dj_official', name: 'DJ Official', slug: 'dj-official', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djofficial.png', email: null, is_active: true },
    { id: 'host_dj_loudiamonds', name: 'DJ LouDiamonds', slug: 'dj-loudiamonds', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/loudiamonds.png', email: null, is_active: true },
    { id: 'host_dj_lj', name: 'DJ LJ', slug: 'dj-lj', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djlj.png', email: null, is_active: true },
    { id: 'host_dj_daffie', name: 'DJ Daffie', slug: 'dj-daffie', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/daffie.png', email: null, is_active: true },
    { id: 'host_dj_dane_dinero', name: 'DJ Dane Dinero', slug: 'dj-dane-dinero', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djdanedinero.png', email: null, is_active: true },
    { id: 'host_dj_itanist', name: 'DJ Itanist', slug: 'dj-itanist', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djitanist.png', email: null, is_active: true },
    { id: 'host_dj_jay_b', name: 'DJ Jay-B', slug: 'dj-jay-b', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/DJ-JB-1.png', email: null, is_active: true },
    { id: 'host_dj_juice', name: 'DJ Juice', slug: 'dj-juice', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/Juice.png', email: null, is_active: true },
    { id: 'host_dj_killako', name: 'DJ Killako', slug: 'dj-killako', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/killako.png', email: null, is_active: true },
    { id: 'host_dj_kingviv', name: 'DJ KingViv', slug: 'dj-kingviv', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djkingviv.png', email: null, is_active: true },
    { id: 'host_dj_yafeelme', name: 'DJ YaFeelMe', slug: 'dj-yafeelme', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djyafeelme.png', email: null, is_active: true },
    { id: 'host_dj_t_money', name: 'DJ T-Money', slug: 'dj-t-money', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/djtmoney.png', email: null, is_active: true },
    { id: 'host_dj_chuck', name: 'DJ Chuck', slug: 'dj-chuck', bio: 'Mix Squad DJ.', avatar_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/dj-chuck-370x370-1.jpg', email: null, is_active: true },
  ];
  await insertRows('hosts', hosts);

  // 6. SHOWS
  console.log('\n6. Inserting shows...');
  await insertRows('shows', [
    { id: 'show_streetz', name: 'The Streetz Morning Takeover', slug: 'streetz-morning-takeover', description: "North Carolina's #1 Hip-Hop morning show featuring celebrity gossip, viral trending topics, relationship drama (Date Dilemma), wild news (Shawty's Crazy Report), and non-stop laughs. Mon-Fri 6AM-10AM ET.", image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/attachment-thumbnail_new-streetz-pix.png', is_active: true },
    { id: 'show_way_up', name: 'Way Up with Angela Yee', slug: 'way-up-with-angela-yee', description: 'Nationally syndicated show featuring trending topics, relationship advice, celebrity interviews, and motivational segments. Mon-Fri 10AM-3PM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/angela-yee-new-2.png', is_active: true },
    { id: 'show_posted', name: 'Posted on The Corner', slug: 'posted-on-the-corner', description: 'Nationally syndicated evening show with Top 7 Countdowns, interactive trivia, and exclusive celebrity interviews. Broadcasting to 20+ markets. Mon-Fri 7PM-Midnight ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/incog-new-1.png', is_active: true },
    { id: 'show_bootleg_kev', name: 'The Bootleg Kev Show', slug: 'bootleg-kev-show', description: 'Six straight hours of exclusive artist interviews, viral freestyles, No Cap News, and non-stop bangers. Mon-Fri Midnight-6AM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/bootleg-kev-new1.png', is_active: true },
    { id: 'show_crank', name: 'Crank with Shorty Corleone', slug: 'crank-with-shorty-corleone', description: "Go-Go, Hip-Hop, and R&B fusion bridging D.C.'s legendary Go-Go scene with Carolina urban culture. Sundays 5PM-6PM ET.", image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/shorty-corleone-new.png', is_active: true },
    { id: 'show_sunday_snacks', name: 'Sunday Snacks', slug: 'sunday-snacks', description: 'Five-hour Hip-Hop and R&B mixshow featuring throwback classics, current bangers, and exclusive mixtape drops. Sundays 7PM-Midnight ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/cundaysnacks-new11.png', is_active: true },
    { id: 'show_praise_mix', name: 'The Praise Mix at 6', slug: 'the-praise-mix-at-6', description: 'High-energy gospel remixes and soul-stirring vibes. Part of The Sunday Gospel Caravan. Sundays 6AM-8AM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/praisemix-6.png', is_active: true },
    { id: 'show_marvin_sapp', name: 'The Marvin Sapp Radio Show', slug: 'marvin-sapp-radio-show', description: 'Inspiration, conversation, and contemporary gospel. Part of The Sunday Gospel Caravan. Sundays 10AM-12PM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/11/marvin-sapp-banner.png', is_active: true },
    { id: 'show_grace_plus', name: 'Grace Plus Nothing Ministries', slug: 'grace-plus-nothing', description: 'Spirit-filled teachings with Apostle Anthony Monds. Part of The Sunday Gospel Caravan. Sundays 8AM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/gpn-1-1024x743-1.png', is_active: true },
    { id: 'show_encouraging', name: 'Encouraging Moments', slug: 'encouraging-moments', description: 'Biblical encouragement with Dr. Anthony Haire. Part of The Sunday Gospel Caravan. Sundays 9AM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/thm-main-1024x743-1.png', is_active: true },
    { id: 'show_ffwc', name: 'Family Fellowship Worship Center', slug: 'family-fellowship-worship-center', description: 'Live broadcast from Family Fellowship Worship Center, Fayetteville, NC. Weekdays 12PM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/ffwc-1024x743-1.png', is_active: true },
    { id: 'show_progressive', name: 'Progressive Missionary Baptist Church', slug: 'progressive-missionary-baptist', description: 'Live broadcast with Reverend F. Bernard Fuller. Part of The Sunday Gospel Caravan. Sundays 1PM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/progressive-1024x743-1.png', is_active: true },
    { id: 'show_lewis_chapel', name: 'Lewis Chapel Missionary Baptist Church', slug: 'lewis-chapel-missionary-baptist', description: 'Live broadcast with Pastor Dr. Christopher Stackhouse Sr. Part of The Sunday Gospel Caravan. Sundays 2PM ET.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/10/lewis-chapel-1024x743-1.png', is_active: true },
    { id: 'show_island_freq', name: 'Island Frequency Podcast', slug: 'island-frequency-podcast', description: 'Caribbean culture podcast on mY1045TV.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2026/02/island-freq.png', is_active: true },
    { id: 'show_carolina_effect', name: 'The Carolina Effect', slug: 'the-carolina-effect', description: 'Local culture and community show on mY1045TV with J. Reid.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2026/02/j-reid-head.png', is_active: true },
    { id: 'show_in_it', name: 'IN IT', slug: 'in-it', description: 'Entertainment and culture show on mY1045TV with Big A.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2026/02/init-withbiga.png', is_active: true },
    { id: 'show_mix_squad', name: 'Mix Squad Radio', slug: 'mix-squad-radio', description: 'Curated DJ mixshows featuring top DJs, exclusive blends, and genre-spanning sets.', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/CHANNEL-3.png', is_active: true },
    { id: 'show_duke_football', name: 'Duke Football', slug: 'duke-football', description: 'Live play-by-play coverage of Duke Blue Devils football on WCCG 104.5 FM.', image_url: null, is_active: true },
    { id: 'show_duke_basketball', name: 'Duke Basketball', slug: 'duke-basketball', description: 'Live play-by-play coverage of Duke Blue Devils basketball on WCCG 104.5 FM.', image_url: null, is_active: true },
  ]);

  // 7. SHOW-HOST RELATIONSHIPS
  console.log('\n7. Inserting show-host relationships...');
  await insertRows('show_hosts', [
    { show_id: 'show_streetz', host_id: 'host_yung_joc', is_primary: true },
    { show_id: 'show_streetz', host_id: 'host_mz_shyneka', is_primary: false },
    { show_id: 'show_streetz', host_id: 'host_shawty_shawty', is_primary: false },
    { show_id: 'show_way_up', host_id: 'host_angela_yee', is_primary: true },
    { show_id: 'show_posted', host_id: 'host_incognito', is_primary: true },
    { show_id: 'show_posted', host_id: 'host_dj_misses', is_primary: false },
    { show_id: 'show_bootleg_kev', host_id: 'host_bootleg_kev', is_primary: true },
    { show_id: 'show_crank', host_id: 'host_shorty_corleone', is_primary: true },
    { show_id: 'show_sunday_snacks', host_id: 'host_dj_ike_gda', is_primary: true },
    { show_id: 'show_sunday_snacks', host_id: 'host_dj_izzynice', is_primary: false },
    { show_id: 'show_praise_mix', host_id: 'host_dj_spinwiz', is_primary: true },
    { show_id: 'show_marvin_sapp', host_id: 'host_marvin_sapp', is_primary: true },
    { show_id: 'show_grace_plus', host_id: 'host_apostle_monds', is_primary: true },
    { show_id: 'show_encouraging', host_id: 'host_dr_haire', is_primary: true },
    { show_id: 'show_ffwc', host_id: 'host_pastor_davenport', is_primary: true },
    { show_id: 'show_progressive', host_id: 'host_rev_fuller', is_primary: true },
    { show_id: 'show_lewis_chapel', host_id: 'host_pastor_stackhouse', is_primary: true },
    { show_id: 'show_island_freq', host_id: 'host_dj_daffie', is_primary: true },
    { show_id: 'show_island_freq', host_id: 'host_dj_itanist', is_primary: false },
    { show_id: 'show_island_freq', host_id: 'host_dj_kingviv', is_primary: false },
    { show_id: 'show_mix_squad', host_id: 'host_dj_spinwiz', is_primary: true },
    { show_id: 'show_mix_squad', host_id: 'host_dj_ricoveli', is_primary: false },
    { show_id: 'show_mix_squad', host_id: 'host_dj_tony_neal', is_primary: false },
    { show_id: 'show_mix_squad', host_id: 'host_dj_chuck_t', is_primary: false },
    { show_id: 'show_mix_squad', host_id: 'host_dj_rayn', is_primary: false },
    { show_id: 'show_mix_squad', host_id: 'host_dj_yodo', is_primary: false },
  ]);

  // 8. SCHEDULE BLOCKS
  console.log('\n8. Inserting schedule blocks...');
  const weekdayBlocks = [];
  // Mon-Fri (1-5)
  for (let day = 1; day <= 5; day++) {
    weekdayBlocks.push(
      { stream_id: 'stream_wccg', show_id: 'show_bootleg_kev', title: 'The Bootleg Kev Show', day_of_week: day, start_time: '00:00', end_time: '06:00', is_override: false, is_active: true, color: '#6366f1' },
      { stream_id: 'stream_wccg', show_id: 'show_streetz', title: 'The Streetz Morning Takeover', day_of_week: day, start_time: '06:00', end_time: '10:00', is_override: false, is_active: true, color: '#ef4444' },
      { stream_id: 'stream_wccg', show_id: 'show_way_up', title: 'Way Up with Angela Yee', day_of_week: day, start_time: '10:00', end_time: '15:00', is_override: false, is_active: true, color: '#f59e0b' },
      { stream_id: 'stream_wccg', show_id: null, title: 'Afternoon Drive', day_of_week: day, start_time: '15:00', end_time: '19:00', is_override: false, is_active: true, color: '#3b82f6' },
      { stream_id: 'stream_wccg', show_id: 'show_posted', title: 'Posted on The Corner', day_of_week: day, start_time: '19:00', end_time: '23:59', is_override: false, is_active: true, color: '#8b5cf6' },
    );
  }

  // Sunday (0)
  const sundayBlocks = [
    { stream_id: 'stream_wccg', show_id: 'show_praise_mix', title: 'The Praise Mix at 6', day_of_week: 0, start_time: '06:00', end_time: '08:00', is_override: false, is_active: true, color: '#10b981' },
    { stream_id: 'stream_wccg', show_id: 'show_grace_plus', title: 'Grace Plus Nothing Ministries', day_of_week: 0, start_time: '08:00', end_time: '09:00', is_override: false, is_active: true, color: '#10b981' },
    { stream_id: 'stream_wccg', show_id: 'show_encouraging', title: 'Encouraging Moments', day_of_week: 0, start_time: '09:00', end_time: '10:00', is_override: false, is_active: true, color: '#10b981' },
    { stream_id: 'stream_wccg', show_id: 'show_marvin_sapp', title: 'The Marvin Sapp Radio Show', day_of_week: 0, start_time: '10:00', end_time: '12:00', is_override: false, is_active: true, color: '#10b981' },
    { stream_id: 'stream_wccg', show_id: 'show_progressive', title: 'Progressive Missionary Baptist Church', day_of_week: 0, start_time: '13:00', end_time: '14:00', is_override: false, is_active: true, color: '#10b981' },
    { stream_id: 'stream_wccg', show_id: 'show_lewis_chapel', title: 'Lewis Chapel Missionary Baptist Church', day_of_week: 0, start_time: '14:00', end_time: '15:00', is_override: false, is_active: true, color: '#10b981' },
    { stream_id: 'stream_wccg', show_id: 'show_crank', title: 'Crank with Shorty Corleone', day_of_week: 0, start_time: '17:00', end_time: '18:00', is_override: false, is_active: true, color: '#ec4899' },
    { stream_id: 'stream_wccg', show_id: 'show_sunday_snacks', title: 'Sunday Snacks', day_of_week: 0, start_time: '19:00', end_time: '23:59', is_override: false, is_active: true, color: '#8b5cf6' },
  ];

  // Saturday (6)
  const saturdayBlocks = [
    { stream_id: 'stream_wccg', show_id: 'show_mix_squad', title: 'Weekend Mix Sessions', day_of_week: 6, start_time: '08:00', end_time: '12:00', is_override: false, is_active: true, color: '#f97316' },
    { stream_id: 'stream_wccg', show_id: null, title: 'Weekend Countdown', day_of_week: 6, start_time: '12:00', end_time: '15:00', is_override: false, is_active: true, color: '#3b82f6' },
    { stream_id: 'stream_wccg', show_id: null, title: 'Day Party Radio', day_of_week: 6, start_time: '15:00', end_time: '19:00', is_override: false, is_active: true, color: '#ec4899' },
    { stream_id: 'stream_wccg', show_id: null, title: 'Mixtape Radio', day_of_week: 6, start_time: '19:00', end_time: '23:59', is_override: false, is_active: true, color: '#8b5cf6' },
  ];

  await insertRows('schedule_blocks', [...weekdayBlocks, ...sundayBlocks, ...saturdayBlocks]);

  // 9. POINTS RULES
  console.log('\n9. Inserting points rules...');
  await insertRows('points_rules', [
    { name: 'Streaming Reward', trigger_type: 'LISTEN_MINUTES', points_amount: 10, threshold: 30, is_active: true, cooldown_minutes: 60 },
    { name: 'Event Check-In', trigger_type: 'EVENT_ATTENDANCE', points_amount: 50, threshold: 1, is_active: true, cooldown_minutes: 0 },
    { name: 'New Member Bonus', trigger_type: 'SIGNUP', points_amount: 100, threshold: 1, is_active: true, cooldown_minutes: 0 },
    { name: 'Marketplace Purchase', trigger_type: 'PURCHASE', points_amount: 25, threshold: 1, is_active: true, cooldown_minutes: 0 },
    { name: 'Daily Stream Bonus', trigger_type: 'LISTEN_MINUTES', points_amount: 5, threshold: 10, is_active: true, cooldown_minutes: 1440 },
    { name: 'Power Listener (1hr)', trigger_type: 'LISTEN_MINUTES', points_amount: 25, threshold: 60, is_active: true, cooldown_minutes: 360 },
  ]);

  // 10. REWARD CATALOG
  console.log('\n10. Inserting reward catalog...');
  await insertRows('reward_catalog', [
    { name: 'WCCG T-Shirt', description: 'Official WCCG 104.5 FM branded t-shirt', image_url: 'https://wccg1045fm.com/wp-content/uploads/2025/09/wccglogo-1.png', points_cost: 500, category: 'MERCHANDISE', stock_count: 50, is_active: true },
    { name: 'Power Listener Badge', description: 'Digital badge for your mY1045 profile', points_cost: 200, category: 'DIGITAL', is_active: true },
    { name: 'Super Listener Badge', description: 'Digital badge — Super Listener rank', points_cost: 500, category: 'DIGITAL', is_active: true },
    { name: 'VIP Superfan Badge', description: 'Digital badge — VIP Superfan rank', points_cost: 1000, category: 'DIGITAL', is_active: true },
    { name: 'Broadcast Royalty Badge', description: 'Ultimate digital badge — Broadcast Royalty rank', points_cost: 2500, category: 'DIGITAL', is_active: true },
    { name: 'Free Event Ticket', description: 'One free general admission ticket to any WCCG community event', points_cost: 750, category: 'EXPERIENCE', stock_count: 20, is_active: true },
    { name: 'Local Restaurant Gift Card ($10)', description: 'Gift card redeemable at partner restaurants in the Fayetteville area', points_cost: 1000, category: 'LOCAL', stock_count: 25, is_active: true },
    { name: 'Exclusive Stream Access', description: 'Early access to new premium streams and bonus stations', points_cost: 300, category: 'DIGITAL', is_active: true },
    { name: 'Behind-the-Scenes Pass', description: 'Access to exclusive behind-the-scenes content', points_cost: 1500, category: 'EXPERIENCE', stock_count: 10, is_active: true },
    { name: 'WCCG Sticker Pack', description: 'Set of WCCG 104.5 FM branded stickers and collectibles', points_cost: 150, category: 'MERCHANDISE', stock_count: 100, is_active: true },
    { name: 'Creator Ad Credit ($25)', description: 'Ad credit for creators and marketplace vendors', points_cost: 2000, category: 'CREATOR', stock_count: 15, is_active: true },
    { name: 'Profile Boost', description: 'Sponsored profile boost for your creator or marketplace listing', points_cost: 500, category: 'CREATOR', is_active: true },
  ]);

  console.log('\n=== Migration Complete! ===');
}

main().catch(console.error);
