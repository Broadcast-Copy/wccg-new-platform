(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,62131,e=>{"use strict";var t=e.i(30348);e.s(["CheckCircle2",()=>t.default])},41541,e=>{"use strict";var t=e.i(32535);e.s(["AlertTriangle",()=>t.default])},55645,e=>{"use strict";var t=e.i(93033);let r={active:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",completed:"bg-blue-500/10 text-blue-400 border-blue-500/20",pending:"bg-yellow-500/10 text-yellow-400 border-yellow-500/20",draft:"bg-foreground/[0.06] text-muted-foreground border-border",cancelled:"bg-red-500/10 text-red-400 border-red-500/20",overdue:"bg-red-500/10 text-red-400 border-red-500/20",scheduled:"bg-blue-500/10 text-blue-400 border-blue-500/20",aired:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20","make-good":"bg-orange-500/10 text-orange-400 border-orange-500/20",proposal:"bg-purple-500/10 text-purple-400 border-purple-500/20",negotiation:"bg-yellow-500/10 text-yellow-400 border-yellow-500/20",closed:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",lost:"bg-red-500/10 text-red-400 border-red-500/20",operational:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",warning:"bg-yellow-500/10 text-yellow-400 border-yellow-500/20",critical:"bg-red-500/10 text-red-400 border-red-500/20",maintenance:"bg-orange-500/10 text-orange-400 border-orange-500/20",sent:"bg-yellow-500/10 text-yellow-400 border-yellow-500/20",paid:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",compliant:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20","non-compliant":"bg-red-500/10 text-red-400 border-red-500/20","on-track":"bg-emerald-500/10 text-emerald-400 border-emerald-500/20","at-risk":"bg-yellow-500/10 text-yellow-400 border-yellow-500/20",behind:"bg-red-500/10 text-red-400 border-red-500/20",open:"bg-blue-500/10 text-blue-400 border-blue-500/20",resolved:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20","in-progress":"bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20",new:"bg-purple-500/10 text-purple-400 border-purple-500/20"};function i({status:e,className:i=""}){let o=r[e.toLowerCase()]||"bg-foreground/[0.06] text-muted-foreground border-border";return(0,t.jsx)("span",{className:`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${o} ${i}`,children:e})}e.s(["StatusBadge",()=>i])},94938,e=>{"use strict";var t=e.i(93033),r=e.i(23049);function i({open:e,onClose:i,title:o,subtitle:n,children:a,maxWidth:s="max-w-lg",actions:l}){return e?(0,t.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",onClick:i,children:(0,t.jsxs)("div",{className:`mx-4 w-full ${s} rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col`,onClick:e=>e.stopPropagation(),children:[(0,t.jsxs)("div",{className:"flex items-start justify-between p-6 pb-4 border-b border-border shrink-0",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h3",{className:"text-lg font-bold text-foreground",children:o}),n&&(0,t.jsx)("p",{className:"text-sm text-muted-foreground mt-0.5",children:n})]}),(0,t.jsx)("button",{type:"button",onClick:i,className:"h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0",children:(0,t.jsx)(r.X,{className:"h-4 w-4"})})]}),(0,t.jsx)("div",{className:"p-6 overflow-y-auto flex-1",children:a}),l&&(0,t.jsx)("div",{className:"flex items-center justify-end gap-2 p-6 pt-4 border-t border-border shrink-0",children:l})]})}):null}e.s(["DetailModal",()=>i])},6118,e=>{"use strict";var t=e.i(93033),r=e.i(12065),i=e.i(48557),o=e.i(61790),n=e.i(17697);function a({columns:e,data:a,keyField:s,searchable:l=!1,searchPlaceholder:c="Search...",searchFilter:d,onRowClick:u,emptyIcon:m,emptyTitle:g="No data",emptyDescription:p="Nothing to display yet."}){let[f,h]=(0,r.useState)(""),[b,x]=(0,r.useState)(null),[y,v]=(0,r.useState)("asc"),w=a;if(l&&f&&d){let e=f.toLowerCase();w=a.filter(t=>d(t,e))}if(b){let t=e.find(e=>e.key===b);if(t?.sortKey){let e=t.sortKey;w=[...w].sort((t,r)=>{let i=e(t),o=e(r);return i<o?"asc"===y?-1:1:i>o?"asc"===y?1:-1:0})}}return(0,t.jsxs)("div",{className:"space-y-3",children:[l&&(0,t.jsxs)("div",{className:"relative max-w-sm",children:[(0,t.jsx)(n.Search,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"}),(0,t.jsx)("input",{type:"text",placeholder:c,value:f,onChange:e=>h(e.target.value),className:"w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"})]}),(0,t.jsx)("div",{className:"rounded-xl border border-border bg-card overflow-hidden",children:(0,t.jsxs)("table",{className:"w-full text-sm",children:[(0,t.jsx)("thead",{children:(0,t.jsx)("tr",{className:"border-b border-border text-xs text-muted-foreground",children:e.map(e=>(0,t.jsx)("th",{className:`font-medium px-4 py-3 ${"right"===e.align?"text-right":"center"===e.align?"text-center":"text-left"} ${e.hideOnMobile?"hidden sm:table-cell":""} ${e.sortable?"cursor-pointer select-none hover:text-foreground transition-colors":""}`,onClick:e.sortable?()=>{var t;b===(t=e.key)?v("asc"===y?"desc":"asc"):(x(t),v("asc"))}:void 0,children:(0,t.jsxs)("span",{className:"inline-flex items-center gap-1",children:[e.label,e.sortable&&b===e.key&&("asc"===y?(0,t.jsx)(o.ChevronUp,{className:"h-3 w-3"}):(0,t.jsx)(i.ChevronDown,{className:"h-3 w-3"}))]})},e.key))})}),(0,t.jsx)("tbody",{children:0===w.length?(0,t.jsx)("tr",{children:(0,t.jsxs)("td",{colSpan:e.length,className:"px-4 py-12 text-center text-muted-foreground",children:[m&&(0,t.jsx)("div",{className:"flex justify-center mb-2",children:m}),(0,t.jsx)("p",{className:"text-sm font-medium",children:g}),(0,t.jsx)("p",{className:"text-xs mt-1",children:p})]})}):w.map(r=>(0,t.jsx)("tr",{className:`border-b border-border last:border-0 hover:bg-foreground/[0.02] ${u?"cursor-pointer":""}`,onClick:u?()=>u(r):void 0,children:e.map(e=>(0,t.jsx)("td",{className:`px-4 py-3 ${"right"===e.align?"text-right":"center"===e.align?"text-center":""} ${e.hideOnMobile?"hidden sm:table-cell":""}`,children:e.render(r)},e.key))},String(r[s])))})]})})]})}e.s(["DataTable",()=>a])},34448,75126,e=>{"use strict";var t=e.i(93033);function r({icon:e,iconColor:r="text-[#74ddc7]",iconBg:i="bg-[#74ddc7]/10 border-[#74ddc7]/20",title:o,description:n,badge:a,badgeColor:s="bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20",children:l}){return(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",children:[(0,t.jsxs)("div",{className:"flex items-center gap-4",children:[(0,t.jsx)("div",{className:`flex h-12 w-12 items-center justify-center rounded-2xl border ${i}`,children:(0,t.jsx)(e,{className:`h-6 w-6 ${r}`})}),(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)("h1",{className:"text-2xl font-bold text-foreground",children:o}),a&&(0,t.jsx)("span",{className:`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s}`,children:a})]}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground mt-0.5",children:n})]})]}),l&&(0,t.jsx)("div",{className:"flex items-center gap-2",children:l})]})}function i(e,t){try{let r=localStorage.getItem(e);if(r)return JSON.parse(r);return localStorage.setItem(e,JSON.stringify(t)),t}catch{return t}}function o(e,t){try{let r=localStorage.getItem(e);if(r)return JSON.parse(r);return localStorage.setItem(e,JSON.stringify(t)),t}catch{return t}}function n(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function a(e=""){return`${e}${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}function s(e){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(e)}function l(e){return new Date(e).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}function c(e){return new Date(e).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}function d(e){let t=Math.floor((Date.now()-new Date(e).getTime())/6e4);if(t<1)return"just now";if(t<60)return`${t}m ago`;let r=Math.floor(t/60);if(r<24)return`${r}h ago`;let i=Math.floor(r/24);return`${i}d ago`}e.s(["PageHeader",()=>r],34448),e.s(["formatCurrency",()=>s,"formatDate",()=>l,"formatDateTime",()=>c,"genId",()=>a,"loadOrSeed",()=>i,"loadSingle",()=>o,"persist",()=>n,"relativeTime",()=>d],75126)},93251,e=>{"use strict";var t=e.i(93033);function r({label:e,value:r,icon:i,color:o="text-[#74ddc7]",bg:n="bg-[#74ddc7]/10",trend:a,trendUp:s,onClick:l}){return(0,t.jsxs)(l?"button":"div",{type:l?"button":void 0,onClick:l,className:`text-left rounded-xl border border-border bg-card p-5 transition-all ${l?"cursor-pointer hover:border-input hover:shadow-lg hover:shadow-black/10":""}`,children:[(0,t.jsxs)("div",{className:"flex items-center justify-between mb-3",children:[(0,t.jsx)("span",{className:"text-xs text-muted-foreground uppercase tracking-wider font-medium",children:e}),(0,t.jsx)("div",{className:`flex h-8 w-8 items-center justify-center rounded-lg ${n}`,children:(0,t.jsx)(i,{className:`h-4 w-4 ${o}`})})]}),(0,t.jsx)("p",{className:"text-2xl font-bold text-foreground",children:r}),a&&(0,t.jsx)("p",{className:`text-xs mt-1 ${s?"text-emerald-400":"text-red-400"}`,children:a})]})}e.s(["StatCard",()=>r])},2221,e=>{"use strict";let t=(0,e.i(48581).default)("chevron-up",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);e.s(["default",()=>t])},61790,e=>{"use strict";var t=e.i(2221);e.s(["ChevronUp",()=>t.default])},8535,e=>{"use strict";var t=e.i(93033);function r({tabs:e,active:r,onChange:i}){return(0,t.jsx)("div",{className:"flex items-center gap-1 border-b border-border overflow-x-auto",children:e.map(e=>(0,t.jsxs)("button",{type:"button",onClick:()=>i(e.key),className:`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${r===e.key?"border-[#74ddc7] text-[#74ddc7]":"border-transparent text-muted-foreground hover:text-foreground"}`,children:[e.icon,e.label,void 0!==e.count&&(0,t.jsx)("span",{className:"text-[10px] bg-muted rounded-full px-2 py-0.5 font-bold",children:e.count})]},e.key))})}e.s(["TabsNav",()=>r])},66857,e=>{"use strict";let t=(0,e.i(48581).default)("tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);e.s(["Tag",()=>t],66857)},48189,e=>{"use strict";let t=(0,e.i(48581).default)("book-open",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);e.s(["BookOpen",()=>t],48189)},55564,e=>{"use strict";var t=e.i(93033),r=e.i(12065),i=e.i(48189),o=e.i(15028),n=e.i(24979),a=e.i(6114),s=e.i(41541),l=e.i(77403),c=e.i(2608),d=e.i(66857),u=e.i(62131),m=e.i(34448),g=e.i(93251),p=e.i(55645),f=e.i(6118),h=e.i(94938),b=e.i(8535),x=e.i(75126);let y=[{id:"sop1",title:"Station Sign-On / Sign-Off Procedures",category:"On-Air",version:"3.1",lastReviewed:"2026-02-15",reviewer:"Keisha Williams",status:"Current",sections:["Pre-Sign-On Checklist","Legal ID Requirements","EAS Check","Transmitter Verification","Sign-Off Sequence"],content:`WCCG 104.5 FM — Station Sign-On / Sign-Off Procedures

1. PRE-SIGN-ON CHECKLIST
- Verify transmitter is operational (check remote control readings)
- Confirm audio processing chain is active (Orban 8700i green indicators)
- Verify EAS unit is online and receiving alerts (DASDEC-II status page)
- Check automation system (Zetta) — verify scheduled playlist is loaded
- Confirm STL link is active (primary microwave or T1 backup)
- Test studio monitors and headphone feeds

2. LEGAL ID REQUIREMENTS
- FCC requires station identification at the top of each hour
- Format: "WCCG Fayetteville" (call letters + city of license)
- Must air as close to the top of the hour as possible
- Automated in Zetta — verify clock includes legal ID

3. EAS CHECK
- Verify DASDEC-II unit shows "READY" status
- Confirm CAP server connection is active
- Check that weekly test (RWT) schedule is programmed
- Review any pending alerts

4. TRANSMITTER VERIFICATION
- Power output: 25 kW (within 5% tolerance = 23.75–26.25 kW)
- Frequency: 104.5 MHz (within FCC tolerance)
- VSWR: Below 1.5:1
- PA temperature: Below 165\xb0F
- If any readings are out of spec, contact Chief Engineer immediately

5. SIGN-OFF SEQUENCE
- Air final legal ID
- Run sign-off announcement (pre-recorded)
- Reduce transmitter to low power if applicable
- Secure studios and log sign-off time`},{id:"sop2",title:"Emergency Broadcast Procedures (EAS)",category:"Emergency",version:"4.0",lastReviewed:"2026-03-01",reviewer:"James Carter",status:"Current",sections:["Alert Categories","Auto-Forward Alerts","Manual Alert Procedures","Post-Alert Logging","Equipment Failure Protocol"],content:`WCCG 104.5 FM — Emergency Alert System (EAS) Procedures

1. ALERT CATEGORIES
- REQUIRED FORWARDING: EAN (Emergency Action Notification), NPT (National Periodic Test)
- STATE/LOCAL REQUIRED: TOR (Tornado Warning), SVR (Severe Thunderstorm Warning), FFW (Flash Flood Warning), AMB (AMBER Alert)
- VOLUNTARY: All other weather alerts per station discretion

2. AUTO-FORWARD ALERTS
The DASDEC-II is configured to automatically forward:
- All EAN alerts (interrupt programming immediately)
- TOR, SVR, FFW for Cumberland, Hoke, Robeson, Sampson, Harnett, Bladen counties
- AMBER Alerts for State of North Carolina
- All NPT (National Periodic Tests)

3. MANUAL ALERT PROCEDURES
If auto-forward fails:
- Access DASDEC-II web interface at 192.168.1.50
- Navigate to "Send Alert" tab
- Select appropriate alert type and originator
- Verify county codes and duration
- Click "Send" — alert will interrupt programming
- If DASDEC is unresponsive, use backup encoder (rack position 3B)

4. POST-ALERT LOGGING
- All alerts are auto-logged by DASDEC
- Verify log entry within 1 hour of alert
- For live alerts: note time, duration, operator on duty
- Retain logs for minimum 2 years per FCC rules

5. EQUIPMENT FAILURE PROTOCOL
- If DASDEC-II fails: switch to backup encoder, contact Chief Engineer
- If all EAS equipment fails: manually read alert text on-air
- Document all equipment failures and report to Chief Engineer within 1 hour`},{id:"sop3",title:"Transmitter Site Procedures",category:"Technical",version:"2.5",lastReviewed:"2026-01-20",reviewer:"James Carter",status:"Current",sections:["Site Access","Safety Protocols","Routine Inspections","Emergency Switchover","RF Safety"],content:`WCCG 104.5 FM — Transmitter Site Procedures (Bunce Rd Tower)

1. SITE ACCESS
- Gate code: Contact Chief Engineer for current code
- Sign in/out log required for all visits
- Two-person rule for tower climbing
- Notify Operations Manager before and after site visits

2. SAFETY PROTOCOLS
- RF exposure: Do not approach antenna elements when transmitter is at full power
- Tower climbing requires certified climber with fall protection
- Generator room: hearing protection required when running
- Fire extinguisher locations: entrance, generator room, transmitter room

3. ROUTINE INSPECTIONS (Monthly)
- Check transmitter readings (power, VSWR, PA temp, reflected power)
- Inspect antenna and transmission line connections
- Test generator start and run for 30 minutes under load
- Check fuel level — maintain above 75%
- Inspect tower lights — verify operation and report outages within 15 minutes
- Check building HVAC — clean filters if needed
- Verify security cameras and alarm system

4. EMERGENCY SWITCHOVER
- If main transmitter fails: switch to backup Nautel VS2.5
- Switchover procedure: Transfer switch on Panel A, position 2
- Notify FCC if operating at reduced power for more than 10 days

5. RF SAFETY
- Maximum permissible exposure limits posted at site entrance
- RF monitor badge required for all personnel
- Reduce power before approaching antenna — coordinate with on-air staff`},{id:"sop4",title:"Remote Broadcast Setup & Operations",category:"On-Air",version:"2.0",lastReviewed:"2025-12-10",reviewer:"Devon Robinson",status:"Review Due",sections:["Equipment Checklist","Site Survey","Audio Setup","Troubleshooting","Teardown"],content:`WCCG 104.5 FM — Remote Broadcast Procedures

1. EQUIPMENT CHECKLIST
- Comrex ACCESS NX Portable (IP codec)
- LTE modem + backup hotspot
- 2x Electro-Voice RE20 microphones + stands
- Mackie 802 field mixer
- Headphones (2 pair)
- XLR cables (4x 25ft, 2x 50ft)
- Power strip + 100ft extension cord
- WCCG banner and signage
- Business cards and giveaway items

2. SITE SURVEY (Day Before)
- Verify power availability at venue
- Test cell signal strength (need 3+ bars LTE)
- Identify broadcast position with good crowd visibility
- Confirm load-in/load-out access and timing
- Get venue contact information

3. AUDIO SETUP
- Connect mics to Mackie mixer channels 1-2
- Connect mixer main out to Comrex input
- Connect Comrex to studio via LTE (primary) or venue WiFi (backup)
- Test audio levels with studio — aim for -18 dBFS average
- Set up mix-minus from studio to Comrex for IFB
- Test talkback to studio

4. TROUBLESHOOTING
- No connection: Try backup hotspot, check Comrex IP settings
- Audio feedback: Verify mix-minus is configured on studio console
- Poor audio quality: Reduce Comrex bitrate, check LTE signal
- If all else fails: Call studio, they can play pre-recorded segments

5. TEARDOWN
- Disconnect all cables and wrap properly
- Pack equipment in cases — do not stack heavy items on mics
- Return all equipment to Room 104 storage
- Submit equipment condition report to Operations Manager`},{id:"sop5",title:"Network & IT Security Procedures",category:"Technical",version:"1.8",lastReviewed:"2026-02-01",reviewer:"Devon Robinson",status:"Current",sections:["Password Policy","Network Access","Backup Procedures","Incident Response","Vendor Access"],content:`WCCG 104.5 FM — IT Security Procedures

1. PASSWORD POLICY
- Minimum 12 characters, mixed case, numbers, symbols
- Change every 90 days
- No password sharing — each user has individual credentials
- Admin passwords stored in secure password manager (Bitwarden)

2. NETWORK ACCESS
- Studio network (VLAN 10): On-air systems only — no internet browsing
- Office network (VLAN 20): Email, web, business applications
- Guest network (VLAN 30): Visitors and personal devices
- Transmitter site connected via VPN tunnel

3. BACKUP PROCEDURES
- Automation server: Daily full backup + 4-hour incrementals
- Traffic/billing: Daily backup to cloud (Backblaze B2)
- Email: Daily backup to cloud
- Test restore from backup quarterly

4. INCIDENT RESPONSE
- Suspected breach: Disconnect affected system from network immediately
- Contact Operations Manager and Chief Engineer
- Document incident — time, systems affected, actions taken
- If listener data compromised: notify GM within 1 hour

5. VENDOR ACCESS
- All remote vendor access via VPN only
- Temporary credentials for vendor sessions — revoke after completion
- Vendor activity logged and reviewed weekly`},{id:"sop6",title:"Studio Equipment Operation Guide",category:"On-Air",version:"3.2",lastReviewed:"2026-02-20",reviewer:"Chris Morgan",status:"Current",sections:["Console Operation","Microphone Setup","Phone System","Recording","Troubleshooting"],content:`WCCG 104.5 FM — Studio Equipment Operation Guide

1. CONSOLE OPERATION (Wheatstone LX-24)
- Power on: Main power switch on rear panel, then surface power button
- Source assignment: Touch screen > Source > assign to fader
- Monitor select: Press MON button, select source from touch screen
- Talkback: Hold TB button, speak into talkback mic
- Meter bridge: Shows all active channel levels

2. MICROPHONE SETUP
- Studio A mics: EV RE20 — position 2-3 inches from mouth
- Phantom power NOT required for RE20 (dynamic mic)
- Mic processing: Wheatstone built-in — do not adjust without PD approval
- Pop filter recommended for close-mic technique

3. PHONE SYSTEM (Telos VX)
- Incoming calls appear on Telos screen
- Press LINE button to answer, HOLD to park
- Route to air: assign Telos output to console fader
- Caller screening: use delay dump button if needed (7-second delay active)

4. RECORDING
- Zetta: Press REC button on screen, select save location
- Adobe Audition: Available in Studio B for production work
- File format: WAV 44.1kHz 16-bit for broadcast, MP3 320kbps for web

5. TROUBLESHOOTING
- No audio on fader: Check source assignment and channel ON button
- Mic not working: Check cable connections and channel strip settings
- Console frozen: Soft reset via touch screen > System > Restart Surface
- If console unresponsive: Contact Chief Engineer — do NOT power cycle`},{id:"sop7",title:"Severe Weather Operations Plan",category:"Emergency",version:"2.2",lastReviewed:"2026-01-05",reviewer:"Marcus Thompson",status:"Current",sections:["Activation Levels","Staffing Requirements","On-Air Coverage","Shelter-in-Place","Post-Event"],content:`WCCG 104.5 FM — Severe Weather Operations Plan

1. ACTIVATION LEVELS
- Level 1 (Monitor): NWS Watch issued — monitor conditions, prepare staff
- Level 2 (Alert): NWS Warning issued — begin extended coverage
- Level 3 (Emergency): Tornado on the ground or major hurricane — continuous coverage

2. STAFFING REQUIREMENTS
- Level 1: Normal staffing, PD and News on standby
- Level 2: Additional on-air host, PD in station, engineer on call
- Level 3: All hands — GM, PD, engineers, all available on-air talent

3. ON-AIR COVERAGE
- Break into programming with NWS information
- Use WCCG severe weather open (cart: WX-OPEN-01)
- Provide location-specific information for Fayetteville/Cumberland County area
- Take calls from listeners reporting conditions
- Repeat safety information every 15 minutes minimum
- Coordinate with Cumberland County Emergency Management

4. SHELTER-IN-PLACE
- If tornado warning includes station location:
  - Move to interior hallway (no windows)
  - If Studio A is safest, continue broadcasting from there
  - Grab portable weather radio and flashlight from emergency cabinet
  - Account for all personnel in building

5. POST-EVENT
- Continue coverage until all warnings expire
- Transition to recovery information (shelters, road closures, power outages)
- Document coverage for FCC public file
- Debrief with staff within 48 hours`},{id:"sop8",title:"FCC Public File Maintenance",category:"Administrative",version:"1.5",lastReviewed:"2026-03-01",reviewer:"Devon Robinson",status:"Current",sections:["Required Documents","Upload Schedule","Political Files","Access Requirements"],content:`WCCG 104.5 FM — FCC Public File Maintenance

1. REQUIRED DOCUMENTS
- Authorization (station license)
- Contour maps
- Ownership reports (Form 323 — biennial)
- EEO public file reports (annual)
- Quarterly issues/programs lists
- Political file (as needed during election periods)
- Children's TV programming reports (N/A for radio — filed waiver)
- Time brokerage agreements (if applicable)
- Joint sales agreements (if applicable)
- Letters from the public

2. UPLOAD SCHEDULE
- Issues/Programs List: Within 10 days of end of each quarter
  - Q1 due: April 10 | Q2 due: July 10 | Q3 due: Oct 10 | Q4 due: Jan 10
- EEO Report: Anniversary of license (annually)
- Ownership Report: November 1 (biennially)
- Political files: Within 24 hours of request/purchase

3. POLITICAL FILES
- During election periods, all political ad requests and purchases must be logged
- Include: candidate name, office, ad schedule, rates charged, class of time
- Upload to FCC online public file within 24 hours
- Maintain records for 2 years after election

4. ACCESS REQUIREMENTS
- Public file must be available online at FCC's website
- Station must also maintain local copy accessible during business hours
- Respond to public inquiries about file contents within reasonable timeframe`},{id:"sop9",title:"New Employee Onboarding — Operations",category:"Administrative",version:"1.3",lastReviewed:"2025-11-15",reviewer:"Devon Robinson",status:"Review Due",sections:["Day 1 Checklist","Systems Access","Training Schedule","Safety Orientation"],content:`WCCG 104.5 FM — Operations Onboarding Procedures

1. DAY 1 CHECKLIST
- Issue building keys/access card
- Create email account and phone extension
- Provide employee handbook and operations manual
- Tour of facilities: studios, server room, production rooms, transmitter site (scheduled)
- Introduction to team members
- Review emergency procedures and exit routes

2. SYSTEMS ACCESS
- Zetta automation: Read-only access initially, production access after training
- Traffic system: Access level based on role
- Email and shared drives: Standard access
- Studio console: Training required before solo operation
- EAS system: Chief Engineer training required

3. TRAINING SCHEDULE (First 2 Weeks)
- Day 1-2: Facility orientation, HR paperwork, IT setup
- Day 3-4: Console training with Production Director
- Day 5: Zetta automation training
- Week 2: Shadowing on-air shifts, production sessions
- Week 2 end: Competency assessment

4. SAFETY ORIENTATION
- Fire exits and extinguisher locations
- Severe weather shelter areas
- RF safety awareness (transmitter site)
- Emergency contact list
- First aid kit locations`},{id:"sop10",title:"Tower Light Monitoring & Reporting",category:"Technical",version:"2.0",lastReviewed:"2026-02-10",reviewer:"James Carter",status:"Current",sections:["Monitoring Requirements","Failure Reporting","Log Maintenance","Annual Inspection"],content:`WCCG 104.5 FM — Tower Light Monitoring & Reporting

1. MONITORING REQUIREMENTS (47 CFR 17.47)
- Tower lights must be observed at least once every 24 hours
- Automatic monitoring system (alarm) required — currently installed
- Alarm notification goes to Chief Engineer cell phone and station email
- Visual inspection during daytime site visits

2. FAILURE REPORTING
- Report tower light outage to FAA within 15 minutes of discovery
- FAA NOTAM line: 1-877-487-6867
- Include: Structure Registration Number (ASR), location, nature of failure
- Log the NOTAM number
- Report restoration to FAA within 15 minutes of repair

3. LOG MAINTENANCE
- Maintain tower light inspection log
- Record: date, time, observer, status (operational/failure)
- Retain logs for 2 years per FCC rules
- Logs stored in station public file and at transmitter site

4. ANNUAL INSPECTION
- Certified tower crew inspects all lighting annually
- Check beacon, side markers, photo cell, flasher unit
- Replace any dim or failed lamps
- Test backup power for lighting system
- Document inspection with photos and written report`}];function v(){let[e,v]=(0,r.useState)(!1),[w,C]=(0,r.useState)([]),[S,N]=(0,r.useState)(null),[E,R]=(0,r.useState)("all");if((0,r.useEffect)(()=>{C((0,x.loadOrSeed)("ops_sops",y)),v(!0)},[]),!e)return(0,t.jsx)("div",{className:"p-6 space-y-6 animate-pulse",children:(0,t.jsx)("div",{className:"h-12 bg-muted rounded-xl w-64"})});let A="all"===E?w:w.filter(e=>e.category===E),T=w.filter(e=>"Current"===e.status).length,k=w.filter(e=>"Review Due"===e.status).length,O=[{key:"title",label:"SOP Title",sortable:!0,sortKey:e=>e.title,render:e=>(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("div",{className:"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50",children:(e=>{switch(e){case"On-Air":return(0,t.jsx)(n.Radio,{className:"h-3.5 w-3.5 text-[#74ddc7]"});case"Technical":return(0,t.jsx)(a.Wrench,{className:"h-3.5 w-3.5 text-blue-400"});case"Emergency":return(0,t.jsx)(s.AlertTriangle,{className:"h-3.5 w-3.5 text-red-400"});case"Administrative":return(0,t.jsx)(l.Briefcase,{className:"h-3.5 w-3.5 text-purple-400"});default:return(0,t.jsx)(o.FileText,{className:"h-3.5 w-3.5 text-muted-foreground"})}})(e.category)}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"font-medium text-foreground",children:e.title}),(0,t.jsxs)("p",{className:"text-[10px] text-muted-foreground",children:["v",e.version," — ",e.sections.length," sections"]})]})]})},{key:"category",label:"Category",sortable:!0,sortKey:e=>e.category,hideOnMobile:!0,render:e=>(0,t.jsx)("span",{className:"text-xs text-muted-foreground",children:e.category})},{key:"lastReviewed",label:"Last Reviewed",sortable:!0,sortKey:e=>e.lastReviewed,hideOnMobile:!0,render:e=>(0,t.jsx)("span",{className:"text-xs text-muted-foreground",children:(0,x.formatDate)(e.lastReviewed)})},{key:"reviewer",label:"Reviewer",hideOnMobile:!0,render:e=>(0,t.jsx)("span",{className:"text-xs text-muted-foreground",children:e.reviewer})},{key:"status",label:"Status",render:e=>(0,t.jsx)(p.StatusBadge,{status:"Current"===e.status?"compliant":"Review Due"===e.status?"warning":"draft"})}];return(0,t.jsxs)("div",{className:"p-6 space-y-8 max-w-7xl mx-auto",children:[(0,t.jsx)(m.PageHeader,{icon:i.BookOpen,iconColor:"text-[#74ddc7]",iconBg:"bg-[#74ddc7]/10 border-[#74ddc7]/20",title:"SOP Library",description:"Standard Operating Procedures for WCCG 104.5 FM operations",badge:`${w.length} SOPs`}),(0,t.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[(0,t.jsx)(g.StatCard,{label:"Total SOPs",value:w.length,icon:i.BookOpen,color:"text-[#74ddc7]",bg:"bg-[#74ddc7]/10"}),(0,t.jsx)(g.StatCard,{label:"Current",value:T,icon:u.CheckCircle2,color:"text-emerald-400",bg:"bg-emerald-500/10"}),(0,t.jsx)(g.StatCard,{label:"Review Due",value:k,icon:c.Calendar,color:"text-yellow-400",bg:"bg-yellow-500/10"}),(0,t.jsx)(g.StatCard,{label:"Categories",value:4,icon:d.Tag,color:"text-purple-400",bg:"bg-purple-500/10"})]}),(0,t.jsx)(b.TabsNav,{tabs:["all","On-Air","Technical","Emergency","Administrative"].map(e=>({key:e,label:"all"===e?"All":e,count:"all"===e?w.length:w.filter(t=>t.category===e).length})),active:E,onChange:R}),(0,t.jsx)(f.DataTable,{columns:O,data:A,keyField:"id",searchable:!0,searchPlaceholder:"Search SOPs...",searchFilter:(e,t)=>e.title.toLowerCase().includes(t)||e.category.toLowerCase().includes(t)||e.reviewer.toLowerCase().includes(t),onRowClick:e=>N(e)}),(0,t.jsx)(h.DetailModal,{open:!!S,onClose:()=>N(null),title:S?.title||"",subtitle:S?`${S.category} — v${S.version} — Last reviewed ${(0,x.formatDate)(S.lastReviewed)} by ${S.reviewer}`:"",maxWidth:"max-w-3xl",children:S&&(0,t.jsxs)("div",{className:"space-y-5",children:[(0,t.jsxs)("div",{className:"flex items-center gap-3 flex-wrap",children:[(0,t.jsx)(p.StatusBadge,{status:"Current"===S.status?"compliant":"warning"}),(0,t.jsxs)("span",{className:"text-xs text-muted-foreground",children:["Version ",S.version]})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground uppercase tracking-wider mb-2",children:"Sections"}),(0,t.jsx)("div",{className:"flex flex-wrap gap-2",children:S.sections.map((e,r)=>(0,t.jsxs)("span",{className:"text-xs bg-muted rounded-lg px-2.5 py-1 text-foreground",children:[r+1,". ",e]},r))})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground uppercase tracking-wider mb-2",children:"Full Content"}),(0,t.jsx)("div",{className:"rounded-xl border border-border bg-background p-4 max-h-[400px] overflow-y-auto",children:(0,t.jsx)("pre",{className:"text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed",children:S.content})})]})]})})]})}e.s(["default",()=>v])}]);