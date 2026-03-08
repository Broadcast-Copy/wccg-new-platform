# PRD: WCCG Audio Editor — Completion to Production-Ready

**Date:** 2026-03-08
**Status:** Draft
**Owner:** WCCG Engineering
**Priority:** P0 (Core Studio Tool)

---

## Executive Summary

The WCCG Audio Editor is a browser-based DAW at `/studio/audio-editor` designed for radio station production. The editor currently has a working foundation (record, playback, trim, delete, split, undo/redo, export WAV) but approximately **50% of visible UI controls are non-functional** or visual-only stubs. This PRD defines every fix, feature, and enhancement needed to reach production quality.

---

## 1. Critical Bugs (P0 — Fix Immediately)

### 1.1 Playhead Uses setInterval Instead of requestAnimationFrame
- **Current:** Playhead updates via `setInterval(50ms)` = 20fps — visually jerky
- **Fix:** Replace with `requestAnimationFrame` loop reading `audioContext.currentTime` as source of truth
- **Pattern:**
  ```
  startTime = audioContext.currentTime
  startOffset = currentPlaybackPosition
  rAF loop: position = startOffset + (audioContext.currentTime - startTime)
  Stop loop: cancelAnimationFrame on pause/stop/ended
  ```
- **Also fix:** Add `audio.onended` event listener as backup to stop playhead
- **Also fix:** Subtract `audioContext.outputLatency` for accurate visual sync

### 1.2 Mute Button Does Nothing
- **Current:** `isMuted` state toggles but `audioRef.current.muted` is never set
- **Fix:** Add `audioRef.current.muted = !isMuted` in the toggle handler

### 1.3 Volume Fader Does Nothing
- **Current:** Fader animates but doesn't control `audio.volume`
- **Fix:** Wire fader value to `audioRef.current.volume` (0.0–1.0)

### 1.4 Input Source Selector Does Nothing
- **Current:** Dropdown shows devices but `inputSource` never passed to `getUserMedia()`
- **Fix:** Pass `{ audio: { deviceId: { exact: selectedDeviceId } } }` constraint when recording

### 1.5 Export Format Selector Does Nothing
- **Current:** WAV/MP3/FLAC buttons toggle state but export always outputs WAV
- **Fix:** Implement MP3 export via `@breezystack/lamejs`, keep FLAC as "Coming Soon"

---

## 2. Core Editing Features (P0 — Must-Have)

### 2.1 Copy / Paste Selection
- **Keyboard:** `Ctrl+C` copy, `Ctrl+V` paste at playhead, `Ctrl+X` cut
- **Implementation:** Store selected `Float32Array` region in a clipboard ref
- **Paste:** Splice clipboard data into AudioBuffer at playhead position
- **Context menu:** Add Cut, Copy, Paste items

### 2.2 Fade In / Fade Out
- **Toolbar buttons** + context menu items + keyboard shortcuts (`Ctrl+Shift+I` fade in, `Ctrl+Shift+O` fade out)
- **Implementation:** Multiply selection samples by a linear or exponential ramp
- **Types:** Linear (default), Exponential, S-Curve
- **Apply to selection** or first/last N seconds if no selection

### 2.3 Normalize
- **Peak normalization:** Find max absolute sample, scale all samples so peak = target (default -0.1 dBFS)
- **Toolbar button** + context menu + keyboard shortcut (`Ctrl+Shift+N`)
- **Apply to selection** if present, otherwise entire buffer

### 2.4 Zoom & Scroll
- **Zoom controls:** `Ctrl+Scroll` = zoom in/out, `Ctrl+=`/`Ctrl+-` buttons
- **State:** `samplesPerPixel` ratio controlling waveform resolution
- **Scroll:** Horizontal scrollbar appears when zoomed in, `Shift+Scroll` or trackpad horizontal scroll
- **Zoom to selection:** `Ctrl+Shift+F` — zoom to fit current selection
- **Zoom to fit:** `Ctrl+0` — show entire waveform
- **Minimap:** Small overview waveform above main waveform showing viewport position

