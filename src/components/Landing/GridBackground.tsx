"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#f97316", "#fb923c", "#fdba74"];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = (count: number) => {
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      return particles;
    };

    const drawGrid = () => {
      const gridSize = 60;
      ctx.strokeStyle = "rgba(82, 82, 91, 0.15)";
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    const drawParticles = () => {
      particlesRef.current.forEach((particle) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw enhanced gradient background - from deep blue-black to deep purple-black
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#0f0f13"); // Lighter than pure black
      gradient.addColorStop(0.5, "#0d0d12"); // Mid tone with slight blue
      gradient.addColorStop(1, "#120e15"); // Deep purple-black at bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add radial gradient orbs for depth
      const orb1 = ctx.createRadialGradient(
        canvas.width * 0.2,
        canvas.height * 0.3,
        0,
        canvas.width * 0.2,
        canvas.height * 0.3,
        canvas.width * 0.5
      );
      orb1.addColorStop(0, "rgba(249, 115, 22, 0.03)"); // Orange glow
      orb1.addColorStop(1, "transparent");
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const orb2 = ctx.createRadialGradient(
        canvas.width * 0.8,
        canvas.height * 0.7,
        0,
        canvas.width * 0.8,
        canvas.height * 0.7,
        canvas.width * 0.4
      );
      orb2.addColorStop(0, "rgba(139, 92, 246, 0.02)"); // Purple glow
      orb2.addColorStop(1, "transparent");
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawGrid();
      drawParticles();

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    particlesRef.current = createParticles(50);
    animate();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ pointerEvents: "none" }}
    />
  );
}
