<script lang="ts">
  type CategoryData = {
    id: string;
    name: string;
    icon: string;
    unlocked: number;
    total: number;
  };

  let { category, onclick } = $props<{
    category: CategoryData;
    onclick?: () => void;
  }>();

  let progress = $derived(
    category.total > 0
      ? Math.round((category.unlocked / category.total) * 100)
      : 0
  );
  let isComplete = $derived(
    category.unlocked === category.total && category.total > 0
  );
</script>

<button
  type="button"
  {onclick}
  class="category-card"
  class:complete={isComplete}
>
  <!-- Gradient border effect -->
  <div class="card-gradient"></div>

  <!-- Card content -->
  <div class="card-inner">
    <!-- Icon -->
    <div class="icon-container">
      <span class="icon">{category.icon}</span>
    </div>

    <!-- Name -->
    <h3 class="category-name">{category.name}</h3>

    <!-- Progress bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress}%;"></div>
      </div>
      <span class="progress-text">{category.unlocked} / {category.total}</span>
    </div>

    <!-- Status badge -->
    {#if isComplete}
      <span class="status-badge complete">✓ Complété</span>
    {:else if category.unlocked > 0}
      <span class="status-badge progress">En cours</span>
    {:else}
      <span class="status-badge locked">À débloquer</span>
    {/if}
  </div>
</button>

<style>
  .category-card {
    position: relative;
    width: 100%;
    background: linear-gradient(
      180deg,
      rgba(30, 41, 59, 0.9) 0%,
      rgba(15, 23, 42, 0.95) 100%
    );
    border: 1px solid rgba(100, 116, 139, 0.3);
    border-radius: 1.5rem;
    padding: 2px;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .category-card:hover {
    transform: translateY(-4px);
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow:
      0 12px 40px rgba(99, 102, 241, 0.2),
      0 0 0 1px rgba(99, 102, 241, 0.3);
  }

  .category-card.complete {
    border-color: rgba(34, 197, 94, 0.4);
  }

  .category-card.complete:hover {
    border-color: rgba(34, 197, 94, 0.6);
    box-shadow:
      0 12px 40px rgba(34, 197, 94, 0.2),
      0 0 0 1px rgba(34, 197, 94, 0.3);
  }

  .card-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at top,
      rgba(99, 102, 241, 0.15) 0%,
      transparent 60%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .category-card:hover .card-gradient {
    opacity: 1;
  }

  .card-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1.5rem;
    background: linear-gradient(
      180deg,
      rgba(15, 23, 42, 0.8) 0%,
      rgba(0, 0, 0, 0.9) 100%
    );
    border-radius: calc(1.5rem - 2px);
    position: relative;
    z-index: 1;
  }

  .icon-container {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.1) 0%,
      rgba(139, 92, 246, 0.1) 100%
    );
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 1rem;
    margin-bottom: 1.25rem;
    transition: all 0.3s ease;
  }

  .category-card:hover .icon-container {
    border-color: rgba(99, 102, 241, 0.4);
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.2) 0%,
      rgba(139, 92, 246, 0.2) 100%
    );
    transform: scale(1.05);
  }

  .icon {
    font-size: 2.5rem;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  .category-name {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #f1f5f9;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .progress-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: rgba(51, 65, 85, 0.6);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .category-card.complete .progress-fill {
    background: linear-gradient(90deg, #22c55e 0%, #10b981 100%);
  }

  .progress-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    font-family: ui-monospace, monospace;
  }

  .status-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .status-badge.complete {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .status-badge.progress {
    background: rgba(99, 102, 241, 0.15);
    color: #a5b4fc;
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .status-badge.locked {
    background: rgba(100, 116, 139, 0.15);
    color: #94a3b8;
    border: 1px solid rgba(100, 116, 139, 0.3);
  }
</style>
