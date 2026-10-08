'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
}

export const ThreeDCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking for 3D rotation parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / width - 0.5) * 2;
      mouseY = (e.clientY / height - 0.5) * 2;
      targetRotY = mouseX * 0.45;
      targetRotX = -mouseY * 0.45;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Color palette: deep electric cyan, cosmic purple, warm gold, emerald
    const COLORS = [
      'rgba(6, 182, 212, 0.7)',
      'rgba(168, 85, 247, 0.6)',
      'rgba(59, 130, 246, 0.65)',
      'rgba(245, 158, 11, 0.55)',
      'rgba(16, 185, 129, 0.5)'
    ];

    const PARTICLE_COUNT = 75;
    const particles: Particle[] = [];
    const FOV = 450;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 1400,
        y: (Math.random() - 0.5) * 1400,
        z: Math.random() * 800 - 200,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }

    const render = () => {
      // Smooth interpolation towards mouse rotation
      currentRotX += (targetRotX - currentRotX) * 0.05;
      currentRotY += (targetRotY - currentRotY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);
      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);

      // Projected points storage for connecting lines
      const projected: { x: number; y: number; z: number; scale: number; color: string }[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Drift
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap boundaries in 3D box
        if (p.x < -700) p.x = 700;
        if (p.x > 700) p.x = -700;
        if (p.y < -700) p.y = 700;
        if (p.y > 700) p.y = -700;
        if (p.z < -200) p.z = 600;
        if (p.z > 600) p.z = -200;

        // 3D Rotation Y (yaw)
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        // 3D Rotation X (pitch)
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        // Perspective Projection
        const depth = z2 + 700;
        if (depth <= 50) continue;

        const scale = FOV / depth;
        const screenX = cx + x1 * scale;
        const screenY = cy + y2 * scale;

        projected.push({
          x: screenX,
          y: screenY,
          z: depth,
          scale,
          color: p.color
        });

        // Draw particle with glow
        const radius = Math.max(0.5, p.size * scale);
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // Draw subtle connecting filaments between nearby 3D points
      const maxDist = 110;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Dynamic 3D interactive particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />

      {/* Floating 3D ambient aurora orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-600/15 via-blue-600/10 to-transparent blur-[140px] animate-pulse" />
      <div className="absolute top-[40%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-purple-600/15 via-amber-600/10 to-transparent blur-[140px] animate-pulse [animation-delay:3s]" />
      <div className="absolute bottom-[-15%] left-[25%] w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-emerald-600/10 via-cyan-600/10 to-transparent blur-[160px] animate-pulse [animation-delay:6s]" />

      {/* Ethereal dark grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
};
