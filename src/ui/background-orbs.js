import { create, fragment, motion } from "../runtime/react-motion.js";

export function BackgroundOrbs({ reduceMotion }) {
  const primaryAnimate = reduceMotion
    ? { opacity: 0.5 }
    : { x: [0, 20, -12, 0], y: [0, -16, 8, 0], scale: [1, 1.08, 1.02, 1], opacity: [0.55, 0.9, 0.55] };
  const secondaryAnimate = reduceMotion
    ? { opacity: 0.34 }
    : { x: [0, -16, 18, 0], y: [0, 14, -10, 0], scale: [1, 1.04, 1], opacity: [0.34, 0.72, 0.34] };
  const tertiaryAnimate = reduceMotion
    ? { opacity: 0.26 }
    : { x: [0, 12, -8, 0], y: [0, 12, -12, 0], scale: [1, 1.03, 1], opacity: [0.26, 0.54, 0.26] };

  const primaryTransition = reduceMotion ? { duration: 0.01 } : { duration: 18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" };
  const secondaryTransition = reduceMotion ? { duration: 0.01 } : { duration: 22, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1.2 };
  const tertiaryTransition = reduceMotion ? { duration: 0.01 } : { duration: 26, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 2.1 };

  return create(
    fragment,
    null,
    create(motion.div, {
      className: "stage-shell-orb stage-shell-orb--primary",
      "aria-hidden": true,
      animate: primaryAnimate,
      transition: primaryTransition,
    }),
    create(motion.div, {
      className: "stage-shell-orb stage-shell-orb--secondary",
      "aria-hidden": true,
      animate: secondaryAnimate,
      transition: secondaryTransition,
    }),
    create(motion.div, {
      className: "stage-shell-orb stage-shell-orb--tertiary",
      "aria-hidden": true,
      animate: tertiaryAnimate,
      transition: tertiaryTransition,
    })
  );
}