### 2.5 Arrow Key Seeking
- **Left/Right arrows:** Nudge playhead by 0.1 seconds
- **Shift+Left/Right:** Nudge by 1 second
- **Home:** Jump to start
- **End:** Jump to end

### 2.6 Loop Playback
- **`L` key** or toolbar toggle: Loop selected region during playback
- **Visual:** Loop region highlighted differently from selection

---

## 3. Audio Processing / Effects (P1 — Important)

### 3.1 Built-in Effects Using Web Audio API Nodes
Each effect processes the AudioBuffer offline and pushes to undo stack.

| Effect | Web Audio Node | Parameters |
|--------|---------------|------------|
| **EQ (3-band)** | `BiquadFilterNode` x3 (lowshelf, peaking, highshelf) | Low freq/gain, Mid freq/gain/Q, High freq/gain |
| **Compressor** | `DynamicsCompressorNode` | Threshold, Ratio, Attack, Release, Knee |
| **Reverb** | `ConvolverNode` with generated impulse response | Room size, Decay, Wet/Dry mix |
| **Noise Gate** | Custom (sample-level threshold) | Threshold (dB), Attack (ms), Release (ms) |
| **Limiter** | `DynamicsCompressorNode` (ratio: 20, threshold: -1dB) | Threshold, Release |
| **De-esser** | `BiquadFilterNode` (bandpass 4-9kHz) + `DynamicsCompressorNode` | Frequency, Threshold |

### 3.2 Offline Rendering Pattern
```
OfflineAudioContext → source(AudioBuffer) → effect chain → render → new AudioBuffer
```
- Apply to selection if present, otherwise entire buffer
- Show progress indicator for long files
- Always save to undo stack before applying

### 3.3 Effect Presets
- **Voice Cleanup:** Noise gate + EQ (high-pass 80Hz) + Compressor (light)
- **Broadcast Ready:** Compressor + Limiter + Normalize to -16 LUFS
- **Radio Sweeper:** Reverb (short) + Compression (heavy)
- **Podcast Voice:** EQ (presence boost 3kHz) + Compressor + De-esser

---

## 4. Mixer & Metering (P1 — Important)

### 4.1 Working Mixer Panel
- **Single track for now** (multi-track is P2)
- Volume fader: controls actual playback volume (0–100%)
- Pan knob: controls `StereoPannerNode` (-1 to +1)
- Mute/Solo buttons: actually mute/unmute audio
- Input gain: adjustable recording input level

### 4.2 Real VU/Peak Metering
- **During playback:** Use `AnalyserNode` connected to audio output
- **Stereo separation:** Use `ChannelSplitterNode` for true L/R meters
- **Peak hold:** Show peak indicator that decays over 1.5 seconds
- **Clipping indicator:** Red flash when signal exceeds 0 dBFS

### 4.3 Loudness Metering (P2)
- LUFS integrated / momentary / short-term display
- Target indicator for broadcast standard (-23 LUFS EBU R128)
- Consider `needles` library for K-weighted measurement

---

## 5. Timeline & Navigation (P1 — Important)

### 5.1 Time Ruler with Dynamic Scale
- Show time labels (MM:SS.ms) at appropriate density based on zoom level
- Major/minor tick marks that adapt to zoom
- Click on ruler to seek

### 5.2 Markers / Cue Points
- **Add marker:** `M` key at playhead position
- **Named markers** with editable labels
- **Color categories:** Edit point (yellow), Segment (blue), Cue (green)
- **Marker navigation:** `Ctrl+Right/Left` to jump between markers
- **Marker list panel** for overview and quick navigation
- **Markers persist** in project metadata (localStorage)

### 5.3 Snap to Zero Crossing
- **Toggle:** Grid/snap button in toolbar
- When enabled, selection edges and split points snap to nearest zero crossing
- Prevents audible clicks at edit boundaries

---

## 6. File Handling (P1 — Important)

### 6.1 MP3 Export
- **Library:** `@breezystack/lamejs` (ESM + TypeScript)
- **Settings:** Bitrate selector (128/192/256/320 kbps)
- **Process in Web Worker** for non-blocking export
- **Progress indicator** for large files

