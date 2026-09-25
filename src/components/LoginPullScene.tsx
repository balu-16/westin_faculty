import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";
import { CampusSketch } from "./CampusSketch";
import { StudentMascot } from "./StudentMascot";
import "./LoginPullScene.css";

const INTRO_KEY = "westin.login-redesign.intro-seen.v1";
const DURATION = 1800;

export interface LoginPullSceneProps {
  children: ReactNode;
  /** Production-style default: play once per tab session. Replay explicitly overrides this. */
  intro?: boolean;
  replayKey?: number;
  reducedMotion?: boolean;
  onSettled?: () => void;
}

function hasSeenIntro() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "true";
  } catch {
    return false;
  }
}

export function LoginPullScene({
  children,
  intro = true,
  replayKey = 0,
  reducedMotion = false,
  onSettled,
}: LoginPullSceneProps) {
  const stageRef = useRef<HTMLElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const ropeHighlightRef = useRef<SVGPathElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const frameRef = useRef(0);
  const runningRef = useRef(false);
  const lastReplayRef = useRef(0);
  const notifyRef = useRef(onSettled);
  const [pulling, setPulling] = useState(false);
  const [systemReduced, setSystemReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  notifyRef.current = onSettled;
  const motionOff = reducedMotion || systemReduced;

  const positionRope = useCallback(() => {
    const stage = stageRef.current;
    const grip = characterRef.current?.querySelector("[data-rope-grip]");
    const anchor = cardRef.current?.querySelector("[data-card-anchor]");
    if (!stage || !grip || !anchor) return;
    // Measure only this short scene; keep the rope physically attached during transforms and resizing.
    const s = stage.getBoundingClientRect();
    const g = grip.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const x1 = g.left + g.width / 2 - s.left;
    const y1 = g.top + g.height / 2 - s.top;
    const x2 = a.left + a.width / 2 - s.left;
    const y2 = a.top + a.height / 2 - s.top;
    const sag = runningRef.current ? 2 : Math.min(19, Math.abs(x2 - x1) * 0.11);
    const d = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag} ${x2} ${y2}`;
    pathRef.current?.setAttribute("d", d);
    ropeHighlightRef.current?.setAttribute("d", d);
  }, []);

  const settle = useCallback(() => {
    const wasRunning = runningRef.current;
    runningRef.current = false;
    cancelAnimationFrame(frameRef.current);
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
    setPulling(false);
    try {
      sessionStorage.setItem(INTRO_KEY, "true");
    } catch {
      /* Storage is optional. */
    }
    // The mascot removes its pulling pose on React's next commit.
    frameRef.current = requestAnimationFrame(positionRope);
    if (wasRunning) notifyRef.current?.();
  }, [positionRope]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const character = characterRef.current;
    const card = cardRef.current;
    if (!stage || !character || !card) return;
    const replayRequested = replayKey !== lastReplayRef.current;
    lastReplayRef.current = replayKey;
    const shouldPlay =
      intro && !motionOff && (replayRequested || !hasSeenIntro());
    if (!shouldPlay) {
      settle();
      return;
    }

    runningRef.current = true;
    setPulling(true);
    const compact = stage.clientWidth < 760;
    const distance = compact ? 52 : 180;
    const characterAnimation = character.animate(
      [
        { transform: `translateX(${compact ? 22 : 62}px)`, offset: 0 },
        { transform: `translateX(${compact ? 22 : 62}px)`, offset: 0.2 },
        { transform: "translateX(-7px)", offset: 0.78 },
        { transform: "translateX(0)", offset: 1 },
      ],
      {
        duration: DURATION,
        easing: "cubic-bezier(.22,.65,.28,1)",
        fill: "both",
      },
    );
    const cardAnimation = card.animate(
      [
        {
          transform: `translateX(${distance}px) rotate(1.2deg)`,
          opacity: 0.25,
          offset: 0,
        },
        {
          transform: `translateX(${distance * 0.85}px) rotate(1deg)`,
          opacity: 1,
          offset: 0.22,
        },
        {
          transform: "translateX(-5px) rotate(-.3deg)",
          opacity: 1,
          offset: 0.81,
        },
        { transform: "translateX(0) rotate(0)", opacity: 1, offset: 1 },
      ],
      {
        duration: DURATION,
        easing: "cubic-bezier(.22,.65,.28,1)",
        fill: "both",
      },
    );
    animationsRef.current = [characterAnimation, cardAnimation];
    const tick = () => {
      positionRope();
      if (runningRef.current) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    cardAnimation.onfinish = settle;
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(frameRef.current);
      characterAnimation.cancel();
      cardAnimation.cancel();
    };
  }, [intro, replayKey, motionOff, positionRope, settle]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      // Keep the rope attached across responsive layout changes.
      positionRope();
    });
    for (const element of [
      stageRef.current,
      cardRef.current,
      characterRef.current,
    ]) {
      if (element) observer.observe(element);
    }
    const onKey = (event: KeyboardEvent) => {
      if (runningRef.current && (event.key === "Tab" || event.key === "Escape"))
        settle();
    };
    document.addEventListener("keydown", onKey, true);
    document.fonts.ready.then(positionRope);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(frameRef.current);
    };
  }, [positionRope, settle]);

  useEffect(() => {
    positionRope();
  }, [pulling, positionRope]);

  return (
    <section
      className="login-pull-scene login-stage"
      ref={stageRef}
      data-pulling={pulling}
      aria-label="Westin sign-in"
    >
      <div className="stage-grid" aria-hidden="true" />
      <div className="stage-orbit stage-orbit-one" aria-hidden="true" />
      <div className="stage-orbit stage-orbit-two" aria-hidden="true" />
      <div className="stage-story">
        <div className="story-copy">
          <span className="eyebrow">
            <span /> A LITTLE HELP GETTING STARTED
          </span>
          <h1>
            A little pull.
            <br />A <span>bright start.</span>
          </h1>
          <p>
            Your people. Your possibilities.
            <br />
            Your next chapter at Westin.
          </p>
          <div className="story-note">
            <Sparkles size={15} strokeWidth={1.7} /> Good things are just ahead.
          </div>
        </div>
        <CampusSketch />
        <div className="notebook-note" aria-hidden="true">
          <BookOpen size={20} />
          <span>
            Big dreams. <strong>Small first steps.</strong>
          </span>
          <ArrowUpRight size={17} />
        </div>
        <div className="pull-character" ref={characterRef}>
          <StudentMascot pulling={pulling} reducedMotion={motionOff} />
        </div>
        <div className="ground-line" aria-hidden="true" />
      </div>
      <svg className="scene-rope" aria-hidden="true">
        <path
          ref={pathRef}
          fill="none"
          stroke="#9c5d30"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          ref={ropeHighlightRef}
          fill="none"
          stroke="#e5ae69"
          strokeWidth="1.5"
          strokeDasharray="3 6"
          strokeLinecap="round"
        />
      </svg>
      <div
        className="pull-card"
        ref={cardRef}
        onFocusCapture={settle}
        onPointerDownCapture={settle}
      >
        <span
          className="card-rope-anchor"
          data-card-anchor
          aria-hidden="true"
        />
        {children}
      </div>
      {pulling && (
        <button className="skip-animation" type="button" onClick={settle}>
          Skip animation <span aria-hidden="true">→</span>
        </button>
      )}
      <div className="stage-bottom-note" aria-hidden="true">
        <span /> MADE FOR YOUR NEXT CHAPTER
      </div>
    </section>
  );
}

