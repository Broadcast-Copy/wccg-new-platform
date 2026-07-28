/* =====================================================================
   Broadcast Copy — Station Dollhouse
   Exploded isometric floor plates. Everything modeled from primitives;
   all signage drawn on canvas. No image assets.
   ===================================================================== */
/* ?motion=1 forces animation on — headless Chrome/Edge and some embedded
   panes report prefers-reduced-motion:reduce, which otherwise makes the
   motion work impossible to capture. */
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  && !/(\?|&)motion=1\b/.test(location.search);
/* Ambient life (cars, pedestrians, meters, beacons) runs regardless of the
   reduced-motion flag — embedded panes and headless browsers report `reduce`
   unasked, freezing the whole diorama. REDUCED still governs camera moves and
   parallax, which are the actual vestibular triggers. ?motion=0 stills all. */
const ANIM = !/(\?|&)motion=0\b/.test(location.search);
if(THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

/* ---------- plan constants: every floor is a 2x2 quadrant plate ------ */
const PX0 = -17, PX1 = 17;      // plate extent X   (34 wide)
const PZ0 = -13, PZ1 = 13;      // plate extent Z   (26 deep)
const MX = 0, MZ = 0;           // cross-wall axes
const WH = 3.6;                 // wall height
const WT = 0.52;                // wall thickness
const ST = 0.7;                 // slab thickness
/* exploded cascade: each higher plate steps up and back so every floor
   interior stays visible from the fixed isometric view */
const GAP = 10, SGX = -6, SGZ = -12;
const OFF = i => new THREE.Vector3(SGX*i, GAP*i, SGZ*i);
const levelG = [];
const LEVEL_SUNS = [];

/* quadrant helpers */
const Q = {
  bl: {x:[PX0, MX], z:[PZ0, MZ]},   // back-left
  br: {x:[MX, PX1], z:[PZ0, MZ]},   // back-right
  fl: {x:[PX0, MX], z:[MZ, PZ1]},   // front-left
  fr: {x:[MX, PX1], z:[MZ, PZ1]},   // front-right
};
const QC = q => [ (Q[q].x[0]+Q[q].x[1])/2, (Q[q].z[0]+Q[q].z[1])/2 ];

/* ---------- data ---------- */
const ROOMS = [
  {id:"onair", name:"On-Air Studio", group:"Studios", floor:3, q:"bl",
   control:"AirSuite On-Air Console",
   promise:"Live assist by day, fully automated by night — segues, liners and voice-tracked shifts with zero dead air.",
   gear:[["AirSuite on-air position","Log playout, hot keys and auto segues driven by the schedule database."],
         ["Mic chain","Skimmer recording and auto levels on every break."],
         ["Silence watchdog rack","Detects dead air and heals the stream before listeners notice."],
         ["ON AIR tally","Lit by the engine itself — no wall switch."]]},
  {id:"production", name:"Production Studio", group:"Studios", floor:3, q:"br",
   control:"AirSuite Production Console",
   promise:"Script to finished spot in minutes — session presets, neural voiceover and one-click dub straight to the air log.",
   gear:[["AirSuite production position","Session presets, beds and tags, one-click dub to air."],
         ["Voice booth","Neural VO in any voice, accent or tone when talent is off-clock."],
         ["Waveform monitor","Auto loudness and de-breath to broadcast spec."]]},
  {id:"podcast", name:"Podcast Studio", group:"Studios", floor:3, q:"fr",
   control:"AirSuite Podcast Desk",
   promise:"Record once, publish everywhere — multitrack capture with auto RSS, YouTube and episode pages.",
   gear:[["Round-table mics","Multitrack capture, auto mix and leveling."],
         ["Camera","Auto clips for shorts and full episodes to YouTube."],
         ["Episode pipeline","RSS feeds and station site pages update themselves."]]},

  {id:"gaming", name:"Gaming Studio", group:"Studios", floor:3, q:"fl",
   control:"Broadcast Copy Game Desk",
   promise:"The station's gaming channel — streams, clips and tournament nights that publish themselves.",
   gear:[["Battle stations","Every session captured; highlights clipped to socials automatically."],
         ["Stream rig","Camera, overlay and stream key managed by the engine — one button to go live."],
         ["Console corner","Community game nights scheduled and promoted with the station log."]]},

  {id:"programming", name:"Programming", group:"Operations", floor:2, q:"bl",
   control:"Broadcast Copy Scheduler",
   promise:"The clock builds itself. Dayparts, features and specials flow from one schedule database to the site, the app and the air chain.",
   gear:[["Clock board","Program clocks and dayparts assembled by rule, not by hand."],
         ["Scheduling desk","One schedule drives the website, engine and guides."],
         ["Market clocks","Every station, every time zone, one view."]]},
  {id:"music", name:"Music Library", group:"Operations", floor:2, q:"br",
   control:"Broadcast Copy Library",
   promise:"Rotations that never collide. New music lands from email to cart to rotation without anyone touching a file.",
   gear:[["Stacks","Library audits, dedupe and metadata repair on schedule."],
         ["Audition deck","New-music pipeline pulls submissions straight from email."],
         ["Cart crate","Auto conversion to broadcast WAV, correct cart numbers every time."]]},
  {id:"traffic", name:"Traffic & Billing", group:"Operations", floor:2, q:"fr",
   control:"Broadcast Copy Traffic Desk",
   promise:"Logs reconcile themselves. Orders become spots, spots become affidavits, affidavits become invoices.",
   gear:[["Log workstation","Orders placed to log with conflict and separation rules."],
         ["Makegood board","Missed spots re-placed automatically."],
         ["Billing printer","Invoices and affidavits generated at log close."]]},

  {id:"sales", name:"Sales", group:"Front Office", floor:1, q:"bl",
   control:"Broadcast Copy CRM",
   promise:"A pipeline wired straight to the log — live pacing, instant proposals and lead alerts the moment they land.",
   gear:[["Pacing chart","Booked vs. goal, live from traffic."],
         ["Sales desk","CRM with proposals generated from real avails."],
         ["Hotline","New leads alert the desk in seconds."]]},
  {id:"promotions", name:"Promotions", group:"Front Office", floor:1, q:"br",
   control:"Broadcast Copy Promo Engine",
   promise:"Contests that run themselves — entries, winner picks, rules pages and the listener points economy.",
   gear:[["Prize wheel","Winner selection with rules and eligibility built in."],
         ["Prize closet","Inventory and fulfillment tracked per campaign."],
         ["Street kit","Banners, remotes and appearances scheduled with the log."]]},
  {id:"hr", name:"HR & People", group:"Front Office", floor:1, q:"fr",
   control:"Broadcast Copy People Desk",
   promise:"Onboarding on rails — roles, permissions and air-shift certifications mapped to one org chart.",
   gear:[["Org chart","Roles map to platform permissions automatically."],
         ["Review table","Air checks and shift certifications on schedule."],
         ["Records","Policy acknowledgements filed and retrievable."]]},

  {id:"lobby", name:"Lobby & Reception", short:"Lobby", group:"Front Office", floor:0, q:"fl",
   control:"Broadcast Copy Front Desk",
   promise:"The front door, digitized — visitor logs, station tours and one brand system on every surface.",
   gear:[["Reception","Visitor log and tour bookings, no clipboard."],
         ["Brand wall","One brand kit rendered everywhere, from lobby to web."]]},
  {id:"web", name:"Web & Digital", group:"Creative", floor:0, q:"bl",
   control:"Broadcast Copy Site Engine",
   promise:"The station site updates itself — shows, hosts, schedules and streams rebuilt from the database on every change.",
   gear:[["Site desk","Pages rebuild from the station database — no webmaster required."],
         ["Dev desk","Apps, players and embeds share the same live data."],
         ["Stream rack","Streams, status and uptime watched around the clock."]]},
  {id:"design", name:"Design Studio", group:"Creative", floor:0, q:"br",
   control:"Broadcast Copy Brand Kit",
   promise:"One brand, every export — social templates, and a merch line that designs itself, from the mug up.",
   gear:[["Drafting table","Layouts templated once, reused forever."],
         ["Merch shelf","Mugs, tees and caps mocked up and pushed to the station store automatically."],
         ["Swatch wall","Station palette enforced across the platform."]]},
  {id:"photo", name:"Photography Studio", group:"Creative", floor:0, q:"fr",
   control:"Broadcast Copy Media Desk",
   promise:"Shot to site in one step — host portraits and event photos cropped, tagged and published to their pages.",
   gear:[["Backdrop","Consistent look for every host and guest."],
         ["Camera","Auto crop, tag and publish to host pages."],
         ["Lighting","Presets so every shoot matches the last."]]},

  {id:"transmitter", name:"Transmitter Site", group:"Field",
   ext:{cx:-34, cy:14, cz:20, w:22, h:30, d:18},
   control:"AirSuite Signal Chain",
   promise:"The mast never sleeps — power, modulation and tower lights watched around the clock, with the studio link failing over before anyone reaches for a phone.",
   gear:[["Lattice mast","Tower light and beacon status logged for the FCC without a clipboard."],
         ["Control building","Transmitter telemetry on the same dashboard as the studio."],
         ["Studio-transmitter link","Switches to the backup path on its own — the engine knows before you do."]]},
  {id:"van", name:"Remote Van", group:"Field", ext:{cx:32, cy:2.6, cz:-4, w:12, h:9.5, d:9},
   control:"AirSuite Remote Link",
   promise:"The station drives to the show — bonded uplink, auto codec connect and a mast that phones home.",
   gear:[["Telescoping mast","Bonded uplink straight into the stream chain."],
         ["Roof dish","Automatic backup path when the crowd kills the cell site."],
         ["Mobile unit","Codec connects itself when the engine sees the van go live."]]},
  {id:"remote", name:"Live Remote", group:"Field", ext:{cx:32, cy:2.4, cz:10, w:12.5, h:8, d:13},
   control:"AirSuite Remote Console",
   promise:"Broadcast from anywhere — a folding table becomes a studio with liners, sweepers and sponsor reads on time.",
   gear:[["Remote console","Same AirSuite surface, running on a laptop."],
         ["PA stack","Break liners and sponsor reads fire on schedule."],
         ["Site kit","Canopy to cable, checklisted and tracked."]]},

  {id:"drive", name:"In-Car Radio", group:"Audience", ext:{cx:2, cy:1.6, cz:38, w:34, h:4.5, d:8.5},
   control:"Broadcast Copy Drive",
   promise:"Your signal rides along — CarPlay and Android Auto with live now-playing, and a log timed to the commute.",
   gear:[["Dash metadata","Artist, title and station brand on every dashboard, fed straight from the engine."],
         ["Drive-time clock","Morning and evening logs built around the commute, automatically."],
         ["Roadside promo","Billboard flights and remotes booked on the same traffic log as the spots."]]},
  {id:"homes", name:"Connected Homes", group:"Audience", ext:{cx:0, cy:2.8, cz:54, w:62, h:9.5, d:28},
   control:"Broadcast Copy Home Channels",
   promise:"Living rooms are listeners too — the station's TV apps and smart speakers, fed by the same engine as the air chain. Click a house to lift its roof.",
   gear:[["TV apps","Roku, Fire TV and Apple TV channels — video, streams and now-playing managed from one content library."],
         ["Smart speakers","“Play WBCC” on Alexa and Google — skills kept live and certified automatically."],
         ["Rooftop antenna","Over the air by antenna, everywhere else by app — the household never hears the switch."]]},
  {id:"listeners", name:"Mobile Listeners", group:"Audience", ext:{cx:17, cy:2.6, cz:100, w:27, h:9, d:21},
   control:"Broadcast Copy Listener App",
   promise:"The station in every pocket — stream, points and check-ins in one app, and a stage in the park where the crowd checks in for double points.",
   gear:[["Live stream","Now playing, up next and the full schedule, everywhere they walk."],
         ["Points & check-ins","The loyalty economy that keeps 216,000+ listener events moving."],
         ["Show alerts","A push the moment their show, contest or remote goes live."]]},
  {id:"ooh", name:"Billboards & Screens", group:"Audience", ext:{cx:27, cy:3, cz:30, w:17, h:8, d:9},
   control:"Broadcast Copy Ad Screens",
   promise:"Every screen sells — the roadside board and the reels looping in partner stores, all cut from the same brand kit.",
   gear:[["Digital billboard","Campaigns flighted to the roadside screen straight from the traffic log."],
         ["In-store reels","Sponsor loops for partner shops, exported to every screen size automatically."],
         ["Proof of play","Every rotation logged toward the affidavit — no phone calls, no photos."]]},
  {id:"biz", name:"Connected Businesses", group:"Audience", ext:{cx:45.5, cy:2.4, cz:62, w:29, h:7, d:38},
   control:"Broadcast Copy Storefront",
   promise:"The whole commercial district runs on the station too — in-store audio, window screens and spot schedules fed by the same engine as the air chain.",
   gear:[["In-store audio","The station feed with storefront-safe breaks — overhead music and live reads, licensed per location."],
         ["Window screens","Menu boards and promo reels synced to the campaign calendar — one update hits every shopfront."],
         ["Local spot pipeline","Commercials produced upstairs flow straight to the strip — booked, aired and screened from one log."]]}
];
const GROUPS = ["Studios","Operations","Front Office","Creative","Field","Audience"];

/* ---------- renderer ---------- */
const stage = document.getElementById("stage");
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xd2cfc7);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, 1.4, 0.5, 500);

/* soft studio environment for PBR shading */
{
  const es = new THREE.Scene();
  const eb = (w,h,d,c,x,y,z)=>{ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshBasicMaterial({color:c})); m.position.set(x,y,z); es.add(m); };
  eb(80,1,80, 0xffffff, 0,30,0);
  eb(1,40,80, 0xfff0dc, -40,10,0);
  eb(1,40,80, 0xdde8f4, 40,10,0);
  eb(80,40,1, 0xf2efe8, 0,10,-40);
  eb(80,40,1, 0xeae7df, 0,10,40);
  eb(80,1,80, 0xbdb8ad, 0,-10,0);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(es, 0.04).texture;
}

scene.add(new THREE.AmbientLight(0xffffff, 0.14));
scene.add(new THREE.HemisphereLight(0xffffff, 0xc6c0b4, 0.3));
const rim = new THREE.DirectionalLight(0xdce7f2, 0.34);
rim.position.set(-38, 20, -28);
scene.add(rim);

/* One sun per plate, isolated by layer. A single shared sun would let a
   chair on the top floor throw a shadow down onto the floor two plates
   below — with the cascade offset, those land as stray smears. */
const SUN_DIR = new THREE.Vector3(20, 74, 54).normalize();
for(let i=0;i<4;i++){
  const s = new THREE.DirectionalLight(0xfff6e9, 1.5);
  s.castShadow = true;
  s.shadow.mapSize.set(2048, 2048);
  s.shadow.camera.left = -26; s.shadow.camera.right = 26;
  s.shadow.camera.top = 24;   s.shadow.camera.bottom = -24;
  s.shadow.camera.near = 1;   s.shadow.camera.far = 130;
  s.shadow.bias = -0.0006; s.shadow.normalBias = 0.03;
  if(i === 0){
    // the ground level also owns the terrain, road, cars and trees
    s.shadow.camera.left = -66; s.shadow.camera.right = 66;
    s.shadow.camera.top = 64;   s.shadow.camera.bottom = -130;
    s.shadow.camera.far = 250;
    s.shadow.mapSize.set(4096, 4096);
  }
  s.layers.set(i+1);
  s.shadow.camera.layers.set(i+1);
  scene.add(s.target);
  scene.add(s);
  LEVEL_SUNS.push(s);
}

/* ---------- materials ---------- */
function std(hex, o){ return Object.assign(new THREE.MeshStandardMaterial(
  {color:hex, roughness:0.88, metalness:0, envMapIntensity:0.6}), o||{}); }
const MAT = {
  white:  () => std(0xffffff, {roughness:0.7}),
  wall:   () => std(0xffffff, {roughness:0.93, envMapIntensity:0.42}),
  wallTop:() => std(0xf4f1ea, {roughness:0.95, envMapIntensity:0.4}),
  slab:   () => std(0xf2efe8, {roughness:0.94, envMapIntensity:0.38}),
  soft:   () => std(0xebe8e1, {roughness:0.92}),
  ink:    () => std(0x2a261e, {roughness:0.4, metalness:0.55, envMapIntensity:1.0}),
  inkFlat:() => std(0x211e18, {roughness:0.34, metalness:0.7, envMapIntensity:1.05}),
  gray:   () => std(0xbdb8ae),
  mid:    () => std(0x8f8a80),
  accent: () => std(0xff4a1c, {roughness:0.44, envMapIntensity:0.8}),
  glass:  () => new THREE.MeshPhysicalMaterial({color:0xdfeaf0, roughness:0.07, metalness:0,
            transparent:true, opacity:0.3, envMapIntensity:1.5}),
  leaf:   () => std(0x4f5a4d, {roughness:0.9}),
  screen: () => std(0x191712, {roughness:0.22, envMapIntensity:1.35}),
  rubber: () => std(0x201d17, {roughness:0.96, envMapIntensity:0.18}),
  chrome: () => std(0xcfccc5, {roughness:0.22, metalness:0.9, envMapIntensity:1.3}),
};
const emissive = hex => new THREE.MeshBasicMaterial({color:hex, toneMapped:false});

/* ---------- primitives (y = bottom) ---------- */
function Bo(g, w,h,d, mat, x,y,z, ry=0, rz=0, rx=0){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x, y+h/2, z); m.rotation.set(rx, ry, rz);
  m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function Cy(g, rT,rB,h, mat, x,y,z, seg=22, rz=0, rx=0){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT,rB,h,seg), mat);
  m.position.set(x, y+h/2, z); m.rotation.z = rz; m.rotation.x = rx;
  m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function Sp(g, r, mat, x,y,z, sy=1){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
  m.position.set(x,y,z); m.scale.y = sy;
  m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function Pl(g, w,h, mat, x,y,z, ry=0, rx=0){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
  m.position.set(x,y,z); m.rotation.y = ry; m.rotation.x = rx;
  g.add(m); return m;
}
/* a member spanning two points — orientation solved, not guessed at */
const _sa = new THREE.Vector3(), _sb = new THREE.Vector3(), _sd = new THREE.Vector3();
const _UP = new THREE.Vector3(0,1,0);
function strut(g, a, b, r, mat){
  _sa.fromArray(a); _sb.fromArray(b); _sd.subVectors(_sb, _sa);
  const len = _sd.length();
  if(len < 0.001) return null;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(_sa).addScaledVector(_sd, 0.5);
  m.quaternion.setFromUnitVectors(_UP, _sd.clone().normalize());
  m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function Torus(g, r, tube, mat, x,y,z, rx=Math.PI/2){
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 40), mat);
  m.position.set(x,y,z); m.rotation.x = rx;
  m.castShadow = m.receiveShadow = true; g.add(m); return m;
}

/* ---------- canvas textures ---------- */
function tex(w, h, draw){
  const c = document.createElement("canvas");
  c.width = w*3; c.height = h*3;
  const x = c.getContext("2d"); x.scale(3,3);
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.encoding = THREE.sRGBEncoding;
  return t;
}
function signMat(t){ return new THREE.MeshBasicMaterial({map:t, transparent:true, toneMapped:false}); }
function rr(x, a,b,w,h,r){ x.beginPath();
  x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r);
  x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }
const F = "Inter,Segoe UI,sans-serif";

const TILE = tex(128,128,(x,w,h)=>{
  x.fillStyle="#fcfbf8"; x.fillRect(0,0,w,h);
  x.strokeStyle="#e2ded4"; x.lineWidth=1.6;
  x.strokeRect(0.8,0.8,w-1.6,h-1.6);
});
TILE.wrapS = TILE.wrapT = THREE.RepeatWrapping;

const BLOB = tex(128,128,(x,w,h)=>{
  const gr = x.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
  gr.addColorStop(0, "rgba(38,33,25,0.5)");
  gr.addColorStop(0.6, "rgba(38,33,25,0.22)");
  gr.addColorStop(1, "rgba(38,33,25,0)");
  x.fillStyle = gr; x.fillRect(0,0,w,h);
});
function mkBlobShadow(parent, w, d, y){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({map:BLOB, transparent:true, depthWrite:false, toneMapped:false}));
  m.rotation.x = -Math.PI/2; m.position.y = y;
  m.renderOrder = 2; m.userData.noBounds = true;
  parent.add(m); return m;
}

const TX = {
  onair: tex(256, 84, (x,w,h)=>{
    x.fillStyle="#fff"; rr(x,3,3,w-6,h-6,14); x.fill();
    x.strokeStyle="#ff4a1c"; x.lineWidth=5; rr(x,5,5,w-10,h-10,12); x.stroke();
    x.fillStyle="#ff4a1c"; x.font="800 34px "+F; x.textAlign="center"; x.textBaseline="middle";
    x.letterSpacing="8px"; x.fillText("ON AIR", w/2+4, h/2+2);
  }),
  live: tex(220, 90, (x,w,h)=>{
    x.fillStyle="#ff4a1c"; rr(x,2,2,w-4,h-4,16); x.fill();
    x.fillStyle="#fff"; x.font="800 40px "+F; x.textAlign="center"; x.textBaseline="middle";
    x.letterSpacing="12px"; x.fillText("LIVE", w/2+6, h/2+2);
  }),
  vanword: tex(420, 60, (x,w,h)=>{
    x.fillStyle="#231f18"; x.font="600 26px "+F; x.textAlign="center"; x.textBaseline="middle";
    x.letterSpacing="4px"; x.fillText("broadcastcopy.ai", w/2, h/2);
  }),
  banner: tex(560, 70, (x,w,h)=>{
    x.fillStyle="#fff"; rr(x,2,2,w-4,h-4,10); x.fill();
    x.strokeStyle="#231f18"; x.lineWidth=3; rr(x,3,3,w-6,h-6,9); x.stroke();
    x.fillStyle="#ff4a1c"; x.beginPath(); x.arc(52,h/2,9,0,7); x.fill();
    x.fillStyle="#231f18"; x.font="800 26px "+F; x.textAlign="center"; x.textBaseline="middle";
    x.letterSpacing="10px"; x.fillText("LIVE REMOTE", w/2+20, h/2+1);
  }),
  wordwall: tex(430, 60, (x,w,h)=>{
    x.fillStyle="#ff4a1c"; x.beginPath(); x.arc(26,h/2,10,0,7); x.fill();
    x.fillStyle="#231f18"; x.font="800 24px "+F; x.textAlign="left"; x.textBaseline="middle";
    x.letterSpacing="7px"; x.fillText("BROADCAST COPY", 48, h/2+1);
  }),
  sched: tex(300, 190, (x,w,h)=>{
    x.fillStyle="#fff"; x.fillRect(0,0,w,h);
    x.strokeStyle="#231f18"; x.lineWidth=4; x.strokeRect(2,2,w-4,h-4);
    x.strokeStyle="#e0dcd4"; x.lineWidth=2;
    for(let i=1;i<6;i++){ x.beginPath(); x.moveTo(i*w/6,4); x.lineTo(i*w/6,h-4); x.stroke(); }
    for(let j=1;j<4;j++){ x.beginPath(); x.moveTo(4,j*h/4); x.lineTo(w-4,j*h/4); x.stroke(); }
    const cell=(cx,cy,col)=>{ x.fillStyle=col; x.fillRect(cx*w/6+5, cy*h/4+5, w/6-10, h/4-10); };
    cell(1,1,"#ff4a1c"); cell(3,0,"#cfcabf"); cell(4,2,"#cfcabf"); cell(0,3,"#e8e4dc"); cell(5,1,"#e8e4dc");
  }),
  calendar: tex(260, 180, (x,w,h)=>{
    x.fillStyle="#fff"; x.fillRect(0,0,w,h);
    x.strokeStyle="#231f18"; x.lineWidth=4; x.strokeRect(2,2,w-4,h-4);
    x.beginPath(); x.moveTo(4,40); x.lineTo(w-4,40); x.stroke();
    x.fillStyle="#231f18"; x.font="700 17px "+F; x.letterSpacing="4px"; x.fillText("JULY", 16, 28);
    for(let r=0;r<3;r++) for(let c=0;c<6;c++){
      const on=(r*6+c)%4!==2, acc=(r*6+c)%7===3;
      x.fillStyle = acc?"#ff4a1c": on?"#cfcabf":"#eee9e1";
      x.beginPath(); x.arc(34+c*38, 70+r*38, 7, 0, 7); x.fill();
    }
  }),
  org: tex(260, 160, (x,w,h)=>{
    x.fillStyle="#fff"; x.fillRect(0,0,w,h);
    x.strokeStyle="#231f18"; x.lineWidth=3;
    x.beginPath(); x.moveTo(w/2,44); x.lineTo(w/2,70); x.moveTo(46,70); x.lineTo(w-46,70);
    x.moveTo(46,70); x.lineTo(46,92); x.moveTo(w/2,70); x.lineTo(w/2,92); x.moveTo(w-46,70); x.lineTo(w-46,92); x.stroke();
    const bx=(cx,cy,col)=>{ x.fillStyle=col; rr(x,cx-30,cy-14,60,28,6); x.fill();
      if(col==="#fff"){ x.strokeStyle="#231f18"; x.lineWidth=3; rr(x,cx-30,cy-14,60,28,6); x.stroke(); } };
    bx(w/2,30,"#ff4a1c"); bx(46,106,"#fff"); bx(w/2,106,"#fff"); bx(w-46,106,"#fff");
  }),
  chart: tex(240, 160, (x,w,h)=>{
    x.fillStyle="#fff"; x.fillRect(0,0,w,h);
    x.strokeStyle="#231f18"; x.lineWidth=4; x.strokeRect(2,2,w-4,h-4);
    x.strokeStyle="#e0dcd4"; x.lineWidth=2;
    for(let j=1;j<4;j++){ x.beginPath(); x.moveTo(6,j*h/4); x.lineTo(w-6,j*h/4); x.stroke(); }
    x.strokeStyle="#ff4a1c"; x.lineWidth=6; x.lineJoin="round"; x.beginPath();
    x.moveTo(20,h-30); x.lineTo(70,h-58); x.lineTo(110,h-48); x.lineTo(160,h-92); x.lineTo(215,h-116); x.stroke();
    x.fillStyle="#ff4a1c"; x.beginPath(); x.arc(215,h-116,8,0,7); x.fill();
  }),
  siteScreen: tex(190, 120, (x,w,h)=>{
    x.fillStyle="#191712"; x.fillRect(0,0,w,h);
    x.fillStyle="rgba(255,255,255,.5)"; x.fillRect(14,12,w-28,12);
    x.fillStyle="#ff4a1c"; x.fillRect(14,34,64,42);
    x.fillStyle="rgba(255,255,255,.32)"; x.fillRect(88,34,w-102,8);
    x.fillRect(88,50,w-102,8); x.fillRect(88,66,60,8);
    x.fillStyle="rgba(255,255,255,.45)"; x.fillRect(14,88,w-28,8); x.fillRect(14,102,52,8);
  }),
  codeScreen: tex(190, 120, (x,w,h)=>{
    x.fillStyle="#191712"; x.fillRect(0,0,w,h);
    const row=(y,seq)=>{ let cx=14; seq.forEach(([wd,col])=>{ x.fillStyle=col; x.fillRect(cx,y,wd,9); cx+=wd+8; }); };
    row(14,[[38,"#ff4a1c"],[52,"rgba(255,255,255,.38)"]]);
    row(32,[[24,"rgba(255,255,255,.5)"],[70,"rgba(255,255,255,.28)"]]);
    row(50,[[46,"rgba(255,255,255,.28)"],[30,"#ff4a1c"]]);
    row(68,[[60,"rgba(255,255,255,.38)"]]);
    row(86,[[30,"rgba(255,255,255,.5)"],[44,"rgba(255,255,255,.28)"]]);
    row(104,[[52,"rgba(255,255,255,.32)"]]);
  }),
  logScreen: tex(200, 120, (x,w,h)=>{
    x.fillStyle="#191712"; x.fillRect(0,0,w,h);
    for(let i=0;i<6;i++){ x.fillStyle = i===2 ? "#ff4a1c" : "rgba(255,255,255,"+(i%2?.28:.46)+")";
      x.fillRect(14, 12+i*18, w-28-(i%3)*30, 9); }
  }),
  waveScreen: tex(210, 120, (x,w,h)=>{
    x.fillStyle="#191712"; x.fillRect(0,0,w,h);
    x.strokeStyle="#ff4a1c"; x.lineWidth=5; x.lineJoin="round"; x.beginPath();
    [[16,64],[34,30],[50,86],[66,42],[82,72],[98,24],[114,84],[130,50],[146,70],[162,36],[178,62],[194,58]]
      .forEach((p,i)=> i? x.lineTo(p[0],p[1]) : x.moveTo(p[0],p[1])); x.stroke();
  }),
  rackFront: tex(120, 300, (x,w,h)=>{
    x.fillStyle="#fbfaf7"; x.fillRect(0,0,w,h);
    x.strokeStyle="#231f18"; x.lineWidth=3; x.strokeRect(1.5,1.5,w-3,h-3);
    for(let u=1;u<5;u++){ x.beginPath(); x.moveTo(3,u*h/5); x.lineTo(w-3,u*h/5); x.stroke(); }
    x.strokeStyle="#cfcabf"; x.lineWidth=4;
    for(let u=0;u<5;u++){ const y0=u*h/5;
      x.beginPath(); x.moveTo(14,y0+20); x.lineTo(56,y0+20); x.stroke();
      x.beginPath(); x.moveTo(14,y0+33); x.lineTo(56,y0+33); x.stroke(); }
  }),
  swatches: tex(220, 120, (x,w,h)=>{
    x.fillStyle="#fff"; x.fillRect(0,0,w,h);
    ["#cfcabf","#ff4a1c","#e8e4dc","#8a857b","#e8e4dc","#b9b4aa","#231f18","#ffd9cc"]
      .forEach((c,i)=>{ const cx=14+(i%4)*50, cy=10+Math.floor(i/4)*52;
        x.fillStyle=c; rr(x,cx,cy,42,42,8); x.fill(); });
  }),
  easel: tex(180, 220, (x,w,h)=>{
    x.fillStyle="#fff"; x.fillRect(0,0,w,h);
    x.strokeStyle="#231f18"; x.lineWidth=4; x.strokeRect(2,2,w-4,h-4);
    x.strokeStyle="#ff4a1c"; x.lineWidth=9; x.beginPath(); x.arc(w/2,84,42,0,7); x.stroke();
    x.strokeStyle="#231f18"; x.lineWidth=5; x.beginPath(); x.moveTo(40,168); x.lineTo(w-40,168); x.stroke();
  }),
  tee: tex(140, 140, (x,w,h)=>{
    x.fillStyle="#ff4a1c"; x.beginPath(); x.arc(w/2,h/2,17,0,7); x.fill();
    x.strokeStyle="#fff"; x.lineWidth=5; x.beginPath(); x.arc(w/2,h/2-2,9,3.4,6.1); x.stroke();
  }),
  game: tex(190, 120, (x,w,h)=>{
    x.fillStyle="#191712"; x.fillRect(0,0,w,h);
    x.fillStyle="#ff4a1c"; x.fillRect(14,12,54,8);                      // health bar
    x.strokeStyle="rgba(255,255,255,.5)"; x.lineWidth=2; x.strokeRect(13,11,80,10);
    x.strokeStyle="rgba(255,255,255,.4)"; x.strokeRect(w-46,12,32,32);  // minimap
    x.fillStyle="#ff4a1c"; x.fillRect(w-33,25,6,6);
    x.fillStyle="rgba(255,255,255,.6)";                                  // crosshair
    x.fillRect(w/2-9, h/2+6, 18, 3); x.fillRect(w/2-1.5, h/2-3, 3, 21);
    x.fillStyle="rgba(255,255,255,.35)"; x.fillRect(14, h-22, 60, 8);
  }),
  billboard: tex(320, 150, (x,w,h)=>{
    x.fillStyle="#fff"; rr(x,3,3,w-6,h-6,12); x.fill();
    x.strokeStyle="#231f18"; x.lineWidth=4; rr(x,5,5,w-10,h-10,10); x.stroke();
    x.fillStyle="#ff4a1c"; x.beginPath(); x.arc(40,52,14,0,7); x.fill();
    x.fillStyle="#231f18"; x.font="800 30px "+F; x.textAlign="left"; x.textBaseline="middle";
    x.letterSpacing="3px"; x.fillText("WBCC 104.5", 66, 54);
    x.fillStyle="#ff4a1c"; x.font="800 17px "+F; x.letterSpacing="6px";
    x.fillText("DRIVE TIME · LIVE NOW", 40, 102);
  }),
};

