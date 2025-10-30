<script lang="ts">
  import { onMount } from "svelte";
  import { sorters } from "./lib/sort";
  import { currentURL, updateURL, swap } from "./lib/util";
  import { setupAudio, tone } from "./lib/audio";
  import type { Bar, SortGenerator } from "./lib/types";
  import { bars, createBars, setBars } from "./lib/bars";

  const orders = {
    shuffle,
    reverse,
    valley,
    mountain,
  };

  function createState(url: URL) {
    let key = url.searchParams.get("sorter");
    if (!key || !(key in sorters)) key = "bubble";

    let order = url.searchParams.get("order");
    if (!order || !(order in orders)) order = "shuffle";

    let size = Number(url.searchParams.get("size") ?? 50);
    if (size < 10 || size > 1000) size = 50;

    let delay = Number(url.searchParams.get("delay") ?? 10);
    if (delay < 2 || delay > 100) delay = 10;

    return {
      paused: true,
      sorter: key,
      order: "shuffle",
      size,
      delay,
    };
  }

  const state = $state(createState(currentURL()));

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  onMount(() => {
    ctx = canvas.getContext("2d")!;
    if (!ctx) throw new Error("Canvas2D not supported");

    document.addEventListener("pointerdown", setupAudio, { once: true });
  });

  $effect(() => {
    setBars(createBars(state.size));
    shuffle();
    // render();

    const timeout = setTimeout(() => updateURL("size", state.size), 200);
    return () => clearTimeout(timeout);
  });

  $effect(() => {
    updateURL("sorter", state.sorter);
  });

  $effect(() => {
    const delay = state.delay;
    const timeout = setTimeout(() => updateURL("delay", delay), 200);
    return () => clearTimeout(timeout);
  });

  function shuffle() {
    state.paused = true;
    for (let i = bars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      swap(bars, i, j);
    }
    render();
  }

  const gap = 0.2;
  function render(read?: number[], write?: number[]) {
    const [w, h] = [canvas.width, canvas.height];
    ctx.clearRect(0, 0, w, h);
    const barWidth = (w - (bars.length - 1) * gap) / bars.length;

    for (let i = 0; i < bars.length; i++) {
      const barHeight = (bars[i].value / bars.length) * h;
      ctx.fillStyle = "gray";
      if (read?.includes(i)) ctx.fillStyle = "skyblue";
      if (write?.includes(i)) ctx.fillStyle = "orange";
      ctx.fillRect(i * (barWidth + gap), h - barHeight, barWidth, barHeight);
    }
  }

  function run(step: SortGenerator) {
    let lastTime = performance.now();
    let acc = 0;

    let next = step.next();

    const animate = (now: number) => {
      if (state.paused) return;

      const dt = now - lastTime;
      lastTime = now;
      acc += dt;

      while (acc >= state.delay && !next.done) {
        tone(bars, next.value.sound);
        acc -= state.delay;
        next = step.next();
      }

      if (next.done) {
        render();
        state.paused = true;
        return;
      }

      render(next.value.read, next.value.write);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  $effect(() => {
    if (state.paused) return;
    run(getSorter(state.sorter)(bars));
  });

  export function oddsEvens() {
    return bars
      .sort((a, b) => a.value - b.value)
      .reduce<[Bar[], Bar[]]>(
        ([odds, evens], b) => {
          if (b.value % 2 === 0) evens.push(b);
          else odds.push(b);
          return [odds, evens];
        },
        [[], []],
      );
  }

  function reverse() {
    state.paused = true;
    bars.sort((a, b) => a.value - b.value).reverse();
    render();
  }

  function valley() {
    state.paused = true;
    const [odds, evens] = oddsEvens();
    setBars([...odds.reverse(), ...evens]);
    render();
  }

  function mountain() {
    state.paused = true;
    const [odds, evens] = oddsEvens();
    setBars([...odds, ...evens.reverse()]);
    render();
  }

  function getSorter(k: string) {
    return sorters[k as keyof typeof sorters];
  }

  function setSorter(k: string) {
    if (!(k in sorters)) return;
    state.sorter = k;
    state.paused = true;
  }
</script>

<main class="flex flex-col h-screen w-screen p-4 justify-between">
  <section class="flex gap-4 items-center">
    <select class="select cursor-pointer">
      {#each Object.keys(sorters) as k}
        <option selected={state.sorter == k} onclick={() => setSorter(k)}>
          {k[0].toUpperCase() + k.substring(1)}
        </option>
      {/each}
    </select>
    <button class="btn" onclick={() => (state.paused = !state.paused)}>
      {#if state.paused}Start{:else}Stop{/if}
    </button>
    <button class="btn">Step</button>
    <button class="btn" onclick={() => shuffle()}>Shuffle</button>
    <button class="btn" onclick={() => reverse()}>Reverse</button>
    <button class="btn" onclick={() => valley()}> Valley </button>
    <button class="btn" onclick={() => mountain()}>Mountain</button>
    <div class="flex flex-grow items-center gap-4">
      <input
        type="range"
        class="range"
        min="10"
        max="1000"
        step="10"
        bind:value={state.size}
        disabled={!state.paused}
      />
      <span>{state.size}</span>
    </div>
    <div class="flex flex-grow items-center gap-4">
      <input
        type="range"
        class="range"
        min="2"
        max="100"
        step="2"
        bind:value={state.delay}
      />
      <span>{state.delay}ms</span>
    </div>
  </section>
  <canvas
    class="border"
    bind:this={canvas}
    width={window.innerWidth * 0.8}
    height={window.innerHeight * 0.5}
  ></canvas>
  <footer></footer>
</main>
