import {
  siDocker,
  siExpress,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siReact,
  siRedis,
  siTailwindcss,
  siTimescale,
  siTypescript,
  type SimpleIcon,
} from "simple-icons";
import { Reveal } from "./shared";

const STACK: SimpleIcon[] = [
  siTypescript,
  siNodedotjs,
  siExpress,
  siRedis,
  siPostgresql,
  siTimescale,
  siNextdotjs,
  siReact,
  siTailwindcss,
  siDocker,
];

export function StackMarquee() {
  return (
    <section aria-label="Built with" className="relative py-14 md:py-20">
      <Reveal className="mx-auto max-w-6xl px-6">
        <p className="mb-6 text-center text-[12.5px] text-ink/40">
          Built on boring, well-understood parts
        </p>
        <div className="pa-marquee relative overflow-hidden">
          <ul className="pa-marquee-track flex w-max items-center gap-12">
            {[...STACK, ...STACK].map((icon, i) => (
              <li
                key={i}
                aria-hidden={i >= STACK.length}
                className="group flex items-center gap-2.5 text-ink/35 transition-colors duration-300 hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="size-5 fill-current transition-transform duration-300 ease-out group-hover:scale-110"
                >
                  <path d={icon.path} />
                </svg>
                <span className="text-[14px] font-medium whitespace-nowrap">
                  {icon.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