/* ---------- registries ---------- */
const anims = [];
const dimmables = [];
const GHOST = new THREE.Color(0xf0eee8);
function reg(group){
  const rec = {group, dim:0, target:0, mats:[]};
  group.traverse(o=>{
    if(o.material){
      o.material = o.material.clone();
      const m = o.material;
      m.userData.base = m.color.clone();
      m.userData.baseOpacity = m.opacity;
      rec.mats.push(m);
    }});
  dimmables.push(rec); return rec;
}
function applyDim(rec){
  rec.mats.forEach(m=>{
    if(m.userData.noDim) return;
    m.color.copy(m.userData.base).lerp(GHOST, rec.dim*0.8);
    if(m.map){ m.transparent = true; m.opacity = m.userData.baseOpacity*(1 - rec.dim*0.85); }
  });
}

/* =====================================================================
   ring road — a stadium circuit around the whole site.
   makePath(inset) parameterizes it by arc length; inset>0 = inner lane.
   ===================================================================== */
/* True perimeter loop: every site — station, transmitter hill, homes,
   billboard lot, field kit — sits inside the ring. The old tighter circuit
   clipped the transmitter control building on its west corner. */
const RD = {x0:-50, x1:52, z0:-24, z1:38, rc:14};
/* The belt line: the same stadium shape thrown out around the whole city, so
   the grid streets have something to terminate on instead of stopping in open
   ground. Its corners are held inside the island — pushed much further out and
   the south-east arc runs off the rim and into the water. */
const BELT = {x0:-54, x1:60, z0:-26, z1:116, rc:20};
function makePath(inset, rd = RD){
  const x0 = rd.x0+inset, x1 = rd.x1-inset, z0 = rd.z0+inset, z1 = rd.z1-inset;
  const rc = rd.rc - inset;
  const fx = x1-x0-2*rc, fz = z1-z0-2*rc, arc = Math.PI/2*rc;
  const L = 2*fx + 2*fz + 4*arc;
  const at = s => {
    s = ((s % L) + L) % L;
    if(s < fx) return {x:x0+rc+s, z:z1, tx:1, tz:0};
    s -= fx;
    if(s < arc){ const a = Math.PI/2 - s/rc;
      return {x:x1-rc + rc*Math.cos(a), z:z1-rc + rc*Math.sin(a), tx:Math.sin(a), tz:-Math.cos(a)}; }
    s -= arc;
    if(s < fz) return {x:x1, z:z1-rc-s, tx:0, tz:-1};
    s -= fz;
    if(s < arc){ const a = -s/rc;
      return {x:x1-rc + rc*Math.cos(a), z:z0+rc + rc*Math.sin(a), tx:Math.sin(a), tz:-Math.cos(a)}; }
    s -= arc;
    if(s < fx) return {x:x1-rc-s, z:z0, tx:-1, tz:0};
    s -= fx;
    if(s < arc){ const a = -Math.PI/2 - s/rc;
      return {x:x0+rc + rc*Math.cos(a), z:z0+rc + rc*Math.sin(a), tx:Math.sin(a), tz:-Math.cos(a)}; }
    s -= arc;
    if(s < fz) return {x:x0, z:z0+rc+s, tx:0, tz:1};
    s -= fz;
    const a = Math.PI - s/rc;
    return {x:x0+rc + rc*Math.cos(a), z:z1-rc + rc*Math.sin(a), tx:Math.sin(a), tz:-Math.cos(a)};
  };
  return {L, at};
}
const ROAD = makePath(0);
const ROAD_SAMPLES = [];
for(let s=0; s<ROAD.L; s+=2) ROAD_SAMPLES.push(ROAD.at(s));
const BELT_PATH = makePath(0, BELT);
const BELT_SAMPLES = [];
for(let s=0; s<BELT_PATH.L; s+=2) BELT_SAMPLES.push(BELT_PATH.at(s));

let groundH = () => 0;      // set by the terrain build below
let tickClouds = () => {};  // set by the cloud build below
let tickSea = () => {};     // set by the sea build below
let tickSky = () => {};     // set by the aircraft build below
let westH = () => 0;        // set by the west headland build below
function markNoBounds(g){ g.traverse(o=>{ if(o.isMesh) o.userData.noBounds = true; }); }

/* =====================================================================
   SHELL — ground + four exploded quadrant plates
   ===================================================================== */
const shellG = new THREE.Group();
scene.add(shellG);
{
  const g = shellG;
  for(let i=0;i<4;i++){
    const G = new THREE.Group(); G.position.copy(OFF(i));
    levelG[i] = G; g.add(G);
  }
  /* ---- the land: one heightfield under everything --------------------
     Flat where things are built (station, field kit, road, walk), rolling
     hills elsewhere, a flat-topped crown for the transmitter, and a soft
     island rim dropping to the void. Nothing floats. */
  {
    const GW = 128, GD = 200, GN = 150, GCX = 2, GCZ = 45;
    const HILLS = [
      [-41, 26, 2.4, 4.2], [-22.5, 11.5, 2.6, 3.8], [-19.5, 27, 1.9, 3.6], [-38, 9.5, 1.7, 3.8],
      [-44, -3, 1.6, 5], [-34, -17, 1.3, 3.4], [-10, -29, 1.8, 5.5], [16, -29, 1.5, 5],
      [-28, -40, 1.9, 6], [4, -46, 2.2, 7], [34, -40, 1.7, 5.5],   // the rail hills
      [44, -17, 1.6, 4.5], [58, 5, 1.6, 4.5], [57, 27, 1.3, 4],
      [-42, 62, 1.7, 5.5], [40, 64, 1.5, 5], [-46, 86, 1.8, 6], [38, 92, 1.6, 5.5],
      [-10, 126, 1.6, 7], [44, 122, 1.4, 6], [-46, 116, 1.5, 6]
    ];
    const sstep = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v-e0)/(e1-e0))); return t*t*(3-2*t); };
    const rectMask = (x, z, a, b, c, d, f) =>       // 1 inside rect, feather f outside
      sstep(-f, 0, Math.min(x-a, b-x)) * sstep(-f, 0, Math.min(z-c, d-z));
    const roadMask = (x, z) => {
      let best = 1e9;
      for(const p of ROAD_SAMPLES){
        const dd = (x-p.x)*(x-p.x) + (z-p.z)*(z-p.z);
        if(dd < best) best = dd;
      }
      for(const p of BELT_SAMPLES){        // the belt gets a flat bed too
        const dd = (x-p.x)*(x-p.x) + (z-p.z)*(z-p.z);
        if(dd < best) best = dd;
      }
      return 1 - sstep(3.4, 6.5, Math.sqrt(best));
    };
    const hAt = (x, z) => {
      // transmitter crown: flat top, then falls away
      const dTx = Math.hypot(x+30, z-20);
      let h = dTx <= 5 ? 5.4 : 5.4 * Math.exp(-((dTx-5)*(dTx-5)) / (2*6.5*6.5));
      for(const [hx, hz, amp, sig] of HILLS)
        h += amp * Math.exp(-(((x-hx)*(x-hx)) + ((z-hz)*(z-hz))) / (2*sig*sig));
      const flat = Math.max(
        rectMask(x, z, -21, 21, -16, 21, 5),        // station + front walk
        rectMask(x, z, 22, 42, -12, 19, 5),         // field kit
        rectMask(x, z, 10, 18, 32.6, 36.6, 4),      // parking pull-off by the front road
        rectMask(x, z, 19, 37, 26, 34, 4),          // billboard + store lot
        rectMask(x, z, -27, -5, 26, 36, 4),         // concert lawn by the road
        rectMask(x, z, -8.2, -3.8, 38, 118, 3),     // Maple Ave, ring to belt
        rectMask(x, z, -56, 60, 53.8, 58.2, 3),     // Signal St (east-west, belt to belt)
        rectMask(x, z, 33, 59, 44, 70, 4),          // business strip, both sides of Signal St
        rectMask(x, z, 19.8, 24.2, 38, 90, 3),      // Second Ave
        rectMask(x, z, -56, 60, 85.8, 90.2, 3),     // Third St (east-west, belt to belt)
        rectMask(x, z, 29, 58, 73, 85, 4),          // third commercial row, off Third St
        rectMask(x, z, -32, -11, 43, 53, 4),        // house lots, north row
        rectMask(x, z, -1, 32, 42.5, 52, 4),        //   "      east row
        rectMask(x, z, -22, -9, 58, 68, 4),         //   "      south lot
        rectMask(x, z, -31, -12, 72, 84, 4),        // far blocks (scenery)
        rectMask(x, z, 1, 27, 70, 82, 4),
        rectMask(x, z, -27, -3, 94, 108, 4),
        rectMask(x, z, 6, 32, 90, 112, 4),          // the park: stage + crowd
        roadMask(x, z));
      return h * (1 - flat);
    };
    groundH = hAt;
    const geo = new THREE.PlaneGeometry(GW, GD, GN, GN);
    geo.rotateX(-Math.PI/2);
    const pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i) + GCX, z = pos.getZ(i) + GCZ;
      const r4 = Math.pow((x-GCX)/(GW/2-4), 4) + Math.pow((z-GCZ)/(GD/2-4), 4);
      pos.setY(i, hAt(x, z) * (1 - sstep(0.75, 1.0, r4)) - sstep(0.8, 1.25, r4) * 2.8);
    }
    geo.computeVertexNormals();
    // topographic shading: valleys stay pale, rises deepen, slopes shade
    {
      const lo = new THREE.Color(0xe6e1d7), hi = new THREE.Color(0xc6bfae);
      const nrm = geo.attributes.normal, cols = new Float32Array(pos.count*3);
      const cc = new THREE.Color();
      for(let i=0;i<pos.count;i++){
        const hgt = Math.max(0, Math.min(1, pos.getY(i)/7));
        cc.copy(lo).lerp(hi, hgt);
        const shade = 0.86 + 0.14*Math.max(0, nrm.getY(i));
        cols[i*3] = cc.r*shade; cols[i*3+1] = cc.g*shade; cols[i*3+2] = cc.b*shade;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    }
    const land = new THREE.Mesh(geo, std(0xffffff, {roughness:1, envMapIntensity:0.24, vertexColors:true}));
    land.position.set(GCX, -0.02, GCZ);
    land.receiveShadow = true; land.castShadow = false;
    land.userData.noBounds = true;
    levelG[0].add(land);

    /* Paving, shared by the inner ring and the belt line: a ribbon swept along
       the path samples, two solid edge lines and a run of centre dashes. */
    let asphalt = null;
    const pave = (samples, path) => {
      const N = samples.length, rGeo = new THREE.BufferGeometry();
      const rv = new Float32Array((N+1)*2*3);
      for(let i=0;i<=N;i++){
        const p = samples[i % N];
        const nx = -p.tz, nz = p.tx;
        rv.set([p.x + nx*2.1, 0.03, p.z + nz*2.1], i*6);
        rv.set([p.x - nx*2.1, 0.03, p.z - nz*2.1], i*6+3);
      }
      rGeo.setAttribute("position", new THREE.BufferAttribute(rv, 3));
      const rIdx = [];
      for(let i=0;i<N;i++){ const a=i*2, b=i*2+1, c=i*2+2, d=i*2+3; rIdx.push(a,b,c, b,d,c); }
      rGeo.setIndex(rIdx); rGeo.computeVertexNormals();
      // one material object across every road so the asphalt matches exactly
      if(!asphalt){
        asphalt = std(0xbab3a5, {roughness:0.97, envMapIntensity:0.2});
        // the strip's winding leaves its normals pointing down — without this
        // the asphalt is backface-culled from above and only pale ground shows
        asphalt.side = THREE.DoubleSide;
        asphalt.userData.noDim = true;    // roads never ghost — In-Car Radio is about them
      }
      const mesh = new THREE.Mesh(rGeo, asphalt);
      mesh.receiveShadow = true; mesh.castShadow = false;
      mesh.userData.noBounds = true;
      levelG[0].add(mesh);

      const lines = new THREE.Group(); levelG[0].add(lines);
      for(const off of [1.86, -1.86]){
        const lg = new THREE.BufferGeometry();
        const lv = new Float32Array((N+1)*2*3);
        for(let i=0;i<=N;i++){
          const p = samples[i % N];
          const nx = -p.tz, nz = p.tx;
          lv.set([p.x + nx*(off+0.05), 0.045, p.z + nz*(off+0.05)], i*6);
          lv.set([p.x + nx*(off-0.05), 0.045, p.z + nz*(off-0.05)], i*6+3);
        }
        lg.setAttribute("position", new THREE.BufferAttribute(lv, 3));
        lg.setIndex(rIdx); lg.computeVertexNormals();
        const line = new THREE.Mesh(lg, std(0xf8f5ee, {roughness:0.9}));
        line.material.side = THREE.DoubleSide;
        line.castShadow = false; line.receiveShadow = true;
        lines.add(line);
      }
      for(let s=0; s<path.L; s+=6.5){
        const p = path.at(s);
        const d = Bo(lines, 1.5, 0.02, 0.18, std(0xfdfbf6, {roughness:0.85}), p.x, 0.04, p.z,
          Math.atan2(p.tx, p.tz) - Math.PI/2);
        d.castShadow = false;
      }
      lines.traverse(o=>{ if(o.material) o.material.userData.noDim = true; });
      markNoBounds(lines);
      return mesh;
    };
    const road = pave(ROAD_SAMPLES, ROAD);
    pave(BELT_SAMPLES, BELT_PATH);

    // Neighborhood streets. They borrow the ring road's material object so
    // the asphalt matches exactly — a same-hex clone rendered differently.
    const streets = new THREE.Group(); levelG[0].add(streets);
    const dashMat = () => std(0xfdfbf6, {roughness:0.85});
    const strip = (w, d, x, z, mat) => {
      const s = Bo(streets, w, 0.022, d, mat || road.material, x, 0.026, z);
      s.castShadow = false; s.receiveShadow = true; return s;
    };
    strip(3.6, 80, -6, 78);        // Maple Ave, ring road down to the belt
    strip(112, 3.6, 2, 56);        // Signal St, belt to belt
    strip(3.6, 50, 22, 64);        // Second Ave
    strip(112, 3.6, 2, 88);        // Third St, belt to belt, under the shops
    for(let z2=41.5; z2<113; z2+=5) if(Math.abs(z2-56) > 3.4 && Math.abs(z2-88) > 3.4)
      strip(0.14, 1.5, -6, z2, dashMat());
    for(let x2=-50; x2<57; x2+=5) if(Math.abs(x2+6) > 3.4 && Math.abs(x2-22) > 3.4)
      strip(1.5, 0.14, x2, 56, dashMat());
    for(let z2=41.5; z2<87; z2+=5) if(Math.abs(z2-56) > 3.4)
      strip(0.14, 1.5, 22, z2, dashMat());
    for(let x2=-50; x2<57; x2+=5) if(Math.abs(x2+6) > 3.4 && Math.abs(x2-22) > 3.4)
      strip(1.5, 0.14, x2, 88, dashMat());
    /* Crosswalks at every junction the local traffic stops for. Bars run
       parallel to the traffic being crossed and are arrayed across the road,
       which is what makes them read as a crossing rather than as more dashes.
       `acrossNS` marks a crossing laid over the north-south street. */
    const zebra = (cx, cz, acrossNS) => {
      for(let i=-2; i<=2; i++){
        if(acrossNS) strip(0.42, 2.5, cx + i*0.78, cz, dashMat());
        else         strip(2.5, 0.42, cx, cz + i*0.78, dashMat());
      }
    };
    // [x, z, which approaches exist] — Second Ave ends at Third St, so that
    // junction has no southern leg to cross
    for(const [cx, cz, south] of [[-6, 56, true], [22, 56, true],
                                  [-6, 88, true], [22, 88, false]]){
      zebra(cx, cz - 3.1, true);
      if(south) zebra(cx, cz + 3.1, true);
      zebra(cx - 3.1, cz, false);
      zebra(cx + 3.1, cz, false);
    }
    streets.traverse(o=>{ if(o.material) o.material.userData.noDim = true; });
    markNoBounds(streets);

    // far blocks: scenery homes carrying the suburb off the frame
    const farHouse = (x, z, ry) => {
      const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry;
      levelG[0].add(h);
      Bo(h, 5.0, 2.8, 4.0, MAT.wall(), 0, 0, 0);
      const sh2 = std(0xffffff, {roughness:0.82, envMapIntensity:0.4});
      const ra = Bo(h, 5.5, 0.17, 2.6, sh2, 0, 3.2, -1.08); ra.rotation.x = -0.52;
      const rb = Bo(h, 5.5, 0.17, 2.6, sh2, 0, 3.2, 1.08);  rb.rotation.x = 0.52;
      Bo(h, 5.5, 0.15, 0.2, std(0xf4f1ea), 0, 3.76, 0);
      Bo(h, 1.0, 1.95, 0.1, std(0x9a8d79), 1.4, 0, 2.02);
      Bo(h, 1.9, 1.35, 0.08, MAT.inkFlat(), -1.1, 0.7, 2.0);
      Bo(h, 1.7, 1.15, 0.06, MAT.screen(), -1.1, 0.8, 2.04);
      Bo(h, 0.55, 1.4, 0.55, std(0x9a8d79), -1.6, 2.9, -0.5);
      markNoBounds(h);
    };
    // lots sit between the streets — a 5.5-wide roof on a 3.6-wide street
    // reads as a house in the road, so keep centers clear of the asphalt
    farHouse(-22, 77, 0.1);   farHouse(-13, 78.5, -0.06); farHouse(9, 75.5, 0.12);
    farHouse(16.5, 77, -0.1); farHouse(-19, 99, 0.05);    farHouse(-12, 101, -0.12);
    // the block east of Maple is the park — the concert stands there

    // trees on the hills
    const tree = (x, z, s, blob) => {
      const y = hAt(x, z);
      const tg2 = new THREE.Group(); tg2.position.set(x, y-0.05, z); tg2.scale.setScalar(s);
      levelG[0].add(tg2);
      Cy(tg2, 0.09, 0.13, 0.9, std(0x8a7f6e, {roughness:0.95}), 0, 0, 0, 10);
      if(blob){
        Sp(tg2, 0.85, MAT.leaf(), 0, 1.6, 0, 1.15);
        Sp(tg2, 0.6, MAT.leaf(), 0.45, 1.25, 0.2, 1.0);
        Sp(tg2, 0.5, MAT.leaf(), -0.45, 1.35, -0.15, 1.0);
      } else {
        const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.7, 10), MAT.leaf());
        c1.position.y = 1.55; c1.castShadow = true; tg2.add(c1);
        const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.3, 10), MAT.leaf());
        c2.position.y = 2.45; c2.castShadow = true; tg2.add(c2);
      }
      markNoBounds(tg2);
    };
    tree(-41, 29, 1.25, false); tree(-45, 14, 1.1, true); tree(-21, 29.5, 1.0, false);
    tree(-36, 7.5, 0.95, true); tree(-44, -4, 1.15, false); tree(-34, -17, 0.9, true);
    tree(-9, -29.5, 1.2, false); tree(17, -29.5, 1.05, true); tree(44, -16, 1.1, false);
    tree(58, 6, 1.2, true); tree(56, 26, 0.95, false); tree(-3.6, 34.6, 1.0, true); tree(15.5, 29.8, 0.9, false);
    tree(-34, 55.5, 1.1, true); tree(13, 53.4, 0.95, false); tree(-24.5, 67, 1.05, true);
    tree(16, 64, 1.2, false); tree(33, 53.5, 0.9, true);
    tree(-27, 80.5, 1.1, true); tree(16.5, 80.5, 1.0, false); tree(-24, 104, 1.15, false);
    tree(2, 116, 1.05, true); tree(-38, 96, 1.2, false);
    // the park border — kept off the stage apron and out of the crowd
    tree(6.5, 94, 1.1, true);   tree(6.5, 107, 0.95, false);
    tree(30, 95.5, 1.0, false); tree(29.5, 108, 1.15, true);
  }

  const noCast = m => { m.castShadow = false; return m; };

  // per-floor door layouts: gaps in the cross wall (X ranges) and the spine (Z ranges)
  const CROSS_GAPS = [[-10,-7],[3,6]];   // doorways through the z=0 wall
  const SPINE_GAPS = [[-9,-6],[4,7]];    // doorways through the x=0 wall

  function wallX(g, y, z, x0, x1, gaps){
    let a = x0;
    (gaps||[]).forEach(gp=>{
      if(gp[0] > a) seg(a, gp[0]);
      a = Math.max(a, gp[1]);
    });
    if(x1 > a) seg(a, x1);
    function seg(p, q){
      if(q-p < 0.06) return;
      noCast(Bo(g, q-p, WH, WT, MAT.wall(), (p+q)/2, y, z));
      noCast(Bo(g, q-p+0.002, 0.07, WT+0.03, MAT.wallTop(), (p+q)/2, y+WH, z));
    }
  }
  function wallZ(g, y, x, z0, z1, gaps){
    let a = z0;
    (gaps||[]).forEach(gp=>{
      if(gp[0] > a) seg(a, gp[0]);
      a = Math.max(a, gp[1]);
    });
    if(z1 > a) seg(a, z1);
    function seg(p, q){
      if(q-p < 0.06) return;
      noCast(Bo(g, WT, WH, q-p, MAT.wall(), x, y, (p+q)/2));
      noCast(Bo(g, WT+0.03, 0.07, q-p+0.002, MAT.wallTop(), x, y+WH, (p+q)/2));
    }
  }

  for(let i=0;i<4;i++){
    const L = levelG[i], y = 0;
    // Slab band + tiled floor. Upper plates never cast (their shadows would
    // land in mid-air beside the floor below); the ground plate casts onto
    // the terrain so the building is anchored, not floating.
    const slab = Bo(L, (PX1-PX0)+1.0, ST, (PZ1-PZ0)+1.0, MAT.slab(),
      (PX0+PX1)/2, y-ST, (PZ0+PZ1)/2);
    slab.castShadow = (i === 0);
    const fmat = std(0xffffff, {roughness:0.5, envMapIntensity:0.7});
    fmat.map = TILE.clone(); fmat.map.needsUpdate = true;
    fmat.map.wrapS = fmat.map.wrapT = THREE.RepeatWrapping;
    fmat.map.repeat.set((PX1-PX0)/2.6, (PZ1-PZ0)/2.6);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(PX1-PX0, PZ1-PZ0), fmat);
    fl.rotation.x = -Math.PI/2; fl.position.set(0, y+0.006, 0);
    fl.receiveShadow = true; L.add(fl);

    // perimeter
    wallX(L, y, PZ0+WT/2, PX0, PX1);
    wallX(L, y, PZ1-WT/2, PX0, PX1, [[-3.2, 0.4]]);     // entry doors, front
    wallZ(L, y, PX0+WT/2, PZ0, PZ1);
    wallZ(L, y, PX1-WT/2, PZ0, PZ1);
    // facade glazing — the closed building reads as a real office block
    {
      const wg = std(0xa4b4bd, {roughness:0.16, metalness:0.4, envMapIntensity:1.5});
      const win = (x, z, ry2) => {
        const f = noCast(Bo(L, 2.3, 1.9, 0.1, MAT.white(), x, y+0.8, z, ry2));
        noCast(Bo(L, 2.05, 1.65, 0.08, wg, x, y+0.92, z, ry2)).position.add(
          new THREE.Vector3(Math.sin(ry2)*0.03, 0, Math.cos(ry2)*0.03));
        noCast(Bo(L, 0.07, 1.65, 0.12, MAT.white(), x, y+0.92, z, ry2)).position.add(
          new THREE.Vector3(Math.sin(ry2)*0.04, 0, Math.cos(ry2)*0.04));
      };
      for(let wx2=-15.4; wx2<=15.5; wx2+=3.08){
        if(!(wx2 > -4.7 && wx2 < 1.9)) win(wx2, PZ1-WT/2+0.09, 0);   // skip the door bay
        win(wx2, PZ0+WT/2-0.09, Math.PI);
      }
      for(let wz2=-11.2; wz2<=11.3; wz2+=3.2){
        win(PX0+WT/2-0.09, wz2, -Math.PI/2);
        win(PX1-WT/2+0.09, wz2, Math.PI/2);
      }
      if(i === 0){
        // glass entrance in the door bay
        noCast(Bo(L, 3.8, 2.9, 0.12, MAT.white(), -1.4, y, PZ1-WT/2+0.06));
        noCast(Bo(L, 3.3, 2.55, 0.1, wg, -1.4, y, PZ1-WT/2+0.12));
        noCast(Bo(L, 0.08, 2.55, 0.14, MAT.white(), -1.4, y, PZ1-WT/2+0.13));
        noCast(Bo(L, 4.6, 0.16, 1.9, MAT.white(), -1.4, y+2.95, PZ1+0.5));  // canopy
      }
    }
    // the cross
    wallX(L, y, MZ, PX0, PX1, CROSS_GAPS);
    wallZ(L, y, MX, PZ0, PZ1, SPINE_GAPS);

    // stair core in the front-left quadrant (floors 1-2; floor 3 gave the
    // quadrant to the Gaming Studio)
    if(i > 0 && i < 3){
      const [sx, sz] = [-8.5, 7.0];
      for(let s=0;s<7;s++)
        noCast(Bo(L, 3.0, 0.28, 0.6, MAT.soft(), sx, y+s*0.28, sz - s*0.6));
      noCast(Bo(L, 0.14, 1.0, 4.4, MAT.soft(), sx+1.5, y+1.2, sz-1.8, 0, 0, -0.42));
    }
  }

  // ---- rooftop (sits on the top plate) -------------------------------
  const ty = WH, g2 = levelG[3];
  Bo(g2, 3.0,1.2,2.2, MAT.white(), 6, ty, 9.0);
  Cy(g2, 0.62,0.62,0.12, MAT.gray(), 5.1, ty+1.2, 9.0, 20);
  Cy(g2, 0.62,0.62,0.12, MAT.gray(), 6.9, ty+1.2, 9.0, 20);
  Cy(g2, 0.08,0.08,1.0, MAT.inkFlat(), 13, ty, 4.0, 10);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 14, 0, Math.PI*2, 0, 1.02), MAT.white());
  dish.position.set(13, ty+1.85, 4.0); dish.rotation.set(0.42, 0, -0.75);
  dish.castShadow = true; g2.add(dish);
}
const shellRec = reg(shellG);

/* ---- clouds: soft puffs drifting under the island edge and across the
   high sky, so the empty backdrop is never dead space ------------------ */
{
  const clouds = [];
  const puff = (cx, cy, cz, s, tint) => {
    const c = new THREE.Group(); c.position.set(cx, cy, cz); scene.add(c);
    const m = new THREE.MeshBasicMaterial({color:tint, transparent:true, opacity:0.94, toneMapped:false});
    const lobes = [[0,0,0,2.6],[2.2,0.35,0.4,1.9],[-2.3,0.28,-0.3,2.0],[0.9,0.75,-0.5,1.5],[-1.1,0.65,0.5,1.4]];
    lobes.forEach(([lx,ly,lz,r])=>{
      const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m);
      sp.position.set(lx, ly, lz); sp.scale.y = 0.5;
      sp.userData.noBounds = true; c.add(sp);
    });
    c.scale.setScalar(s);
    clouds.push({c, m, sp: 0.5 + Math.abs(cx % 5)/8, y0: cy, ph: cx});
    return c;
  };
  // sky only — nothing floats below the island
  puff(-40, 42, -36, 2.2, 0xffffff);
  puff(10, 49, -64, 2.8, 0xf6f4ef);
  puff(52, 37, -44, 1.9, 0xffffff);
  puff(-68, 44, -52, 2.5, 0xf3f1eb);
  puff(30, 52, -76, 3.2, 0xffffff);
  puff(74, 40, -58, 2.4, 0xf6f4ef);
  // high band, far behind the model for the top of the frame
  puff(-30, 36, -46, 2.6, 0xffffff);
  puff(24, 41, -54, 3.1, 0xf6f4ef);
  puff(66, 34, -40, 2.2, 0xffffff);
  puff(-62, 39, -34, 2.4, 0xffffff);
  puff(-4, 45, -62, 3.5, 0xf4f2ec);
  puff(46, 47, -70, 2.7, 0xffffff);
  puff(-44, 48, -58, 2.1, 0xf6f4ef);
  if(ANIM) anims.push((t, dt)=> clouds.forEach(cl=>{
    cl.c.position.x += dt * cl.sp;
    if(cl.c.position.x > 100) cl.c.position.x = -100;
    cl.c.position.y = cl.y0 + Math.sin(t*0.14 + cl.ph)*0.6;
  }));
  /* The clouds live in world space high over the campus, so once the camera
     drops into a room on an upper plate they drift between it and the lens.
     Fade them out for the length of the zoom and bring them back at overview. */
  let op = 0.94;
  tickClouds = dt => {
    const goal = active >= 0 ? 0 : 0.94;
    if(Math.abs(op - goal) < 0.004) return;
    // REDUCED cuts instead of fading — headless and reduced-motion starve rAF,
    // so a tween here would never settle and the clouds would stay put
    op = REDUCED ? goal : op + (goal - op) * Math.min(1, dt * 4);
    clouds.forEach(cl=>{ cl.m.opacity = op; cl.c.visible = op > 0.02; });
  };
}

