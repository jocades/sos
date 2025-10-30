<script lang="ts">
  import { onMount } from "svelte";
  import { customOscillators } from "web-audio-oscillators";

  const sorters = {
    bubble,
    insertion,
    pass,
  };

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
    if (size < 10 || size >= 1000) size = 50;

    let delay = Number(url.searchParams.get("delay") ?? 10);
    if (delay < 2 || delay >= 100) delay = 10;

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

    document.addEventListener("pointerdown", setupSound, { once: true });
  });

  const audioCtx = new AudioContext();
  let osc: OscillatorNode;
  let gain: GainNode;

  async function setupSound() {
    osc = customOscillators.triangle(audioCtx);
    gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    console.log("Start oscillator");
  }

  function tone(bar: Bar) {
    if (audioCtx.state !== "running") return;

    const now = audioCtx.currentTime;

    osc.frequency.setValueAtTime(bar.freq, now);

    let duration = 0.05;
    if (state.delay >= 50) duration = 0.1;
    else if (state.delay >= 80) duration = 0.2;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.25, now);
    // gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.gain.setValueAtTime(0, now + duration);
  }

  interface Bar {
    value: number;
    freq: number;
  }

  function createBars(length: number) {
    return Array.from({ length }, (_, i) => ({
      value: i + 1,
      freq: 200 + ((i + 1) / length) * 800,
    }));
  }

  let bars: Bar[] = [];

  $effect(() => {
    bars = createBars(state.size);
    // shuffle();
    render();

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

  function swap<T>(a: T[], i: number, j: number) {
    [a[i], a[j]] = [a[j], a[i]];
  }

  function shuffle() {
    state.paused = true;
    for (let i = bars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      swap(bars, i, j);
    }
    render();
  }

  const gap = 0.2;
  function render(hls?: number[]) {
    const [w, h] = [canvas.width, canvas.height];
    ctx.clearRect(0, 0, w, h);
    const barWidth = (w - (bars.length - 1) * gap) / bars.length;

    for (let i = 0; i < bars.length; i++) {
      const barHeight = (bars[i].value / bars.length) * h;
      ctx.fillStyle = hls?.includes(i) ? "skyblue" : "gray";
      ctx.fillRect(i * (barWidth + gap), h - barHeight, barWidth, barHeight);
    }
  }

  function* pass() {
    for (let i = 0; i < bars.length; i++) {
      yield { access: [i], sound: i };
    }
  }

  type SortGenerator = Generator<{ access: number[]; sound: number[] }>;

  function progress(access: number[], sound: number[]) {
    return { access, sound };
  }

  function* bubble(): SortGenerator {
    for (let i = 0; i < bars.length; i++) {
      for (let j = 0; j < bars.length - i - 1; j++) {
        // yield { access: [j, j + 1], sound: [j + 1] };
        yield progress([j, j + 1], [j + 1]);
        if (bars[j].value > bars[j + 1].value) {
          swap(bars, j, j + 1);
        }
      }
    }
  }

  function* insertion(): SortGenerator {
    for (let i = 1; i < bars.length; i++) {
      const cur = bars[i];
      let j;
      for (j = i - 1; j >= 0 && bars[j].value > cur.value; j--) {
        bars[j + 1] = bars[j];
        yield { access: [i, j], sound: [j] };
      }
      bars[j + 1] = cur;
      yield { access: [i, j + 1], sound: [i] };
    }
  }

  function* mergeSort(bars: Bar[], l = 0, r = bars.length - 1): SortGenerator {
    if (l >= r) return;

    const mid = Math.floor((l + r) / 2);

    yield* mergeSort(bars, l, mid);

    yield* mergeSort(bars, mid + 1, r);

    yield* merge(bars, l, mid, r);
  }

  function* merge(
    bars: Bar[],
    l: number,
    mid: number,
    r: number,
  ): SortGenerator {
    const left = bars.slice(l, mid + 1);
    const right = bars.slice(mid + 1, r + 1);
    let i = 0,
      j = 0,
      k = l;

    while (i < left.length && j < right.length) {
      yield { access: [l + i, mid + 1 + j], sound: [k] };
      if (left[i].value <= right[j].value) {
        bars[k++] = left[i++];
      } else {
        bars[k++] = right[j++];
      }
    }

    while (i < left.length) {
      bars[k++] = left[i++];
      yield { access: [k - 1], sound: [k - 1] };
    }

    while (j < right.length) {
      bars[k++] = right[j++];
      yield { access: [k - 1], sound: [k - 1] };
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
        tone(bars[next.value.sound[0]]);
        acc -= state.delay;
        next = step.next();
      }

      if (next.done) {
        render();
        state.paused = true;
        return;
      }

      render(next.value.access);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  $effect(() => {
    if (state.paused) return;
    // run(getSorter(state.sorter)());
    run(mergeSort(bars));
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
    state.paused = true;
    bars.sort((a, b) => a.value - b.value).reverse();
    render();
  }

  function valley() {
    state.paused = true;
    const [odds, evens] = oddsEvens();
    bars = [...odds.reverse(), ...evens];
    render();
  }

  function mountain() {
    state.paused = true;
    const [odds, evens] = oddsEvens();
    bars = [...odds, ...evens.reverse()];
    render();
  }

  function currentURL() {
    return new URL(location.href);
  }

  function updateURL(k: string, v: string | number) {
    const url = currentURL();
    url.searchParams.set(k, v.toString());
    window.history.replaceState(null, "", url);
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
