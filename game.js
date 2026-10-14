(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const context = canvas.getContext("2d");
  const scoreDisplay = document.querySelector("#score");
  const message = document.querySelector("#message");
  const hint = document.querySelector("#hint");
  const restartButton = document.querySelector("#restart");

  const WORLD_WIDTH = 2800;
  const TOTAL_SHARDS = 5;
  const DOUBLE_TAP_MS = 340;
  const keys = { left: false, right: false, jump: false };
  const player = { x: 70, y: 0, width: 34, height: 44, vx: 0, vy: 0, grounded: false };
  const shards = [
    { x: 390, lift: 86 },
    { x: 850, lift: 95 },
    { x: 1320, lift: 88 },
    { x: 1840, lift: 100 },
    { x: 2350, lift: 92 },
  ];

  let width = 0;
  let height = 0;
  let groundY = 0;
  let cameraX = 0;
  let score = 0;
  let elapsed = 0;
  let previousTime = 0;
  let finished = false;
  let moveTargetX = null;
  let lastTap = null;

  function platforms() {
    return [
      { x: 270, y: groundY - 82, width: 190 },
      { x: 600, y: groundY - 145, width: 180 },
      { x: 900, y: groundY - 76, width: 220 },
      { x: 1230, y: groundY - 130, width: 185 },
      { x: 1530, y: groundY - 78, width: 225 },
      { x: 1880, y: groundY - 150, width: 190 },
      { x: 2190, y: groundY - 88, width: 220 },
    ];
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    groundY = height - 42;
    if (!player.grounded && player.y === 0) player.y = groundY - player.height;
  }

  function reset() {
    player.x = 70;
    player.y = groundY - player.height;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    keys.left = false;
    keys.right = false;
    keys.jump = false;
    cameraX = 0;
    moveTargetX = null;
    lastTap = null;
    score = 0;
    elapsed = 0;
    finished = false;
    for (const shard of shards) shard.collected = false;
    scoreDisplay.textContent = "0";
    message.textContent = "光るかけらを集めて、旗のところまで進もう。";
    hint.textContent = "タップで移動先を指定 · ダブルタップでジャンプ";
    hint.classList.remove("hidden");
  }

  function setKey(key, pressed) {
    if (key === "ArrowLeft" || key.toLowerCase() === "a") {
      keys.left = pressed;
      if (pressed) moveTargetX = null;
    }
    if (key === "ArrowRight" || key.toLowerCase() === "d") {
      keys.right = pressed;
      if (pressed) moveTargetX = null;
    }
    if (key === " " || key === "ArrowUp" || key.toLowerCase() === "w") {
      if (pressed && !keys.jump && player.grounded && !finished) {
        player.vy = -690;
        player.grounded = false;
      }
      keys.jump = pressed;
    }
  }

  window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(event.key)) event.preventDefault();
    setKey(event.key, true);
    hint.classList.add("hidden");
  });

  window.addEventListener("keyup", (event) => setKey(event.key, false));
  window.addEventListener("blur", () => {
    keys.left = false;
    keys.right = false;
    keys.jump = false;
  });

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (finished) return;
    const bounds = canvas.getBoundingClientRect();
    const tapX = event.clientX - bounds.left;
    const tapY = event.clientY - bounds.top;
    const now = performance.now();
    const isDoubleTap = lastTap &&
      now - lastTap.time <= DOUBLE_TAP_MS &&
      Math.hypot(tapX - lastTap.x, tapY - lastTap.y) <= 48;

    if (isDoubleTap) {
      moveTargetX = null;
      if (player.grounded) {
        setKey(" ", true);
        setKey(" ", false);
      }
      lastTap = null;
    } else {
      moveTargetX = Math.max(
        0,
        Math.min(WORLD_WIDTH - player.width, cameraX + tapX - player.width / 2),
      );
      lastTap = { x: tapX, y: tapY, time: now };
    }

    hint.classList.add("hidden");
  });

  restartButton.addEventListener("click", reset);
  window.addEventListener("resize", resize);

  function update(delta) {
    if (finished) return;
    elapsed += delta;

    const targetDirection = moveTargetX === null ? 0 : Math.sign(moveTargetX - player.x);
    const direction = Number(keys.right) - Number(keys.left) || targetDirection;
    player.vx = direction * 310;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.vx * delta));
    if (moveTargetX !== null && Math.abs(moveTargetX - player.x) < 6) {
      player.x = moveTargetX;
      player.vx = 0;
      moveTargetX = null;
    }
    player.vy += 1750 * delta;

    const oldBottom = player.y + player.height;
    player.y += player.vy * delta;
    player.grounded = false;
    if (player.y + player.height >= groundY) {
      player.y = groundY - player.height;
      player.vy = 0;
      player.grounded = true;
    }

    for (const platform of platforms()) {
      const overlapsX = player.x + player.width > platform.x && player.x < platform.x + platform.width;
      const crossesTop = oldBottom <= platform.y && player.y + player.height >= platform.y;
      if (player.vy >= 0 && overlapsX && crossesTop) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.grounded = true;
      }
    }

    for (const shard of shards) {
      const shardY = groundY - shard.lift;
      if (!shard.collected && Math.abs((player.x + player.width / 2) - shard.x) < 28 &&
          Math.abs((player.y + player.height / 2) - shardY) < 32) {
        shard.collected = true;
        score += 1;
        scoreDisplay.textContent = String(score);
        message.textContent = score === TOTAL_SHARDS
          ? "すべてのかけらを集めた！旗を目指そう。"
          : `かけらを見つけた！ あと ${TOTAL_SHARDS - score} 個。`;
      }
    }

    cameraX += (Math.max(0, Math.min(WORLD_WIDTH - width, player.x - width * 0.34)) - cameraX) *
      Math.min(1, delta * 5);

    if (player.x >= WORLD_WIDTH - 115) {
      finished = true;
      message.textContent = `ゴール！ ${score} / ${TOTAL_SHARDS} 個のかけらを集めた。`;
      hint.classList.remove("hidden");
      hint.textContent = "やり直すボタンで、もう一度冒険できます";
    }
  }

  function roundedRect(x, y, w, h, radius) {
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
  }

  function drawBackground() {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#101a38");
    sky.addColorStop(0.48, "#37466e");
    sky.addColorStop(0.78, "#b66b78");
    sky.addColorStop(1, "#f2a36e");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < 58; i += 1) {
      const x = (i * 173 + 31) % width;
      const y = (i * 79 + 17) % Math.max(1, height * 0.56);
      const twinkle = 0.45 + (Math.sin(elapsed * 2 + i) + 1) * 0.25;
      context.fillStyle = `rgba(229, 237, 255, ${twinkle})`;
      context.beginPath();
      context.arc(x, y, i % 7 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);
      context.fill();
    }

    const moonGlow = context.createRadialGradient(
      width * 0.78 - cameraX * 0.035, height * 0.2, 10,
      width * 0.78 - cameraX * 0.035, height * 0.2, 88,
    );
    moonGlow.addColorStop(0, "rgba(255, 221, 178, 0.46)");
    moonGlow.addColorStop(1, "rgba(255, 194, 166, 0)");
    context.fillStyle = moonGlow;
    context.fillRect(0, 0, width, height * 0.48);
    context.fillStyle = "#ffe5bd";
    context.shadowColor = "rgba(255, 211, 168, 0.75)";
    context.shadowBlur = 30;
    context.beginPath();
    context.arc(width * 0.78 - cameraX * 0.035, height * 0.2, 27, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    for (let layer = 0; layer < 4; layer += 1) {
      const y = height * (0.52 + layer * 0.105);
      const parallax = cameraX * (0.07 + layer * 0.075);
      const colors = ["#65749a", "#4d5d83", "#35476a", "#283955"];
      const peakHeight = 48 + layer * 17;
      context.fillStyle = colors[layer];
      context.beginPath();
      context.moveTo(0, height);
      context.lineTo(-100, y + 45);
      for (let x = -170; x <= width + 170; x += 170) {
        const peak = x - (parallax % 510);
        context.lineTo(peak + 80, y - peakHeight - Math.sin(x * 0.01 + layer) * 16);
        context.lineTo(peak + 170, y + 35);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fill();
    }

    const haze = context.createLinearGradient(0, height * 0.66, 0, height);
    haze.addColorStop(0, "rgba(236, 151, 126, 0)");
    haze.addColorStop(1, "rgba(241, 145, 117, 0.16)");
    context.fillStyle = haze;
    context.fillRect(0, height * 0.6, width, height * 0.4);
  }

  function drawWorld() {
    context.save();
    context.translate(-cameraX, 0);

    const ground = context.createLinearGradient(0, groundY, 0, height);
    ground.addColorStop(0, "#263b55");
    ground.addColorStop(0.18, "#17283f");
    ground.addColorStop(1, "#101a2d");
    context.fillStyle = ground;
    context.fillRect(0, groundY, WORLD_WIDTH, height - groundY);
    context.fillStyle = "#65d8c9";
    context.shadowColor = "rgba(87, 237, 217, 0.75)";
    context.shadowBlur = 12;
    context.fillRect(0, groundY, WORLD_WIDTH, 3);
    context.shadowBlur = 0;

    for (let x = 20; x < WORLD_WIDTH; x += 74) {
      const detailY = groundY + 16 + ((x * 13) % Math.max(1, height - groundY - 20));
      context.fillStyle = x % 3 === 0 ? "rgba(122, 177, 191, 0.2)" : "rgba(208, 151, 135, 0.17)";
      context.fillRect(x, detailY, 18 + (x % 19), 1);
      context.fillStyle = "rgba(113, 220, 204, 0.45)";
      context.fillRect(x + 5, groundY + 5, 2, 2);
    }

    if (moveTargetX !== null) {
      const markerX = moveTargetX + player.width / 2;
      const pulse = 1 + Math.sin(elapsed * 7) * 0.12;
      context.save();
      context.translate(markerX, groundY - 5);
      context.scale(pulse, pulse);
      context.strokeStyle = "rgba(152, 255, 229, 0.82)";
      context.lineWidth = 2;
      context.shadowColor = "#76f5d6";
      context.shadowBlur = 12;
      context.beginPath();
      context.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2);
      context.stroke();
      context.shadowBlur = 0;
      context.beginPath();
      context.moveTo(-5, -10);
      context.lineTo(-5, -16);
      context.lineTo(5, -16);
      context.lineTo(5, -10);
      context.stroke();
      context.restore();
    }

    for (const platform of platforms()) {
      const platformFace = context.createLinearGradient(0, platform.y, 0, platform.y + 20);
      platformFace.addColorStop(0, "#354e69");
      platformFace.addColorStop(1, "#1b2b43");
      context.fillStyle = platformFace;
      roundedRect(platform.x, platform.y, platform.width, 18, 6);
      context.fill();
      context.strokeStyle = "rgba(132, 221, 218, 0.32)";
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = "#a5f0d9";
      context.shadowColor = "rgba(113, 245, 217, 0.72)";
      context.shadowBlur = 10;
      roundedRect(platform.x, platform.y, platform.width, 4, 3);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = "rgba(176, 198, 224, 0.36)";
      context.fillRect(platform.x + 14, platform.y + 12, Math.min(36, platform.width - 28), 2);
      context.fillRect(platform.x + platform.width - 31, platform.y + 12, 17, 2);
    }

    for (const shard of shards) {
      if (shard.collected) continue;
      const y = groundY - shard.lift + Math.sin(elapsed * 3.5 + shard.x) * 5;
      context.save();
      context.translate(shard.x, y);
      context.rotate(Math.sin(elapsed * 2 + shard.x) * 0.12);
      context.shadowColor = "#ffd27c";
      context.shadowBlur = 22;
      context.fillStyle = "#ffe5a0";
      context.beginPath();
      context.moveTo(0, -12);
      context.lineTo(9, 0);
      context.lineTo(0, 12);
      context.lineTo(-9, 0);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(255, 255, 235, 0.86)";
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      context.fillRect(-1, -6, 2, 5);
      context.restore();
    }

    const goalX = WORLD_WIDTH - 135;
    context.fillStyle = "rgba(255, 199, 142, 0.22)";
    context.beginPath();
    context.ellipse(goalX + 24, groundY - 8, 38, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e7f4e9";
    context.shadowColor = "rgba(200, 255, 228, 0.8)";
    context.shadowBlur = 12;
    context.fillRect(goalX, groundY - 112, 4, 112);
    context.shadowBlur = 0;
    context.fillStyle = "#ff9d79";
    context.beginPath();
    context.moveTo(goalX + 4, groundY - 110);
    context.lineTo(goalX + 56, groundY - 94);
    context.lineTo(goalX + 4, groundY - 77);
    context.closePath();
    context.fill();
    context.fillStyle = "#ffe2a2";
    context.beginPath();
    context.arc(goalX + 4, groundY - 112, 4, 0, Math.PI * 2);
    context.fill();

    const bob = player.grounded ? Math.sin(elapsed * 12) * (Math.abs(player.vx) > 0 ? 2 : 0) : 0;
    const facing = player.vx < 0 ? -1 : 1;
    context.save();
    context.translate(player.x + player.width / 2, player.y + bob);
    context.scale(facing, 1);
    context.shadowColor = "rgba(255, 143, 110, 0.32)";
    context.shadowBlur = 14;
    context.fillStyle = "rgba(12, 22, 40, 0.38)";
    context.beginPath();
    context.ellipse(0, player.height - 1, 18, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    const capeWave = Math.sin(elapsed * 10) * (Math.abs(player.vx) > 0 ? 3 : 1);
    const cape = context.createLinearGradient(-17, 13, 13, 34);
    cape.addColorStop(0, "#ff916e");
    cape.addColorStop(0.5, "#d34f70");
    cape.addColorStop(1, "#713b70");
    context.fillStyle = cape;
    context.beginPath();
    context.moveTo(-10, 16);
    context.quadraticCurveTo(-20 - capeWave, 24, -14 - capeWave, 37);
    context.lineTo(3, 29);
    context.lineTo(11, 16);
    context.closePath();
    context.fill();

    const armor = context.createLinearGradient(-10, 12, 11, 38);
    armor.addColorStop(0, "#e6f5eb");
    armor.addColorStop(0.45, "#84d7d1");
    armor.addColorStop(1, "#3b8b9c");
    context.fillStyle = armor;
    roundedRect(-11, 13, 22, 25, 8);
    context.fill();
    context.fillStyle = "#f3c27e";
    roundedRect(-11, 27, 22, 4, 2);
    context.fill();
    context.fillStyle = "#d8eced";
    roundedRect(-10, 34, 8, 9, 3);
    context.fill();
    roundedRect(2, 34, 8, 9, 3);
    context.fill();

    context.shadowColor = "rgba(102, 239, 224, 0.46)";
    context.shadowBlur = 9;
    context.fillStyle = "#182945";
    context.beginPath();
    context.arc(0, 10, 12, Math.PI, Math.PI * 2);
    context.lineTo(11, 14);
    context.quadraticCurveTo(0, 20, -11, 14);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#f1c092";
    context.beginPath();
    context.arc(0, 11, 8, Math.PI, Math.PI * 2);
    context.lineTo(8, 13);
    context.quadraticCurveTo(0, 17, -8, 13);
    context.closePath();
    context.fill();
    context.fillStyle = "#17263c";
    roundedRect(1, 10, 5, 2, 1);
    context.fill();
    context.fillStyle = "#ffe2a2";
    context.fillRect(2, 10, 2, 1);

    context.fillStyle = "#f8c778";
    context.beginPath();
    context.moveTo(-10, 3);
    context.lineTo(-7, -2);
    context.lineTo(-2, 4);
    context.closePath();
    context.fill();
    context.restore();
    context.restore();
  }

  function frame(time) {
    const delta = Math.min((time - previousTime) / 1000 || 0, 0.033);
    previousTime = time;
    update(delta);
    context.clearRect(0, 0, width, height);
    drawBackground();
    drawWorld();
    requestAnimationFrame(frame);
  }

  resize();
  reset();
  requestAnimationFrame(frame);
})();