/* ---- horizon: the sky band closing the backdrop ----------------------
   There were far ridgelines here, from before the campus became an island.
   Once the sea went in they had nowhere to stand: the water reaches past the
   top of the frame at every zoom, so any landmass big enough to read had to
   sit so close that only one corner entered the shot — a beige wedge, not a
   coastline. The sea and the clouds carry the backdrop now. */
{
  const skyTex = tex(64, 256, (x,w,h)=>{
    const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#dad7d0");
    gr.addColorStop(0.5, "#d2cfc7");
    gr.addColorStop(0.74, "#cdc9c0");
    gr.addColorStop(1, "#c9c5bc");
    x.fillStyle = gr; x.fillRect(0,0,w,h);
  });
  // oversized on purpose: at wide window shapes a 920-unit backdrop ran out
  // before the frame did, and the raw clear colour showed through the corner
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1300),
    new THREE.MeshBasicMaterial({map:skyTex, toneMapped:false, depthWrite:false}));
  const vdir = new THREE.Vector3(0.80, 0.86, 1.0).normalize();   // matches VIEW below
  const back = vdir.clone().multiplyScalar(-260);
  sky.position.set(2 + back.x, 42 + back.y, 6 + back.z);
  sky.lookAt(sky.position.clone().add(vdir));
  sky.renderOrder = -3;
  sky.userData.noBounds = true;
  scene.add(sky);
}

/* ---- the sea: the campus is an island, so put water around it ---------
   Sized far past any framing on purpose — it has to run off every edge of
   the frame at every zoom, so its own edge is never the thing you notice. */
{
  const sea = new THREE.Group(); levelG[0].add(sea);
  /* The water is a coast off one corner, not a moat. Screen directions here
     were measured, not guessed: +x goes right and slightly down, +z goes left
     and down, so the LOWER-RIGHT of the frame is +x and +z together — the
     south-east. The sea fills that quadrant (x > −20, z > −10). Both inland
     edges fade out underneath the island, so the coastline is the terrain's own
     rim rather than a drawn line, and the two seaward edges fade to nothing,
     which reads as haze instead of the hard horizon a solid plane gives. */
  const seaTex = tex(256, 256, (x,w,h)=>{
    x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "destination-out";
    const fade = (x0,y0,x1,y1) => {
      const g = x.createLinearGradient(x0,y0,x1,y1);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    };
    fade(0, 0, w*0.05, 0);      // inland edges — short, and hidden under the land
    fade(0, 0, 0, h*0.05);
    fade(w, 0, w*0.84, 0);      // out to sea
    fade(0, h, 0, h*0.84);
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshBasicMaterial({color:0xb9c5c9, map:seaTex, transparent:true,
      depthWrite:false, toneMapped:false}));
  water.rotation.x = -Math.PI/2;
  water.position.set(580, -1.62, 530);
  water.renderOrder = -2;
  sea.add(water);

  // surf: a soft white band tracing where the water meets the island rim
  const surfTex = tex(256, 400, (x,w,h)=>{
    x.strokeStyle = "rgba(255,255,255,0.8)";
    x.shadowColor = "rgba(255,255,255,0.85)"; x.shadowBlur = 10;
    x.lineWidth = 6.5; rr(x, 9, 9, w-18, h-18, 60); x.stroke();
    x.lineWidth = 2.2; x.shadowBlur = 3; x.stroke();
    // there's only surf where there's sea: canvas right is east and canvas
    // bottom is south, so keep that corner's shoreline and wipe the rest,
    // where the land simply carries on
    x.shadowBlur = 0;
    x.globalCompositeOperation = "destination-out";
    const wipe = (x0,y0,x1,y1) => {
      const g = x.createLinearGradient(x0,y0,x1,y1);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    };
    wipe(w*0.34, 0, w*0.2, 0);
  });
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(127, 200),
    new THREE.MeshBasicMaterial({map:surfTex, transparent:true,
      depthWrite:false, toneMapped:false}));
  surf.rotation.x = -Math.PI/2; surf.position.set(2, -1.55, 45);
  surf.renderOrder = -1;
  sea.add(surf);

  // sailboats — hull, mast, mainsail and jib, kept simple enough to read
  // from across the bay
  const sailShape = (bw, bh) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(bw, 0); s.lineTo(0, bh); s.closePath();
    return new THREE.ShapeGeometry(s);
  };
  const sailMat = () => new THREE.MeshStandardMaterial({color:0xfbf9f4,
    roughness:0.85, side:THREE.DoubleSide, envMapIntensity:0.9});
  function mkBoat(){
    const h = new THREE.Group();
    Bo(h, 4.0, 0.62, 1.25, std(0xf4f1ea, {roughness:0.72}), 0, -0.24, 0);
    Bo(h, 4.1, 0.16, 1.33, MAT.inkFlat(), 0, 0.34, 0);          // sheer stripe
    Bo(h, 1.5, 0.3, 0.95, std(0xe4e0d6, {roughness:0.8}), 0.9, 0.5, 0);
    Cy(h, 0.045, 0.055, 5.2, MAT.chrome(), -0.5, 0.5, 0, 8);    // mast
    Cy(h, 0.035, 0.035, 2.3, MAT.chrome(), 0.65, 0.72, 0, 8, 0, 0, Math.PI/2);
    const main = new THREE.Mesh(sailShape(2.5, 4.6), sailMat());
    main.position.set(-0.45, 0.72, 0); main.rotation.y = -0.12;
    const jib = new THREE.Mesh(sailShape(-1.7, 3.1), sailMat());
    jib.position.set(-0.55, 0.72, 0); jib.rotation.y = 0.16;
    h.add(main, jib);
    return h;
  }
  // clustered where open water actually shows in the frame — off the west
  // shore and across the south bay
  // offshore in the south-east quadrant, working along the coast
  /* Close in, working north and south along the shore. The band of open water
     actually in shot is narrow — measured by projecting a grid of candidate
     points through the camera against the framing in overviewFrame, it runs
     x 66…80, z 10…55. Anything further out sails behind the sidebar. Re-measure
     these if HERO_BOX changes; the two are coupled. */
  const boats = [
    {x:70, z:10, ry:-1.55, s:1.3, sp:0.9},
    {x:78, z:26, ry:1.58,  s:1.1, sp:0.8},
    {x:68, z:42, ry:-1.5,  s:1.4, sp:1.0},
    {x:82, z:16, ry:1.55,  s:1.2, sp:0.85},
    {x:74, z:56, ry:-1.6,  s:1.3, sp:0.95},
    {x:88, z:38, ry:1.52,  s:1.1, sp:0.8},
  ].map((b, i) => {
    const g0 = new THREE.Group(); g0.position.set(b.x, -1.35, b.z);
    g0.rotation.y = b.ry; g0.scale.setScalar(b.s); sea.add(g0);
    const hull = mkBoat(); g0.add(hull);
    // a hull's length runs along its local x, so that — not local z — is the
    // way it goes; the old vector had them all crabbing sideways
    return {g0, hull, home: new THREE.Vector3(b.x, -1.35, b.z),
            vx: Math.cos(b.ry) * b.sp * 0.55, vz: -Math.sin(b.ry) * b.sp * 0.55,
            ph: i * 1.7};
  });
  markNoBounds(sea);
  sea.traverse(o=>{ if(o.isMesh){ o.castShadow = false; o.receiveShadow = false; } });
  /* Boats are a mile out but the camera doesn't know that — zoom a room on an
     upper plate and one sails straight through it, same trap as the clouds.
     The water can stay; it just reads as backdrop. */
  const boatMats = [];
  boats.forEach(b=> b.g0.traverse(o=>{
    if(o.isMesh && o.material){ o.material.transparent = true; boatMats.push(o.material); }
  }));
  let sop = 1;
  tickSea = dt => {
    const goal = active >= 0 ? 0 : 1;
    if(Math.abs(sop - goal) < 0.004) return;
    sop = REDUCED ? goal : sop + (goal - sop) * Math.min(1, dt * 4);
    boatMats.forEach(m=> m.opacity = sop);
    boats.forEach(b=> b.g0.visible = sop > 0.02);
  };
  if(ANIM) anims.push((t, dt)=> boats.forEach(b=>{
    b.g0.position.x += dt * b.vx;
    b.g0.position.z += dt * b.vz;
    // hard-stop before any of them can drift onto dry land, and a reset once
    // they've reached well past the frame
    const p = b.g0.position;
    if(p.x < 66 || p.x > 105 || p.z < -25 || p.z > 95) b.g0.position.copy(b.home);
    b.hull.position.y = Math.sin(t*0.75 + b.ph) * 0.14;
    b.hull.rotation.z = Math.sin(t*0.62 + b.ph) * 0.055;
    b.hull.rotation.x = Math.sin(t*0.9 + b.ph*1.4) * 0.03;
  }));
}

/* ---- west headland: the land carries on across the road from the
   transmitter, into the empty upper-left the planes were flying over. Real
   terrain rather than painted-on shapes — same heightfield, superellipse rim
   and topographic vertex colouring as the campus island, so the two read as
   one landscape. Its east rim runs UNDER the island: the island's own ground
   is higher there and wins, which is what hides the seam, so no blending
   code is needed. The mountains on it are just tall hills in the field. --- */
{
  const GW2 = 152, GD2 = 214, GN2 = 112, CX2 = -118, CZ2 = -10;
  /* Peaks sit off the rail alignment, not on it, so the line threads between
     them instead of climbing over the summits — each one contributes under a
     unit of height at the track. */
  const PEAKS = [
    [-165, -25, 26, 13], [-130, -35, 30, 15], [-100, -50, 24, 12],
    [-195, -62, 26, 14], [-160, 50, 28, 14],  [-115, 46, 24, 12],
    [-88, 30, 18, 10],   [-205, 8, 22, 13],
  ];
  const sstep2 = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v-e0)/(e1-e0))); return t*t*(3-2*t); };
  const hAt2 = (x, z) => {
    let h = 0;
    for(const [hx, hz, amp, sig] of PEAKS)
      h += amp * Math.exp(-(((x-hx)*(x-hx)) + ((z-hz)*(z-hz))) / (2*sig*sig));
    return h;
  };
  westH = hAt2;
  const geo = new THREE.PlaneGeometry(GW2, GD2, GN2, GN2);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i) + CX2, z = pos.getZ(i) + CZ2;
    const r4 = Math.pow((x-CX2)/(GW2/2-4), 4) + Math.pow((z-CZ2)/(GD2/2-4), 4);
    pos.setY(i, hAt2(x, z) * (1 - sstep2(0.75, 1.0, r4)) - sstep2(0.8, 1.25, r4) * 3.0);
  }
  geo.computeVertexNormals();
  {
    const lo = new THREE.Color(0xe4dfd4), hi = new THREE.Color(0xa9a18e);
    const nrm = geo.attributes.normal, cols = new Float32Array(pos.count*3);
    const cc = new THREE.Color();
    for(let i=0;i<pos.count;i++){
      const hgt = Math.max(0, Math.min(1, pos.getY(i)/24));
      cc.copy(lo).lerp(hi, hgt);
      const shade = 0.82 + 0.18*Math.max(0, nrm.getY(i));
      cols[i*3] = cc.r*shade; cols[i*3+1] = cc.g*shade; cols[i*3+2] = cc.b*shade;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  }
  const land2 = new THREE.Mesh(geo, std(0xffffff, {roughness:1, envMapIntensity:0.22, vertexColors:true}));
  land2.position.set(CX2, -0.04, CZ2);        // a hair under the island, so the island wins the overlap
  land2.receiveShadow = true; land2.castShadow = false;
  land2.userData.noBounds = true;
  levelG[0].add(land2);
  // conifers up the slopes
  const conifer = (x, z, s) => {
    const t = new THREE.Group(); t.position.set(x, hAt2(x, z) - 0.1, z); t.scale.setScalar(s);
    levelG[0].add(t);
    Cy(t, 0.1, 0.14, 0.9, std(0x8a7f6e, {roughness:0.95}), 0, 0, 0, 8);
    for(const [cy, cr] of [[0.7, 1.15], [1.5, 0.9], [2.2, 0.62]]){
      const c = new THREE.Mesh(new THREE.ConeGeometry(cr, 1.5, 8), MAT.leaf());
      c.position.y = cy + 0.75; c.castShadow = true; t.add(c);
    }
    markNoBounds(t);
  };
  /* Forest across the headland. Kept clear of the rail alignment, which runs
     roughly z 16 at x −178 down to z −24 at x −60. */
  for(const [tx, tz, ts] of [[-104, -34, 1.5], [-88, -30, 1.3], [-132, 24, 1.6],
      [-158, -40, 1.4], [-186, 30, 1.5], [-112, 40, 1.3], [-70, -42, 1.2],
      [-150, -88, 1.4], [-96, 34, 1.4], [-176, -62, 1.3], [-142, -14, 1.5],
      [-198, -28, 1.4],
      [-120, -60, 1.5], [-104, -78, 1.3], [-140, -42, 1.6], [-156, -66, 1.2],
      [-172, -34, 1.45],[-190, -8, 1.35],[-196, 42, 1.5], [-166, 44, 1.3],
      [-148, 64, 1.55],[-128, 56, 1.35],[-108, 64, 1.25],[-92, 46, 1.4],
      [-80, 32, 1.2],  [-118, 24, 1.5], [-138, -4, 1.3], [-100, -16, 1.45],
      [-84, -60, 1.35],[-124, -92, 1.4],[-164, -12, 1.25],[-182, 62, 1.4],
      [-206, 20, 1.3], [-152, 36, 1.2], [-134, 76, 1.45],[-98, 8, 1.15],
      /* South-west stand. This also breaks up the crease where the headland
         laps under the island — a straight tonal edge reads as a seam, a
         ragged tree line reads as a forest. Held to z ≤ 90 out past x −62,
         where the headland rim starts dropping and a tree would float. */
      [-58, 40, 1.35], [-70, 34, 1.2],  [-64, 56, 1.5],  [-78, 48, 1.3],
      [-88, 38, 1.45], [-96, 52, 1.25], [-72, 70, 1.4],  [-86, 66, 1.55],
      [-100, 74, 1.3], [-58, 78, 1.2],  [-110, 44, 1.45],[-104, 62, 1.35],
      [-92, 84, 1.25], [-68, 88, 1.4],  [-116, 70, 1.5], [-124, 50, 1.3],
      [-130, 66, 1.2], [-112, 86, 1.4], [-80, 80, 1.3],  [-50, 62, 1.15]])
    conifer(tx, tz, ts);
}

/* ---- railway: a single line snaking through the hills behind the station.
   It rides the terrain rather than sitting on a shelf, so y is sampled from
   groundH along the centreline and then smoothed over a nine-sample window —
   raw samples make the train jitter over every bump. ---------------------- */
{
  const rail = new THREE.Group(); levelG[0].add(rail);
  /* The line comes in off the headland, crosses the country over the road
     from the transmitter, then swings behind the station and out east. Its
     height is the higher of the two landforms at each point, since the west
     half rides the headland and the east half the island. */
  const X0 = -178, X1 = 54, N = 320;
  const ss = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v-e0)/(e1-e0))); return t*t*(3-2*t); };
  const railZ = x => 15 - 54*ss(-140, -25, x) + 4*Math.sin(x*0.09);
  const pts = [];
  for(let i=0;i<=N;i++){
    const x = X0 + (X1-X0)*i/N, z = railZ(x);
    pts.push({x, z, y: Math.max(groundH(x, z), westH(x, z))});
  }
  const smooth = pts.map((_, i)=>{
    let s = 0, n = 0;
    for(let k=-4;k<=4;k++){ const j = i+k; if(j>=0 && j<pts.length){ s += pts[j].y; n++; } }
    return s/n;
  });
  pts.forEach((p, i)=>{ p.y = smooth[i] + 0.14; });
  // per-point tangent and normal, plus a running arc length for the train
  let total = 0;
  pts.forEach((p, i)=>{
    const a = pts[Math.max(0, i-1)], b = pts[Math.min(pts.length-1, i+1)];
    const tx = b.x-a.x, tz = b.z-a.z, m = Math.hypot(tx, tz) || 1;
    p.tx = tx/m; p.tz = tz/m; p.nx = -p.tz; p.nz = p.tx;
    if(i > 0) total += Math.hypot(p.x-pts[i-1].x, p.z-pts[i-1].z);
    p.s = total;
  });
  const RAIL_L = total;
  const railAt = s => {
    s = ((s % RAIL_L) + RAIL_L) % RAIL_L;
    let i = 1;
    while(i < pts.length-1 && pts[i].s < s) i++;
    const a = pts[i-1], b = pts[i];
    const k = (s - a.s) / Math.max(1e-4, b.s - a.s);
    return {x: a.x + (b.x-a.x)*k, y: a.y + (b.y-a.y)*k, z: a.z + (b.z-a.z)*k,
            tx: b.tx, tz: b.tz};
  };
  // ballast bed and the two rails, all ribbons along the centreline
  const ribbon = (hw, dy, mat, off=0) => {
    const geo = new THREE.BufferGeometry();
    const v = new Float32Array(pts.length*2*3);
    pts.forEach((p, i)=>{
      v.set([p.x + p.nx*(off+hw), p.y+dy, p.z + p.nz*(off+hw)], i*6);
      v.set([p.x + p.nx*(off-hw), p.y+dy, p.z + p.nz*(off-hw)], i*6+3);
    });
    geo.setAttribute("position", new THREE.BufferAttribute(v, 3));
    const idx = [];
    for(let i=0;i<pts.length-1;i++){ const a=i*2, b=i*2+1, c=i*2+2, d=i*2+3; idx.push(a,b,c, b,d,c); }
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.material.side = THREE.DoubleSide;      // same winding trap as the ring road
    m.material.userData.noDim = true;
    m.castShadow = false; m.receiveShadow = true;
    rail.add(m); return m;
  };
  ribbon(1.75, 0, std(0xcac4b6, {roughness:0.99, envMapIntensity:0.2}));
  const railMat = std(0xb4aea3, {roughness:0.4, metalness:0.65, envMapIntensity:1.1});
  ribbon(0.075, 0.17, railMat, 0.62);
  ribbon(0.075, 0.17, railMat, -0.62);
  const sleeper = std(0x9a8d79, {roughness:0.95});
  for(let s=1; s<RAIL_L; s+=2.1){
    const p = railAt(s);
    Bo(rail, 2.05, 0.11, 0.35, sleeper, p.x, p.y+0.02, p.z,
      Math.atan2(p.tx, p.tz)).castShadow = false;
  }

  /* rolling stock: a loco and three coaches, nose along local +x so the same
     heading maths as the cars applies */
  /* What separates rail stock from a bus, at this size, is proportion and
     what's under it: long and narrow, a dark underframe the body sits on,
     inboard bogies rather than wheels at the corners, a rounded roof, and
     windows broken up by mullions instead of one glazed band. */
  const stockPaint = () => std(0xf7f4ee, {roughness:0.38, metalness:0.1, envMapIntensity:1.05});
  const truckMat = std(0x3a352d, {roughness:0.55, metalness:0.35});
  function bogie(g2, bx){
    for(const wz of [0.52, -0.52])
      Bo(g2, 1.7, 0.2, 0.14, MAT.inkFlat(), bx, 0.44, wz);       // side frame
    for(const ax of [bx-0.5, bx+0.5]) for(const wz of [0.54, -0.54]){
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.13, 14), truckMat);
      w.rotation.x = Math.PI/2; w.position.set(ax, 0.3, wz); w.castShadow = true; g2.add(w);
    }
  }
  function glazing(g2, len, paint){
    Bo(g2, len, 0.5, 1.3, MAT.screen(), 0, 1.06, 0);
    for(let mx = -len/2 + 0.75; mx < len/2 - 0.3; mx += 1.15)
      Bo(g2, 0.13, 0.52, 1.33, paint, mx, 1.05, 0);              // mullions
  }
  function mkCoach(){
    const g2 = new THREE.Group(); rail.add(g2);
    const paint = stockPaint();
    Bo(g2, 7.1, 0.36, 1.04, MAT.inkFlat(), 0, 0.5, 0);           // underframe
    Bo(g2, 7.3, 0.92, 1.26, paint, 0, 0.86, 0);                  // body sides
    glazing(g2, 6.5, paint);
    Cy(g2, 0.63, 0.63, 7.3, paint, 0, -1.87, 0, 16, Math.PI/2);  // rounded roof
    Bo(g2, 7.34, 0.09, 1.3, MAT.accent(), 0, 0.78, 0);           // waist stripe
    for(const dx of [-2.6, 2.6]) Bo(g2, 0.1, 1.25, 0.9, std(0xdcd7cc, {roughness:0.7}), dx, 0.9, 0.64);
    for(const cx of [-3.72, 3.72]) Bo(g2, 0.34, 0.2, 0.34, MAT.inkFlat(), cx, 0.56, 0);  // gangway
    bogie(g2, -2.35); bogie(g2, 2.35);
    mkBlobShadow(g2, 8.4, 2.0, 0.02);
    markNoBounds(g2);
    return g2;
  }
  function mkLoco(){
    const g2 = new THREE.Group(); rail.add(g2);
    const dark = std(0x2f2a23, {roughness:0.4, metalness:0.15, envMapIntensity:1.0});
    Bo(g2, 6.4, 0.4, 1.06, MAT.inkFlat(), 0, 0.46, 0);           // underframe
    Bo(g2, 4.5, 1.15, 1.2, dark, -0.7, 0.86, 0);                 // long hood
    Cy(g2, 0.58, 0.58, 4.5, dark, -0.7, -1.24, 0, 14, Math.PI/2);
    Bo(g2, 1.9, 1.7, 1.26, dark, 2.05, 0.86, 0);                 // cab
    Bo(g2, 1.55, 0.5, 1.3, MAT.screen(), 2.05, 1.85, 0);
    Bo(g2, 0.12, 0.5, 1.28, MAT.screen(), 3.02, 1.8, 0);         // front screen
    Bo(g2, 6.5, 0.11, 1.24, MAT.accent(), 0, 1.42, 0);
    Sp(g2, 0.13, emissive(0xfff0da), 3.15, 1.05, 0.3);
    Sp(g2, 0.13, emissive(0xfff0da), 3.15, 1.05, -0.3);
    Bo(g2, 0.28, 0.62, 1.34, MAT.inkFlat(), 3.3, 0.5, 0);        // buffer beam
    Cy(g2, 0.015, 0.015, 0.4, MAT.inkFlat(), -2.4, 2.6, -0.4, 6);
    Sp(g2, 0.05, emissive(0xff4a1c), -2.4, 3.04, -0.4);          // tuned in, like the cars
    bogie(g2, -2.0); bogie(g2, 2.0);
    mkBlobShadow(g2, 7.6, 2.0, 0.02);
    markNoBounds(g2);
    return g2;
  }
  /* A hill swallows each end of the line. That is what stops the train
     appearing in mid-air: cars are hidden past either end of the track, and
     both of those thresholds sit inside a knoll, so what you see is a train
     entering one tunnel and coming out of the other. */
  const knoll = (targetX, dir) => {
    let i = 0; while(i < pts.length-1 && pts[i].x < targetX) i++;
    const p = pts[i], gy = Math.max(groundH(p.x, p.z), westH(p.x, p.z));
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14),
      std(0xdcd7cb, {roughness:1, envMapIntensity:0.22}));
    mound.position.set(p.x, gy - 1.7, p.z);
    mound.scale.set(7.4, 5.4, 6.6);
    mound.castShadow = false; mound.receiveShadow = true;
    rail.add(mound);
    const mx = p.x + dir*6.0, mz = railZ(mx);
    Bo(rail, 2.7, 2.0, 0.55, MAT.inkFlat(), mx,
      Math.max(groundH(mx, mz), westH(mx, mz)) + 0.04, mz,
      Math.atan2(p.tx, p.tz)).castShadow = false;
  };
  knoll(-172, 1);
  knoll(47, -1);

  const consist = [mkLoco(), mkCoach(), mkCoach(), mkCoach()];
  const CYCLE = RAIL_L + 34;          // a clear pause between passes
  const placeTrain = t => {
    // the offset starts the consist mid-line rather than inside the west
    // tunnel, so it is on screen from the first frame
    const head = ((t * 8.5 + 150) % CYCLE + CYCLE) % CYCLE;
    consist.forEach((car, i)=>{
      const s = head - i*7.9;          // coach length plus a coupler gap
      car.visible = s > 0 && s < RAIL_L;
      if(!car.visible) return;
      const p = railAt(s);
      car.position.set(p.x, p.y + 0.28, p.z);
      car.rotation.y = Math.atan2(-p.tz, p.tx);
    });
  };
  markNoBounds(rail);
  placeTrain(0);
  if(ANIM) anims.push(t => placeTrain(t));
}

/* ---- aircraft: light planes crossing the sky off the north-west, one of
   them towing a station banner. They fly the −z axis, which climbs up and to
   the right on screen, out of the lower left and away toward the cloud band —
   rather than the +x axis, which ran them straight at the building. Held at
   x −58…−92 so the whole visible run passes above and left of the station's
   screen box (measured: the building sits at 484,268…784,506 and the lane
   never enters it), and at y 27…31 — under the clouds at y 34+, and clear of
   the exploded plates, which stack to y 34 over x −35…1. ----------------- */
{
  const air = new THREE.Group(); levelG[0].add(air);
  const bannerTex = tex(384, 76, (x,w,h)=>{
    x.fillStyle = "rgba(253,251,246,0.95)"; rr(x, 0, 0, w, h, 9); x.fill();
    x.strokeStyle = "#ff4a1c"; x.lineWidth = 3.5; rr(x, 3, 3, w-6, h-6, 7); x.stroke();
    x.fillStyle = "#26211a"; x.font = "800 29px "+F;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("WBCC 104.5 · ALWAYS ON", w/2, h/2 + 1);
  });
  function mkPlane(banner){
    const g = new THREE.Group();
    const body = std(0xfbf9f4, {roughness:0.5, metalness:0.14, envMapIntensity:1.05});
    Cy(g, 0.34, 0.4, 5.0, body, 0, -2.5, 0, 14, Math.PI/2);       // fuselage, nose at +x
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 14), body);
    nose.position.set(2.95, 0, 0); nose.rotation.z = -Math.PI/2; g.add(nose);
    Bo(g, 1.7, 0.13, 7.8, body, 0.15, -0.065, 0);                 // wing
    Bo(g, 0.8, 0.1, 2.9, body, -2.1, -0.05, 0);                   // tailplane
    Bo(g, 0.85, 1.25, 0.13, body, -2.15, 0.1, 0);                 // fin
    Bo(g, 0.5, 0.24, 0.13, MAT.accent(), -2.15, 0.95, 0);         // fin flash
    Bo(g, 1.15, 0.3, 0.64, MAT.glass(), 1.55, 0.16, 0);           // cockpit
    for(const nz of [-2.1, 2.1]){
      Cy(g, 0.2, 0.2, 1.5, MAT.inkFlat(), 0.3, -1.1, nz, 12, Math.PI/2);
      Sp(g, 0.06, emissive(0xff4a1c), -0.5, -0.35, nz);           // nav light
    }
    if(banner){
      Cy(g, 0.02, 0.02, 2.8, MAT.chrome(), -4.1, -1.4, 0, 6, Math.PI/2);
      const bn = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.9),
        new THREE.MeshBasicMaterial({map:bannerTex, transparent:true,
          side:THREE.DoubleSide, toneMapped:false}));
      bn.position.set(-10.3, -0.1, 0); g.add(bn);
    }
    return g;
  }
  const HDG = Math.PI/2;              // nose down the −z axis, toward the clouds
  const planes = [
    {x:-58, y:29, z:66,  ry:HDG, s:0.85, sp:4.4, banner:false},
    // the banner rides the middle lane: the outer one spends too much of its
    // run off the left edge, taking the banner with it
    {x:-76, y:31, z:20,  ry:HDG, s:1.0,  sp:5.0, banner:true},
    {x:-92, y:27, z:-28, ry:HDG, s:0.9, sp:4.6, banner:false},
  ].map((a, i) => {
    const g0 = new THREE.Group(); g0.position.set(a.x, a.y, a.z);
    g0.rotation.y = a.ry; g0.scale.setScalar(a.s); air.add(g0);
    const body = mkPlane(a.banner); g0.add(body);
    return {g0, body, home: new THREE.Vector3(a.x, a.y, a.z),
            vx: Math.cos(a.ry) * a.sp, vz: -Math.sin(a.ry) * a.sp, ph: i * 2.1};
  });
  markNoBounds(air);
  air.traverse(o=>{ if(o.isMesh){ o.castShadow = false; o.receiveShadow = false; } });
  // same trap as the clouds and the boats: a plane is a long way off, but from
  // a room on an upper plate it flies straight through the shot
  const airMats = [];
  air.traverse(o=>{ if(o.isMesh && o.material){ o.material.transparent = true; airMats.push(o.material); } });
  let aop = 1;
  tickSky = dt => {
    const goal = active >= 0 ? 0 : 1;
    if(Math.abs(aop - goal) < 0.004) return;
    aop = REDUCED ? goal : aop + (goal - aop) * Math.min(1, dt * 4);
    airMats.forEach(m=> m.opacity = aop);
    planes.forEach(a=> a.g0.visible = aop > 0.02);
  };
  if(ANIM) anims.push((t, dt)=> planes.forEach(a=>{
    a.g0.position.x += dt * a.vx;
    a.g0.position.z += dt * a.vz;
    // they all restart from the same point down the coast, so the stagger in
    // their starting z spaces them out instead of bunching them by lane length
    if(a.g0.position.z < -88) a.g0.position.z = 78;
    a.body.position.y = Math.sin(t*0.5 + a.ph) * 0.5;
    a.body.rotation.z = Math.sin(t*0.37 + a.ph) * 0.045;
  }));
}