### 6.2 Metadata (ID3 Tags)
- **On import:** Read tags with `music-metadata` (title, artist, album, duration)
- **On export:** Write tags with `browser-id3-writer` (title, artist, album, year)
- **UI:** Metadata panel showing file info for loaded audio

### 6.3 Project Save/Load
- **Auto-save** to IndexedDB every 30 seconds when changes exist
- **Project state:** AudioBuffer + markers + undo stack + selection + metadata
- **Named projects** in library panel
- **Export project** as WAV with sidecar JSON metadata

---

## 7. UI/UX Improvements (P1 — Important)

### 7.1 Keyboard Shortcuts Modal
- Wire up the keyboard shortcuts button (currently no handler)
- Show categorized list of all shortcuts
- Searchable

### 7.2 Settings Panel
- Wire up settings button
- Options: default export format, auto-save interval, waveform color, grid snap default, recording format

### 7.3 Enhanced Context Menu
Current context menu items (keep):
- Play/Pause, Select All, Trim, Delete, Split, Undo, Redo, Export

Add new items:
- Cut / Copy / Paste
- Fade In / Fade Out
- Normalize Selection
- Add Marker Here
- Zoom to Selection
- Loop Selection

### 7.4 Status Bar Enhancements
- Show: sample rate, bit depth, channels, file size
- Show: current selection duration (if selected)
- Show: total file duration
- Show: zoom level percentage

### 7.5 Waveform Display Improvements
- **RMS + Peak overlay:** Show RMS as filled area, peaks as outline
- **Stereo display option:** Split L/R channels vertically
- **Selection handles:** Draggable edges on selection boundaries for fine adjustment
- **Playhead line extends** through timeline panel (already done)

---

## 8. Multi-Track Support (P2 — Future)

### 8.1 Multiple Audio Tracks
- Add/remove tracks in timeline
- Independent record-arm, mute, solo, volume, pan per track
- Drag clips between tracks
- Time-shift clips on timeline

### 8.2 Crossfades Between Clips
- Overlap clips to create automatic crossfades
- Adjustable crossfade curve (linear, equal-power, S-curve)

### 8.3 Auto-Ducking
- Designate a "voice" track
- Music/bed tracks automatically reduce volume when voice is present
- Configurable threshold, ratio, attack/release

---

## 9. Advanced Features (P3 — Nice-to-Have)

| Feature | Notes |
|---------|-------|
| Spectrogram view | Toggle between waveform and spectrogram |
| Playback speed control | 0.5x – 2.0x with pitch preservation |
| Silence detection & removal | Auto-find and trim silence > threshold |
| Click/pop removal | Detect and interpolate over transient artifacts |
| Batch export | Export multiple marked regions as separate files |
| Templates | Save effect chain + settings as reusable presets |
| FLAC export | Via `libflac.js` WASM module |
| OGG export | Via WebAudioRecorder.js |

---

## 10. Technical Architecture Notes

### Web Audio Graph (Target)
```
AudioBufferSourceNode
  → GainNode (track volume)
  → StereoPannerNode (track pan)
  → [Effect chain: BiquadFilter → DynamicsCompressor → ConvolverNode]
  → AnalyserNode (metering)
  → AudioContext.destination
```

### Playhead Sync Architecture
```
Source of truth: AudioContext.currentTime
Visual update: requestAnimationFrame loop
Latency compensation: subtract audioContext.outputLatency
Stop conditions: audio.onended, user pause, user stop
```

### Performance Considerations
- **Max practical file duration:** ~30-60 minutes stereo 44.1kHz before memory pressure
- **Waveform peaks:** Pre-compute and cache; re-compute only on zoom change
- **Export:** Run in Web Worker to avoid blocking UI
- **Effects rendering:** Use OfflineAudioContext for offline processing
- **Large files:** Consider chunked loading/rendering for files > 10 minutes

