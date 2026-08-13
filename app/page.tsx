"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VIDEO_ID = "_aCTltkyEdU";
const COUNT_IN_START = 85;
const CHALLENGE_START = 88;
const CHALLENGE_END = 119;
const CHALLENGE_LENGTH = CHALLENGE_END - CHALLENGE_START;
const DEFAULT_VOLUME = 82;

type TimedWord = {
  text: string;
  start: number;
  end: number;
};

type LyricLine = {
  start: number;
  end: number;
  text: string;
  words: TimedWord[];
};

function makeLine(words: TimedWord[]): LyricLine {
  return {
    start: words[0].start,
    end: words[words.length - 1].end,
    text: words.map((word) => word.text).join(" "),
    words,
  };
}

const lyricLines = [
  makeLine([
    { text: "멀어져도", start: 88.6, end: 89.74 },
    { text: "다시", start: 89.74, end: 90.18 },
    { text: "내게", start: 90.18, end: 90.78 },
    { text: "돌아오는", start: 90.78, end: 92.18 },
    { text: "물결처럼", start: 92.18, end: 93.18 },
  ]),
  makeLine([
    { text: "You", start: 93.18, end: 93.72 },
    { text: "always", start: 93.72, end: 94.5 },
    { text: "save", start: 94.5, end: 95 },
    { text: "me", start: 95, end: 95.36 },
    { text: "again", start: 95.36, end: 96.12 },
  ]),
  makeLine([
    { text: "더", start: 96.12, end: 96.96 },
    { text: "깊이", start: 96.96, end: 97.56 },
    { text: "네게로", start: 97.56, end: 98.62 },
    { text: "가", start: 98.62, end: 99.3 },
    { text: "Just", start: 99.3, end: 100.04 },
    { text: "Dive", start: 100.04, end: 100.88 },
  ]),
  makeLine([
    { text: "손", start: 100.88, end: 101.26 },
    { text: "닿지", start: 101.26, end: 101.76 },
    { text: "않아", start: 101.76, end: 102.34 },
    { text: "멀어져도", start: 102.34, end: 103.74 },
    { text: "난", start: 103.74, end: 104.28 },
    { text: "Just", start: 104.28, end: 105 },
    { text: "Love", start: 105, end: 105.6 },
  ]),
  makeLine([
    { text: "보이지", start: 105.6, end: 106.72 },
    { text: "않는", start: 106.72, end: 107.44 },
  ]),
  makeLine([
    { text: "깊은", start: 107.44, end: 108.88 },
    { text: "바닷속", start: 108.88, end: 109.74 },
    { text: "어둠", start: 109.74, end: 110.74 },
  ]),
  makeLine([
    { text: "요동치는", start: 110.74, end: 112.14 },
    { text: "일렁임까지", start: 112.14, end: 114.06 },
  ]),
  makeLine([
    { text: "Oh", start: 115, end: 115.14 },
    { text: "I", start: 115.14, end: 115.62 },
    { text: "I", start: 115.62, end: 116.32 },
    { text: "love", start: 116.32, end: 116.72 },
    { text: "‘LOVE’", start: 116.72, end: 117.28 },
    { text: "‘LOVE’", start: 117.28, end: 118 },
  ]),
];

function getTimedUnits(word: TimedWord) {
  const parts = /^[가-힣]+$/.test(word.text) ? Array.from(word.text) : [word.text];
  const unitDuration = (word.end - word.start) / parts.length;

  return parts.map((text, index) => ({
    text,
    start: word.start + unitDuration * index,
    end: word.start + unitDuration * (index + 1),
  }));
}

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
                {focusLine.words.map((word, wordIndex) => {
                  const units = getTimedUnits(word);
                  return (
                    <span className="timed-word" key={`${focusLine.text}-focus-${wordIndex}`}>
                      {units.map((unit, unitIndex) => {
                        const unitProgress = clamp(
                          (currentTime - unit.start) / (unit.end - unit.start),
                        );
                        return (
                          <span
                            className="focus-unit"
                            key={`${word.text}-${unitIndex}`}
                            style={
                              {
                                "--word-progress": `${unitProgress * 100}%`,
                              } as React.CSSProperties
                            }
                          >
                            {unit.text}
                          </span>
                        );
                      })}
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
                      {line.words.map((word, wordIndex) => {
                        const units = getTimedUnits(word);
                        return (
                          <span className="timed-word" key={`${line.text}-${wordIndex}`}>
                            {units.map((unit, unitIndex) => {
                              const unitProgress = clamp(
                                (currentTime - unit.start) / (unit.end - unit.start),
                              );
                              return (
                                <span
                                  className="lyric-word"
                                  key={`${word.text}-${unitIndex}`}
                                  style={
                                    {
                                      "--word-progress": `${unitProgress * 100}%`,
                                    } as React.CSSProperties
                                  }
                                >
                                  {unit.text}
                                </span>
                              );
                            })}
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