/* =====================================================================
   furniture builders
   ===================================================================== */
function mkDesk(g, x, fy, z, w=3.4, d=1.8){
  Bo(g, w, 0.14, d, MAT.white(), x, fy+1.4, z);
  Bo(g, 0.14, 1.4, d*0.8, MAT.white(), x-w/2+0.2, fy, z);
  Bo(g, 0.14, 1.4, d*0.8, MAT.white(), x+w/2-0.2, fy, z);
  return fy+1.54;
}
function mkChair(g, x, fy, z, ry=0){
  const c = new THREE.Group(); c.position.set(x, fy, z); c.rotation.y = ry; g.add(c);
  const pad = std(0xe3ded2, {roughness:0.97, envMapIntensity:0.3});
  for(let i=0;i<5;i++){ const a = i*Math.PI*2/5;
    Bo(c, 0.44,0.06,0.09, MAT.inkFlat(), Math.sin(a)*0.23, 0.04, Math.cos(a)*0.23, -a); }
  Cy(c, 0.07,0.07,0.55, MAT.chrome(), 0, 0.1, 0, 12);
  Bo(c, 0.9,0.14,0.88, pad, 0, 0.65, 0);
  const back = Bo(c, 0.88,1.0,0.14, pad, 0, 0.79, -0.42);
  back.rotation.x = -0.12;
  return c;
}
function mkMonitor(g, x, sy, z, txr, s=1, ry=0){
  const m = new THREE.Group(); m.position.set(x, sy, z); m.rotation.y = ry; m.scale.setScalar(s); g.add(m);
  Cy(m, 0.38,0.42,0.05, MAT.inkFlat(), 0, 0, 0, 20);
  Bo(m, 0.11,0.36,0.09, MAT.inkFlat(), 0, 0.04, -0.02);
  Bo(m, 1.6,1.05,0.09, MAT.screen(), 0, 0.4, 0);
  if(txr) Pl(m, 1.46, 0.92, signMat(txr), 0, 0.92, 0.05);
  return m;
}
function mkMug(g, x, sy, z){
  Cy(g, 0.11,0.1,0.19, MAT.white(), x, sy, z, 18);
  Cy(g, 0.115,0.115,0.045, MAT.accent(), x, sy+0.125, z, 18);
  Torus(g, 0.07, 0.02, MAT.white(), x+0.12, sy+0.1, z, 0);
}
function mkPapers(g, x, sy, z, ry=0.3){
  Bo(g, 0.5,0.02,0.36, MAT.white(), x, sy, z, ry);
  Bo(g, 0.5,0.02,0.36, MAT.white(), x+0.04, sy+0.02, z-0.02, ry+0.25);
}
function mkKeyboard(g, x, sy, z){ Bo(g, 0.74,0.04,0.26, std(0xe8e5dd), x, sy, z); }
function mkPlant(g, x, fy, z, s=1){
  const p = new THREE.Group(); p.position.set(x, fy, z); p.scale.setScalar(s); g.add(p);
  Cy(p, 0.26,0.19,0.44, MAT.white(), 0, 0, 0, 20);
  Sp(p, 0.28, MAT.leaf(), -0.12, 0.78, 0.05, 1.5);
  Sp(p, 0.24, MAT.leaf(), 0.14, 0.92, -0.07, 1.6);
  Sp(p, 0.2, MAT.leaf(), 0.02, 1.1, 0.03, 1.4);
}
function mkMicBoom(g, x, sy, z, ry=0){
  const b = new THREE.Group(); b.position.set(x, sy, z); b.rotation.y = ry; g.add(b);
  Cy(b, 0.11,0.11,0.06, MAT.inkFlat(), 0, 0, 0, 14);
  Cy(b, 0.032,0.032,0.9, MAT.inkFlat(), 0.15, 0.36, 0, 10, 0.52);
  Cy(b, 0.028,0.028,0.75, MAT.inkFlat(), 0.66, 0.66, 0, 10, 1.35);
  Sp(b, 0.11, MAT.inkFlat(), 1.02, 0.76, 0);
  Cy(b, 0.065,0.065,0.2, MAT.inkFlat(), 1.02, 0.57, 0, 12);
}
function mkStool(g, x, fy, z){
  Cy(g, 0.34,0.34,0.1, MAT.white(), x, fy+0.8, z, 20);
  Torus(g, 0.34, 0.024, MAT.inkFlat(), x, fy+0.89, z);
  for(const a of [0, 2.1, 4.2]){
    const leg = Cy(g, 0.032,0.032,0.86, MAT.chrome(), x+Math.sin(a)*0.29, fy, z+Math.cos(a)*0.29, 8);
    leg.rotation.z = -Math.sin(a)*0.16; leg.rotation.x = Math.cos(a)*0.16;
  }
}
function mkTripod(g, x, fy, z, h=1.7){
  for(const a of [0.4, 2.5, 4.6]){
    const leg = Cy(g, 0.03,0.03,h, MAT.inkFlat(), x+Math.sin(a)*0.38, fy, z+Math.cos(a)*0.38, 8);
    leg.rotation.z = -Math.sin(a)*0.22; leg.rotation.x = Math.cos(a)*0.22;
  }
  return fy+h*0.96;
}
function mkCamera(g, x, fy, z, ry=0){
  const top = mkTripod(g, x, fy, z, 1.7);
  const c = new THREE.Group(); c.position.set(x, top, z); c.rotation.y = ry; g.add(c);
  Bo(c, 0.38,0.4,0.62, MAT.white(), 0, 0, 0);
  Cy(c, 0.13,0.13,0.24, MAT.inkFlat(), 0, 0.2, 0.4, 16, 0, Math.PI/2);
  const tally = Sp(c, 0.055, emissive(0xff4a1c), 0, 0.38, -0.22);
  if(ANIM) anims.push(t=>{ tally.material.transparent = true;
    tally.material.opacity = 0.35+0.65*Math.abs(Math.sin(t*2.4)); });
  return c;
}
function mkNearfield(g, x, sy, z, ry=0){
  const s = new THREE.Group(); s.position.set(x, sy, z); s.rotation.y = ry; g.add(s);
  Bo(s, 0.4,0.6,0.38, MAT.white(), 0, 0, 0);
  Cy(s, 0.12,0.12,0.05, MAT.inkFlat(), 0, 0.18, 0.19, 16, 0, Math.PI/2);
  Cy(s, 0.055,0.055,0.05, MAT.inkFlat(), 0, 0.44, 0.19, 12, 0, Math.PI/2);
}
function mkConsole(g, x, sy, z, s=1, ry=0){
  const c = new THREE.Group(); c.position.set(x, sy, z); c.scale.setScalar(s); c.rotation.y = ry; g.add(c);
  const slab = Bo(c, 2.0,0.16,1.0, MAT.inkFlat(), 0, 0, 0); slab.rotation.x = 0.1;
  for(let i=0;i<6;i++) Bo(c, 0.06,0.04,0.38, std(0xf3f1ea), -0.76+i*0.3, 0.15, 0.04);
  Bo(c, 0.2,0.05,0.2, MAT.accent(), 0.8, 0.15, 0.08);
  return c;
}
function mkCabinet(g, x, fy, z, ry=0){
  Bo(g, 1.2,1.9,0.9, MAT.white(), x, fy, z, ry);
  Bo(g, 0.4,0.07,0.07, MAT.inkFlat(), x, fy+1.35, z+0.46, ry);
  Bo(g, 0.4,0.07,0.07, MAT.inkFlat(), x, fy+0.6, z+0.46, ry);
}
function mkShelfUnit(g, x, fy, z, w, h, shelves, ry=0){
  const u = new THREE.Group(); u.position.set(x, fy, z); u.rotation.y = ry; g.add(u);
  Bo(u, 0.16, h, 0.9, MAT.white(), -w/2, 0, 0);
  Bo(u, 0.16, h, 0.9, MAT.white(), w/2, 0, 0);
  Bo(u, w, 0.14, 0.9, MAT.white(), 0, h-0.14, 0);
  for(let i=0;i<shelves;i++) Bo(u, w, 0.11, 0.9, MAT.white(), 0, (i+1)*(h/(shelves+1)), 0);
  return u;
}
function mkRug(g, x, fy, z, w, d, ry=0){
  const m = Bo(g, w, 0.05, d, std(0xdbd5c9, {roughness:0.99, envMapIntensity:0.22}), x, fy+0.012, z, ry);
  m.castShadow = false; return m;
}
function mkSofa(g, x, fy, z, w=3.2, ry=0){
  const s = new THREE.Group(); s.position.set(x, fy, z); s.rotation.y = ry; g.add(s);
  const body = std(0xf3f0e9, {roughness:0.95, envMapIntensity:0.35});
  const cush = std(0xdfd9cd, {roughness:0.98, envMapIntensity:0.3});
  Bo(s, w, 0.42, 1.5, body, 0, 0.16, 0);
  Bo(s, w-0.5, 0.28, 1.3, cush, 0, 0.58, 0.06);
  Bo(s, w, 0.95, 0.3, body, 0, 0.58, -0.6);
  Bo(s, w-0.6, 0.4, 0.18, cush, 0, 0.9, -0.5);
  Bo(s, 0.3, 0.62, 1.5, body, -w/2+0.15, 0.58, 0);
  Bo(s, 0.3, 0.62, 1.5, body, w/2-0.15, 0.58, 0);
  for(const dx of [-w/2+0.3, w/2-0.3]) for(const dz of [-0.55, 0.55])
    Cy(s, 0.05,0.05,0.16, MAT.inkFlat(), dx, 0, dz, 8);
  return s;
}
function mkCoffeeTable(g, x, fy, z){
  Bo(g, 1.6, 0.1, 0.9, MAT.white(), x, fy+0.48, z);
  for(const dx of [-0.66, 0.66]) for(const dz of [-0.32, 0.32])
    Cy(g, 0.045,0.045,0.5, MAT.inkFlat(), x+dx, fy, z+dz, 8);
  Bo(g, 0.4, 0.05, 0.28, std(0xe8e4dc), x-0.3, fy+0.58, z, 0.3);
}
function mkFloorLamp(g, x, fy, z){
  Cy(g, 0.28,0.32,0.05, MAT.inkFlat(), x, fy, z, 18);
  Cy(g, 0.035,0.035,2.1, MAT.inkFlat(), x, fy+0.05, z, 10);
  const sh = Cy(g, 0.24,0.36,0.5, MAT.white(), x, fy+2.1, z, 20);
  Sp(g, 0.1, new THREE.MeshBasicMaterial({color:0xf7b757, toneMapped:false}), x, fy+2.2, z);
}
function mkSideTable(g, x, fy, z){
  Cy(g, 0.42,0.42,0.09, MAT.white(), x, fy+0.62, z, 24);
  Cy(g, 0.07,0.07,0.62, MAT.inkFlat(), x, fy, z, 12);
  Cy(g, 0.3,0.3,0.05, MAT.inkFlat(), x, fy, z, 18);
}
function mkWaterCooler(g, x, fy, z){
  Bo(g, 0.55, 1.1, 0.5, MAT.white(), x, fy, z);
  Cy(g, 0.26,0.26,0.6, MAT.glass(), x, fy+1.1, z, 20);
  Bo(g, 0.16, 0.1, 0.1, MAT.accent(), x, fy+0.72, z+0.28);
}
function mkWhiteboard(g, x, y, z, w=3.0, h=1.7, face="n"){
  const t = 0.1;
  if(face === "n" || face === "s"){
    Bo(g, w, h, t, MAT.white(), x, y-h/2, z);
    Bo(g, w, 0.1, t+0.12, std(0xe4e0d6), x, y-h, z);
  } else {
    Bo(g, t, h, w, MAT.white(), x, y-h/2, z);
    Bo(g, t+0.12, 0.1, w, std(0xe4e0d6), x, y-h, z);
  }
}
function mkBookcase(g, x, fy, z, w=2.6, h=2.2, ry=0){
  const u = mkShelfUnit(g, x, fy, z, w, h, 2, ry);
  for(let s=0;s<3;s++){
    const shy = 0.09 + s*(h/3);
    for(let i=0;i<9;i++){
      const col = ((i+s)%7===3) ? 0xff4a1c : [0xdad6ce,0xc9c4ba,0xe4e0d8][(i+s)%3];
      Bo(u, 0.16, 0.5+((i*5+s)%3)*0.06, 0.62, std(col), -w/2+0.5+i*0.24, shy, 0);
    }
  }
  return u;
}
function mkCrate(g, x, fy, z, w=1.1, h=0.7, d=0.9){
  Bo(g, w, h, d, MAT.white(), x, fy, z);
  Bo(g, w+0.02, 0.08, d*0.5, std(0xe4e0d6), x, fy+h-0.08, z);
}
/* framed board mounted flat on a wall */
function mkBoard(g, txr, w, h, x, y, z, face){
  // face: 'n' (back wall, normal +z) | 's' | 'w' | 'e'
  const t = 0.09;
  if(face === "n" || face === "s"){
    Bo(g, w+0.14, h+0.14, t, MAT.white(), x, y-(h+0.14)/2, z);
    Pl(g, w, h, signMat(txr), x, y, z + (face==="n" ? t/2+0.01 : -t/2-0.01), face==="n"?0:Math.PI);
  } else {
    Bo(g, t, h+0.14, w+0.14, MAT.white(), x, y-(h+0.14)/2, z);
    Pl(g, w, h, signMat(txr), x + (face==="e" ? t/2+0.01 : -t/2-0.01), y, z, face==="e"?Math.PI/2:-Math.PI/2);
  }
}

/* =====================================================================
   ROOMS
   ===================================================================== */
const roomRecs = {};
const pickExtras = [];      // moving groups (cars, pedestrians) picked recursively
/* Sims-style reveal for the homes: roofs lift and fade, full front walls swap
   for waist-high stubs, exposing the furnished interiors. */
const homesState = {parts:[]};
function applyHomes(){
  const e = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  homesState.parts.forEach(p=>{
    const k = e(p.k);
    p.roof.position.y = 2.3*k;
    p.roof.traverse(o=>{
      if(o.material){ o.material.transparent = true; o.material.opacity = 1 - 0.75*k; }
    });
    p.full.visible = p.k < 0.5;
    p.stub.visible = p.k >= 0.5;
  });
}
function closeHomes(snap){
  homesState.parts.forEach(p=> p.t = 0);
  if(snap || REDUCED){ homesState.parts.forEach(p=> p.k = 0); applyHomes(); }
}
function roomGroup(room){
  const g = new THREE.Group();
  const lvl = room.ext ? 0 : room.floor;
  levelG[lvl].add(g);
  const pins = [];
  roomRecs[room.id] = {group:g, pins, room, lvl};
  return {g, pin:(x,y,z)=>pins.push(new THREE.Vector3(x,y,z).add(OFF(lvl)))};
}
const RM = id => ROOMS.find(r=>r.id===id);
const BACKW = PZ0 + WT + 0.03;      // inner face of back wall
const LEFTW = PX0 + WT + 0.03;      // inner face of left wall
const RIGHTW = PX1 - WT - 0.03;

/* --- On-Air Studio (F3, back-left) --- */
{
  const room = RM("onair"), {g, pin} = roomGroup(room), fy = 0;
  const sy = mkDesk(g, -10.5, fy, -8.4, 5.6, 2.1);
  mkMonitor(g, -12.0, sy, -8.8, TX.logScreen, 1.0);
  mkMonitor(g, -10.4, sy, -9.0, TX.siteScreen, 0.95, 0.14);
  mkConsole(g, -8.3, sy, -8.2, 1.1);
  mkKeyboard(g, -11.2, sy, -7.7);
  mkMug(g, -9.6, sy, -7.6);
  mkMicBoom(g, -13.0, sy, -8.2, -0.5);
  mkChair(g, -10.2, fy, -6.6, Math.PI);
  mkBoard(g, TX.onair, 3.2, 1.05, -6.0, fy+2.7, BACKW, "n");
  // watchdog rack
  const rx = -2.4, rz = -10.6;
  Bo(g, 1.4, 3.1, 1.15, MAT.white(), rx, fy, rz);
  Pl(g, 1.2, 2.9, signMat(TX.rackFront), rx, fy+1.6, rz+0.59);
  const vus = [];
  for(let i=0;i<4;i++)
    vus.push(Bo(g, 0.11, 0.6, 0.06, emissive(0xff4a1c), rx-0.36+i*0.24, fy+1.8, rz+0.61));
  if(ANIM) anims.push(t=> vus.forEach((b,i)=>{
    const s = 0.3+0.7*Math.abs(Math.sin(t*(2.1+i*0.6)+i*1.7));
    b.scale.y = s; b.position.y = fy+1.8+0.3*s;
  }));
  mkNearfield(g, -14.0, fy+2.3, -11.4, 0.5);
  mkNearfield(g, -7.0, fy+2.3, -11.4, -0.5);
  mkPlant(g, -15.2, fy, -1.8, 1.1);
  mkCabinet(g, -15.4, fy, -6.0, Math.PI/2);
  // guest / listening side of the studio
  mkRug(g, -9.6, fy, -3.2, 7.6, 4.6);
  mkSofa(g, -11.4, fy, -4.6, 3.4, 0);
  mkCoffeeTable(g, -11.4, fy, -2.4);
  mkSideTable(g, -13.8, fy, -3.0);
  mkFloorLamp(g, -14.4, fy, -4.8);
  mkBookcase(g, -4.6, fy, -3.0, 2.8, 2.2, -Math.PI/2);
  mkStool(g, -5.6, fy, -6.0);
  pin(-8.3, sy+0.6, -8.2);
  pin(-12.0, sy+0.9, -7.9);
  pin(rx, fy+2.4, rz+0.7);
  pin(-6.0, fy+2.7, BACKW+0.4);
}

/* --- Production Studio (F3, back-right) --- */
{
  const room = RM("production"), {g, pin} = roomGroup(room), fy = 0;
  const sy = mkDesk(g, 5.4, fy, -8.0, 4.4, 2.0);
  mkMonitor(g, 5.4, sy, -8.4, TX.waveScreen, 1.15);
  mkNearfield(g, 3.6, sy, -8.4, 0.3);
  mkNearfield(g, 7.2, sy, -8.4, -0.3);
  mkConsole(g, 5.4, sy, -7.3, 0.95);
  mkMug(g, 7.1, sy, -7.2);
  mkChair(g, 5.4, fy, -6.0, Math.PI);
  // voice booth in the corner
  const bx = 12.6, bz = -9.4, bw = 6.2, bd = 5.4;
  Bo(g, 0.2, WH-0.3, bd, MAT.wall(), bx-bw/2, fy, bz);
  Bo(g, bw, 0.2, bd, MAT.wall(), bx, fy+WH-0.45, bz);
  Bo(g, 0.12, WH-1.7, bd*0.6, MAT.glass(), bx-bw/2+0.16, fy+0.95, bz+0.6);
  for(let r=0;r<3;r++) for(let c=0;c<5;c++)
    Bo(g, 0.68,0.68,0.14, std(0x8f887c, {roughness:0.98}), bx-1.7+c*0.86, fy+1.5+r*0.8, BACKW+0.05);
  Cy(g, 0.022,0.022,1.4, MAT.inkFlat(), bx, fy+2.4, bz, 8);
  Sp(g, 0.16, MAT.inkFlat(), bx, fy+2.34, bz);
  Torus(g, 0.26, 0.028, MAT.gray(), bx-0.4, fy+2.0, bz, 0);
  const rec = Sp(g, 0.08, emissive(0xff4a1c), bx+2.3, fy+3.2, bz-2.3);
  if(ANIM) anims.push(t=>{ rec.material.transparent = true;
    rec.material.opacity = 0.3+0.7*Math.abs(Math.sin(t*2.2)); });
  mkStool(g, bx, fy, bz+1.4);
  mkPlant(g, 1.9, fy, -2.0, 1.0);
  mkRug(g, 7.4, fy, -3.0, 8.0, 4.4);
  mkSofa(g, 5.4, fy, -4.2, 3.0, 0);
  mkCoffeeTable(g, 5.4, fy, -2.0);
  mkFloorLamp(g, 2.6, fy, -4.4);
  mkBookcase(g, 12.0, fy, -3.4, 3.0, 2.2, 0);
  mkWaterCooler(g, 15.0, fy, -4.6);
  mkCabinet(g, 15.0, fy, -1.4, -Math.PI/2);
  pin(5.4, sy+0.65, -7.3);
  pin(bx, fy+2.34, bz+1.2);
  pin(5.4, sy+1.3, -8.4);
}

/* --- Podcast Studio (F3, front-right) --- */
{
  const room = RM("podcast"), {g, pin} = roomGroup(room), fy = 0;
  const cx = 8.6, cz = 6.6;
  Cy(g, 0.18,0.24,1.06, MAT.inkFlat(), cx, fy, cz);
  Cy(g, 0.9,0.9,0.08, MAT.inkFlat(), cx, fy+0.02, cz, 26);
  Cy(g, 2.0,2.0,0.12, MAT.white(), cx, fy+1.06, cz, 44);
  Torus(g, 2.0, 0.032, MAT.inkFlat(), cx, fy+1.15, cz);
  [[-1.25,0.55],[0,-1.25],[1.25,0.55]].forEach(([dx,dz])=>{
    Cy(g, 0.11,0.11,0.055, MAT.inkFlat(), cx+dx, fy+1.18, cz+dz, 14);
    Cy(g, 0.024,0.024,0.4, MAT.inkFlat(), cx+dx, fy+1.23, cz+dz, 8);
    Sp(g, 0.1, MAT.inkFlat(), cx+dx, fy+1.68, cz+dz);
  });
  mkMug(g, cx+0.55, fy+1.2, cz+1.0);
  mkStool(g, cx-3.0, fy, cz+1.0);
  mkStool(g, cx+3.0, fy, cz+1.0);
  mkStool(g, cx, fy, cz-3.0);
  mkCamera(g, cx+4.4, fy, cz+3.4, -2.5);
  for(let c=0;c<4;c++)
    Bo(g, 1.1, 1.7, 0.12, std(0xf1ede5, {roughness:0.98}), 3.4+c*2.0, fy+1.4, PZ1-WT-0.06);
  mkPlant(g, 15.0, fy, 10.6, 1.05);
  mkRug(g, cx, fy, cz, 8.6, 8.0);
  mkSofa(g, 3.4, fy, 9.6, 3.2, -0.5);
  mkSideTable(g, 1.6, fy, 7.6);
  mkFloorLamp(g, 15.2, fy, 2.6);
  mkBookcase(g, 14.6, fy, 8.0, 3.2, 2.2, -Math.PI/2);
  mkCabinet(g, 2.0, fy, 2.2);
  pin(cx, fy+1.85, cz+0.5);
  pin(cx+4.4, fy+2.0, cz+3.4);
  pin(cx-1.8, fy+1.3, cz+1.4);
}

/* --- Gaming Studio (F3, front-left) --- */
{
  const room = RM("gaming"), {g, pin} = roomGroup(room), fy = 0;
  mkRug(g, -8.5, fy, 6.8, 10.5, 7.0);
  // battle stations against the back of the quadrant
  for(const dx of [-11.6, -6.4]){
    const sy = mkDesk(g, dx, fy, 2.9, 3.6, 1.8);
    mkMonitor(g, dx-0.6, sy, 2.5, TX.game, 0.95, 0.1);
    mkMonitor(g, dx+0.8, sy, 2.5, TX.game, 0.88, -0.12);
    mkKeyboard(g, dx, sy, 3.5); mkMug(g, dx+1.3, sy, 3.6);
    // headset on a stand
    Cy(g, 0.02,0.02,0.42, MAT.chrome(), dx-1.4, sy, 3.5, 8);
    Torus(g, 0.14, 0.035, MAT.inkFlat(), dx-1.4, sy+0.46, 3.5, 0.4);
    mkChair(g, dx, fy, 4.6, Math.PI);
  }
  // LIVE tally + acoustic panels on the cross wall
  const live = Pl(g, 1.5, 0.62, signMat(TX.live), -3.2, fy+2.8, WT/2+0.04);
  if(ANIM) anims.push(t=>{ live.material.opacity = 0.55+0.45*Math.abs(Math.sin(t*1.9)); });
  Bo(g, 1.0, 1.4, 0.1, std(0xf0ece4, {roughness:0.98}), -15.2, fy+1.5, WT/2+0.05);
  Bo(g, 1.0, 1.4, 0.1, std(0xf0ece4, {roughness:0.98}), -2.0, fy+1.1, WT/2+0.05);
  // stream rig: camera + ring light aimed at the stations
  mkCamera(g, -9.0, fy, 6.6, Math.PI);
  Cy(g, 0.03,0.03,1.7, MAT.inkFlat(), -12.2, fy, 6.4, 8);
  Torus(g, 0.5, 0.05, Object.assign(new THREE.MeshBasicMaterial({color:0xfff0d8}), {toneMapped:false}),
    -12.2, fy+1.9, 6.4, 0.28);
  // console corner: couch + TV on the spine wall
  mkSofa(g, -4.6, fy, 9.8, 3.0, Math.PI/2);
  mkCoffeeTable(g, -6.6, fy, 9.8);
  Bo(g, 0.7, 0.16, 0.5, MAT.inkFlat(), -6.6, fy+0.6, 9.8);
  Sp(g, 0.05, emissive(0xff4a1c), -6.35, fy+0.72, 9.6);
  Bo(g, 0.12, 1.7, 2.9, MAT.white(), -0.45, fy+1.2, 9.4);
  Pl(g, 2.6, 1.45, signMat(TX.game), -0.52, fy+2.05, 9.4, -Math.PI/2);
  mkPlant(g, -15.4, fy, 11.4, 1.05);
  mkFloorLamp(g, -2.2, fy, 12.0);
  pin(-9.0, fy+2.4, 2.7);
  pin(-9.0, fy+2.1, 6.6);
  pin(-2.2, fy+2.0, 9.7);
}

/* --- Programming (F2, back-left) --- */
{
  const room = RM("programming"), {g, pin} = roomGroup(room), fy = 0;
  mkBoard(g, TX.sched, 5.4, 3.4, -12.2, fy+2.5, BACKW, "n");
  for(let i=0;i<3;i++){
    const cx2 = -5.6+i*1.9;
    Cy(g, 0.56,0.56,0.12, MAT.white(), cx2, fy+2.7, BACKW+0.06, 26, 0, Math.PI/2);
    Torus(g, 0.56, 0.038, MAT.inkFlat(), cx2, fy+2.7, BACKW+0.12, 0);
    Bo(g, 0.05,0.4,0.035, MAT.inkFlat(), cx2, fy+2.7, BACKW+0.14, 0, (i-1)*0.9);
    const hand = Bo(g, 0.045,0.48,0.035, MAT.accent(), cx2, fy+2.7, BACKW+0.16);
    hand.geometry.translate(0,-0.24,0); hand.position.y = fy+2.7+0.24;
    if(ANIM) anims.push(t=>{ hand.rotation.z = -t*0.7 - i; });
  }
  const sy = mkDesk(g, -9.0, fy, -5.4, 4.4, 2.0);
  mkMonitor(g, -9.9, sy, -5.8, TX.sched, 0.92, 0.12);
  mkMonitor(g, -8.1, sy, -5.8, TX.siteScreen, 0.92, -0.12);
  mkKeyboard(g, -9.0, sy, -4.8); mkMug(g, -7.5, sy, -4.7);
  mkChair(g, -9.0, fy, -3.5, Math.PI);
  mkCabinet(g, -15.2, fy, -9.6, Math.PI/2);
  mkPlant(g, -15.0, fy, -1.9, 1.1);
  // planning table
  mkRug(g, -6.6, fy, -3.4, 8.4, 5.2);
  Bo(g, 3.6, 0.14, 1.8, MAT.white(), -6.6, fy+1.4, -3.4);
  for(const dx of [-1.6, 1.6]) for(const dz of [-0.7, 0.7])
    Cy(g, 0.06,0.06,1.4, MAT.inkFlat(), -6.6+dx, fy, -3.4+dz, 10);
  mkChair(g, -6.6, fy, -5.0, Math.PI);
  mkChair(g, -6.6, fy, -1.8, 0);
  mkChair(g, -9.2, fy, -3.4, Math.PI/2);
  mkPapers(g, -6.0, fy+1.54, -3.4, 0.2);
  mkMug(g, -7.6, fy+1.54, -3.0);
  mkWhiteboard(g, -13.4, fy+2.8, -3.0, 4.0, 1.9, "e");
  mkBookcase(g, -2.4, fy, -6.2, 2.8, 2.2, -Math.PI/2);
  pin(-12.2, fy+3.1, BACKW+0.5);
  pin(-9.0, fy+2.4, -5.2);
  pin(-5.6, fy+2.7, BACKW+0.5);
}

/* --- Music Library (F2, back-right) --- */
{
  const room = RM("music"), {g, pin} = roomGroup(room), fy = 0;
  for(let bay=0; bay<2; bay++){
    const bx = 4.2 + bay*5.4, bz = -10.4;
    mkShelfUnit(g, bx, fy, bz, 4.8, 3.0, 2);
    for(let s=0;s<3;s++){
      const shy = fy + 0.11 + s*0.96;
      for(let i=0;i<17;i++){
        const shade = [0xdad6ce,0xc9c4ba,0xb3aea3,0xe4e0d8][(i+s+bay)%4];
        const col = ((i+s*3+bay*5)%9===4) ? 0xff4a1c : shade;
        Bo(g, 0.19, 0.82+((i*7+s)%3)*0.05, 0.8, std(col), bx-2.2+i*0.27, shy, bz);
      }
    }
  }
  const sy = mkDesk(g, 12.6, fy, -5.6, 3.2, 1.8);
  Bo(g, 1.5,0.12,1.2, MAT.white(), 12.3, sy, -5.6);
  Cy(g, 0.52,0.52,0.07, MAT.inkFlat(), 12.3, sy+0.12, -5.6, 32);
  Cy(g, 0.07,0.07,0.03, MAT.accent(), 12.3, sy+0.19, -5.6, 12);
  Cy(g, 0.02,0.02,0.6, MAT.chrome(), 13.0, sy+0.21, -5.2, 8, 1.2);
  mkMug(g, 13.6, sy, -5.0);
  mkChair(g, 12.6, fy, -3.9, Math.PI);
  // cart crate
  Bo(g, 1.4,0.85,1.0, MAT.white(), 4.0, fy, -4.4);
  for(let i=0;i<5;i++)
    Bo(g, 0.17,0.66,0.8, std(i===3?0xff4a1c:[0xbdb8ae,0x8f8a80,0xd2cdc2,0xdad6ce][i%4]),
       3.56+i*0.22, fy+0.2, -4.4, 0.07*(i-2));
  mkPlant(g, 15.0, fy, -1.9, 1.05);
  // more stacks along the side wall + listening nook
  mkBookcase(g, 15.0, fy, -8.6, 5.6, 2.6, -Math.PI/2);
  mkRug(g, 7.6, fy, -2.6, 8.6, 4.0);
  mkSofa(g, 7.0, fy, -3.6, 3.0, 0);
  mkCoffeeTable(g, 7.0, fy, -1.6);
  mkFloorLamp(g, 3.0, fy, -2.2);
  mkCrate(g, 2.4, fy, -6.0, 1.2, 0.8, 1.0);
  mkCrate(g, 2.4, fy, -7.4, 1.2, 0.8, 1.0);
  pin(6.6, fy+2.5, -9.7);
  pin(12.3, sy+0.4, -5.6);
  pin(4.0, fy+1.05, -4.4);
}

