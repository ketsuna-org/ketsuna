<svelte:head>
  <title>Ketsuna Organisation | Empowering communities with better tools.</title>
  <meta
    name="description"
    content="Official home of the Ketsuna Team. Discover Bot-Creator, our flagship platform for building and hosting Discord bots, and follow Ketsuna's incubation journey."
  />
  <meta property="og:title" content="Ketsuna Organisation" />
  <meta
    property="og:description"
    content="Bot-Creator is our active flagship project. Ketsuna is currently in incubation."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ketsuna.com" />
</svelte:head>

<main class="page">
  <div class="bg-glow bg-glow-a" aria-hidden="true"></div>
  <div class="bg-glow bg-glow-b" aria-hidden="true"></div>

  <section class="hero container">
    <p class="eyebrow">Ketsuna Team</p>
    <h1>Welcome to the Ketsuna Organisation</h1>
    <p class="lead">
      We build powerful, user-friendly tools for communities. Our current priority is
      <strong>Bot-Creator</strong>, a comprehensive platform to build, customize, and host Discord bots
      with confidence.
    </p>
    <p class="motto">"Empowering communities with better tools."</p>
  </section>

  <section class="projects container">
    <h2>Our Projects</h2>

    <article class="card card-featured">
      <header>
        <p class="badge">Active</p>
        <h3>Bot-Creator</h3>
      </header>
      <p>
        Bot-Creator is our flagship application: a feature-rich experience that helps users create,
        configure, and operate Discord bots without friction.
      </p>
      <ul>
        <li><strong>Visual Builder:</strong> craft commands, actions, and workflows without complex code.</li>
        <li><strong>Cross-Platform:</strong> built with Flutter/Dart for mobile, web, and desktop.</li>
        <li>
          <strong>Feature Packed:</strong> manage roles, webhooks, UI elements, and moderation from one
          intuitive interface.
        </li>
      </ul>
      <a class="button" href="https://bot-creator.fr" target="_blank" rel="noreferrer">Visit bot-creator.fr</a>
    </article>

    <article class="card">
      <header>
        <p class="badge badge-soft">Incubating</p>
        <h3>Ketsuna</h3>
      </header>
      <p>
        Our namesake project is in planning and incubation. It does not yet have a public purpose,
        but we are exploring exciting ideas behind the scenes.
      </p>
      <p>Stay tuned for upcoming announcements.</p>
    </article>
  </section>

  <section class="container grid-two">
    <article class="card">
      <h2>What You Will Find Here</h2>
      <ul>
        <li>Core source code for Bot-Creator and its runners.</li>
        <li>Shared libraries and APIs used across our ecosystem.</li>
        <li>Community discussion areas and issue trackers.</li>
      </ul>
    </article>

    <article class="card">
      <h2>Getting Involved</h2>
      <ul>
        <li><strong>Report Bugs:</strong> open an issue in the relevant repository.</li>
        <li><strong>Suggest Features:</strong> start a discussion with your idea.</li>
        <li><strong>Contribute Code:</strong> submit a pull request after reading CONTRIBUTING.md when available.</li>
      </ul>
    </article>
  </section>

  <section class="container contact card">
    <h2>Connect With Us</h2>
    <ul class="links">
      <li><a href="https://bot-creator.fr" target="_blank" rel="noreferrer">Bot-Creator Website</a></li>
      <li><a href="https://ketsuna.com" target="_blank" rel="noreferrer">Ketsuna Website</a></li>
      <li>
        <a href="https://discord.gg/gyEGNBUZdA" target="_blank" rel="noreferrer">Discord Community</a>
      </li>
    </ul>
  </section>
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Syne:wght@600;700;800&display=swap');

  :global(body) {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    color: #f5f7ff;
    background:
      radial-gradient(1200px 700px at 10% 10%, #20446f 0%, rgba(32, 68, 111, 0) 70%),
      radial-gradient(1000px 700px at 90% 20%, #005844 0%, rgba(0, 88, 68, 0) 70%),
      linear-gradient(160deg, #07111f 0%, #0f1f2f 45%, #142b2d 100%);
    min-height: 100vh;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .page {
    position: relative;
    overflow: clip;
    padding: 3rem 1.25rem 4rem;
  }

  .container {
    width: min(1080px, 100%);
    margin: 0 auto;
  }

  .bg-glow {
    position: absolute;
    border-radius: 999px;
    filter: blur(55px);
    opacity: 0.25;
    pointer-events: none;
  }

  .bg-glow-a {
    width: 26rem;
    height: 26rem;
    background: #1fd7a2;
    top: -8rem;
    left: -6rem;
    animation: drift-a 16s ease-in-out infinite;
  }

  .bg-glow-b {
    width: 30rem;
    height: 30rem;
    background: #4f9cfb;
    right: -8rem;
    top: 8rem;
    animation: drift-b 18s ease-in-out infinite;
  }

  .hero {
    position: relative;
    z-index: 1;
    padding: 1rem 0 2rem;
    animation: rise 650ms ease both;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 700;
    font-size: 0.78rem;
    color: #8dc6ff;
    margin: 0 0 0.6rem;
  }

  h1,
  h2,
  h3 {
    font-family: 'Syne', sans-serif;
    line-height: 1.1;
    margin: 0;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 3.8rem);
    max-width: 14ch;
  }

  h2 {
    font-size: clamp(1.45rem, 2.5vw, 2rem);
    margin-bottom: 1rem;
  }

  h3 {
    font-size: clamp(1.25rem, 2vw, 1.75rem);
  }

  .lead {
    margin: 1rem 0 0;
    max-width: 75ch;
    color: #d7e5ff;
    font-size: clamp(1rem, 2vw, 1.18rem);
    line-height: 1.7;
  }

  .motto {
    margin-top: 1.2rem;
    color: #8ad6d4;
    font-style: italic;
    font-weight: 500;
  }

  .projects {
    margin-top: 2rem;
    display: grid;
    gap: 1rem;
  }

  .card {
    position: relative;
    z-index: 1;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(139, 192, 255, 0.25);
    background: linear-gradient(180deg, rgba(17, 38, 64, 0.75), rgba(12, 24, 45, 0.7));
    border-radius: 1.1rem;
    padding: 1.15rem;
    animation: rise 750ms ease both;
  }

  .card-featured {
    border-color: rgba(47, 223, 177, 0.45);
    background:
      linear-gradient(160deg, rgba(15, 56, 58, 0.76), rgba(7, 30, 53, 0.72)),
      radial-gradient(100% 140% at 100% 0%, rgba(49, 212, 173, 0.28), rgba(0, 0, 0, 0));
  }

  .badge {
    margin: 0 0 0.6rem;
    display: inline-block;
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    background: rgba(47, 223, 177, 0.25);
    color: #98f1cf;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .badge-soft {
    background: rgba(140, 176, 224, 0.23);
    color: #b2d5ff;
  }

  ul {
    margin: 0.9rem 0 0;
    padding-left: 1.1rem;
    line-height: 1.65;
    color: #d9e6ff;
  }

  li + li {
    margin-top: 0.45rem;
  }

  p {
    line-height: 1.65;
    color: #d9e6ff;
    margin: 0.75rem 0 0;
  }

  .button {
    margin-top: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-weight: 700;
    color: #042634;
    background: linear-gradient(135deg, #70f2cf, #56d4ff);
    padding: 0.66rem 1rem;
    border-radius: 0.7rem;
    box-shadow: 0 8px 22px rgba(40, 171, 226, 0.24);
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(40, 171, 226, 0.32);
  }

  .grid-two {
    margin-top: 1rem;
    display: grid;
    gap: 1rem;
  }

  .contact {
    margin-top: 1rem;
  }

  .links {
    list-style: none;
    padding: 0;
    margin: 0.4rem 0 0;
  }

  .links a {
    color: #9ad8ff;
    text-underline-offset: 0.2rem;
  }

  @media (min-width: 820px) {
    .projects {
      grid-template-columns: 1.25fr 1fr;
    }

    .grid-two {
      grid-template-columns: 1fr 1fr;
    }

    .page {
      padding-top: 4rem;
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes drift-a {
    0%,
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(1.2rem, 1rem, 0) scale(1.06);
    }
  }

  @keyframes drift-b {
    0%,
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(-1rem, 1.1rem, 0) scale(1.04);
    }
  }
</style>
