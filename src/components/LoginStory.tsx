export default function LoginStory() {
  return (
    <section className="login-story" aria-label="Create with GlamAR">
      <div className="login-collage" aria-hidden="true">
        {[0, 1, 2, 6, 3, 7].map((number, index) => (
          <img
            key={number}
            className={`login-tile login-tile-${index}`}
            src={`/images/product-${number}.jpg`}
            alt=""
          />
        ))}
      </div>
      <img
        className="login-brand"
        src="/brand/fynd-glamar-wordmark.svg"
        alt="Fynd GlamAR"
      />
      <div className="login-story-copy">
        <div className="login-tags">
          <span>From product to possibility</span>
          <span>Powered by AI</span>
        </div>
        <h2>
          Bring your products
          <br />
          to a new dimension.
        </h2>
        <p>
          Create, refine, and manage beautiful 3D assets.
          <br />
          One workspace. Endless possibilities.
        </p>
        <div className="login-story-rule" />
        <span className="login-story-caption">
          YOUR NEXT DIMENSION STARTS HERE
        </span>
      </div>
    </section>
  );
}