/* --- Traffic & Billing (F2, front-right) --- */
{
  const room = RM("traffic"), {g, pin} = roomGroup(room), fy = 0;
  const sy = mkDesk(g, 6.0, fy, 4.6, 4.4, 2.0);
  mkMonitor(g, 6.0, sy, 4.2, TX.logScreen, 1.15, Math.PI);
  mkKeyboard(g, 6.0, sy, 5.3); mkMug(g, 7.6, sy, 5.3); mkPapers(g, 4.4, sy, 5.2);
  mkChair(g, 6.0, fy, 6.4, 0);
  mkBoard(g, TX.calendar, 3.8, 2.6, 13.0, fy+2.4, PZ1-WT-0.05, "s");
  // printer credenza
  Bo(g, 2.2, 1.0, 1.1, MAT.white(), 12.4, fy, 6.8);
  Bo(g, 1.3, 0.65, 1.0, MAT.white(), 12.4, fy+1.0, 6.8);
  Bo(g, 0.9, 0.07, 0.6, std(0xe8e5dd), 12.4, fy+1.65, 6.8);
  Bo(g, 0.95,0.025,0.68, MAT.white(), 12.4, fy+1.72, 6.5, 0.05);
  mkCabinet(g, 2.4, fy, 10.4);
  mkPlant(g, 15.0, fy, 2.2, 1.05);
  // second billing desk + files
  const sy2 = mkDesk(g, 6.0, fy, 9.6, 4.4, 2.0);
  mkMonitor(g, 6.0, sy2, 9.2, TX.siteScreen, 1.0, Math.PI);
  mkKeyboard(g, 6.0, sy2, 10.3); mkPapers(g, 7.6, sy2, 10.2, -0.3);
  mkChair(g, 6.0, fy, 11.2, 0);
  mkBookcase(g, 15.0, fy, 5.6, 4.2, 2.2, -Math.PI/2);
  mkRug(g, 6.4, fy, 7.2, 8.0, 3.0);
  mkWaterCooler(g, 1.4, fy, 4.2);
  pin(6.0, sy+1.3, 4.4);
  pin(13.0, fy+2.9, PZ1-1.0);
  pin(12.4, fy+1.85, 6.8);
}

/* --- Sales (F1, back-left) --- */
{
  const room = RM("sales"), {g, pin} = roomGroup(room), fy = 0;
  mkBoard(g, TX.chart, 3.8, 2.6, -12.6, fy+2.4, BACKW, "n");
  const sy = mkDesk(g, -8.4, fy, -7.4, 4.4, 2.0);
  mkMonitor(g, -9.4, sy, -7.8, TX.siteScreen, 0.98, 0.1);
  Bo(g, 0.6,0.09,0.4, MAT.inkFlat(), -7.4, sy, -7.4);
  Bo(g, 0.55,0.1,0.16, MAT.inkFlat(), -7.4, sy+0.12, -7.5, 0.06);
  mkMug(g, -8.0, sy, -6.6); mkPapers(g, -6.9, sy, -6.7, -0.2);
  mkChair(g, -8.8, fy, -6.0, Math.PI);
  mkChair(g, -6.6, fy, -5.2, -2.6);
  // trophy shelf
  Bo(g, 2.0, 0.12, 0.7, MAT.white(), -3.4, fy+2.4, BACKW+0.3);
  Cy(g, 0.11,0.2,0.38, std(0xe9c15f, {roughness:0.32, metalness:0.65}), -3.7, fy+2.52, BACKW+0.3, 14);
  Sp(g, 0.17, std(0xe9c15f, {roughness:0.32, metalness:0.65}), -3.7, fy+3.02, BACKW+0.3);
  mkPlant(g, -15.0, fy, -2.0, 1.1);
  mkCabinet(g, -15.2, fy, -8.4, Math.PI/2);
  // client meeting nook + second rep desk
  mkRug(g, -5.4, fy, -3.4, 8.6, 5.0);
  mkSofa(g, -6.6, fy, -4.8, 3.2, 0);
  mkCoffeeTable(g, -6.6, fy, -2.6);
  mkSideTable(g, -9.0, fy, -3.2);
  mkFloorLamp(g, -9.6, fy, -5.0);
  const sy3 = mkDesk(g, -2.8, fy, -8.4, 3.4, 1.8);
  mkMonitor(g, -2.8, sy3, -8.8, TX.chart, 0.92);
  mkKeyboard(g, -2.8, sy3, -7.8); mkMug(g, -1.6, sy3, -7.7);
  mkChair(g, -2.8, fy, -6.8, Math.PI);
  pin(-12.6, fy+3.0, BACKW+0.5);
  pin(-8.4, fy+2.5, -7.2);
  pin(-7.4, sy+0.45, -7.4);
}

/* --- Promotions (F1, back-right) --- */
{
  const room = RM("promotions"), {g, pin} = roomGroup(room), fy = 0;
  const wx2 = 5.0, wz = -8.4;
  const wg = new THREE.Group(); wg.position.set(wx2, fy+2.3, wz); g.add(wg);
  const wheel = new THREE.Group(); wg.add(wheel);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,0.18,40), MAT.white());
  disc.rotation.x = Math.PI/2; disc.castShadow = disc.receiveShadow = true; wheel.add(disc);
  for(let i=0;i<8;i++){
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.09,1.5,0.07), MAT.inkFlat());
    sp.position.set(Math.sin(i*Math.PI/4)*0.75, Math.cos(i*Math.PI/4)*0.75, 0.11);
    sp.rotation.z = -i*Math.PI/4; sp.castShadow = true; wheel.add(sp);
  }
  for(let i=0;i<8;i++){
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.08,14),
      std(i%3===0 ? 0xff4a1c : (i%3===1 ? 0xcfcabf : 0xe8e4dc)));
    dot.rotation.x = Math.PI/2;
    dot.position.set(Math.sin((i+0.5)*Math.PI/4)*1.24, Math.cos((i+0.5)*Math.PI/4)*1.24, 0.12);
    wheel.add(dot);
  }
  if(ANIM) anims.push((t,dt)=>{ wheel.rotation.z -= dt*0.25; });
  const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.13,0.36,4), MAT.accent());
  ptr.position.set(0, 1.9, 0.13); ptr.rotation.z = Math.PI; wg.add(ptr);
  Cy(g, 0.055,0.055,2.3, MAT.inkFlat(), wx2-0.34, fy, wz-0.34, 10, 0.12);
  Cy(g, 0.055,0.055,2.3, MAT.inkFlat(), wx2+0.34, fy, wz-0.34, 10, -0.12);
  Cy(g, 0.055,0.055,2.3, MAT.inkFlat(), wx2, fy, wz+0.5, 10, 0, -0.14);
  // prize closet
  Bo(g, 1.9,1.2,1.4, MAT.white(), 11.0, fy, -8.6);
  Bo(g, 1.4,1.0,1.1, MAT.white(), 11.2, fy+1.2, -8.6, 0.22);
  Bo(g, 0.1,1.2,1.42, MAT.accent(), 11.0, fy, -8.6);
  const roll = Cy(g, 0.11,0.11,3.0, MAT.white(), 13.6, fy+0.05, -10.6, 14, -0.3);
  Cy(g, 0.115,0.115,0.36, MAT.accent(), 14.06, fy+2.65, -10.6, 14, -0.3);
  // megaphone shelf
  Bo(g, 1.9, 0.12, 0.7, MAT.white(), 2.0, fy+2.4, BACKW+0.3);
  const mega = new THREE.Group(); mega.position.set(2.0, fy+2.68, BACKW+0.3); mega.rotation.z = -0.3; g.add(mega);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.13,0.66,20), MAT.white());
  cone.rotation.z = Math.PI/2; cone.castShadow = true; mega.add(cone);
  Cy(mega, 0.12,0.12,0.24, MAT.inkFlat(), -0.43, -0.12, 0, 14, Math.PI/2);
  mkPlant(g, 15.0, fy, -2.0, 1.0);
  // giveaway packing bench + stock
  mkRug(g, 7.6, fy, -3.2, 9.0, 4.4);
  Bo(g, 4.2, 0.16, 1.9, MAT.white(), 7.4, fy+1.4, -3.6);
  for(const dx of [-1.9, 1.9]) for(const dz of [-0.75, 0.75])
    Cy(g, 0.06,0.06,1.4, MAT.inkFlat(), 7.4+dx, fy, -3.6+dz, 10);
  mkCrate(g, 6.4, fy+1.56, -3.6, 1.0, 0.6, 0.8);
  Bo(g, 0.6,0.5,0.6, MAT.accent(), 8.6, fy+1.56, -3.6);
  mkStool(g, 7.4, fy, -1.6);
  mkBookcase(g, 15.0, fy, -6.4, 4.0, 2.4, -Math.PI/2);
  mkCrate(g, 1.6, fy, -4.4, 1.2, 0.9, 1.0);
  mkCrate(g, 1.6, fy, -6.0, 1.2, 0.9, 1.0);
  pin(wx2, fy+4.2, wz);
  pin(11.1, fy+2.3, -8.6);
  pin(2.0, fy+2.9, BACKW+0.5);
}

/* --- HR & People (F1, front-right) --- */
{
  const room = RM("hr"), {g, pin} = roomGroup(room), fy = 0;
  mkBoard(g, TX.org, 3.8, 2.4, 4.0, fy+2.4, PZ1-WT-0.05, "s");
  const tx2 = 9.0, tz = 5.6;
  Cy(g, 0.18,0.26,1.02, MAT.inkFlat(), tx2, fy, tz);
  Cy(g, 0.95,0.95,0.07, MAT.inkFlat(), tx2, fy+0.02, tz, 24);
  Cy(g, 1.9,1.9,0.12, MAT.white(), tx2, fy+1.02, tz, 44);
  Torus(g, 1.9, 0.03, MAT.inkFlat(), tx2, fy+1.11, tz);
  mkMug(g, tx2-0.65, fy+1.14, tz+0.55); mkPapers(g, tx2+0.75, fy+1.14, tz, 0.5);
  mkChair(g, tx2-2.8, fy, tz, Math.PI/2);
  mkChair(g, tx2+2.8, fy, tz, -Math.PI/2);
  mkChair(g, tx2, fy, tz-2.8, 0);
  mkChair(g, tx2, fy, tz+2.8, Math.PI);
  mkCabinet(g, 15.0, fy, 9.6, -Math.PI/2);
  mkPlant(g, 2.2, fy, 10.4, 1.1);
  mkRug(g, tx2, fy, tz, 8.4, 8.0);
  // interview corner + records wall
  mkSofa(g, 3.6, fy, 3.0, 3.0, 0.6);
  mkSideTable(g, 2.0, fy, 5.0);
  mkFloorLamp(g, 1.6, fy, 2.0);
  mkBookcase(g, 15.0, fy, 4.0, 4.0, 2.2, -Math.PI/2);
  mkWaterCooler(g, 14.8, fy, 12.0);
  pin(4.0, fy+2.9, PZ1-1.0);
  pin(tx2, fy+1.4, tz+1.0);
  pin(15.0, fy+2.0, 9.6);
}

/* --- Lobby (F0, front-left) --- */
{
  const room = RM("lobby"), {g, pin} = roomGroup(room), fy = 0;
  const cx = -9.0, cz = 3.4;
  Bo(g, 4.6, 1.25, 1.4, MAT.white(), cx, fy, cz);
  Bo(g, 4.9, 0.16, 1.7, MAT.white(), cx, fy+1.25, cz);
  Torus(g, 0.36, 0.07, MAT.accent(), cx, fy+0.68, cz+0.71, 0);
  Sp(g, 0.11, MAT.accent(), cx, fy+0.68, cz+0.71);
  mkMonitor(g, cx-1.3, fy+1.41, cz-0.25, null, 0.72, 0.4);
  mkMug(g, cx+1.2, fy+1.41, cz+0.2);
  mkChair(g, cx, fy, cz-1.8, 0);
  mkBoard(g, TX.wordwall, 4.8, 0.68, -9.0, fy+2.7, LEFTW, "e");
  // waiting area
  Bo(g, 3.0, 0.16, 1.0, MAT.white(), -11.0, fy+0.5, 9.4);
  Bo(g, 0.14,0.5,0.9, MAT.inkFlat(), -12.3, fy, 9.4);
  Bo(g, 0.14,0.5,0.9, MAT.inkFlat(), -9.7, fy, 9.4);
  Cy(g, 0.55,0.55,0.12, MAT.white(), -11.0, fy+0.5, 7.2, 26);
  Cy(g, 0.12,0.12,0.5, MAT.inkFlat(), -11.0, fy, 7.2, 12);
  mkPlant(g, -15.0, fy, 10.4, 1.35);
  mkPlant(g, -2.2, fy, 10.6, 1.15);
  // seating lounge for visitors
  mkRug(g, -8.0, fy, 8.4, 8.4, 5.4);
  mkSofa(g, -6.0, fy, 6.6, 3.4, Math.PI);
  mkCoffeeTable(g, -8.0, fy, 8.4);
  mkSideTable(g, -4.4, fy, 9.6);
  mkFloorLamp(g, -3.4, fy, 6.4);
  mkBookcase(g, -15.0, fy, 4.0, 3.4, 2.2, Math.PI/2);
  mkWaterCooler(g, -2.4, fy, 3.0);
  pin(cx, fy+1.8, cz+0.9);
  pin(-15.6, fy+2.7, -9.0);
}

/* --- Web & Digital (F0, back-left) --- */
{
  const room = RM("web"), {g, pin} = roomGroup(room), fy = 0;
  const sy1 = mkDesk(g, -12.0, fy, -8.0, 3.6, 1.9);
  mkMonitor(g, -12.0, sy1, -8.4, TX.siteScreen, 1.05);
  mkKeyboard(g, -12.0, sy1, -7.3); mkMug(g, -10.7, sy1, -7.2);
  mkChair(g, -12.0, fy, -6.2, Math.PI);
  const sy2 = mkDesk(g, -6.6, fy, -8.0, 3.6, 1.9);
  mkMonitor(g, -6.6, sy2, -8.4, TX.codeScreen, 1.05);
  mkKeyboard(g, -6.6, sy2, -7.3); mkPapers(g, -5.3, sy2, -7.3, 0.4);
  mkChair(g, -6.6, fy, -6.2, Math.PI);
  // server rack
  const rx = -2.4, rz = -10.4;
  Bo(g, 1.6, 3.3, 1.2, MAT.white(), rx, fy, rz);
  Pl(g, 1.35, 3.1, signMat(TX.rackFront), rx, fy+1.7, rz+0.61);
  const leds = [];
  for(let u=0;u<5;u++)
    leds.push(Sp(g, 0.06, emissive(0xff4a1c), rx+0.48, fy+0.62+u*0.62, rz+0.63));
  if(ANIM) anims.push(t=> leds.forEach((l,i)=>{
    l.material.transparent = true;
    l.material.opacity = (Math.sin(t*2.4+i*2.1) > 0.15) ? 1 : 0.12;
  }));
  mkPlant(g, -15.0, fy, -2.0, 1.05);
  mkCabinet(g, -15.2, fy, -10.0, Math.PI/2);
  // stand-up area + third bench
  mkRug(g, -8.6, fy, -3.2, 9.0, 4.6);
  Bo(g, 4.6, 0.14, 1.9, MAT.white(), -8.8, fy+1.4, -3.6);
  for(const dx of [-2.1, 2.1]) for(const dz of [-0.75, 0.75])
    Cy(g, 0.06,0.06,1.4, MAT.inkFlat(), -8.8+dx, fy, -3.6+dz, 10);
  mkMonitor(g, -10.0, fy+1.54, -3.9, TX.logScreen, 0.85);
  mkMug(g, -7.4, fy+1.54, -3.2);
  mkStool(g, -8.8, fy, -1.8); mkStool(g, -6.6, fy, -2.2);
  mkWhiteboard(g, -15.0, fy+2.8, -6.4, 4.2, 1.9, "e");
  mkBookcase(g, -2.6, fy, -5.6, 2.8, 2.2, -Math.PI/2);
  pin(-12.0, sy1+1.35, -7.8);
  pin(-6.6, sy2+1.35, -7.8);
  pin(rx, fy+2.7, rz+0.8);
}

/* --- Design Studio (F0, back-right) — the merch line --- */
{
  const room = RM("design"), {g, pin} = roomGroup(room), fy = 0;
  const dx = 5.0, dz = -5.6;
  const dt = Bo(g, 3.0, 0.14, 1.8, MAT.white(), dx, fy+1.5, dz);
  dt.rotation.x = 0.2;
  Cy(g, 0.045,0.045,1.64, MAT.inkFlat(), dx-1.25, fy, dz-0.7, 10);
  Cy(g, 0.045,0.045,1.64, MAT.inkFlat(), dx-1.25, fy, dz+0.7, 10);
  Cy(g, 0.045,0.045,1.3, MAT.inkFlat(), dx+1.25, fy, dz-0.7, 10);
  Cy(g, 0.045,0.045,1.3, MAT.inkFlat(), dx+1.25, fy, dz+0.7, 10);
  Bo(g, 2.4,0.025,1.2, std(0xfdfcfa), dx, fy+1.62, dz, 0, 0, 0.2);
  mkMug(g, dx+1.15, fy+1.45, dz+0.6);
  mkChair(g, dx, fy, dz+2.0, Math.PI);
  // easel
  const ex = 10.6, ez = -8.2;
  Cy(g, 0.04,0.04,2.9, MAT.inkFlat(), ex-0.55, fy, ez, 8, 0.2);
  Cy(g, 0.04,0.04,2.9, MAT.inkFlat(), ex+0.55, fy, ez, 8, -0.2);
  Cy(g, 0.04,0.04,2.7, MAT.inkFlat(), ex, fy, ez+0.6, 8, 0, 0.25);
  Bo(g, 1.85, 2.2, 0.08, MAT.white(), ex, fy+0.8, ez+0.1);
  const board = Pl(g, 1.65, 2.0, signMat(TX.easel), ex, fy+1.9, ez+0.15);
  mkBoard(g, TX.swatches, 3.0, 1.6, 2.4, fy+2.6, BACKW, "n");
  // merch shelf
  const mx = 12.6, mz = -11.0;
  mkShelfUnit(g, mx, fy, mz, 3.8, 3.0, 1);
  Cy(g, 0.36,0.32,0.62, MAT.white(), mx-1.2, fy+0.13, mz, 24);
  Cy(g, 0.375,0.375,0.12, MAT.accent(), mx-1.2, fy+0.56, mz, 24);
  Torus(g, 0.24, 0.06, MAT.white(), mx-0.78, fy+0.42, mz, 0);
  Bo(g, 1.3,0.2,1.0, MAT.white(), mx+0.6, fy+0.13, mz);
  const teeMark = Pl(g, 0.5,0.5, signMat(TX.tee), mx+0.6, fy+0.34, mz);
  teeMark.rotation.x = -Math.PI/2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 22, 14, 0, Math.PI*2, 0, Math.PI/2), MAT.white());
  cap.position.set(mx-1.1, fy+1.63, mz); cap.castShadow = true; g.add(cap);
  Cy(g, 0.06,0.06,0.035, MAT.accent(), mx-1.1, fy+2.0, mz, 10);
  Bo(g, 0.56,0.07,0.48, MAT.white(), mx-1.1, fy+1.6, mz+0.38);
  Bo(g, 0.95,0.65,0.72, MAT.white(), mx+0.8, fy+1.63, mz);
  Bo(g, 0.08,0.65,0.74, MAT.accent(), mx+0.8, fy+1.63, mz);
  mkPlant(g, 15.0, fy, -2.0, 1.0);
  // second design bench + supply shelving + finished-goods crates
  const sy4 = mkDesk(g, 4.6, fy, -1.8, 3.6, 1.8);
  mkMonitor(g, 4.6, sy4, -2.2, TX.swatches, 1.0);
  mkKeyboard(g, 4.6, sy4, -1.2); mkMug(g, 5.9, sy4, -1.1);
  mkChair(g, 4.6, fy, -0.4, Math.PI);
  mkRug(g, 8.4, fy, -4.0, 8.0, 3.6);
  mkBookcase(g, 15.0, fy, -6.0, 4.2, 2.4, -Math.PI/2);
  mkCrate(g, 1.6, fy, -9.4, 1.1, 0.8, 0.9);
  mkCrate(g, 1.6, fy, -10.8, 1.1, 0.8, 0.9);
  mkFloorLamp(g, 9.6, fy, -1.6);
  pin(dx, fy+2.0, dz+0.4);
  pin(mx, fy+2.5, mz+0.7);
  pin(2.4, fy+2.6, BACKW+0.5);
}

/* --- Photography Studio (F0, front-right) --- */
{
  const room = RM("photo"), {g, pin} = roomGroup(room), fy = 0;
  const cx = 9.4, bz = 11.0;
  Cy(g, 0.18,0.18,8.0, MAT.gray(), cx, fy+3.3, bz, 18, Math.PI/2);
  Bo(g, 8.0, 0.14, 0.18, MAT.inkFlat(), cx, fy+3.48, bz);
  const sweepMat = std(0xfdfcfa, {roughness:0.9, envMapIntensity:0.5});
  sweepMat.side = THREE.DoubleSide;
  Pl(g, 7.8, 2.3, sweepMat, cx, fy+2.15, bz-0.06, Math.PI);
  const curve = new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,7.8,26,1,true,0,Math.PI/2), sweepMat);
  curve.rotation.z = Math.PI/2; curve.rotation.y = -Math.PI/2;
  curve.position.set(cx, fy+1.3, bz-1.36);
  curve.receiveShadow = true; g.add(curve);
  Bo(g, 7.8, 0.025, 1.8, sweepMat, cx, fy+0.01, bz-2.3);
  function softbox(x, z, ry){
    const s = new THREE.Group(); s.position.set(x, fy, z); s.rotation.y = ry; g.add(s);
    for(const a of [0.4, 2.5, 4.6]){
      const leg = Cy(s, 0.03,0.03,1.05, MAT.inkFlat(), Math.sin(a)*0.36, 0, Math.cos(a)*0.36, 8);
      leg.rotation.z = -Math.sin(a)*0.3; leg.rotation.x = Math.cos(a)*0.3;
    }
    Cy(s, 0.035,0.035,2.5, MAT.inkFlat(), 0, 0.62, 0, 8);
    const head = new THREE.Group(); head.position.set(0, 2.9, 0); head.rotation.x = -0.3; s.add(head);
    Bo(head, 1.1,1.1,0.45, MAT.inkFlat(), 0, -0.55, -0.25);
    const face = Pl(head, 0.94,0.94, new THREE.MeshBasicMaterial({color:0xfff4e0, toneMapped:false}), 0, 0, 0.02);
    face.position.set(0, -0.02, 0.02);
    if(ANIM) anims.push(t=>{ face.material.color.setHSL(0.1, 0.4, 0.9+0.05*Math.sin(t*1.1+x)); });
  }
  softbox(4.6, 6.6, -0.9);
  softbox(14.2, 6.4, 0.8);
  mkCamera(g, cx, fy, 4.2, 0);
  const refl = new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.07,30), std(0xf3f1ec));
  refl.position.set(14.4, fy+0.95, 2.6); refl.rotation.set(Math.PI/2-0.3, 0, -0.25);
  refl.castShadow = true; g.add(refl);
  mkStool(g, 3.0, fy, 3.0);
  // gear cases, garment rack and retouch desk
  mkCrate(g, 2.6, fy, 8.6, 1.4, 0.7, 1.0);
  mkCrate(g, 2.6, fy, 10.2, 1.4, 0.7, 1.0);
  const sy5 = mkDesk(g, 4.2, fy, 1.4, 3.2, 1.7);
  mkMonitor(g, 4.2, sy5, 1.0, TX.siteScreen, 0.95);
  mkKeyboard(g, 4.2, sy5, 2.0); mkMug(g, 5.4, sy5, 2.0);
  mkChair(g, 4.2, fy, 2.9, 0);
  // garment rack
  Cy(g, 0.04,0.04,1.9, MAT.chrome(), 14.2, fy, 11.0, 8);
  Cy(g, 0.04,0.04,1.9, MAT.chrome(), 14.2, fy, 8.4, 8);
  Cy(g, 0.045,0.045,2.6, MAT.chrome(), 14.2, fy+1.9, 9.7, 8, 0, Math.PI/2);
  for(let i=0;i<5;i++)
    Bo(g, 0.14, 1.1, 0.5, std(i===2?0xff4a1c:0xffffff), 14.2, fy+0.75, 8.7+i*0.5);
  mkPlant(g, 15.2, fy, 1.6, 1.0);
  pin(cx, fy+2.5, bz-1.0);
  pin(cx, fy+2.1, 4.2);
  pin(4.6, fy+3.0, 6.6);
}

/* --- Transmitter Site (own ground, west of the station) --- */
{
  const room = RM("transmitter"), {g, pin} = roomGroup(room);
  const SX = -30, SZ = 20;
  const PEAK = groundH(SX, SZ);      // crown of the shared terrain

  // self-supporting lattice mast — legs converge inward to the apex
  const MH = 20, SEGS = 6, R0 = 1.85, R1 = 0.14;
  const ringAt = t => {
    const r = R0 + (R1 - R0) * t, y = PEAK + MH * t;
    return [[1,1],[1,-1],[-1,-1],[-1,1]].map(([sx,sz]) => [SX + sx*r, y, SZ + sz*r]);
  };
  for(let s=0; s<SEGS; s++){
    const c0 = ringAt(s/SEGS), c1 = ringAt((s+1)/SEGS);
    const legR = 0.085 - s*0.008;
    for(let i=0;i<4;i++){
      const j = (i+1) % 4;
      strut(g, c0[i], c1[i], legR, MAT.inkFlat());        // leg
      strut(g, c1[i], c1[j], legR*0.55, MAT.inkFlat());   // horizontal belt
      strut(g, c0[i], c1[j], legR*0.42, MAT.inkFlat());   // diagonal brace
    }
  }
  for(let i=0;i<4;i++) strut(g, ringAt(0)[i], ringAt(0)[(i+1)%4], 0.05, MAT.inkFlat());
  Cy(g, 0.06,0.06,2.6, MAT.inkFlat(), SX, PEAK + MH, SZ, 10);
  Sp(g, 0.3, emissive(0xff4a1c), SX, PEAK + MH + 2.9, SZ);
  for(let i=0;i<3;i++){
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 44),
      new THREE.MeshBasicMaterial({color:0xff4a1c, transparent:true, opacity:0, toneMapped:false}));
    ring.position.set(SX, PEAK + MH + 2.9, SZ); g.add(ring);
    if(ANIM) anims.push(t=>{
      const p = ((t*0.4 + i/3) % 1);
      ring.scale.setScalar(0.4 + p*3.6);
      ring.material.opacity = p<0.08 ? p*9*0.8 : 0.8*(1-p);
      ring.lookAt(cam.position);
    });
  }

  // control building, sat on the ground height the terrain actually has there
  const CBX = SX - 7.6, CBZ = SZ + 3.0;
  const CBY = groundH(CBX, CBZ) - 0.1;
  const apron = Bo(g, 9.0, 0.26, 7.0, std(0xdcd7cc, {roughness:1, envMapIntensity:0.2}),
    CBX, CBY - 0.22, CBZ);
  apron.castShadow = false;
  Bo(g, 7.2, 3.3, 5.4, MAT.wall(), CBX, CBY, CBZ);
  Bo(g, 7.8, 0.34, 6.0, MAT.slab(), CBX, CBY + 3.3, CBZ);
  Bo(g, 1.3, 2.3, 0.14, std(0xdcd7cc), CBX + 2.2, CBY, CBZ + 2.72);
  Bo(g, 3.4, 0.9, 0.12, MAT.glass(), CBX - 1.4, CBY + 1.5, CBZ + 2.73);
  Bo(g, 1.4, 0.9, 1.0, std(0xe4e0d6), CBX + 4.4, CBY, CBZ + 1.1);
  Bo(g, 1.4, 0.9, 1.0, std(0xe4e0d6), CBX + 4.4, CBY, CBZ - 0.5);
  Cy(g, 0.7,0.7,0.16, MAT.gray(), CBX - 2.0, CBY + 3.64, CBZ, 20);
  const cdish = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 12, 0, Math.PI*2, 0, 1.02), MAT.white());
  cdish.position.set(CBX + 2.2, CBY + 4.4, CBZ - 1.4); cdish.rotation.set(0.42, 0.5, -0.7);
  cdish.castShadow = true; g.add(cdish);
  // feed line from the building up onto the mast
  strut(g, [CBX + 3.7, CBY + 3.5, CBZ - 1.8], [SX - R0*0.9, PEAK + 1.1, SZ + 0.6], 0.055, MAT.gray());
  mkPlant(g, SX + 5.6, groundH(SX + 5.6, SZ + 5.0), SZ + 5.0, 1.2);

  pin(SX, PEAK + 13, SZ);
  pin(CBX + 0.4, CBY + 4.2, CBZ + 3.0);
  pin(CBX + 5.4, CBY + 2.4, CBZ - 1.4);
}

