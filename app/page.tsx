"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VIDEO_ID = "_aCTltkyEdU";
const COUNT_IN_START = 85;
const CHALLENGE_START = 88;
const CHALLENGE_END = 119;
const CHALLENGE_LENGTH = CHALLENGE_END - CHALLENGE_START;
const DEFAULT_VOLUME = 82;

const lyricLines = [
  { start: 88, end: 93.1, text: "멀어져도 다시 내게 돌아오는 물결처럼" },
  { start: 93.1, end: 96, text: "You always save me again" },
  { start: 96.5, end: 100, text: "더 깊이 네게로 가 Just Dive" },
  { start: 101, end: 105, text: "손 닿지 않아 멀어져도 난 Just Love" },
  { start: 105, end: 108, text: "보이지 않는" },
  { start: 108, end: 111, text: "깊은 바닷속 어둠" },
  { start: 111, end: 115, text: "요동치는 일렁임까지" },
  { start: 115, end: 118, text: "Oh I I love ‘LOVE’ ‘LOVE’" },
] as const;

type Phase = "idle" | "countdown" | "singing" | "finished";

type YouTubePlayer = {
  cueVideoById: (options: { videoId: string; startSeconds: number }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars: Record<string, number | string>;
          events: {
            onReady: (event: { target: YouTubePlayer }) => void;
            onStateChange: (event: { data: number }) => void;
          };
        },
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.min(CHALLENGE_LENGTH, seconds));
  return `0:${Math.floor(safeSeconds).toString().padStart(2, "0")}`;
}

