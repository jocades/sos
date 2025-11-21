<script lang="ts">
  import { onMount } from "svelte";
  import { sorters } from "./lib/sort";
  import { currentURL, updateURL, swap } from "./lib/util";
  import { setupAudio, tone } from "./lib/audio";
  import type { Bar, SortGenerator } from "./lib/types";

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
    if (delay < 2 || delay > 500) delay = 10;

    return {
      paused: true,
      sorterKey: key,
      order: "shuffle",
      size,
      delay,
    };
  }

  const theme = $state({
    mode: "dark",
    colors: {
      stale: "gray",
      read: "skyblue",
      write: "orange",
    },
  });

  const s = $state(createState(currentURL()));

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  function getColors() {
    const ss = getComputedStyle(document.querySelector(":root")!);
    theme.colors.stale = ss.getPropertyValue("--color-neutral-content");
    theme.colors.read = ss.getPropertyValue("--color-info");
    theme.colors.write = ss.getPropertyValue("--color-warning");
  }

  let audioActive = false;
  onMount(() => {
    ctx = canvas.getContext("2d")!;
    if (!ctx) throw new Error("Canvas2D not supported");

    document.addEventListener(
      "pointerdown",
      () => {
        setupAudio();
        audioActive = true;
      },
      { once: true },
    );

    getColors();

    document.addEventListener("keydown", (e) => {
      if (audioActive && e.key == "ArrowRight") {
        step();
      }
    });
  });

  let bars: Bar[] = [];

  function createBars(length: number) {
    return Array.from({ length }, (_, i) => ({
      value: i + 1,
      freq: 200 + ((i + 1) / length) * 800,
    }));
  }

  $effect(() => {
    bars = createBars(s.size);
    shuffle();

    const timeout = setTimeout(() => updateURL("size", s.size), 500);
    return () => clearTimeout(timeout);
  });

  $effect(() => {
    updateURL("sorter", s.sorterKey);
  });

  $effect(() => {
    const delay = s.delay;
    const timeout = setTimeout(() => updateURL("delay", delay), 500);
    return () => clearTimeout(timeout);
  });

  let stepper: SortGenerator;
  $effect(() => {
    stepper = getSorter(s.sorterKey)(bars);
  });

  function reset() {
    s.paused = true;
    stepper = getSorter(s.sorterKey)(bars);
    render();
  }

  function step() {
    const next = stepper.next();

    if (next.done) {
      reset();
      return;
    }

    tone(bars, next.value.sound);
    render(next.value.read, next.value.write);
  }

  function shuffle() {
    for (let i = bars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      swap(bars, i, j);
    }
    reset();
  }

  const gap = 0.2;
  function render(read?: number[], write?: number[]) {
    const [w, h] = [canvas.width, canvas.height];
    ctx.clearRect(0, 0, w, h);
    const barWidth = (w - (bars.length - 1) * gap) / bars.length;

    for (let i = 0; i < bars.length; i++) {
      const barHeight = (bars[i].value / bars.length) * h;
      ctx.fillStyle = theme.colors.stale;
      if (read?.includes(i)) ctx.fillStyle = theme.colors.read;
      if (write?.includes(i)) ctx.fillStyle = theme.colors.write;
      ctx.fillRect(i * (barWidth + gap), h - barHeight, barWidth, barHeight);
    }
  }

  function run() {
    let next = stepper.next();

    const step = () => {
      tone(bars, next.value.sound);
      render(next.value.read, next.value.write);
      next = stepper.next();
    };

    if (!next.done) {
      step();
    }

    let lastTime = performance.now();
    let acc = 0;

    const animate = (now: number) => {
      if (s.paused) return;

      const dt = now - lastTime;
      lastTime = now;
      acc += dt;

      if (next.done) {
        reset();
        return;
      }

      if (acc >= s.delay) {
        step();
        acc = 0;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  $effect(() => {
    if (s.paused) return;
    run();
  });

  function oddsEvens() {
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
    bars.sort((a, b) => a.value - b.value).reverse();
    reset();
  }

  function valley() {
    const [odds, evens] = oddsEvens();
    bars = [...odds.reverse(), ...evens];
    reset();
  }

  function mountain() {
    const [odds, evens] = oddsEvens();
    bars = [...odds, ...evens.reverse()];
    reset();
  }

  function getSorter(k: string) {
    return sorters[k as keyof typeof sorters];
  }

  function setSorter(k: string) {
    if (!(k in sorters)) return;
    s.sorterKey = k;
    s.paused = true;
  }
</script>

<main class="flex flex-col h-screen w-screen p-4">
  <header
    class="sticky top-0 flex items-center border-b border-base-300 pb-4 justify-between"
  >
    <span class="text-2xl font-bold leading-tight">Sound of Sorting</span>
    <label class="swap swap-rotate">
      <input type="checkbox" class="theme-controller" value="nord" />
      <svg
        class="swap-off h-4 w-4 fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"
        />
      </svg>
      <svg
        class="swap-on h-4 w-4 fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"
        />
      </svg>
    </label>
  </header>
  <div class="flex flex-col flex-grow justify-between">
    <section class="flex gap-4 items-center pt-8 justify-between">
      <select class="select cursor-pointer max-w-48">
        {#each Object.keys(sorters) as k}
          <option selected={s.sorterKey == k} onclick={() => setSorter(k)}>
            {k[0].toUpperCase() + k.substring(1)}
          </option>
        {/each}
      </select>
      <div class="join">
        <button
          class={["btn join-item w-16", s.paused ? "btn-success" : "btn-error"]}
          onclick={() => (s.paused = !s.paused)}
        >
          {#if s.paused}Start{:else}Stop{/if}
        </button>
        <button class="btn btn-soft join-item" onclick={step}>Step</button>
      </div>
      <div class="join">
        <button class="btn btn-soft join-item" onclick={shuffle}>
          Shuffle
        </button>
        <button class="btn btn-soft join-item" onclick={reverse}>
          Reverse
        </button>
        <button class="btn btn-soft join-item" onclick={valley}>
          Valley
        </button>
        <button class="btn btn-soft join-item" onclick={mountain}>
          Mountain
        </button>
      </div>
      <div class="flex flex-grow items-center gap-2.5">
        <input
          type="range"
          class="range"
          min="10"
          max="1000"
          step="10"
          bind:value={s.size}
          disabled={!s.paused}
        />
        <span>{s.size}</span>
      </div>
      <div class="flex flex-grow items-center gap-4">
        <input
          type="range"
          class="range"
          min="2"
          max="500"
          step="2"
          bind:value={s.delay}
        />
        <span>{s.delay}ms</span>
      </div>
    </section>
    <canvas
      bind:this={canvas}
      width={window.innerWidth * 0.8}
      height={window.innerHeight * 0.5}
    ></canvas>
    <footer></footer>
  </div>
</main>