/* --- Remote Van --- */
{
  const room = RM("van"), {g, pin} = roomGroup(room);
  const vg = new THREE.Group(); vg.position.set(32, 0, -4); vg.rotation.y = -0.5; g.add(vg);
  Bo(vg, 8.2, 3.0, 3.5, MAT.white(), -0.4, 0.85, 0);
  Bo(vg, 2.0, 1.8, 3.4, MAT.white(), 4.6, 0.85, 0);
  const ws = Bo(vg, 0.16, 1.25, 3.2, MAT.glass(), 3.95, 2.25, 0);
  ws.rotation.z = -0.5;
  Bo(vg, 1.8, 1.15, 3.46, MAT.glass(), 2.6, 2.1, 0);
  Pl(vg, 2.3, 0.94, signMat(TX.live), -1.9, 2.15, 1.76);
  Pl(vg, 3.8, 0.56, signMat(TX.vanword), -1.7, 1.4, 1.76);
  Pl(vg, 2.3, 0.94, signMat(TX.live), -1.9, 2.15, -1.76, Math.PI);
  Bo(vg, 8.2, 0.22, 3.52, std(0xffe3d9), -0.4, 0.7, 0);
  Bo(vg, 0.07, 1.6, 3.54, std(0xe8e5dd), 0.4, 1.05, 0);
  for(const [wx3,wz2] of [[-2.9,1.6],[2.9,1.6],[-2.9,-1.6],[2.9,-1.6]]){
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.72,0.42,26), MAT.rubber());
    tire.rotation.x = Math.PI/2; tire.position.set(wx3, 0.72, wz2);
    tire.castShadow = true; vg.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.44,18), MAT.chrome());
    hub.rotation.x = Math.PI/2; hub.position.set(wx3, 0.72, wz2); vg.add(hub);
  }
  Bo(vg, 6.0, 0.18, 2.5, MAT.inkFlat(), -1.0, 3.85, 0);
  Cy(vg, 0.15,0.15,1.8, MAT.white(), -3.2, 4.0, 0, 14);
  Cy(vg, 0.1,0.1,1.7, MAT.inkFlat(), -3.2, 5.7, 0, 12);
  Cy(vg, 0.07,0.07,1.7, MAT.inkFlat(), -3.2, 7.3, 0, 10);
  Sp(vg, 0.2, emissive(0xff4a1c), -3.2, 9.2, 0);
  for(let i=0;i<2;i++){
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5,0.045,8,36),
      new THREE.MeshBasicMaterial({color:0xff4a1c, transparent:true, opacity:0, toneMapped:false}));
    ring.position.set(-3.2, 9.2, 0); vg.add(ring);
    if(ANIM) anims.push(t=>{
      const p = ((t*0.5 + i/2) % 1);
      ring.scale.setScalar(0.4 + p*3.0);
      ring.material.opacity = p<0.1 ? p*7 : 0.8*(1-p);
      ring.lookAt(vg.worldToLocal(cam.position.clone()));
    });
  }
  Cy(vg, 0.07,0.07,0.6, MAT.inkFlat(), 0.9, 4.03, -0.7, 8);
  const vd = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 12, 0, Math.PI*2, 0, 1.0), MAT.white());
  vd.position.set(0.9, 4.8, -0.7); vd.rotation.set(0.4, 0, -0.7); vd.castShadow = true; vg.add(vd);
  pin(30.4, 8.6, -2.5);
  pin(32.7, 4.7, -4.9);
  pin(31.5, 2.2, -2.0);
}

/* --- Live Remote --- */
{
  const room = RM("remote"), {g, pin} = roomGroup(room);
  const tg = new THREE.Group(); tg.position.set(32, 0, 9); tg.rotation.y = -0.35; g.add(tg);
  /* trade-show canopy: open frame, translucent peaked roof, scalloped
     valance — you can see the whole booth under it */
  const EAVE = 3.5;
  for(const [px,pz] of [[-3.1,-2.7],[3.1,-2.7],[-3.1,2.7],[3.1,2.7]])
    Cy(tg, 0.07,0.07,EAVE, MAT.chrome(), px, 0, pz, 10);
  Bo(tg, 6.5, 0.1, 0.1, MAT.chrome(), 0, EAVE, -2.7);
  Bo(tg, 6.5, 0.1, 0.1, MAT.chrome(), 0, EAVE, 2.7);
  Bo(tg, 0.1, 0.1, 5.6, MAT.chrome(), -3.1, EAVE, 0);
  Bo(tg, 0.1, 0.1, 5.6, MAT.chrome(), 3.1, EAVE, 0);
  const canopyMat = std(0xfdfcf8, {roughness:0.85, envMapIntensity:0.55,
    transparent:true, opacity:0.55});
  canopyMat.side = THREE.DoubleSide;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(4.5, 1.5, 4), canopyMat);
  canopy.rotation.y = Math.PI/4;
  canopy.position.y = EAVE + 0.78;
  canopy.castShadow = false; tg.add(canopy);
  for(const [cx2, cz2] of [[-3.1,-2.7],[3.1,-2.7],[3.1,2.7],[-3.1,2.7]])
    strut(tg, [cx2, EAVE, cz2], [0, EAVE + 1.53, 0], 0.035, MAT.chrome());
  Sp(tg, 0.14, MAT.accent(), 0, EAVE + 1.62, 0);
  // valance strips, alternating signal/white; banner centered on the front
  const valance = (x, z, ry, len) => {
    const n = Math.round(len/0.78);
    for(let i=0;i<n;i++){
      const off = -len/2 + 0.39 + i*(len/n);
      const st = Bo(tg, len/n - 0.06, 0.5, 0.06,
        i%2 ? MAT.accent() : MAT.white(),
        x + Math.cos(ry)*off, EAVE - 0.45, z - Math.sin(ry)*off, ry);
      st.castShadow = false;
    }
  };
  valance(0, -2.76, 0, 6.4);
  valance(-3.16, 0, Math.PI/2, 5.5);
  valance(3.16, 0, Math.PI/2, 5.5);
  // the front valance IS the banner
  Bo(tg, 6.4, 0.5, 0.06, MAT.white(), 0, EAVE - 0.45, 2.76).castShadow = false;
  Pl(tg, 6.3, 0.46, signMat(TX.banner), 0, EAVE - 0.2, 2.8);
  /* the working booth sits OUT FRONT of the canopy so every piece reads;
     the tent itself is the branded backdrop */
  Bo(tg, 3.6, 0.14, 1.6, MAT.white(), -0.6, 1.4, 3.9);
  for(const s of [-1, 1]){
    Cy(tg, 0.04,0.04,1.58, MAT.chrome(), -0.6+s*1.4, 0, 3.3, 8, 0, 0.35);
    Cy(tg, 0.04,0.04,1.58, MAT.chrome(), -0.6+s*1.4, 0, 4.5, 8, 0, -0.35);
  }
  mkConsole(tg, -1.4, 1.54, 3.9, 0.9);
  const lap = new THREE.Group(); lap.position.set(0.8, 1.54, 3.9); lap.rotation.y = -0.4; tg.add(lap);
  Bo(lap, 0.95,0.06,0.66, MAT.chrome(), 0, 0, 0);
  const lscr = Bo(lap, 0.95,0.64,0.06, MAT.screen(), 0, 0.32, -0.32);
  lscr.rotation.x = 0.35;
  mkMug(tg, 1.5, 1.54, 4.35);
  mkStool(tg, -2.9, 0, 4.1);
  // stock stays under the canopy
  mkCrate(tg, -1.4, 0, -1.2, 1.2, 0.8, 1.0);
  mkCrate(tg, 0.6, 0, -1.5, 1.0, 0.7, 0.9);
  // PA on a straight pole, drivers facing the crowd side of the booth
  const spk = new THREE.Group(); spk.position.set(4.7, 0, 3.2); spk.rotation.y = 0.35; tg.add(spk);
  Cy(spk, 0.44,0.48,0.08, MAT.chrome(), 0, 0, 0, 20);
  Cy(spk, 0.05,0.05,2.15, MAT.chrome(), 0, 0.08, 0, 10);
  const box = new THREE.Group(); box.position.set(0, 2.2, 0); box.rotation.x = 0.16; spk.add(box);
  Bo(box, 0.9,1.3,0.8, MAT.white(), 0, -0.15, 0);
  Bo(box, 0.9,0.12,0.82, MAT.inkFlat(), 0, -0.27, 0);
  Cy(box, 0.28,0.28,0.09, MAT.inkFlat(), 0, 0.2, 0.41, 18, 0, Math.PI/2);
  Cy(box, 0.13,0.13,0.09, MAT.inkFlat(), 0, 0.78, 0.41, 14, 0, Math.PI/2);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(31.5, 0.85, -1.4),
      new THREE.Vector3(30.6, 0.12, 2.4),
      new THREE.Vector3(30.1, 0.12, 7.4),
      new THREE.Vector3(30.1, 1.35, 11.9)
    ]), 26, 0.045, 8), MAT.gray());
  cable.castShadow = true; g.add(cable);
  pin(29.3, 2.0, 12.2);
  pin(35.3, 2.5, 13.6);
  pin(31.0, 3.4, 11.6);
}

/* --- In-Car Radio: traffic on the ring road --- */
{
  const room = RM("drive"), {g, pin} = roomGroup(room);
  g.userData.idx = ROOMS.indexOf(room); pickExtras.push(g);
  function mkCar(color){
    const c = new THREE.Group(); g.add(c);
    const paint = std(color, {roughness:0.42, envMapIntensity:1.0});
    Bo(c, 1.9, 0.5, 0.95, paint, 0, 0.22, 0);
    Bo(c, 1.05, 0.44, 0.86, paint, -0.1, 0.7, 0);
    Bo(c, 0.98, 0.28, 0.9, MAT.screen(), -0.1, 0.76, 0);
    for(const [wx,wz] of [[-0.62,0.46],[0.62,0.46],[-0.62,-0.46],[0.62,-0.46]]){
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.21,0.15,14), MAT.rubber());
      t.rotation.x = Math.PI/2; t.position.set(wx, 0.21, wz); t.castShadow = true; c.add(t);
    }
    Cy(c, 0.015,0.015,0.4, MAT.inkFlat(), -0.75, 0.9, -0.3, 6);
    Sp(c, 0.05, emissive(0xff4a1c), -0.75, 1.34, -0.3);   // radio whip — tuned in
    mkBlobShadow(c, 2.6, 1.5, 0.012);                     // grounds the car
    markNoBounds(c);
    return c;
  }
  /* A transit bus — same footprint logic as the cars but longer, with a glazed
     band down the side and a rolling destination sign, which is one more screen
     the traffic log feeds. */
  function mkBus(color, dest){
    const c = new THREE.Group(); g.add(c);
    const paint = std(color, {roughness:0.45, envMapIntensity:0.95});
    Bo(c, 4.6, 1.5, 1.35, paint, 0, 0.3, 0);
    Bo(c, 4.64, 0.5, 1.39, MAT.screen(), 0, 1.02, 0);        // window band
    Bo(c, 4.7, 0.16, 1.42, paint, 0, 1.62, 0);               // roof cap
    Bo(c, 0.06, 0.42, 1.2, MAT.glass(), 2.32, 0.42, 0);      // windscreen
    Pl(c, 1.05, 0.3, signMat(tex(160, 44, (x,w,h)=>{
      x.fillStyle = "#26211a"; x.fillRect(0, 0, w, h);
      x.fillStyle = "#ffd9a8"; x.font = "800 22px "+F;
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(dest, w/2, h/2 + 1);
    })), 2.36, 1.35, 0, Math.PI/2);
    Bo(c, 4.66, 0.1, 1.37, MAT.accent(), 0, 0.72, 0);        // livery stripe
    for(const [wx,wz] of [[-1.55,0.66],[1.6,0.66],[-1.55,-0.66],[1.6,-0.66]]){
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.2,14), MAT.rubber());
      t.rotation.x = Math.PI/2; t.position.set(wx, 0.3, wz); t.castShadow = true; c.add(t);
    }
    Cy(c, 0.015, 0.015, 0.4, MAT.inkFlat(), -1.9, 1.78, -0.4, 6);
    Sp(c, 0.05, emissive(0xff4a1c), -1.9, 2.22, -0.4);       // tuned in, same as the cars
    mkBlobShadow(c, 5.6, 2.1, 0.012);
    markNoBounds(c);
    return c;
  }
  const lanes = [
    {path: makePath(1.05), dir: 1},
    {path: makePath(-1.05), dir: -1},
  ];
  const colors = [0xffffff, 0xd8d3c9, 0xff4a1c, 0xffffff, 0xbdb8ae, 0xf0ede6, 0xffffff,
                  0xe8e4dc, 0xffffff, 0xd0cabf];
  /* The ring is simulated, not swept along on a timer. Every vehicle carries a
     position and a speed and, each frame, measures the gap to whoever is in
     front and brakes for it — which is what makes cars queue behind a bus
     instead of driving straight through it. */
  const RING = [];
  const SPEC = [];
  colors.forEach((col, i) => SPEC.push({kind:"car", col, lane: i % 2, vmax: 6.4 + (i % 3) * 1.0}));
  // buses are slower, so traffic stacks up behind them like it does for real
  [{dest:"DOWNTOWN", col:0xf0ede6, lane:0, vmax:4.4},
   {dest:"CAMPUS",   col:0xffffff, lane:1, vmax:4.0},
   {dest:"AIRPORT",  col:0xe8e4dc, lane:0, vmax:4.7},
  ].forEach(b => SPEC.push({kind:"bus", ...b}));
  [0xffffff, 0xe8e4dc, 0xd8d3c9, 0xbdb8ae].forEach((col, i) =>
    SPEC.push({kind:"car", col, lane: i % 2, vmax: 5.8 + (i % 3) * 0.8}));
  /* Spaced evenly around each lane at build. Hand-picked start offsets used to
     drop two vehicles almost on top of each other, and a pair that starts
     overlapped can never recover: each reads the other as directly ahead at
     zero distance, both brake to a stop, and neither is the one that moves. */
  for(const li of [0, 1]){
    const mine = SPEC.filter(s => s.lane === li);
    const lane = lanes[li], step = lane.path.L / mine.length;
    mine.forEach((s, i) => RING.push({
      mesh: s.kind === "bus" ? mkBus(s.col, s.dest) : mkCar(s.col),
      lane, dir: lane.dir, p: i * step + (li ? step * 0.5 : 0),
      v: s.vmax, vmax: s.vmax, len: s.kind === "bus" ? 5.2 : 2.6,
    }));
  }

  /* The belt carries its own traffic, and runs faster than the inner ring
     because it is the bypass. It joins the same simulation — gapAhead only
     compares vehicles sharing a lane object, so the two loops never see each
     other even though they are stepped together. */
  const beltLanes = [
    {path: makePath(1.05, BELT), dir: 1},
    {path: makePath(-1.05, BELT), dir: -1},
  ];
  const BELT_SPEC = [
    {kind:"car", col:0xffffff, lane:0, vmax:8.0},
    {kind:"car", col:0xe8e4dc, lane:0, vmax:8.6},
    {kind:"bus", col:0xf0ede6, lane:0, vmax:5.2, dest:"BELT LINE"},
    {kind:"car", col:0xf0ede6, lane:0, vmax:7.2},
    {kind:"car", col:0xd0cabf, lane:0, vmax:8.3},
    {kind:"car", col:0xd8d3c9, lane:1, vmax:7.4},
    {kind:"car", col:0xbdb8ae, lane:1, vmax:7.8},
    {kind:"car", col:0xffffff, lane:1, vmax:8.2},
    {kind:"bus", col:0xffffff, lane:1, vmax:5.0, dest:"CROSSTOWN"},
    {kind:"car", col:0xe8e4dc, lane:1, vmax:7.6},
  ];
  for(const li of [0, 1]){
    const mine = BELT_SPEC.filter(s => s.lane === li);
    const lane = beltLanes[li], step = lane.path.L / mine.length;
    mine.forEach((s, i) => RING.push({
      mesh: s.kind === "bus" ? mkBus(s.col, s.dest) : mkCar(s.col),
      lane, dir: lane.dir, p: i * step + (li ? step * 0.5 : 0),
      v: s.vmax, vmax: s.vmax, len: s.kind === "bus" ? 5.2 : 2.6,
    }));
  }

  const placeRing = r => {
    const p = r.lane.path.at(r.p);
    r.mesh.position.set(p.x, 0.035, p.z);
    r.mesh.rotation.y = Math.atan2(-p.tz * r.dir, p.tx * r.dir);
  };
  const MIN_GAP = 1.3;
  const gapAhead = me => {
    const L = me.lane.path.L;
    let best = L;
    for(const o of RING){
      if(o === me || o.lane !== me.lane) continue;
      let gp = (o.p - me.p) * me.dir;
      gp = ((gp % L) + L) % L;                 // forward distance, centre to centre
      gp -= (me.len + o.len) / 2;              // bumper to bumper
      if(gp < best) best = gp;
    }
    return best;
  };
  const stepRing = (dt, busy) => {
    // drive time is congestion, not extra cars appearing out of nowhere:
    // everyone's ceiling drops, so the ring visibly thickens and slows
    const cap = 1 - 0.55 * Math.max(0, Math.min(1, (busy - 0.32) / 0.68));
    for(const r of RING){
      const clear = gapAhead(r);
      const want = Math.min(r.vmax * cap, Math.max(0, (clear - MIN_GAP) * 1.4));
      r.v = Math.max(0, r.v + Math.max(-11 * dt, Math.min(4.5 * dt, want - r.v)));
      // the advance is capped by the room actually available, so no vehicle can
      // ever pass through the one in front no matter how the timing lands
      r.p += r.dir * Math.min(r.v * dt, Math.max(0, clear - MIN_GAP));
      placeRing(r);
    }
  };
  RING.forEach(placeRing);
  // parked listener at the pull-off, dash lit
  const parked = mkCar(0xffffff);
  parked.position.set(14, 0.035, 34.8); parked.rotation.y = 0.06;
  Bo(parked, 0.3, 0.12, 0.5, emissive(0xffe9d2), 0.28, 0.62, 0);
  /* Stop signs on the grid, and local traffic that actually obeys them: a
     route is a timeline of runs and dwells rather than a constant sweep, so
     a car rolls up to each junction, sits for a beat and pulls away. */
  const STOP_TEX = tex(128, 128, (x, w, h)=>{
    x.fillStyle = "#fdfbf6"; x.font = "800 40px "+F;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("STOP", w/2, h/2 + 1);
  });
  const FACE_CAM = Math.atan2(0.80, 1.0);
  const stopSign = (x, z) => {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = FACE_CAM; g.add(s);
    Cy(s, 0.05, 0.065, 1.55, MAT.chrome(), 0, 0, 0, 8);
    const oct = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.07, 8), MAT.accent());
    oct.rotation.x = Math.PI/2; oct.position.set(0, 1.68, 0.02);
    oct.castShadow = true; s.add(oct);
    Pl(s, 0.66, 0.66, signMat(STOP_TEX), 0, 1.68, 0.07);
    markNoBounds(s);
  };
  for(const [ix, iz] of [[-6, 56], [22, 56], [-6, 88], [22, 88]]){
    stopSign(ix - 2.7, iz - 2.7);
    stopSign(ix + 2.7, iz + 2.7);
  }
  stopSign(33.5, 52.4); stopSign(33.5, 59.9);

  /* ---- local streets --------------------------------------------------
     Two rules make the grid behave. A car halts at the STOP LINE, short of
     the crossing, never inside the box — stopping on the crosswalk was the
     giveaway that this was a timeline and not a simulation. And a junction is
     a shared resource: north-south and east-west cannot hold the same box at
     once, so two streets never meet in the middle of it. Vehicles on the same
     axis may share, since they are in different lanes and only pass alongside.
     Route ends are pulled back from the ring and the belt so a car waiting to
     turn around is never parked in a through lane. */
  const JUNC = [[-6, 56], [22, 56], [-6, 88], [22, 88]];
  /* A junction is claimed BEFORE it is entered, not while occupied. Checking
     occupancy alone races: two cars on crossing streets both see an empty box,
     both proceed, and they meet in it. The claim is taken on approach and held
     until the box is cleared; the axis is recorded so vehicles running the same
     way can share, since they are in different lanes. */
  const owner = JUNC.map(() => null);   // axis holding it, or null
  const users = JUNC.map(() => 0);      // how many of that axis are engaged
  const STOP_BACK = 5.4;      // outside the crosswalk, which reaches 4.35
  const BOX = 5.0;            // half-depth of the junction body
  const ENGAGE = 15;          // start bidding for the box this far out

  const mkLocal = (L) => {
    const len = Math.hypot(L.B[0]-L.A[0], L.B[1]-L.A[1]);
    const ux = (L.B[0]-L.A[0])/len, uz = (L.B[1]-L.A[1])/len;
    const axis = Math.abs(ux) > Math.abs(uz) ? "ew" : "ns";
    const gates = [];
    JUNC.forEach(([jx, jz], i) => {
      const s = (jx - L.A[0])*ux + (jz - L.A[1])*uz;         // project onto the street
      const px = L.A[0] + ux*s, pz = L.A[1] + uz*s;
      if(s > BOX && s < len - BOX && Math.hypot(px-jx, pz-jz) < 3) gates.push({s, i});
    });
    gates.sort((a, b) => a.s - b.s);
    return {...L, len, ux, uz, axis, gates,
            car: L.bus ? mkBus(L.col, L.bus) : mkCar(L.col),
            s: (L.ph || 0) * len, v: 0, dir: 1, claim: -1, cleared: -1, wait: 0};
  };
  const releaseLocal = L => {
    if(L.claim >= 0){
      users[L.claim] = Math.max(0, users[L.claim] - 1);
      if(users[L.claim] === 0) owner[L.claim] = null;
      L.claim = -1;
    }
  };
  const stepLocal = (L, dt) => {
    // the junction we are engaged with: the one we sit in, else the next one
    // close enough ahead to start bidding for
    let want = -1, aheadD = Infinity;
    for(const g of L.gates){
      const d = (g.s - L.s) * L.dir;
      if(Math.abs(L.s - g.s) < BOX){ want = g.i; aheadD = 0; break; }
      if(d > 0 && d < ENGAGE && d < aheadD){ want = g.i; aheadD = d; }
    }
    if(L.claim !== want) releaseLocal(L);
    let holds = L.claim === want && want >= 0;
    if(want >= 0 && !holds && (owner[want] === null || owner[want] === L.axis)){
      owner[want] = L.axis; users[want]++; L.claim = want; holds = true;
    }

    let target = L.vmax;
    if(want >= 0 && aheadD > 0){
      // stop at the line if the box is spoken for, or for the sign itself,
      // which is obeyed once per approach — `cleared` remembers we did
      if(!holds || L.cleared !== want){
        const room = aheadD - STOP_BACK;
        target = Math.max(0, Math.min(L.vmax, room * 1.5));
        if(room < 0.3 && L.v < 0.25){
          L.wait += dt;
          if(holds && L.wait > 0.8){ L.cleared = want; L.wait = 0; }
        }
      }
    }
    L.v = Math.max(0, L.v + Math.max(-10*dt, Math.min(4.2*dt, target - L.v)));
    L.s += L.dir * L.v * dt;
    if(L.s >= L.len){ L.s = L.len; L.dir = -1; L.v = 0; L.cleared = -1; releaseLocal(L); }
    if(L.s <= 0){ L.s = 0; L.dir = 1; L.v = 0; L.cleared = -1; releaseLocal(L); }
    L.car.position.set(L.A[0] + L.ux*L.s, 0.035, L.A[1] + L.uz*L.s);
    L.car.rotation.y = Math.atan2(-L.uz*L.dir, L.ux*L.dir);
  };

  const locals = [
    {A:[-6.9, 42],  B:[-6.9, 105], vmax:5.4, ph:0.10, col:0xffffff},
    {A:[-48, 55.3], B:[49, 55.3],  vmax:5.8, ph:0.55, col:0xe8e4dc},
    {A:[-48, 88.9], B:[49, 88.9],  vmax:5.2, ph:0.30, col:0xd8d3c9},
    {A:[21.1, 44],  B:[21.1, 85],  vmax:5.0, ph:0.70, col:0xf0ede6},
    // the local route: down Signal St past the shops and back
    {A:[-48, 56.7], B:[49, 56.7],  vmax:3.9, ph:0.02, col:0xffffff, bus:"SIGNAL ST"},
  ].map(mkLocal);
  locals.forEach(L => stepLocal(L, 0));
  if(ANIM) anims.push((t, dt) => locals.forEach(L => stepLocal(L, dt)));
  // and a few parked in driveways
  for(const [px, pz, pr, pc] of [[-20.8, 45.0, 0.1, 0xffffff],
      [6.2, 44.2, -0.08, 0xd8d3c9], [-18.6, 60.2, 0.12, 0xbdb8ae]]){
    const c = mkCar(pc); c.position.set(px, 0.035, pz); c.rotation.y = pr;
  }
  // drive times: a 2-minute virtual day; the roads surge at 12p, 5p and 10p
  const DAY = 120;                                     // real seconds per 24h
  const hourAt = t => (10.5 + (t / DAY) * 24) % 24;
  const busyAt = h => {
    let b = 0;
    for(const p of [12, 17, 22]){
      const d = Math.min(Math.abs(h - p), 24 - Math.abs(h - p));
      b = Math.max(b, Math.exp(-(d * d) / 2.645));
    }
    return 0.28 + 0.72 * b;
  };
  // extras on the far side of each street, so they can never meet the local
  // already working it
  // peak-hour extras, on the far side of each street from the base local
  const rushLocals = [
    {A:[-5.1, 105], B:[-5.1, 42],  vmax:5.6, ph:0.62, col:0xf0ede6, th:0.60},
    {A:[49, 87.1],  B:[-48, 87.1], vmax:5.3, ph:0.80, col:0xffffff, th:0.72},
    {A:[22.9, 85],  B:[22.9, 44],  vmax:5.1, ph:0.15, col:0xd8d3c9, th:0.65},
  ].map(mkLocal);
  const clockEl = document.getElementById("dayclock");
  const setClock = t => {
    if(!clockEl) return;
    const h = hourAt(t), b = busyAt(h);
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    const h12 = ((hh + 11) % 12) + 1, ap = hh >= 12 ? "PM" : "AM";
    const stamp = h12 + ":" + String(mm).padStart(2, "0") + " " + ap;
    clockEl.innerHTML = b > 0.72 ? stamp + " &nbsp;<b>· drive time</b>" : stamp;
  };
  const setRush = (t, dt) => {
    const b = busyAt(hourAt(t));
    stepRing(dt || 0.016, b);
    rushLocals.forEach(L => {
      const on = b >= L.th;
      L.car.visible = on;
      // a hidden car must not keep a junction reserved against live traffic
      if(on) stepLocal(L, dt || 0.016); else releaseLocal(L);
    });
    setClock(t);
  };
  if(ANIM){ setRush(0, 0); anims.push(setRush); }
  else setRush(7.5, 0);                                // static render parks at noon — peak drive time
  pin(0, 1.1, 36.95);
  pin(14, 1.1, 34.8);
  pin(6, 1.1, 39.05);
}

