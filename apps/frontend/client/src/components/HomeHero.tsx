import { buildHeroTimeline } from "../logic/heroTimeline.ts";
import { DURATION_S, toSeconds } from "../logic/motionTokens.ts";
import { AuthBar } from "./AuthBar.tsx";
import { BlurFade } from "./magicui/blur-fade.tsx";
import { BorderBeam } from "./magicui/border-beam.tsx";
import { Terminal, TypingAnimation } from "./magicui/terminal.tsx";
import DecryptedText from "./reactbits/DecryptedText.tsx";

// The prompt "$ " is static; only the command after it is typed.
const HERO_COMMAND = "./tiendadcc --start";
const HERO_OUTPUT_LINES = [
  "Hola, mundo.",
  "Compila tu estilo: tazas, poleras y stickers.",
] as const;

// Every delay and duration below comes from this timeline, which keeps the
// whole hero under 2 s (Home RF-10; plan D15).
const timeline = buildHeroTimeline(HERO_COMMAND, HERO_OUTPUT_LINES);

// Home hero (Home RF-2, RF-3). The h1's accessible name is a static
// sr-only "TiendaDCC"; the scramble effect is hidden from assistive
// technology, and so is the whole decorative terminal (plan D6).
export function HomeHero() {
  return (
    <section className="border-b border-border py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
        <div className="min-w-0 text-center lg:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            <span className="sr-only">TiendaDCC</span>
            <span aria-hidden="true">
              <DecryptedText
                text="TiendaDCC"
                animateOn="view"
                speed={timeline.title.speedMs}
                maxIterations={timeline.title.maxIterations}
                encryptedClassName="text-muted-foreground"
              />
            </span>
          </h1>
          <p className="mt-4 font-sans text-lg text-muted-foreground">
            Venta de productos del DCC.
          </p>
          <div className="mt-8">
            <AuthBar />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto w-full max-w-lg min-w-0 rounded-xl"
        >
          {/* Lines wrap inside the window instead of scrolling (Home RNF-3). */}
          <Terminal
            sequence={false}
            className="bg-card font-mono [&_pre]:break-words [&_pre]:whitespace-pre-wrap"
          >
            <div className="text-sm">
              <span className="text-terminal-prompt">$ </span>
              <TypingAnimation
                startOnView={false}
                delay={timeline.command.startMs}
                duration={timeline.command.charIntervalMs}
                className="text-foreground"
              >
                {HERO_COMMAND}
              </TypingAnimation>
              <span className="ml-0.5 text-terminal-prompt">▍</span>
            </div>
            {timeline.outputLines.map((line) => (
              <BlurFade
                key={line.text}
                delay={toSeconds(line.startMs)}
                duration={DURATION_S.base}
              >
                <span className="text-sm text-muted-foreground">
                  {line.text}
                </span>
              </BlurFade>
            ))}
          </Terminal>
          <BorderBeam
            delay={toSeconds(timeline.borderBeam.startMs)}
            duration={toSeconds(timeline.borderBeam.durationMs)}
          />
        </div>
      </div>
    </section>
  );
}
