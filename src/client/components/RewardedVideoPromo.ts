import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("rewarded-video-ad")
export class RewardedVideoAd extends LitElement {
  @state()
  private rampReady: boolean = false;

  @state()
  private adPlaying: boolean = false;

  @property({ attribute: false })
  onRewardGranted?: () => void;

  @property({ attribute: false })
  onAdNotAvailable?: () => void;

  @property({ attribute: false })
  onAdError?: (error: unknown) => void;

  private rampCheckInterval: ReturnType<typeof setInterval> | null = null;
  private rampWaitTimeout: ReturnType<typeof setTimeout> | null = null;

  private static readonly RAMP_WAIT_TIMEOUT_MS = 10000;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.waitForRamp();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.rampCheckInterval) {
      clearInterval(this.rampCheckInterval);
      this.rampCheckInterval = null;
    }
    if (this.rampWaitTimeout) {
      clearTimeout(this.rampWaitTimeout);
      this.rampWaitTimeout = null;
    }
  }

  private waitForRamp(): void {
    if (window.ramp?.manuallyCreateRewardUi) {
      console.log("[RewardedVideoAd] Ramp SDK already available");
      this.rampReady = true;
      return;
    }

    this.rampCheckInterval = setInterval(() => {
      if (window.ramp?.manuallyCreateRewardUi) {
        console.log("[RewardedVideoAd] Ramp SDK now available");
        this.rampReady = true;
        if (this.rampCheckInterval) {
          clearInterval(this.rampCheckInterval);
          this.rampCheckInterval = null;
        }
        if (this.rampWaitTimeout) {
          clearTimeout(this.rampWaitTimeout);
          this.rampWaitTimeout = null;
        }
      }
    }, 100);

    this.rampWaitTimeout = setTimeout(() => {
      if (this.rampCheckInterval) {
        clearInterval(this.rampCheckInterval);
        this.rampCheckInterval = null;
      }
      console.log(
        "[RewardedVideoAd] Ramp SDK never loaded - possible adblocker",
      );
      this.onAdNotAvailable?.();
    }, RewardedVideoAd.RAMP_WAIT_TIMEOUT_MS);
  }

  private handleWatchAd(): void {
    if (!window.ramp?.manuallyCreateRewardUi) {
      console.error("[RewardedVideoAd] Ramp SDK not available");
      this.onAdError?.("Ramp SDK not available");
      return;
    }

    this.adPlaying = true;

    const result = window.ramp.manuallyCreateRewardUi({
      skipConfirmation: true,
    });

    if (result && typeof result.then === "function") {
      result
        .then(() => {
          console.log("[RewardedVideoAd] Reward granted");
          this.adPlaying = false;
          this.onRewardGranted?.();
        })
        .catch((error: unknown) => {
          console.error("[RewardedVideoAd] Rewarded video error:", error);
          this.adPlaying = false;
          this.onAdError?.(error);
        });
    } else {
      // SDK returned void/undefined - it doesn't return a promise
      console.log("[RewardedVideoAd] manuallyCreateRewardUi returned:", result);
      this.adPlaying = false;
    }
  }

  render() {
    if (!this.rampReady || this.adPlaying) {
      return html``;
    }

    return html`
      <button
        @click="${this.handleWatchAd}"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-lg transition-colors"
      >
        Watch Ad for Reward
      </button>
    `;
  }
}
