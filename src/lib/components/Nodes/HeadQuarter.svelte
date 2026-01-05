<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";

  let { data }: NodeProps = $props();
</script>

<Handle type="target" position={Position.Left} class="custom-handle" />
<Handle type="target" position={Position.Right} class="custom-handle" />
<Handle type="target" position={Position.Bottom} class="custom-handle" />
<Handle type="target" position={Position.Top} class="custom-handle" />
<div class="flex items-center justify-center">
  <div class="text-center p-4 shadow-lg rounded-lg">
    {data.label}
  </div>
</div>
