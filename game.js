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
    cameraX = 0;
    score = 0;
    elapsed = 0;
    finished = false;
    for (const shard of shards) shard.collected = false;
    scoreDisplay.textContent = "0";
    message.textContent = "光るかけらを集めて、旗のところまで進もう。";
    hint.classList.remove("hidden");
  }

  function setKey(key, pressed) {
    if (key === "ArrowLeft" || key.toLowerCase() === "a") keys.left = pressed;
    if (key === "ArrowRight" || key.toLowerCase() === "d") keys.right = pressed;
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

  for (const button of document.querySelectorAll(".touch-button")) {
    const key = button.dataset.key;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (key === "jump") setKey(" ", true);
      else keys[key] = true;
      hint.classList.add("hidden");
    });
    const release = () => {
      if (key === "jump") setKey(" ", false);
      else keys[key] = false;
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  restartButton.addEventListener("click", reset);
  window.addEventListener("resize", resize);

  function update(delta) {
    if (finished) return;
    elapsed += delta;

    const direction = Number(keys.right) - Number(keys.left);
    player.vx = direction * 310;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.vx * delta));
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
    sky.addColorStop(0, "#829dbc");
    sky.addColorStop(0.56, "#b4cbd2");
    sky.addColorStop(1, "#d7d3b2");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255, 239, 192, 0.74)";
    context.beginPath();
    context.arc(width * 0.78 - cameraX * 0.035, height * 0.2, 34, 0, Math.PI * 2);
    context.fill();

    for (let layer = 0; layer < 3; layer += 1) {
      const y = height * (0.49 + layer * 0.12);
      const parallax = cameraX * (0.08 + layer * 0.09);
      context.fillStyle = ["#94b2bc", "#72949e", "#527882"][layer];
      context.beginPath();
      context.moveTo(0, height);
      for (let x = -130; x <= width + 130; x += 130) {
        const peak = x - (parallax % 390);
        context.lineTo(peak, y + Math.sin((x + layer * 88) * 0.012) * 24);
        context.lineTo(peak + 70, y - 52 - layer * 13);
        context.lineTo(peak + 150, y + 20);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fill();
    }
  }

  function drawWorld() {
    context.save();
    context.translate(-cameraX, 0);

    const ground = context.createLinearGradient(0, groundY, 0, height);
    ground.addColorStop(0, "#496b60");
    ground.addColorStop(1, "#273d3d");
    context.fillStyle = ground;
    context.fillRect(0, groundY, WORLD_WIDTH, height - groundY);
    context.fillStyle = "#a6c987";
    context.fillRect(0, groundY, WORLD_WIDTH, 5);

    for (const platform of platforms()) {
      context.fillStyle = "#3d5c54";
      roundedRect(platform.x, platform.y, platform.width, 13, 6);
      context.fill();
      context.fillStyle = "#b0cd8e";
      roundedRect(platform.x, platform.y, platform.width, 6, 4);
      context.fill();
      context.fillStyle = "rgba(223, 235, 190, 0.45)";
      context.fillRect(platform.x + 13, platform.y + 17, 24, 2);
    }

    for (const shard of shards) {
      if (shard.collected) continue;
      const y = groundY - shard.lift + Math.sin(elapsed * 3.5 + shard.x) * 5;
      context.save();
      context.translate(shard.x, y);
      context.rotate(Math.sin(elapsed * 2 + shard.x) * 0.12);
      context.shadowColor = "#fff0a6";
      context.shadowBlur = 18;
      context.fillStyle = "#ffe28a";
      context.beginPath();
      context.moveTo(0, -12);
      context.lineTo(9, 0);
      context.lineTo(0, 12);
      context.lineTo(-9, 0);
      context.closePath();
      context.fill();
      context.restore();
    }

    const goalX = WORLD_WIDTH - 135;
    context.fillStyle = "#f3f3df";
    context.fillRect(goalX, groundY - 112, 4, 112);
    context.fillStyle = "#f1a17f";
    context.beginPath();
    context.moveTo(goalX + 4, groundY - 111);
    context.lineTo(goalX + 56, groundY - 95);
    context.lineTo(goalX + 4, groundY - 78);
    context.closePath();
    context.fill();

    const bob = player.grounded ? Math.sin(elapsed * 12) * (Math.abs(player.vx) > 0 ? 2 : 0) : 0;
    context.save();
    context.translate(player.x, player.y + bob);
    context.shadowColor = "rgba(33, 48, 59, 0.22)";
    context.shadowBlur = 8;
    context.shadowOffsetY = 5;
    context.fillStyle = "#f5f2df";
    roundedRect(2, 10, player.width - 4, player.height - 10, 11);
    context.fill();
    context.shadowColor = "transparent";
    context.fillStyle = "#e9a982";
    roundedRect(5, 1, 25, 22, 9);
    context.fill();
    context.fillStyle = "#253648";
    context.beginPath();
    context.arc(22, 11, 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#8ce8e2";
    roundedRect(7, 25, 20, 12, 5);
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
