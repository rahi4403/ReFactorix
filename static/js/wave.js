/**
 * ReFactorix Cyber Wave Ribbon Canvas
 * Simulates the 3D glowing particle mesh wave from the template design
 */

(function () {
  const canvas = document.getElementById('hero-wave-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let animationFrameId;
  let time = 0;

  function resize() {
    const parent = canvas.parentElement;
    width = canvas.width = parent.offsetWidth;
    height = canvas.height = parent.offsetHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  // Mouse interaction
  let mouse = { x: width * 0.7, y: height * 0.5 };
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
  });

  const lines = 36;
  const points = 65;

  function draw() {
    ctx.clearRect(0, 0, width, height);
    time += 0.012;

    const isLight = document.body.classList.contains('light-theme');
    const baseAlpha = isLight ? 0.22 : 0.45;

    // Draw wavy cyber ribbons
    for (let i = 0; i < lines; i++) {
      ctx.beginPath();
      const progress = i / lines;
      const waveOffset = progress * Math.PI * 2;

      // Color gradient transitioning from amber-orange to warm red-orange and cyan hints
      let strokeColor;
      if (progress < 0.7) {
        // Orange to amber gradient
        const r = Math.floor(255);
        const g = Math.floor(91 + progress * 70);
        const b = Math.floor(38 + progress * 20);
        strokeColor = `rgba(${r}, ${g}, ${b}, ${baseAlpha * (1 - progress * 0.5)})`;
      } else {
        // Cyan-electric hint at trailing edges
        strokeColor = `rgba(0, 242, 254, ${baseAlpha * 0.6})`;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = i % 4 === 0 ? 1.8 : 1.0;

      for (let j = 0; j <= points; j++) {
        const xProgress = j / points;
        // Concentrate the ribbon on the right half of the hero box (as in template)
        const x = width * 0.42 + xProgress * (width * 0.62);

        // Sinusoidal spatial transformation
        const envelope = Math.sin(xProgress * Math.PI);
        const yBase = height * 0.48 + (progress - 0.5) * (height * 0.55);
        
        const wave1 = Math.sin(time * 1.5 + xProgress * 5 + waveOffset) * 45 * envelope;
        const wave2 = Math.cos(time * 0.8 - progress * 4 + xProgress * 3) * 35 * envelope;
        
        // Subtle mouse attraction
        const dx = x - mouse.x;
        const dy = yBase - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseEffect = Math.max(0, (1 - dist / 300)) * 25;

        const y = yBase + wave1 + wave2 - mouseEffect;

        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Floating glowing dust particles
    for (let k = 0; k < 18; k++) {
      const pX = width * 0.5 + Math.sin(time * 0.5 + k * 1.3) * (width * 0.38);
      const pY = height * 0.5 + Math.cos(time * 0.7 + k * 0.9) * (height * 0.35);
      const pRadius = 1.2 + (Math.sin(time + k) + 1) * 1.0;

      ctx.beginPath();
      ctx.arc(pX, pY, pRadius, 0, Math.PI * 2);
      ctx.fillStyle = k % 3 === 0 ? 'rgba(0, 242, 254, 0.7)' : 'rgba(255, 122, 69, 0.8)';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#FF5B26';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();
})();

