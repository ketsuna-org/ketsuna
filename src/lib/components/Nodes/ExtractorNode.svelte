<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";

  let { data }: NodeProps = $props();
</script>

<Handle type="target" position={Position.Top} class="custom-handle" />
<Handle type="source" position={Position.Bottom} class="custom-handle" />
<div class="flex items-center justify-center h-screen">
  <div class="text-center">
    {data.label}
  </div>
</div>