### Dependencies to Add
| Package | Purpose | Size |
|---------|---------|------|
| `@breezystack/lamejs` | MP3 encoding | ~170KB |
| `music-metadata` | Read audio file tags | ~50KB (tree-shaken) |
| `browser-id3-writer` | Write ID3 tags to MP3 | ~15KB |

---

## 11. Implementation Priority & Effort

### Sprint 1: Critical Fixes (1-2 days)
| Task | Effort | Priority |
|------|--------|----------|
| Replace setInterval with rAF playhead | 2h | P0 |
| Wire mute button to audio.muted | 15min | P0 |
| Wire volume fader to audio.volume | 30min | P0 |
| Wire input source selector to getUserMedia | 30min | P0 |
| Add audio.onended handler | 15min | P0 |
| Arrow key seeking (Left/Right/Home/End) | 30min | P0 |

### Sprint 2: Core Editing (2-3 days)
| Task | Effort | Priority |
|------|--------|----------|
| Copy/Cut/Paste selection | 3h | P0 |
| Fade in / fade out | 2h | P0 |
| Normalize (peak) | 1h | P0 |
| Zoom in/out with Ctrl+Scroll | 4h | P0 |
| Horizontal scroll when zoomed | 2h | P0 |
| Minimap overview | 3h | P0 |
| Loop playback | 2h | P0 |

### Sprint 3: Effects & Mixer (3-4 days)
| Task | Effort | Priority |
|------|--------|----------|
| EQ (3-band) via BiquadFilterNode | 3h | P1 |
| Compressor via DynamicsCompressorNode | 2h | P1 |
| Reverb via ConvolverNode | 3h | P1 |
| Noise Gate (sample-level) | 2h | P1 |
| Limiter | 1h | P1 |
| De-esser | 2h | P1 |
| Effect presets (Voice Cleanup, Broadcast Ready) | 2h | P1 |
| Real stereo VU metering with peak hold | 3h | P1 |
| Working pan knob (StereoPannerNode) | 1h | P1 |

### Sprint 4: File & UI Polish (2-3 days)
| Task | Effort | Priority |
|------|--------|----------|
| MP3 export via lamejs | 3h | P1 |
| Markers / cue points | 4h | P1 |
| Keyboard shortcuts modal | 2h | P1 |
| Settings panel | 2h | P1 |
| Enhanced context menu items | 1h | P1 |
| Status bar enhancements | 1h | P1 |
| Snap to zero crossing | 2h | P1 |
| Metadata read on import | 2h | P1 |

### Sprint 5: Multi-Track & Advanced (5+ days, P2/P3)
- Multi-track support
- Crossfades
- Auto-ducking
- Spectrogram view
- Playback speed control
- Silence detection
- FLAC/OGG export

---

## 12. Success Criteria

1. **All visible UI controls are functional** — no stub buttons or visual-only faders
2. **Playhead is smooth** at 60fps via requestAnimationFrame
3. **Core radio production workflow** is possible: Record VO → Edit → Apply effects → Normalize → Export MP3
4. **Zero build errors** with `pnpm --filter web build`
5. **All keyboard shortcuts** match industry standards
6. **Context menu** provides full editing access
7. **Files up to 30 minutes** load and edit without crashes

---

## Appendix: Current Working Features (Keep As-Is)

- Record audio from microphone with live waveform visualization
- Import audio files (WAV, MP3, FLAC, OGG, AAC) via picker or drag-drop
- Play/pause/stop playback
- Seek/scrub on waveform and timeline
- Drag-to-select on waveform (pointer capture) and timeline
- Trim selection (keep region)
- Delete selection (remove region)
- Split at playhead
- Undo/redo with snapshot stack
- Export to WAV
- VU meter (real RMS during recording, waveform peaks during playback)
- Fullscreen toggle
- Panel visibility toggles (left/right/bottom)
- File library with IndexedDB persistence
- Right-click context menu with core operations
- Keyboard shortcuts (Space, Ctrl+Z, Ctrl+Shift+Z, Del, Ctrl+T, Ctrl+A, Ctrl+E, S, Esc)
