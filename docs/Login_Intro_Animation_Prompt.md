# Login Intro Animation — Claude Code Prompt

Read the project context file: `Mission_Control_v2_Project_Context.md`

## Goal

After a successful login, play a fullscreen cinematic intro animation before showing the dashboard. This should feel like booting up a military command center — inspired by Command & Conquer's EVA system.

## Audio File

The audio file is already saved at:
```
C:\Users\msant\OneDrive\Desktop\Claude Code\Mission Control V2\Audio\boot-up.mp3
```

Copy this file to the Next.js public folder so it's accessible in the browser:
```bash
cp "Audio/boot-up.mp3" public/sounds/boot-up.mp3
```

The audio will be playable at `/sounds/boot-up.mp3` in the app.

## Animation Sequence (4-5 seconds total)

### Phase 1 — Dark Boot (0s - 0.5s)
- Screen is completely black
- A subtle scan line / static flicker effect runs across the screen (like an old CRT monitor turning on)
- Audio starts playing

### Phase 2 — Logo / Title Reveal (0.5s - 2s)
- "MISSION CONTROL" fades in at center screen in large, bold, uppercase text
- Use the app's existing font or a clean military-style font
- Text color: bright teal/cyan (#00d4aa or similar from the app's theme)
- A **horizontal lens flare / light sweep** glides across the text from left to right (like a glare reflecting off glass)
- Subtle glow/bloom effect around the text

### Phase 3 — Subtitle Type-out (2s - 3.5s)
- Below "MISSION CONTROL", the text "COMMAND CENTER ONLINE" types out character by character (typewriter effect)
- Each character appears with a subtle cursor blink
- Text color: white or light gray, slightly smaller than the main title
- After typing completes, "ALL SYSTEMS OPERATIONAL" fades in below in smaller text, green color (#10b981)

### Phase 4 — Solar Flare Burst (3.5s - 4s)
- A bright flash / solar flare burst emanates from the center of the text
- The flare expands outward briefly then fades
- Use CSS radial gradient animation — white/teal glow that expands and fades to transparent

### Phase 5 — Fade to Dashboard (4s - 5s)
- The entire animation fades out (opacity 0)
- The dashboard is revealed underneath
- Remove the animation overlay from the DOM after fade completes

## Technical Implementation

### Create a new component: `IntroAnimation.tsx`

Location: `src/components/IntroAnimation.tsx` (or wherever components live in the project)

```tsx
// Pseudocode structure:
const IntroAnimation = ({ onComplete }) => {
  const [phase, setPhase] = useState('boot');
  const audioRef = useRef(null);

  useEffect(() => {
    // Play audio
    const audio = new Audio('/sounds/boot-up.mp3');
    audio.play().catch(() => {}); // Handle autoplay restrictions

    // Phase timing
    setTimeout(() => setPhase('title'), 500);
    setTimeout(() => setPhase('subtitle'), 2000);
    setTimeout(() => setPhase('flare'), 3500);
    setTimeout(() => {
      setPhase('fadeout');
      setTimeout(onComplete, 1000);
    }, 4000);
  }, []);

  return (
    <div className="intro-overlay">
      {/* Animation content based on phase */}
    </div>
  );
};
```

### Key CSS effects needed:

**Scan lines:**
```css
.scanlines::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  animation: scanline-move 0.1s linear infinite;
  pointer-events: none;
}
```

**Lens flare sweep:**
```css
.lens-flare {
  position: absolute;
  width: 200px;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 212, 170, 0.3),
    rgba(255, 255, 255, 0.6),
    rgba(0, 212, 170, 0.3),
    transparent
  );
  animation: sweep 1.5s ease-in-out forwards;
}

@keyframes sweep {
  from { transform: translateX(-200px); }
  to { transform: translateX(calc(100vw + 200px)); }
}
```

**Typewriter effect:**
```css
.typewriter {
  overflow: hidden;
  border-right: 2px solid rgba(255, 255, 255, 0.75);
  white-space: nowrap;
  animation: typing 1.5s steps(24) forwards, blink-caret 0.5s step-end 3;
}

@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}
```

**Solar flare:**
```css
.solar-flare {
  position: absolute;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.8), rgba(0,212,170,0.4), transparent);
  animation: flare-burst 0.5s ease-out forwards;
}

@keyframes flare-burst {
  from { width: 0; height: 0; opacity: 1; }
  to { width: 200vw; height: 200vh; opacity: 0; }
}
```

### Where to trigger it:

In the login flow (likely in the auth callback or the dashboard page):

1. After NextAuth `signIn()` succeeds, instead of immediately redirecting to `/dashboard`, set a state flag like `showIntro: true`
2. Render `<IntroAnimation onComplete={() => setShowIntro(false)} />` as a fullscreen overlay on top of the dashboard
3. When the animation completes, remove the overlay and the user sees the dashboard

### Option: Store in sessionStorage

To avoid showing the animation on every page refresh:
```javascript
// Only show on fresh login, not on page refresh
if (!sessionStorage.getItem('introPlayed')) {
  setShowIntro(true);
  sessionStorage.setItem('introPlayed', 'true');
}
```

This way it only plays once per login session — not every time they refresh the page.

### Skip Button

Add a small "Skip" button in the bottom-right corner:
```tsx
<button
  onClick={onComplete}
  className="absolute bottom-8 right-8 text-gray-500 text-sm hover:text-white transition"
>
  Skip ▸
</button>
```

### Audio Autoplay Note

Some browsers block audio autoplay. Handle this gracefully:
- Try to play audio immediately
- If blocked (the `.play()` promise rejects), the animation still runs silently — it still looks cool without sound
- The audio will work after any user interaction (which login provides, so it should work)

## Design Guidelines

- Match the app's existing dark navy background (#0a1628 or whatever the app uses)
- Use the app's teal/cyan accent color for glows and text
- The animation should feel premium — smooth easing, no jank
- All animations should use CSS transitions/animations (GPU accelerated) not JavaScript intervals
- The overlay should be `position: fixed; inset: 0; z-index: 9999` to cover everything
- Use `will-change: transform, opacity` for smooth performance

## After Implementation

1. Copy the audio file to `/public/sounds/boot-up.mp3`
2. Test the full flow: Login → Animation plays with audio → Dashboard appears
3. Verify the Skip button works
4. Verify it doesn't replay on page refresh (only on fresh login)
5. Deploy: `vercel --prod` or `git push`