export default function Home() {
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(COUNT_IN_START);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    let disposed = false;

    const createPlayer = () => {
      if (disposed || !window.YT || !playerHostRef.current || playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          end: CHALLENGE_END,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          start: COUNT_IN_START,
          origin: window.location.origin,
        },
        events: {
          onReady: ({ target }) => {
            target.cueVideoById({
              videoId: VIDEO_ID,
              startSeconds: COUNT_IN_START,
            });
            target.setVolume(DEFAULT_VOLUME);
            setIsPlayerReady(true);
          },
          onStateChange: ({ data }) => {
            if (data === 1) setIsPaused(false);
            if (data === 2 && phaseRef.current !== "finished") setIsPaused(true);
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      window.onYouTubeIframeAPIReady = createPlayer;
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []); // The player is intentionally created only once.

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || player.getPlayerState() !== 1) return;

      const nextTime = player.getCurrentTime();
      setCurrentTime(nextTime);

      if (nextTime >= CHALLENGE_END - 0.08) {
        player.pauseVideo();
        setCurrentTime(CHALLENGE_END);
        setPhase("finished");
        setIsPaused(false);
      } else if (nextTime >= CHALLENGE_START) {
        setPhase("singing");
      } else if (nextTime >= COUNT_IN_START) {
        setPhase("countdown");
      }
    }, 70);

    return () => window.clearInterval(timer);
  }, []);

  const elapsed = clamp(
    currentTime - CHALLENGE_START,
    0,
    CHALLENGE_LENGTH,
  );
  const progress = elapsed / CHALLENGE_LENGTH;
  const activeLineIndex = useMemo(
    () =>
      lyricLines.findIndex(
        (line) => currentTime >= line.start && currentTime < line.end,
      ),
    [currentTime],
  );
  const activeLine =
    activeLineIndex >= 0 ? lyricLines[activeLineIndex] : undefined;
  const nextLine = lyricLines.find((line) => line.start > currentTime);
  const finalLine = lyricLines[lyricLines.length - 1];
  const hasCompletedLyrics = currentTime >= finalLine.end;
  const focusLine =
    activeLine ??
    (phase === "finished" || hasCompletedLyrics ? finalLine : nextLine) ??
    lyricLines[0];
  const focusLineProgress = activeLine
    ? clamp(
        (currentTime - activeLine.start) / (activeLine.end - activeLine.start),
      )
    : phase === "finished" || hasCompletedLyrics
      ? 1
      : 0;
  const focusWords = focusLine.text.split(" ");
  const focusLabel = activeLine
    ? "NOW · 現在唱"
    : phase === "finished" || hasCompletedLyrics
      ? "COMPLETE · 完成"
      : phase === "idle"
        ? "FIRST LINE · 第一句"
        : phase === "countdown"
          ? "GET READY · 準備"
          : "NEXT · 下一句";
  const countIn = Math.max(1, Math.ceil(CHALLENGE_START - currentTime));
  const isRunning = phase === "countdown" || phase === "singing";

  useEffect(() => {
    if (activeLineIndex >= 0) {
      activeLineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLineIndex]);

  const startChallenge = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.setPlaybackRate(speed);
    player.setVolume(volume);
    player.seekTo(COUNT_IN_START, true);
    player.playVideo();
    setCurrentTime(COUNT_IN_START);
    setPhase("countdown");
    setIsPaused(false);
  }, [speed, volume]);

  const togglePlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (!isRunning && phase !== "finished") {
      startChallenge();
      return;
    }

    if (phase === "finished") {
      startChallenge();
    } else if (player.getPlayerState() === 1) {
      player.pauseVideo();
      setIsPaused(true);
    } else {
      player.playVideo();
      setIsPaused(false);
    }
  }, [isRunning, phase, startChallenge]);

  const jumpToLine = (lineStart: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.setPlaybackRate(speed);
    player.seekTo(lineStart, true);
    player.playVideo();
    setCurrentTime(lineStart);
    setPhase("singing");
    setIsPaused(false);
  };

  const changeSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    playerRef.current?.setPlaybackRate(nextSpeed);
  };

  const changeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    playerRef.current?.setVolume(nextVolume);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }
      if (event.key.toLowerCase() === "r") startChallenge();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startChallenge, togglePlayback]);

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#challenge" aria-label="回到挑戰主畫面">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>파도 (i love LOVE)</span>
        </a>
        <div className="session-label">
          <span className="live-dot" />
          31 秒跟唱練習
        </div>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">SING CHALLENGE · 01:28—01:59</p>
          <h1 id="page-title">
            跟著浪，<span>唱進愛裡。</span>
          </h1>
        </div>
        <p className="intro-copy">
          戴上耳機，先聽三秒倒數。亮起的字就是你的拍點。
        </p>
      </section>

      <section className="challenge-card" id="challenge">
        <div className="card-meta">
          <div className="track-index" aria-hidden="true">
            01
          </div>
          <div>
            <p className="meta-label">TODAY&apos;S VERSE</p>
            <p className="meta-title">파도 (i love LOVE) · Chorus challenge</p>
          </div>
          <div className="timecode">
            <span>{formatTime(elapsed)}</span>
            <span className="time-divider">/</span>
            <span>0:31</span>
          </div>
        </div>

        <div className="progress-track" aria-label={`挑戰進度 ${Math.round(progress * 100)}%`}>
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="challenge-grid">
          <aside className="player-panel" aria-label="歌曲播放器">
            <div className="video-frame">
              <div ref={playerHostRef} className="youtube-player" />
              <div className={`video-shade ${isRunning ? "is-running" : ""}`}>
                {phase === "countdown" && (
                  <div className="countdown" aria-live="assertive">
                    <span>READY</span>
                    <strong>{countIn}</strong>
                  </div>
                )}
                {phase === "idle" && (
                  <button
                    className="big-play"
                    type="button"
                    onClick={startChallenge}
                    disabled={!isPlayerReady}
                    aria-label="開始 31 秒跟唱挑戰"
                  >
                    <span aria-hidden="true">▶</span>
                  </button>
                )}
              </div>
              <span className="clip-badge">01:28 → 01:59</span>
            </div>

            <div
              className={`focus-lyric ${activeLine ? "is-singing" : "is-preview"}`}
              aria-live="polite"
              aria-label={`${focusLabel}：${focusLine.text}`}
            >
              <div className="focus-lyric-meta">
                <span className="focus-pulse" aria-hidden="true" />
                <span>{focusLabel}</span>
                {!activeLine && nextLine && phase === "singing" && (
                  <span className="focus-wait">
                    {Math.max(0, nextLine.start - currentTime).toFixed(1)}s
                  </span>
                )}
              </div>
              <p className="focus-lyric-copy" lang="ko">
                {focusWords.map((word, wordIndex) => {
                  const wordProgress = clamp(
                    focusLineProgress * focusWords.length - wordIndex,
                  );
                  return (
                    <span
                      key={`${focusLine.text}-focus-${wordIndex}`}
                      style={
                        {
                          "--word-progress": `${wordProgress * 100}%`,
                        } as React.CSSProperties
                      }
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
            </div>

            <div className="wave-meter" aria-hidden="true">
              {Array.from({ length: 34 }, (_, index) => (
                <i
                  key={index}
                  style={{
                    height: `${18 + ((index * 19) % 52)}%`,
                    animationDelay: `${index * -0.055}s`,
                  }}
                />
              ))}
            </div>

            <div className="player-controls">
              <button
                className="control-button primary-control"
                type="button"
                onClick={togglePlayback}
                disabled={!isPlayerReady}
              >
                <span aria-hidden="true">
                  {phase === "finished" ? "↻" : isRunning && !isPaused ? "Ⅱ" : "▶"}
                </span>
                {phase === "finished"
                  ? "再唱一次"
                  : isRunning && !isPaused
                    ? "暫停"
                    : isPaused
                      ? "繼續"
                      : isPlayerReady
                        ? "開始挑戰"
                        : "歌曲載入中"}
              </button>

              <div className="speed-control" aria-label="播放速度">
                {[0.75, 1].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={speed === rate ? "is-active" : ""}
                    onClick={() => changeSpeed(rate)}
                    aria-pressed={speed === rate}
                  >
                    {rate}×
                  </button>
                ))}
              </div>
            </div>

            <label className="volume-control">
              <span aria-hidden="true">◖))</span>
              <span className="sr-only">音量</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(event) => changeVolume(Number(event.target.value))}
                style={{ "--volume": `${volume}%` } as React.CSSProperties}
              />
              <output>{volume}</output>
            </label>

            <a
              className="source-link"
              href={`https://www.youtube.com/watch?v=${VIDEO_ID}&t=${CHALLENGE_START}s`}
              target="_blank"
              rel="noreferrer"
            >
              在 YouTube 開啟原曲 <span aria-hidden="true">↗</span>
            </a>
          </aside>

          <section className="lyrics-panel" aria-label="同步歌詞">
            <div className="lyrics-heading">
              <div>
                <p className="meta-label">LYRICS / 가사</p>
                <h2>
                  {phase === "finished"
                    ? "挑戰完成"
                    : phase === "countdown"
                      ? "準備吸氣⋯"
                      : phase === "singing"
                        ? "現在，跟著唱"
                        : "點擊開始，歌詞會跟著亮起"}
                </h2>
              </div>
              <div className={`beat-orb ${isRunning && !isPaused ? "is-active" : ""}`}>
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="lyrics-window">
              {lyricLines.map((line, lineIndex) => {
                const isPast = currentTime >= line.end;
                const isCurrent = lineIndex === activeLineIndex;
                const words = line.text.split(" ");
                const lineProgress = clamp(
                  (currentTime - line.start) / (line.end - line.start),
                );

                return (
                  <button
                    type="button"
                    key={line.text}
                    ref={isCurrent ? activeLineRef : undefined}
                    className={`lyric-line ${isCurrent ? "is-current" : ""} ${isPast ? "is-past" : ""}`}
                    onClick={() => jumpToLine(line.start)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`從這句開始：${line.text}`}
                  >
                    <span className="line-number">
                      {(lineIndex + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="line-copy" lang="ko">
                      {words.map((word, wordIndex) => {
                        const wordProgress = clamp(
                          lineProgress * words.length - wordIndex,
                        );
                        return (
                          <span
                            className="lyric-word"
                            key={`${line.text}-${wordIndex}`}
                            style={
                              {
                                "--word-progress": `${wordProgress * 100}%`,
                              } as React.CSSProperties
                            }
                          >
                            {word}
                          </span>
                        );
                      })}
                    </span>
                    <span className="line-time">
                      {formatTime(line.start - CHALLENGE_START)}
                    </span>
                  </button>
                );
              })}
            </div>

            {phase === "finished" && (
              <div className="finish-toast" role="status">
                <span className="finish-check" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <strong>Nice dive!</strong>
                  <span>完整唱完 31 秒，節奏抓得很好。</span>
                </div>
                <button type="button" onClick={startChallenge}>
                  ↻ 重唱
                </button>
              </div>
            )}
          </section>
        </div>

        <footer className="challenge-footer">
          <span>SPACE 播放 / 暫停</span>
          <span>R 重新開始</span>
          <span>點歌詞可從該句練習</span>
        </footer>
      </section>
    </main>
  );
}