/* --- Mobile Listeners: pedestrians on the front walk --- */
{
  const room = RM("listeners"), {g, pin} = roomGroup(room);
  g.userData.idx = ROOMS.indexOf(room); pickExtras.push(g);
  // groundShadow: the jumpers get their contact shadow left behind on the
  // grass instead of carried with them, or it reads as a floating smudge
  function mkPed(color, phone, groundShadow){
    const p = new THREE.Group(); g.add(p);
    Cy(p, 0.2, 0.27, 1.0, std(color, {roughness:0.92}), 0, 0, 0, 12);
    Sp(p, 0.2, std(0xe9dfd2, {roughness:0.9}), 0, 1.22, 0);
    if(phone){
      Bo(p, 0.05, 0.26, 0.16, MAT.inkFlat(), 0.3, 0.78, 0.1, 0, 0, -0.45);
      Bo(p, 0.02, 0.2, 0.12, emissive(0xfff0da), 0.335, 0.815, 0.1, 0, 0, -0.45);
    }
    if(!groundShadow) mkBlobShadow(p, 0.85, 0.6, -0.03);
    markNoBounds(p);
    return p;
  }
  const walkers = [
    {A:[-14, 17.6], B:[13, 17.6],  c:0xffffff, phone:true,  sp:1.35, ph:0.0},
    {A:[10, 17.4],  B:[-12, 17.4], c:0xd8d3c9, phone:false, sp:1.1,  ph:0.45},
    {A:[-1.4, 14.2],B:[-1.4, 21.4],c:0xff4a1c, phone:true,  sp:0.85, ph:0.2},
    {A:[12, 18],    B:[27, 28.6],  c:0xbdb8ae, phone:false, sp:0.9,  ph:0.7},
    {A:[24.5, 13],  B:[24.5, -5],  c:0xffffff, phone:true,  sp:1.5,  ph:0.3},
    {A:[-16, 15.2], B:[5, 15.2],   c:0xf0ede6, phone:false, sp:1.2,  ph:0.85},
    {A:[8, 15.4],   B:[-9, 15.4],  c:0xffffff, phone:true,  sp:1.0,  ph:0.15},
    {A:[-9, 19.6],  B:[-13, 28.5], c:0xd8d3c9, phone:false, sp:0.8,  ph:0.55},
    // walking in to the park off Third St
    {A:[6.5, 92],   B:[12.5, 99],  c:0xffffff, phone:true,  sp:1.0,  ph:0.1},
    {A:[29, 93],    B:[23.5, 100], c:0xf0ede6, phone:false, sp:0.95, ph:0.6},
    {A:[17, 112],   B:[17, 105],   c:0xd8d3c9, phone:true,  sp:1.15, ph:0.35},
    {A:[9, 106],    B:[25, 106],   c:0xbdb8ae, phone:false, sp:1.25, ph:0.8},
    /* and the rest of the campus — every sidewalk and lot has someone on it.
       Paths hug the streets without standing in them, and stay inside the
       flat masks; a walker on a hillside would sink, since y is fixed. */
    {A:[-3.4, 44],  B:[-3.4, 84],  c:0xffffff, phone:true,  sp:1.3,  ph:0.05},  // Maple, east side
    {A:[-8.6, 82],  B:[-8.6, 48],  c:0xd8d3c9, phone:false, sp:1.15, ph:0.5},   // Maple, west side
    {A:[-30, 53.4], B:[10, 53.4],  c:0xf0ede6, phone:true,  sp:1.4,  ph:0.25},  // Signal, north walk
    {A:[30, 58.6],  B:[-14, 58.6], c:0xbdb8ae, phone:false, sp:1.25, ph:0.75},  // Signal, south walk
    {A:[24.6, 56],  B:[24.6, 84],  c:0xffffff, phone:false, sp:1.1,  ph:0.4},   // Second Ave
    {A:[-30, 85.4], B:[26, 85.4],  c:0xd8d3c9, phone:true,  sp:1.45, ph:0.6},   // Third St
    {A:[34, 52.4],  B:[56, 52.4],  c:0xffffff, phone:true,  sp:1.05, ph:0.15},  // shop row one
    {A:[56, 59.9],  B:[34, 59.9],  c:0xf0ede6, phone:false, sp:1.2,  ph:0.55},  // shop row two
    {A:[30.5, 83],  B:[53, 83],    c:0xbdb8ae, phone:true,  sp:1.0,  ph:0.9},   // shop row three
    {A:[21, 33.6],  B:[35, 33.6],  c:0xffffff, phone:false, sp:1.1,  ph:0.3},   // past the billboard
    {A:[26, 22],    B:[26, -6],    c:0xd8d3c9, phone:true,  sp:1.35, ph:0.7},   // the field yard
    {A:[38, -8],    B:[38, 16],    c:0xffffff, phone:false, sp:1.2,  ph:0.2},
    {A:[8, 108],    B:[8, 93],     c:0xf0ede6, phone:true,  sp:0.95, ph:0.45},  // park, west path
    {A:[27, 94],    B:[27, 107],   c:0xffffff, phone:false, sp:1.05, ph:0.85},  // park, east path
    {A:[-20, 42.6], B:[6, 42.6],   c:0xbdb8ae, phone:true,  sp:1.15, ph:0.65},  // in front of the homes
    // using the crossings — the local traffic stops at these junctions, so the
    // two read as one piece of choreography
    {A:[-11.6, 52.6],B:[-0.4, 52.6],c:0xffffff, phone:false, sp:1.0, ph:0.12},  // over Maple
    {A:[-9.1, 50.4], B:[-9.1, 61.6],c:0xf0ede6, phone:true,  sp:0.9, ph:0.58},  // over Signal
    {A:[16.4, 52.6], B:[27.6, 52.6],c:0xd8d3c9, phone:false, sp:1.05,ph:0.34},  // over Second Ave
    {A:[-9.1, 84.4], B:[-9.1, 91.6],c:0xbdb8ae, phone:true,  sp:0.85,ph:0.77},  // over Third St
  ].map(w => ({...w, ped: mkPed(w.c, w.phone),
    len: Math.hypot(w.B[0]-w.A[0], w.B[1]-w.A[1])}));
  // a pair chatting by the entrance
  const chatA = mkPed(0xffffff, false); chatA.position.set(-3.4, 0.05, 14.6); chatA.rotation.y = 1.1;
  const chatB = mkPed(0xbdb8ae, true);  chatB.position.set(-2.2, 0.05, 15.1); chatB.rotation.y = -2.1;

  /* ---- station stage: the concert in the park, crowd facing it ---- */
  const CX = 17, CZ = 96;                    // stage center; the crowd fills +z of it
  const stg = new THREE.Group(); stg.position.set(CX, 0, CZ); g.add(stg);
  Bo(stg, 10, 0.9, 4.6, MAT.white(), 0, 0, 0);
  Bo(stg, 10.06, 0.26, 4.66, MAT.inkFlat(), 0, 0.06, 0);            // skirt band
  Bo(stg, 9.6, 3.4, 0.22, MAT.wall(), 0, 0.9, -2.05);               // scrim
  Bo(stg, 9.6, 0.26, 0.26, MAT.accent(), 0, 0.94, -2.05);
  Pl(stg, 4.8, 0.66, signMat(TX.wordwall), 0, 3.2, -1.9);
  for(const px of [-4.6, 4.6]) for(const pz of [-2.0, 2.0])
    Cy(stg, 0.05, 0.05, 3.9, MAT.chrome(), px, 0.9, pz, 10);
  const sroof = Bo(stg, 10.5, 0.18, 5.3, MAT.white(), 0, 4.8, -0.05);
  sroof.rotation.x = -0.05; sroof.castShadow = false;
  for(const px of [-3.2, 0, 3.2]) Sp(stg, 0.09, emissive(0xf7b757), px, 4.6, 1.75);
  // monitors + mic + DJ rig (the same AirSuite surface, on a milk crate stage)
  Bo(stg, 0.85, 0.3, 0.5, MAT.inkFlat(), -1.6, 0.9, 1.85, 0, 0, 0).rotation.x = 0.5;
  Bo(stg, 0.85, 0.3, 0.5, MAT.inkFlat(), 1.9, 0.9, 1.85, 0, 0, 0).rotation.x = 0.5;
  Cy(stg, 0.02, 0.02, 1.5, MAT.chrome(), 0.7, 0.9, 0.7, 8);
  Sp(stg, 0.05, MAT.inkFlat(), 0.7, 2.42, 0.7);
  Bo(stg, 2.6, 0.12, 1.0, MAT.white(), -2.2, 1.75, -0.7);
  Bo(stg, 0.12, 0.85, 0.85, MAT.white(), -3.3, 0.9, -0.7);
  Bo(stg, 0.12, 0.85, 0.85, MAT.white(), -1.1, 0.9, -0.7);
  mkConsole(stg, -2.2, 1.9, -0.7, 0.8);
  function mkPA(x, z, ry){
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; stg.add(s);
    Cy(s, 0.4, 0.44, 0.08, MAT.chrome(), 0, 0, 0, 18);
    Cy(s, 0.048, 0.048, 1.95, MAT.chrome(), 0, 0.08, 0, 10);
    const b = new THREE.Group(); b.position.set(0, 2.0, 0); b.rotation.x = 0.15; s.add(b);
    Bo(b, 0.82, 1.18, 0.72, MAT.white(), 0, -0.12, 0);
    Bo(b, 0.82, 0.1, 0.74, MAT.inkFlat(), 0, -0.22, 0);
    Cy(b, 0.24, 0.24, 0.08, MAT.inkFlat(), 0, 0.16, 0.37, 16, 0, Math.PI/2);
    Cy(b, 0.11, 0.11, 0.08, MAT.inkFlat(), 0, 0.62, 0.37, 12, 0, Math.PI/2);
  }
  mkPA(-5.9, 1.6, 0.5);
  mkPA(5.9, 1.6, -0.5);
  // performer, mid-set
  const perf = mkPed(0xff4a1c, false, true);
  perf.position.set(CX + 0.2, 0.95, CZ + 0.6); perf.scale.setScalar(1.12);
  { const psh = mkBlobShadow(stg, 0.9, 0.62, 0.93); psh.position.x = 0.2; psh.position.z = 0.6; }
  // the performer works the same beat as the crowd — see jumpAt below

  /* the crowd — bouncing, phones up */
  const crowd = [];
  // six ranks fanning back from the stage lip, staggered so no one hides behind
  // the person in front; offsets are stage-relative, jitter is deterministic
  const spots = [];
  for(let r=0; r<6; r++){
    const n = 7 + (r % 2);
    for(let i=0; i<n; i++){
      const jx = ((r*7 + i*13) % 5) * 0.24 - 0.48;
      const jz = ((r*5 + i*11) % 4) * 0.28;
      spots.push([CX - 7.4 + i * (14.8/(n-1)) + jx, CZ + 3.4 + r*1.85 + jz]);
    }
  }
  spots.forEach(([px,pz], i)=>{
    const col = i%7===0 ? 0xff4a1c : [0xffffff,0xd8d3c9,0xbdb8ae,0xf0ede6][i%4];
    const p = mkPed(col, i%3===0, true);
    const ry = Math.atan2(CX - px, CZ - pz);      // face the stage
    const s0 = 0.88 + (i%4)*0.06;
    p.position.set(px, 0.05, pz); p.rotation.y = ry;
    p.scale.setScalar(s0);
    const sh = mkBlobShadow(g, 0.85*s0, 0.6*s0, 0.03);
    sh.position.x = px; sh.position.z = pz;
    // off is hundredths of a second — enough to keep the crowd from reading as
    // one rigid object, small enough that they still leave the ground together
    crowd.push({p, ry, s0, ph: i*1.31, off: (i%5)*0.006});
  });
  // stragglers arriving from the street and drifting along the back of the park
  const chatC = mkPed(0xffffff, true);  chatC.position.set(CX+9.6, 0.05, CZ+6.4); chatC.rotation.y = -1.9;
  const chatD = mkPed(0xd8d3c9, false); chatD.position.set(CX+10.4, 0.05, CZ+7.2); chatD.rotation.y = 1.3;
  const chatE = mkPed(0xbdb8ae, true);  chatE.position.set(CX-10.2, 0.05, CZ+5.1); chatE.rotation.y = 2.2;
  /* the whole crowd jumps on the same beat — airborne for the first half of
     each bar, then a short crouch on the landing before the next one */
  const BEAT = 1.85;
  const jumpAt = t => {
    const k = (t * BEAT) % 1;
    return k < 0.58 ? {air: Math.sin(k/0.58 * Math.PI), sq: 1}
                    : {air: 0, sq: 1 - 0.13*Math.sin((k-0.58)/0.42 * Math.PI)};
  };
  if(ANIM) anims.push(t=>{
    crowd.forEach(c=>{
      const j = jumpAt(t + c.off);
      c.p.position.y = 0.05 + j.air*0.36;
      c.p.scale.y = c.s0 * j.sq;
      c.p.rotation.y = c.ry + Math.sin(t*1.2 + c.ph)*0.1;
    });
    const j = jumpAt(t + 0.02);            // leading the room by a hair
    perf.position.y = 0.95 + j.air*0.3;
    perf.scale.y = 1.12 * j.sq;
    perf.rotation.y = Math.sin(t*0.9)*0.4;
  });
  const placePed = (w, t) => {
    const cyc = (t * w.sp / w.len + w.ph) % 1;
    const k = 1 - Math.abs(2*cyc - 1);            // ping-pong
    const fwd = cyc < 0.5 ? 1 : -1;
    const x = w.A[0] + (w.B[0]-w.A[0]) * k;
    const z = w.A[1] + (w.B[1]-w.A[1]) * k;
    w.ped.position.set(x, 0.05 + 0.045*Math.abs(Math.sin(t*6 + w.ph*9)), z);
    w.ped.rotation.y = Math.atan2((w.B[0]-w.A[0]) * fwd, (w.B[1]-w.A[1]) * fwd);
  };
  walkers.forEach(w => placePed(w, 0.6));
  if(ANIM) anims.push(t => walkers.forEach(w => placePed(w, t)));
  pin(CX - 6.5, 2.0, CZ + 4.2);    // phones up in the front rank
  pin(CX + 7.5, 1.9, CZ + 9.4);    // the crowd, checked in at the gate
  pin(CX, 5.6, CZ + 2.6);          // the stage — clear of its own canopy
}

/* --- Connected Homes: TV apps + smart speakers across the road --- */
{
  const room = RM("homes"), {g, pin} = roomGroup(room);
  function house(x, z, ry, dining, dishNotAerial){
    const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; g.add(h);
    const W2 = 5.2, D2 = 4.2, WHh = 2.9, T = 0.16;
    // hollow shell: floor + three fixed walls
    Bo(h, W2-0.1, 0.08, D2-0.1, std(0xf2efe8, {roughness:0.9}), 0, 0.01, 0);
    Bo(h, W2, WHh, T, MAT.wall(), 0, 0, -D2/2+T/2);
    Bo(h, T, WHh, D2, MAT.wall(), -W2/2+T/2, 0, 0);
    Bo(h, T, WHh, D2, MAT.wall(),  W2/2-T/2, 0, 0);
    // front wall: full version (traditional face) vs open-house stub
    const shutter = std(0x5b665a, {roughness:0.9});
    const trim = std(0xf4f1ea, {roughness:0.9});
    const full = new THREE.Group(); h.add(full);
    Bo(full, W2, WHh, T, MAT.wall(), 0, 0, D2/2-T/2);
    // paneled door with step + stoop light
    Bo(full, 1.15, 2.1, 0.08, trim, 1.5, 0, D2/2);
    Bo(full, 0.95, 1.95, 0.1, std(0x9a8d79, {roughness:0.85}), 1.5, 0, D2/2+0.03);
    Sp(full, 0.035, MAT.inkFlat(), 1.85, 1.0, D2/2+0.1);
    Bo(full, 1.3, 0.14, 0.6, trim, 1.5, -0.02, D2/2+0.35);
    // six-pane window with shutters + sill
    Bo(full, 2.1, 1.5, 0.07, trim, -1.1, 0.72, D2/2);
    Bo(full, 1.85, 1.25, 0.07, MAT.glass(), -1.1, 0.82, D2/2+0.03);
    Bo(full, 0.08, 1.25, 0.1, trim, -1.1, 0.82, D2/2+0.04);
    Bo(full, 1.85, 0.08, 0.1, trim, -1.1, 1.4, D2/2+0.04);
    Bo(full, 2.3, 0.1, 0.24, trim, -1.1, 0.62, D2/2+0.08);
    Bo(full, 0.42, 1.5, 0.06, shutter, -2.35, 0.72, D2/2+0.02);
    Bo(full, 0.42, 1.5, 0.06, shutter, 0.15, 0.72, D2/2+0.02);
    const stub = new THREE.Group(); stub.visible = false; h.add(stub);
    Bo(stub, W2, 0.95, T, MAT.wall(), 0, 0, D2/2-T/2);
    Bo(stub, W2+0.04, 0.07, T+0.04, trim, 0, 0.95, D2/2-T/2);
    // roof assembly (lifts away when the house opens) — shingled tone, eaves,
    // fascia boards, chimney, porch canopy over the door
    const shingle = std(0xffffff, {roughness:0.82, envMapIntensity:0.4});
    const roof = new THREE.Group(); h.add(roof);
    const rA = Bo(roof, 6.1, 0.18, 2.85, shingle, 0, 3.32, -1.18); rA.rotation.x = -0.52;
    const rB = Bo(roof, 6.1, 0.18, 2.85, shingle, 0, 3.32, 1.18);  rB.rotation.x = 0.52;
    Bo(roof, 6.1, 0.16, 0.24, trim, 0, 3.92, 0);
    Bo(roof, 6.1, 0.14, 0.1, trim, 0, 2.72, -2.28, 0, 0, 0);   // fascia
    Bo(roof, 6.1, 0.14, 0.1, trim, 0, 2.72, 2.28, 0, 0, 0);
    Bo(roof, 0.62, 1.5, 0.62, std(0x9a8d79, {roughness:0.9}), -1.7, 3.1, -0.55);  // chimney
    Bo(roof, 0.76, 0.14, 0.76, trim, -1.7, 4.6, -0.55);
    // porch canopy (lifts with the lid); its posts stay with the facade
    const pr = Bo(roof, 1.7, 0.1, 1.1, shingle, 1.5, 2.42, D2/2+0.42); pr.rotation.x = 0.32;
    Cy(full, 0.05, 0.05, 2.25, trim, 0.8, 0, D2/2+0.82, 10);
    Cy(full, 0.05, 0.05, 2.25, trim, 2.2, 0, D2/2+0.82, 10);
    if(dishNotAerial){
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI*2, 0, 1.0), MAT.white());
      d.position.set(1.8, 4.15, -0.6); d.rotation.set(0.5, 0.4, -0.6); d.castShadow = true; roof.add(d);
    } else {
      Cy(roof, 0.025, 0.025, 1.3, MAT.inkFlat(), -1.6, 3.95, 0, 8);
      strut(roof, [-2.5, 5.2, 0], [-0.7, 5.2, 0], 0.02, MAT.inkFlat());
      strut(roof, [-2.2, 5.05, 0], [-1.0, 5.05, 0], 0.02, MAT.inkFlat());
      strut(roof, [-1.9, 4.9, 0], [-1.3, 4.9, 0], 0.02, MAT.inkFlat());
    }
    homesState.parts.push({roof, full, stub, g: h, k: 0, t: 0});
    // ---- interior, Sims-style ----
    mkRug(h, -0.2, 0.05, 0.3, 3.2, 2.2);
    const tvWall = Bo(h, 2.2, 1.3, 0.1, MAT.inkFlat(), -0.6, 0.9, -D2/2+T+0.08);
    const tvGlow = Bo(h, 2.0, 1.1, 0.04, emissive(0xcfe2f4), -0.6, 1.0, -D2/2+T+0.15);
    if(ANIM) anims.push(t => {
      tvGlow.material.transparent = true;
      tvGlow.material.opacity = 0.55 + 0.45*Math.abs(Math.sin(t*8.7 + x)*Math.sin(t*2.3));
    });
    Bo(h, 2.4, 0.5, 0.5, MAT.white(), -0.6, 0.05, -D2/2+T+0.4);   // media console
    if(dining){
      Cy(h, 0.55, 0.55, 0.07, MAT.white(), 1.5, 0.78, -0.6, 22);
      Cy(h, 0.07, 0.07, 0.78, MAT.inkFlat(), 1.5, 0.05, -0.6, 10);
      mkStool(h, 0.8, 0.05, -1.2); mkStool(h, 2.2, 0.05, -0.1);
      Bo(h, 0.85, 0.95, 1.9, MAT.white(), 1.95, 0.05, 0.9);        // kitchenette
      Bo(h, 0.9, 0.06, 2.0, std(0xe8e5dd), 1.93, 1.0, 0.9);
      Cy(h, 0.13, 0.13, 0.26, MAT.inkFlat(), 1.9, 1.06, 0.4, 14);  // speaker on counter
      Torus(h, 0.13, 0.024, emissive(0xff4a1c), 1.9, 1.36, 0.4, 0.35);
      mkSofa(h, -1.5, 0.05, 0.7, 2.2, Math.PI);
    } else {
      mkSofa(h, -0.4, 0.05, 1.0, 2.6, Math.PI);
      mkCoffeeTable(h, -0.5, 0.05, -0.3);
      mkSideTable(h, 1.7, 0.05, -1.2);
      Cy(h, 0.13, 0.13, 0.26, MAT.inkFlat(), 1.7, 0.73, -1.2, 14); // speaker on side table
      Torus(h, 0.13, 0.024, emissive(0xff4a1c), 1.7, 1.03, -1.2, 0.35);
      mkFloorLamp(h, -2.0, 0.05, -1.3);
      mkPlant(h, 2.05, 0.05, 1.3, 0.7);
    }
    return h;
  }
  // the neighborhood: five homes on the far side of the street, on their own
  // blocks around the Maple Ave / Signal St intersections
  house(-18, 48.5, 0.08, false, false);      // Signal St, north side
  house(-27.5, 49.2, 0.2, true, true);
  house(4, 47.6, -0.08, true, false);
  house(28.6, 47.2, -0.18, false, true);   // clear of the Second Ave curb
  house(-15.5, 62.5, 0.1, true, false);      // below Signal St
  mkPlant(g, -21.6, 0, 51.4, 1.15);
  mkPlant(g, 0.4, 0, 50.2, 0.95);
  mkPlant(g, -10.4, 0, 64.6, 1.0);
  pin(3.3, 1.6, 45.7);        // interior TV (Signal St east)
  pin(-16.4, 1.1, 47.2);      // smart speaker (Signal St west)
  pin(-29.1, 5.2, 49.5);      // rooftop aerial
}

/* --- Billboards & Screens: roadside board + partner storefront --- */
{
  const room = RM("ooh"), {g, pin} = roomGroup(room);
  // digital billboard angled at the road
  const bb = new THREE.Group(); bb.position.set(23.2, 0, 29.6); bb.rotation.y = 0.22; g.add(bb);
  Cy(bb, 0.1,0.12,3.1, MAT.inkFlat(), -1.7, 0, 0, 10);
  Cy(bb, 0.1,0.12,3.1, MAT.inkFlat(), 1.7, 0, 0, 10);
  Bo(bb, 5.7, 2.75, 0.2, MAT.white(), 0, 3.1, 0);
  Pl(bb, 5.3, 2.4, signMat(TX.billboard), 0, 4.47, 0.12);
  Bo(bb, 0.9, 0.7, 0.5, std(0xe4e0d6), 2.5, 0, 0.3);          // proof-of-play cabinet
  // partner storefront with an in-window reel
  const st = new THREE.Group(); st.position.set(31.8, 0, 30.4); st.rotation.y = 0.24; g.add(st);
  Bo(st, 4.8, 3.1, 3.6, MAT.wall(), 0, 0, 0);
  Bo(st, 5.2, 0.3, 4.0, MAT.slab(), 0, 3.1, 0);
  Bo(st, 1.1, 2.2, 0.12, std(0xdcd7cc), 1.5, 0, 1.82);        // door
  Bo(st, 2.3, 1.35, 0.1, MAT.glass(), -0.7, 0.85, 1.84);      // window
  Pl(st, 1.95, 1.05, signMat(TX.siteScreen), -0.7, 1.5, 1.92); // the reel
  Pl(st, 2.9, 0.4, signMat(TX.wordwall), 0.1, 2.7, 1.87);
  const awn = Bo(st, 3.2, 0.08, 1.15, MAT.accent(), -0.5, 2.28, 2.28);
  awn.rotation.x = 0.42;
  mkPlant(g, 27.6, 0, 32.6, 1.0);
  pin(23.2, 4.5, 29.6);
  pin(31.2, 1.6, 32.1);
  pin(25.5, 0.9, 29.9);
}

/* --- Connected Businesses: the strip east of the suburb --- */
{
  const room = RM("biz"), {g, pin} = roomGroup(room);
  const shopSign = label => tex(256, 44, (x,w,h)=>{
    x.fillStyle = "#26211a"; rr(x, 4, 5, w-8, h-10, 7); x.fill();
    x.fillStyle = "#fdfbf6"; x.font = "800 17px "+F;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(label.split("").join(" "), w/2, h/2+1);
  });
  const shop = (x0, name, awnMat, z0 = 48.5) => {
    const s = new THREE.Group(); s.position.set(x0, 0, z0); g.add(s);
    Bo(s, 6.6, 3.2, 5.0, MAT.wall(), 0, 0, 0);
    Bo(s, 6.9, 0.26, 5.3, MAT.slab(), 0, 3.2, 0);                 // parapet
    Bo(s, 0.95, 0.5, 0.7, std(0xe4e0d6), -1.6, 3.46, -0.9);       // rooftop unit
    Bo(s, 5.9, 1.8, 0.1, MAT.inkFlat(), -0.35, 0.4, 2.46);        // storefront frame
    Bo(s, 5.6, 1.55, 0.06, MAT.glass(), -0.35, 0.52, 2.52);       // glazing
    Pl(s, 2.0, 1.05, signMat(TX.siteScreen), -1.75, 1.25, 2.56);  // the window reel
    Bo(s, 1.12, 2.25, 0.1, std(0xdcd7cc), 2.45, 0, 2.48);         // door
    const awn = Bo(s, 6.0, 0.07, 1.25, awnMat, -0.3, 2.42, 3.0);
    awn.rotation.x = 0.42;
    Pl(s, 3.6, 0.6, signMat(shopSign(name)), 0, 2.85, 2.72);      // fascia sign
    Cy(s, 0.1, 0.12, 0.3, MAT.inkFlat(), 2.95, 2.5, 2.42, 10);    // wall speaker
    Sp(s, 0.045, emissive(0xff4a1c), 2.95, 2.72, 2.5);            //   live ring
    markNoBounds(s);
    return s;
  };
  shop(37.5, "CAFE", MAT.accent());
  shop(45.5, "MARKET", std(0x2f2a23, {roughness:0.9}));
  shop(53.5, "GYM", std(0xbdb8ae, {roughness:0.9}));

  /* Second row, across Signal St. These front NORTH onto the street, which
     the camera never sees — so they're double-fronted: a proper storefront on
     the street side and a rear entrance, patio and sign band on the side that
     faces the lens. Same trick a real corner block uses. */
  const shopAcross = (x0, name, awnMat) => {
    const s = new THREE.Group(); s.position.set(x0, 0, 63.5); g.add(s);
    Bo(s, 6.6, 3.4, 5.2, MAT.wall(), 0, 0, 0);
    Bo(s, 6.9, 0.28, 5.5, MAT.slab(), 0, 3.4, 0);                 // parapet
    Bo(s, 0.9, 0.55, 0.75, std(0xe4e0d6), 1.7, 3.68, 0.4);        // rooftop unit
    // street frontage (north)
    Bo(s, 5.9, 1.85, 0.1, MAT.inkFlat(), 0.35, 0.4, -2.61);
    Bo(s, 5.6, 1.6, 0.06, MAT.glass(), 0.35, 0.52, -2.67);
    Bo(s, 1.12, 2.3, 0.1, std(0xdcd7cc), -2.45, 0, -2.63);
    const awnN = Bo(s, 6.0, 0.07, 1.3, awnMat, 0.3, 2.5, -3.18);
    awnN.rotation.x = -0.42;
    // camera side: rear entrance, window reel and the name
    Bo(s, 4.4, 1.6, 0.1, MAT.inkFlat(), -0.7, 0.35, 2.66);
    Bo(s, 4.1, 1.35, 0.06, MAT.glass(), -0.7, 0.47, 2.72);
    Pl(s, 1.9, 1.0, signMat(TX.siteScreen), -0.7, 1.15, 2.76);
    Bo(s, 1.05, 2.2, 0.1, std(0xdcd7cc), 2.3, 0, 2.68);
    Pl(s, 3.5, 0.58, signMat(shopSign(name)), -0.2, 3.0, 2.79);
    Cy(s, 0.1, 0.12, 0.32, MAT.inkFlat(), 2.9, 2.3, 2.62, 10);    // wall speaker
    Sp(s, 0.045, emissive(0xff4a1c), 2.9, 2.54, 2.7);             //   live ring
    markNoBounds(s);
    return s;
  };
  shopAcross(36.5, "DINER", std(0x2f2a23, {roughness:0.9}));
  shopAcross(44.5, "SALON", MAT.accent());
  shopAcross(52.5, "AUTO", std(0xbdb8ae, {roughness:0.9}));
  // shared sidewalk along the shop fronts on the far side
  const walk2 = Bo(g, 25.5, 0.05, 2.0, std(0xe9e5db, {roughness:0.96}), 44.5, 0.02, 59.9);
  walk2.castShadow = false; markNoBounds(walk2);
  // diner patio, on the side the camera reads
  for(const px of [34.6, 38.4]){
    Cy(g, 0.42, 0.46, 0.06, MAT.white(), px, 0.6, 67.4, 16);
    Cy(g, 0.035, 0.045, 0.66, MAT.chrome(), px, 0, 67.4, 8);
    for(const a of [0.9, 2.4]) Cy(g, 0.16, 0.18, 0.5,
      std(0xdfd9cd, {roughness:0.9}), px+Math.cos(a)*0.85, 0, 67.4+Math.sin(a)*0.85, 10);
  }
  // salon planters and an auto bay stall marked out front
  mkPlant(g, 47.9, 0, 67.2, 0.95);
  Bo(g, 3.2, 0.03, 0.12, std(0xf2efe8, {roughness:0.9}), 52.5, 0.02, 67.6);
  Bo(g, 0.12, 0.03, 2.6, std(0xf2efe8, {roughness:0.9}), 50.9, 0.02, 66.4);
  Bo(g, 0.12, 0.03, 2.6, std(0xf2efe8, {roughness:0.9}), 54.1, 0.02, 66.4);
  // sidewalk connecting the strip to Signal St
  const walk = Bo(g, 24.5, 0.05, 2.1, std(0xe9e5db, {roughness:0.96}), 45.5, 0.02, 52.4);
  walk.castShadow = false; markNoBounds(walk);
  // cafe seating: umbrella table + stools
  Cy(g, 0.4, 0.44, 0.06, MAT.white(), 35.4, 0.62, 52.4, 16);
  Cy(g, 0.035, 0.045, 0.68, MAT.chrome(), 35.4, 0, 52.4, 8);
  Cy(g, 0.03, 0.03, 1.6, MAT.chrome(), 35.4, 0.62, 52.4, 8);
  const um = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.42, 8), MAT.accent());
  um.position.set(35.4, 2.28, 52.4); um.castShadow = true; g.add(um);
  for(const a of [0.7, 2.5]) Cy(g, 0.16, 0.18, 0.5,
    std(0xdfd9cd, {roughness:0.9}), 35.4+Math.cos(a)*0.85, 0, 52.4+Math.sin(a)*0.85, 10);
  // market produce crates
  for(const [cx2, cz2, cc] of [[43.9, 52.15, 0x8fa06b], [44.9, 52.3, 0xd98e4a], [44.4, 52.9, 0x8fa06b]]){
    Bo(g, 0.8, 0.45, 0.6, std(0x9a8d79, {roughness:0.95}), cx2, 0, cz2);
    for(let k=0;k<4;k++) Sp(g, 0.11, std(cc, {roughness:0.8}),
      cx2-0.24+(k%2)*0.48, 0.5, cz2-0.12+Math.floor(k/2)*0.24);
  }
  // gym: rubber mat + barbell by the door
  Bo(g, 1.5, 0.035, 0.9, std(0x3a352d, {roughness:0.98}), 52.6, 0.02, 52.5);
  Cy(g, 0.026, 0.026, 1.3, MAT.chrome(), 52.6, -0.45, 52.5, 8, Math.PI/2);
  Sp(g, 0.16, MAT.inkFlat(), 52.0, 0.2, 52.5);
  Sp(g, 0.16, MAT.inkFlat(), 53.2, 0.2, 52.5);
  mkPlant(g, 41.4, 0, 52.5, 0.9);
  mkPlant(g, 49.6, 0, 52.5, 0.9);

  /* Third row, filling the block down at Third St — these front the street
     and the camera at once, so they take the plain storefront treatment. */
  shop(34, "BANK", std(0x2f2a23, {roughness:0.9}), 79);
  shop(42, "PHARMACY", MAT.accent(), 79);
  shop(50, "MOTORS", std(0xbdb8ae, {roughness:0.9}), 79);
  const walk3 = Bo(g, 25.5, 0.05, 2.0, std(0xe9e5db, {roughness:0.96}), 42, 0.02, 83.0);
  walk3.castShadow = false; markNoBounds(walk3);
  mkPlant(g, 38.1, 0, 83.0, 0.95);
  mkPlant(g, 46.1, 0, 83.0, 0.95);
  // motors forecourt: a marked-out row of stalls
  for(const sx of [47.4, 49.4, 51.4, 53.4])
    Bo(g, 0.12, 0.03, 2.4, std(0xf2efe8, {roughness:0.9}), sx, 0.02, 84.6);
  pin(40.45, 2.6, 51.1);
  pin(36.3, 3.4, 66.3);       // across the street — same log feeds both rows
  pin(42.3, 3.0, 81.6);       // and again down on Third St
}

Object.values(roomRecs).forEach(r=> r.rec = reg(r.group));

/* assign each plate (and its rooms) to its own light layer, then aim its sun */
for(let i=0;i<4;i++){
  levelG[i].traverse(o=> o.layers.enable(i+1));
  const s = LEVEL_SUNS[i];
  s.target.position.copy(OFF(i));
  s.position.copy(OFF(i)).addScaledVector(SUN_DIR, 62);
  s.target.updateMatrixWorld();
}

