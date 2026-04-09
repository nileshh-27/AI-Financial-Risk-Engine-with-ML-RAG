import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";

export function ParticleBackground() {
  const particlesInit = async (engine: Engine) => {
    await loadSlim(engine);
  };

  return (
    <div className="particle-root" aria-hidden="true">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          fullScreen: { enable: true, zIndex: 0 },
          detectRetina: true,
          fpsLimit: 60,
          background: { color: { value: "transparent" } },
          interactivity: {
            events: {
              onHover: { enable: true, mode: "repulse" },
              resize: true,
            },
            modes: {
              repulse: { distance: 120, duration: 0.25 },
            },
          },
          particles: {
            number: { value: 95, density: { enable: true, area: 900 } },
            color: { value: ["#3b82f6", "#60a5fa", "#93c5fd"] },
            links: {
              enable: true,
              distance: 130,
              opacity: 0.32,
              width: 1,
              color: "#60a5fa",
            },
            move: {
              enable: true,
              speed: 0.85,
              direction: "none",
              outModes: { default: "out" },
            },
            opacity: { value: { min: 0.25, max: 0.62 } },
            size: { value: { min: 1, max: 4 } },
          },
        }}
      />
      <div className="particle-overlay" />
    </div>
  );
}
