import { React, create, motion, useReducedMotion } from "../runtime/react-motion.js";
import { baseTitle } from "../constants/ui.js";
import { BackgroundOrbs } from "./background-orbs.js";

export function StatusScreen({ title, description, details }) {
  const reduceMotion = Boolean(useReducedMotion());

  React.useEffect(() => {
    document.title = title || baseTitle;
  }, [title]);

  return create(
    "div",
    { className: "experience-shell" },
    create(BackgroundOrbs, { reduceMotion }),
    create(
      "div",
      { className: "stage-frame flex h-full w-full items-center justify-center p-6" },
      create(
        motion.div,
        {
          className: "floating-card max-w-2xl px-8 py-10 text-center",
          initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 },
          animate: reduceMotion
            ? { opacity: 1 }
            : { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 18 } },
        },
        create("p", { className: "section-kicker" }, "Sanity"),
        create("h1", { className: "font-display mt-5 text-4xl uppercase tracking-[0.12em] text-white" }, title),
        create("p", { className: "mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70" }, description),
        details ? create("p", { className: "mt-6 text-[10px] uppercase tracking-[0.4em] text-white/35" }, details) : null
      )
    )
  );
}
