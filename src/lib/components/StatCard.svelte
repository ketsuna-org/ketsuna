<script lang="ts">
  interface Props {
    title: string;
    value: string | number;
    color?: string; // Tailwind text color class, e.g. "text-emerald-400"
    icon?: any; // Placeholder for icon if needed later
  }

  let { title, value, color = "text-white" }: Props = $props();
</script>

<div
  class="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 hover:border-slate-600 transition-colors"
>
  <p class="text-sm text-slate-400 uppercase tracking-wider font-semibold">
    {title}
  </p>
  <p class={`text-2xl font-mono mt-1 ${color}`}>
    {value}
  </p>
</div>