/* =====================================================================
   hit boxes + hover outlines
   ===================================================================== */
const hitboxes = [];
ROOMS.forEach((room, i)=>{
  let cx, cy, cz, w, h, d;
  const lvl = room.ext ? 0 : room.floor;
  if(room.ext){ ({cx, cy, cz, w, h, d} = room.ext); }
  else {
    const q = Q[room.q];
    cx = (q.x[0]+q.x[1])/2; w = q.x[1]-q.x[0];
    cz = (q.z[0]+q.z[1])/2; d = q.z[1]-q.z[0];
    cy = WH/2; h = WH;
  }
  const o = OFF(lvl);
  room._box = {cx:cx+o.x, cy:cy+o.y, cz:cz+o.z, w, h, d};   // world space
  const hb = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false}));
  hb.position.set(cx, cy, cz); hb.userData.idx = i;
  levelG[lvl].add(hb); hitboxes.push(hb);
  const ol = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w-0.3, h-0.2, d-0.3)),
    new THREE.LineBasicMaterial({color:0xff4a1c, transparent:true, opacity:0.95}));
  ol.position.copy(hb.position); ol.visible = false; levelG[lvl].add(ol);
  hb.userData.outline = ol;
});

/* =====================================================================
   overlay labels + pins
   ===================================================================== */
const labelsEl = document.getElementById("labels");
const pinsEl = document.getElementById("pins");
const labelAnchors = [];
ROOMS.forEach(room=>{
  const el = document.createElement("div");
  el.className = "rlabel"; el.textContent = (room.short || room.name);
  labelsEl.appendChild(el);
  const b = room._box;
  labelAnchors.push({el, room, v:new THREE.Vector3(b.cx, b.cy + b.h/2 + 1.0, b.cz + b.d/2 - 1.0)});
});
let pinDots = [];
function setPins(rec){
  pinsEl.innerHTML = ""; pinDots = [];
  if(rec) rec.pins.forEach((v,n)=>{
    const el = document.createElement("div");
    el.className = "pin3"; el.textContent = n+1;
    pinsEl.appendChild(el); pinDots.push({el, v});
  });
}
const _pv = new THREE.Vector3();
function projectOverlay(){
  const w = stage.clientWidth, h = stage.clientHeight;
  labelAnchors.forEach(a=>{
    _pv.copy(a.v).project(cam);
    a.el.style.left = ((_pv.x*0.5+0.5)*w)+"px";
    a.el.style.top  = ((-_pv.y*0.5+0.5)*h)+"px";
    // the bottom strip belongs to the hint and the title block; a label that
    // lands in it collides with that copy, so it steps aside
    const py = (-_pv.y*0.5+0.5)*h;
    a.el.style.display =
      (_pv.z > 1 || py > h - 72 || (!expandedTarget && !a.room.ext)) ? "none" : "";
  });
  if(bldgTag.style.display !== "none"){
    _pv.copy(bldgTagV).project(cam);
    bldgTag.style.left = ((_pv.x*0.5+0.5)*w)+"px";
    bldgTag.style.top  = ((-_pv.y*0.5+0.5)*h)+"px";
  }
  pinDots.forEach(p=>{
    _pv.copy(p.v).project(cam);
    p.el.style.left = ((_pv.x*0.5+0.5)*w)+"px";
    p.el.style.top  = ((-_pv.y*0.5+0.5)*h)+"px";
  });
}

/* =====================================================================
   isometric camera
   ===================================================================== */
const VIEW = new THREE.Vector3(0.80, 0.86, 1.0).normalize();
let active = -1, camBase = null, camTween = null;
const camTarget = new THREE.Vector3();

function aspect(){
  return (stage.clientWidth>0 && stage.clientHeight>0) ? stage.clientWidth/stage.clientHeight : 1.4;
}
const _right = new THREE.Vector3().crossVectors(VIEW, new THREE.Vector3(0,1,0)).normalize();
const _up = new THREE.Vector3().crossVectors(_right, VIEW).normalize();
/* exact fit: measure the box's extent along the view's screen axes */
function fitBox(box, pad=1.0, shift=null){
  const c = box.getCenter(new THREE.Vector3());
  if(shift) c.add(shift);
  let maxR = 0, maxU = 0;
  for(const x of [box.min.x, box.max.x])
  for(const y of [box.min.y, box.max.y])
  for(const z of [box.min.z, box.max.z]){
    const d = new THREE.Vector3(x,y,z).sub(c);
    maxR = Math.max(maxR, Math.abs(d.dot(_right)));
    maxU = Math.max(maxU, Math.abs(d.dot(_up)));
  }
  const fov = cam.fov*Math.PI/180, A = aspect();
  const dist = Math.max(maxU/Math.tan(fov/2), maxR/(Math.tan(fov/2)*A)) * pad + 3;
  return {pos:c.clone().addScaledVector(VIEW, dist), tgt:c};
}
function boxOf(cx, cy, cz, w, h, d){
  return new THREE.Box3(
    new THREE.Vector3(cx-w/2, cy-h/2, cz-d/2),
    new THREE.Vector3(cx+w/2, cy+h/2, cz+d/2));
}
/* per-level local bounds, cached once while levels sit at build positions */
let BOX_LOCAL = null;
function levelBoxes(){
  if(!BOX_LOCAL){
    BOX_LOCAL = levelG.map((L,i)=>{
      const b = new THREE.Box3(), one = new THREE.Box3();
      L.traverse(o=>{
        if(!o.isMesh || o.userData.noBounds) return;
        one.setFromObject(o); b.union(one);
      });
      return b.translate(OFF(i).clone().negate());
    });
  }
  return BOX_LOCAL;
}
/* The campus outgrew the frame: every district added widened the bounds and
   pushed the station further away, until the hero of the shot was a speck in
   the middle of a map. The overview is clamped to the station block and its
   ring road instead — the suburb, the shops, the park and the water are
   context and are meant to run off the edges. */
const HERO_BOX = new THREE.Box3(new THREE.Vector3(-56, -2, -52),
                                new THREE.Vector3(74, 40, 76));
function overviewFrame(){
  const u = new THREE.Box3();
  levelBoxes().forEach((b,i)=>
    u.union(b.clone().translate(expandedTarget ? OFF(i) : OFF_C(i))));
  u.intersect(HERO_BOX);
  // the open state needs headroom the closed one doesn't: the plates cascade
  // up and back, and their labels sit above the topmost plate
  return fitBox(u, expandedTarget ? 1.12 : 1.0);
}
function roomFrame(room){
  const b = room._box;
  // bias the target toward the back of the room, where the workstations sit
  return fitBox(boxOf(b.cx, b.cy + 0.9, b.cz - 1.2, b.w + 2.4, b.h + 3.0, b.d + 2.4), 1.1);
}
/* Camera moves travel along a lifted arc rather than a straight line, so a
   jump between two floors reads as a crane move instead of a dolly. */
const _b1 = new THREE.Vector3(), _b2 = new THREE.Vector3(), _b3 = new THREE.Vector3();
function bez(out, p0, pm, p1, k){
  const u = 1-k;
  out.copy(p0).multiplyScalar(u*u)
     .addScaledVector(pm, 2*u*k)
     .addScaledVector(p1, k*k);
  return out;
}
function goCam(f, dur=1150){
  if(REDUCED){ cam.position.copy(f.pos); camTarget.copy(f.tgt); cam.lookAt(camTarget); camBase = f; render(); return; }
  const p0 = cam.position.clone(), t0 = camTarget.clone();
  const span = p0.distanceTo(f.pos);
  const pm = p0.clone().lerp(f.pos, 0.5); pm.y += span*0.16;
  const tm = t0.clone().lerp(f.tgt, 0.5);  tm.y += span*0.06;
  camTween = {p0, t0, pm, tm, p1:f.pos, t1:f.tgt, start:performance.now(),
              dur: dur * (0.75 + Math.min(1, span/120)*0.6)};
  camBase = f;
}
function tickCam(now){
  if(!camTween) return;
  const e = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const p = Math.max(0, Math.min(1, (now-camTween.start)/camTween.dur));
  const k = e(p);
  cam.position.copy(bez(_b1, camTween.p0, camTween.pm, camTween.p1, k));
  camTarget.copy(bez(_b2, camTween.t0, camTween.tm, camTween.t1, k));
  cam.lookAt(camTarget);
  if(p>=1) camTween = null;
}
function setDims(activeId){
  Object.values(roomRecs).forEach(r=>{
    r.rec.target = (activeId && r.room.id !== activeId) ? 1 : 0;
    if(REDUCED){ r.rec.dim = r.rec.target; applyDim(r.rec); }
  });
  shellRec.target = activeId ? 0.6 : 0;
  if(REDUCED){ shellRec.dim = shellRec.target; applyDim(shellRec); render(); }
}
/* peel away the plates stacked above the room being inspected */
function setLevelVisibility(activeLvl){
  levelG.forEach((L,i)=> L.visible = (activeLvl == null) ? true : i <= activeLvl);
}

function activate(i, fromTour){
  const room = ROOMS[i];
  if(!room.ext && !expandedTarget){
    // interior rooms only exist once the building is open
    openBuilding();
    setExpanded(true, ()=> activate(i, fromTour));
    return;
  }
  active = i;
  if(!fromTour){ stopTour(); stopReel(); }
  revealGroup(room.group);
  document.getElementById("backBtn").textContent = "← Whole building";
  document.body.classList.add("zoomed");
  hitboxes.forEach(h=> h.userData.outline.visible = false);
  goCam(roomFrame(room));
  setLevelVisibility(roomRecs[room.id].lvl);
  setDims(room.id);
  if(room.id !== "homes") closeHomes();
  setPins(null);
  pinsEl.classList.remove("show");
  clearTimeout(activate._t);
  activate._t = setTimeout(()=>{
    setPins(roomRecs[room.id]);
    pinsEl.classList.add("show");
  }, REDUCED ? 60 : 640);
  document.getElementById("dEyebrow").textContent = `${room.group} · ${String(i+1).padStart(2,"0")} / ${ROOMS.length}`;
  document.getElementById("dTitle").textContent = room.name;
  document.getElementById("dPromise").textContent = room.promise;
  document.getElementById("dControl").textContent = room.control;
  const gearEl = document.getElementById("dGear");
  gearEl.innerHTML = "";
  room.gear.forEach((gr,n)=>{
    const row = document.createElement("div");
    row.className = "g-row";
    row.innerHTML = `<span class="pin">${n+1}</span><div><div class="t">${gr[0]}</div><div class="d">${gr[1]}</div></div>`;
    gearEl.appendChild(row);
  });
  document.querySelector("#side .scroll").scrollTop = 0;
  if(!fromTour){ try{ history.replaceState(null,"","#"+room.id); }catch(e){} }
}
function overview(){
  active = -1; stopTour();
  document.body.classList.remove("zoomed");
  pinsEl.classList.remove("show");
  setPins(null); setDims(null); setLevelVisibility(null);
  closeHomes();
  document.getElementById("backBtn").textContent = "▣ Close the building";
  goCam(overviewFrame());
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
}

/* ---------- pointer ---------- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let hovered = null, pointer = {x:0, y:0}, downAt = null;
canvas.addEventListener("pointermove", ev=>{
  const r = canvas.getBoundingClientRect();
  mouse.x = ((ev.clientX-r.left)/r.width)*2-1;
  mouse.y = -((ev.clientY-r.top)/r.height)*2+1;
  pointer.x = mouse.x; pointer.y = mouse.y;
  if(document.body.classList.contains("zoomed")){
    setHover(null);
    if(active >= 0 && ROOMS[active].id === "homes"){
      ray.setFromCamera(mouse, cam);
      const hh = ray.intersectObjects(homesState.parts.map(p=>p.g), true)[0];
      canvas.style.cursor = hh ? "pointer" : "grab";
    }
    return;
  }
  ray.setFromCamera(mouse, cam);
  if(!expandedTarget){
    // closed building: exterior sites hover normally, the building as a whole
    const hb = pickRoom();
    if(hb && ROOMS[hb.userData.idx].ext){ setHover(hb); bldgOutline.visible = false; return; }
    setHover(null);
    const onBldg = !!(hb || ray.intersectObject(bldgHit, false)[0]);
    bldgOutline.visible = onBldg;
    canvas.style.cursor = onBldg ? "pointer" : "grab";
    return;
  }
  setHover(pickRoom());
});
/* rooms are picked via their static hitboxes; cars and pedestrians move, so
   their whole groups are raycast recursively and resolved by walking up to
   the group that carries a room index */
function pickRoom(){
  // cars/pedestrians first: they're small and visible, while room hitboxes
  // are large invisible volumes that would otherwise swallow clicks on them
  let hit = ray.intersectObjects(pickExtras, true)[0];
  if(!hit) hit = ray.intersectObjects(hitboxes, false)[0];
  let o = hit && hit.object;
  while(o && o.userData.idx === undefined) o = o.parent;
  return o ? hitboxes[o.userData.idx] : null;
}
function setHover(hb){
  if(hovered === hb) return;
  if(hovered) hovered.userData.outline.visible = false;
  hovered = hb;
  if(hovered){ hovered.userData.outline.visible = true; canvas.style.cursor = "pointer"; }
  else canvas.style.cursor = dragging ? "grabbing" : "grab";
}
/* ---- grab to pan, wheel to zoom -------------------------------------
   The view direction is fixed on purpose — fitBox measures against its screen
   axes and every label projects through it — so dragging pans rather than
   orbits. The whole rig (eye, target and the base the ambient drift is
   measured from) shifts together, which keeps panning working both at the
   overview and inside a room, and leaves the next goCam free to re-frame. */
let dragging = false, lastDrag = null;
const _pr = new THREE.Vector3(), _pu = new THREE.Vector3(), _pd = new THREE.Vector3();
function panBy(dxPx, dyPx){
  if(!camBase) return;
  const dist = cam.position.distanceTo(camTarget);
  const perPx = (2 * Math.tan(cam.fov * Math.PI / 360) * dist) / Math.max(1, stage.clientHeight);
  cam.matrixWorld.extractBasis(_pr, _pu, _pd);
  // the model should follow the cursor, so the camera goes the other way
  const mv = _pr.multiplyScalar(-dxPx * perPx).add(_pu.multiplyScalar(dyPx * perPx));
  cam.position.add(mv); camTarget.add(mv);
  camBase.pos.add(mv); camBase.tgt.add(mv);
  cam.lookAt(camTarget);
}
canvas.addEventListener("pointerdown", ev=>{
  downAt = [ev.clientX, ev.clientY];
  if(ev.button !== 0) return;
  dragging = true; lastDrag = [ev.clientX, ev.clientY];
  canvas.setPointerCapture(ev.pointerId);
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", ev=>{
  if(!dragging) return;
  camTween = null;                       // a drag takes the wheel off any tween
  panBy(ev.clientX - lastDrag[0], ev.clientY - lastDrag[1]);
  lastDrag = [ev.clientX, ev.clientY];
}, true);
canvas.addEventListener("wheel", ev=>{
  ev.preventDefault();
  camTween = null;
  const dist = cam.position.distanceTo(camTarget);
  const next = Math.max(14, Math.min(420, dist * (1 + Math.sign(ev.deltaY) * 0.12)));
  cam.position.copy(camTarget).addScaledVector(VIEW, next);
  if(camBase){ camBase.pos.copy(cam.position); camBase.tgt.copy(camTarget); }
  cam.lookAt(camTarget);
}, {passive:false});
canvas.addEventListener("pointerup", ev=>{
  if(dragging){
    dragging = false;
    try{ canvas.releasePointerCapture(ev.pointerId); }catch(e){}
    canvas.style.cursor = hovered ? "pointer" : "grab";
  }
  if(!downAt) return;
  const moved = Math.hypot(ev.clientX-downAt[0], ev.clientY-downAt[1]);
  downAt = null;
  if(moved > 6) return;
  ray.setFromCamera(mouse, cam);
  // inside the homes zoom, clicking a house lifts (or closes) its own roof
  if(document.body.classList.contains("zoomed") && active >= 0 && ROOMS[active].id === "homes"){
    const hh = ray.intersectObjects(homesState.parts.map(p=>p.g), true)[0];
    if(hh){
      let o = hh.object;
      while(o && !homesState.parts.some(p=>p.g === o)) o = o.parent;
      const part = homesState.parts.find(p=>p.g === o);
      if(part){
        part.t = part.t ? 0 : 1;
        if(REDUCED){ part.k = part.t; applyHomes(); render(); }
        return;
      }
    }
  }
  const hb = pickRoom();
  if(!expandedTarget){
    if(hb && ROOMS[hb.userData.idx].ext){ activate(hb.userData.idx); return; }
    if(hb || ray.intersectObject(bldgHit, false)[0]) openBuilding();
    return;
  }
  if(hb) activate(hb.userData.idx);
});

/* ---------- sidebar ---------- */
const groupsEl = document.getElementById("groups");
/* Groups collapse. 22 departments in one flat list is a wall of text; folded
   up, the six groups are the map and you open the one you want. The first is
   open on load so the rail never reads as empty. */
const groupPanels = [];
GROUPS.forEach((gname, gi)=>{
  const wrap = document.createElement("div");
  wrap.className = "group";
  const h = document.createElement("button");
  h.className = "ghead"; h.type = "button";
  const n = ROOMS.filter(r => r.group === gname).length;
  h.innerHTML = `<span class="gname">${gname}</span><span class="grule"></span>` +
                `<span class="gcount">${n}</span><span class="gchev">›</span>`;
  const body = document.createElement("div");
  body.className = "gbody";
  ROOMS.forEach((room,i)=>{
    if(room.group !== gname) return;
    const b = document.createElement("button");
    b.className = "item";
    b.innerHTML = `<span class="num">${String(i+1).padStart(2,"0")}</span><span class="name">${room.name}</span><span class="auto">auto</span><span class="arrow">→</span>`;
    b.addEventListener("click", ()=>activate(i));
    b.addEventListener("mouseenter", ()=>{ if(active<0) setHover(hitboxes[i]); });
    b.addEventListener("mouseleave", ()=>{ if(active<0) setHover(null); });
    body.appendChild(b);
  });
  const setOpen = open => {
    wrap.classList.toggle("open", open);
    h.setAttribute("aria-expanded", open ? "true" : "false");
    // an explicit height is what lets the fold animate; auto would not
    body.style.maxHeight = open ? body.scrollHeight + "px" : "0px";
  };
  h.setAttribute("aria-controls", "grp-" + gi);
  body.id = "grp-" + gi;
  h.addEventListener("click", ()=> setOpen(!wrap.classList.contains("open")));
  wrap.appendChild(h); wrap.appendChild(body);
  groupsEl.appendChild(wrap);
  groupPanels.push({gname, wrap, setOpen});
  setOpen(gi === 0);
});
/* zooming a room from anywhere — a pin, a car, the flyover — opens the group
   it belongs to, so the rail always agrees with what's on screen */
function revealGroup(gname){
  groupPanels.forEach(p => p.setOpen(p.gname === gname));
}
document.getElementById("backBtn").addEventListener("click", ()=>{
  if(document.body.classList.contains("zoomed")) overview(); else collapse();
});
document.getElementById("backLink").addEventListener("click", overview);
document.getElementById("prevBtn").addEventListener("click", ()=>activate((active-1+ROOMS.length)%ROOMS.length));
document.getElementById("nextBtn").addEventListener("click", ()=>activate((active+1)%ROOMS.length));
document.addEventListener("keydown", e=>{
  if(e.key === "Escape"){
    if(document.body.classList.contains("zoomed")) overview();
    else if(expandedTarget) collapse();
  }
  if(document.body.classList.contains("zoomed")){
    if(e.key === "ArrowRight") activate((active+1)%ROOMS.length);
    if(e.key === "ArrowLeft") activate((active-1+ROOMS.length)%ROOMS.length);
  }
});

/* ---------- tour ---------- */
let tourTimer = null;
const tourBtn = document.getElementById("tourBtn");
function stopTour(){
  if(tourTimer){ clearInterval(tourTimer); tourTimer = null;
    tourBtn.classList.remove("on"); tourBtn.textContent = "▶ Play tour"; }
}
tourBtn.addEventListener("click", ()=>{
  if(tourTimer){ stopTour(); return; }
  tourBtn.classList.add("on"); tourBtn.textContent = "■ Stop tour";
  let idx = active >= 0 ? active : -1;
  const step = ()=>{ idx = (idx+1)%ROOMS.length; activate(idx, true); };
  step();
  tourTimer = setInterval(step, 5600);
});

/* =====================================================================
   collapsed <-> exploded building
   The model loads as a closed four-story building; clicking it lifts the
   plates apart into the exploded view, and only then are rooms pickable.
   ===================================================================== */
const OFF_C = i => new THREE.Vector3(0, i*4.38, 0);
let expandedTarget = false, expandK = 0, expandCb = null;

const roofCap = Bo(levelG[3], (PX1-PX0)+1.0, 0.5, (PZ1-PZ0)+1.0, MAT.slab(),
  (PX0+PX1)/2, WH, (PZ0+PZ1)/2);
roofCap.castShadow = false;
roofCap.layers.enable(4);
Cy(roofCap, 0.5, 0.5, 0.4, MAT.gray(), -10, 0.5, -6, 18).layers.enable(4);

/* Call letters on the roof. They ride the cap, so they are part of the closed
   building and step aside the moment it opens — the same rule the cap follows.
   Two faces, because the camera sees the +x and +z sides of everything. */
{
  // light on dark: a white sign on a white building is invisible at this size
  const callTex = tex(520, 190, (x, w, h)=>{
    x.fillStyle = "#fdfbf6"; x.font = "800 134px "+F;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("WBCC", w/2, h*0.42);
    x.fillStyle = "#ff4a1c";
    rr(x, w/2 - 122, h*0.74, 244, 11, 5); x.fill();
    x.fillStyle = "#c8c1b4"; x.font = "700 31px "+F;
    x.fillText("1 0 4 . 5   F M", w/2, h*0.93);
  });
  const sign = new THREE.Group();
  sign.position.set(2.0, 0.5, 1.6);          // set back from the roof's front edge
  // turned to look down over the neighbourhood and the shops, which sit south
  // and south-east — near enough to square-on for the camera to read it too
  sign.rotation.y = Math.atan2(0.42, 1.0);
  roofCap.add(sign);
  for(const px of [-6.6, 6.6]){
    Cy(sign, 0.15, 0.19, 7.0, MAT.chrome(), px, 0, 0, 12).layers.enable(4);
    Cy(sign, 0.11, 0.11, 4.2, MAT.chrome(), px, 0, -1.9, 10).layers.enable(4);
  }
  // the panel and its canvas share an aspect ratio (2.74:1); when they didn't,
  // the letters came out stretched flat
  Bo(sign, 14.6, 5.5, 0.3, std(0x26211a, {roughness:0.5, envMapIntensity:0.8}),
    0, 1.6, 0).layers.enable(4);
  Bo(sign, 15.0, 0.24, 0.5, MAT.white(), 0, 7.1, 0).layers.enable(4);
  Bo(sign, 15.0, 0.22, 0.5, MAT.white(), 0, 1.4, 0).layers.enable(4);
  Pl(sign, 13.7, 5.0, signMat(callTex), 0, 4.35, 0.17).layers.enable(4);
  markNoBounds(sign);
  sign.traverse(o=>{ if(o.isMesh) o.castShadow = false; });
}

const bldgHit = new THREE.Mesh(
  new THREE.BoxGeometry((PX1-PX0)+1.4, 4*4.38 + 1.4, (PZ1-PZ0)+1.4),
  new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false}));
bldgHit.position.set(0, (4*4.38)/2, 0); scene.add(bldgHit);
const bldgOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(bldgHit.geometry),
  new THREE.LineBasicMaterial({color:0xff4a1c, transparent:true, opacity:0.95}));
bldgOutline.position.copy(bldgHit.position); bldgOutline.visible = false; scene.add(bldgOutline);

const bldgTag = document.createElement("div");
bldgTag.className = "rlabel";
bldgTag.style.fontSize = "11px"; bldgTag.style.padding = "5px 12px";
bldgTag.textContent = "THE STATION · CLICK TO OPEN";
labelsEl.appendChild(bldgTag);
const bldgTagV = new THREE.Vector3(0, 4*4.38 + 9.6, 2);   // clears the roof sign

function setHint(msg){
  const h = document.getElementById("hint");
  h.innerHTML = '<span class="dot"></span>' + msg;
}
function applyExpand(){
  const e = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  levelG.forEach((L,i)=>{
    const d = i*0.1;
    const kk = Math.max(0, Math.min(1, (expandK - d)/0.7));
    L.position.lerpVectors(OFF_C(i), OFF(i), e(kk));
  });
  roofCap.visible = expandK < 0.1;
  const col = expandK < 0.4;
  bldgHit.visible = col;
  if(!col) bldgOutline.visible = false;
  bldgTag.style.display = col ? "" : "none";
}
function setExpanded(t, cb){
  expandedTarget = t; expandCb = cb || null;
  document.body.classList.toggle("expanded", t);
  goCam(overviewFrame());
  if(REDUCED){
    expandK = t ? 1 : 0; applyExpand(); render();
    const c = expandCb; expandCb = null; if(c) c();
  }
}
function tickExpand(dt){
  const goal = expandedTarget ? 1 : 0;
  if(expandK === goal) return;
  expandK += Math.sign(goal - expandK) * dt / 1.25;
  expandK = Math.max(0, Math.min(1, expandK));
  applyExpand();
  if(expandK === goal && expandCb){ const c = expandCb; expandCb = null; c(); }
}
function openBuilding(){
  if(expandedTarget) return;
  setExpanded(true);
  setHint("Select a department — or click any room");
  document.getElementById("backBtn").textContent = "▣ Close the building";
}
function collapse(){
  active = -1; stopTour(); stopReel();
  document.body.classList.remove("zoomed");
  pinsEl.classList.remove("show");
  setPins(null); setDims(null); setLevelVisibility(null);
  closeHomes();
  setExpanded(false);
  setHint("Click the building to open it — the grounds are live too");
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
}

/* =====================================================================
   flyover reel — a scripted crane through the building
   ===================================================================== */
const REEL = ["onair","gaming","production","podcast","music","promotions","design","photo",
              "transmitter","van","drive","homes","ooh"];
let reelTimer = null, reelIdx = -1;
const reelBtn = document.getElementById("reelBtn");
function stopReel(){
  if(reelTimer){ clearTimeout(reelTimer); reelTimer = null; }
  reelIdx = -1;
  if(reelBtn){ reelBtn.classList.remove("on"); reelBtn.textContent = "◉ Flyover"; }
}
function startReel(){
  stopTour();
  if(reelBtn){ reelBtn.classList.add("on"); reelBtn.textContent = "■ Stop flyover"; }
  reelIdx = -1;
  const step = ()=>{
    reelIdx++;
    if(reelIdx >= REEL.length){
      overview();
      reelTimer = setTimeout(()=>{ if(reelTimer) startReel(); }, 4200);
      if(reelBtn){ reelBtn.classList.add("on"); reelBtn.textContent = "■ Stop flyover"; }
      return;
    }
    const i = ROOMS.findIndex(r=>r.id === REEL[reelIdx]);
    if(i >= 0) activate(i, true);
    reelTimer = setTimeout(step, 3400);
  };
  step();
}
if(reelBtn) reelBtn.addEventListener("click", ()=>{
  if(reelTimer) { stopReel(); overview(); } else startReel();
});

/* ---------- loop ---------- */
function resize(){
  const w = stage.clientWidth, h = stage.clientHeight;
  if(w < 2 || h < 2) return;          // container not laid out yet (iframes)
  document.body.classList.toggle("compact", w < 900);
  renderer.setSize(w, h, false);
  cam.aspect = aspect(); cam.updateProjectionMatrix();
  const f = (active >= 0) ? roomFrame(ROOMS[active]) : overviewFrame();
  if(!camTween){ cam.position.copy(f.pos); camTarget.copy(f.tgt); cam.lookAt(camTarget); camBase = f; }
}
window.addEventListener("resize", resize);
/* an iframe never fires window resize when its container settles, so watch
   the stage box directly */
if(window.ResizeObserver) new ResizeObserver(()=> resize()).observe(stage);

let last = performance.now();
function tick(now){
  const t = now/1000, dt = Math.min(0.05, (now-last)/1000); last = now;
  tickExpand(dt);
  tickClouds(dt);
  tickSea(dt);
  tickSky(dt);
  if(homesState.parts.some(p=> p.k !== p.t)){
    homesState.parts.forEach(p=>{
      if(p.k !== p.t) p.k += Math.sign(p.t - p.k) * Math.min(dt*2.4, Math.abs(p.t - p.k));
    });
    applyHomes();
  }
  tickCam(now);
  if(!camTween && active < 0 && camBase && !REDUCED){
    // slow ambient orbit + pointer parallax while the whole model is shown
    const a = Math.sin(t*0.075)*0.05;
    const dx = camBase.pos.x - camTarget.x, dz = camBase.pos.z - camTarget.z;
    cam.position.x = camTarget.x + dx*Math.cos(a) - dz*Math.sin(a) - pointer.x*2.0;
    cam.position.z = camTarget.z + dx*Math.sin(a) + dz*Math.cos(a);
    cam.position.y = camBase.pos.y + pointer.y*1.2 + Math.sin(t*0.11)*0.7;
    cam.lookAt(camTarget);
  }
  dimmables.forEach(rec=>{
    if(Math.abs(rec.dim-rec.target) < 0.001) return;
    rec.dim += (rec.target-rec.dim)*Math.min(1, dt*5);
    applyDim(rec);
  });
  anims.forEach(a=>a(t, dt));
  projectOverlay();
  render();
  requestAnimationFrame(tick);
}
function render(){ renderer.render(scene, cam); }

levelBoxes();                 // cache bounds while levels sit at build offsets
applyExpand();                // then fold the building shut for the opening shot
setHint("Click the building to open it — the grounds are live too");
resize();
{
  const f = overviewFrame();
  cam.position.copy(f.pos); camTarget.copy(f.tgt); cam.lookAt(camTarget); camBase = f;
}
render();
requestAnimationFrame(tick);

if(/(\?|&)open=1\b/.test(location.search)) openBuilding();
const hash = location.hash.replace("#","");
if(hash){
  const i = ROOMS.findIndex(r=>r.id === hash);
  if(i >= 0) setTimeout(()=>activate(i), REDUCED ? 50 : 700);
}
