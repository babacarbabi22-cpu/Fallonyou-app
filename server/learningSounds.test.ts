import assert from "node:assert/strict";
import { test } from "node:test";
import { learningSoundsEnabled, playLearningFeedback, setLearningSoundsEnabled } from "../client/src/lib/learning-sounds";

test("answer sounds are distinct, respect mute, resume after gestures and never break answers", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>();
  const notes: number[] = [];
  let resumes = 0;
  let rejectResume = false;
  class FakeAudio {
    state = "suspended";
    currentTime = 1;
    destination = {};
    async resume() {
      resumes++;
      if (rejectResume) throw new Error("Device denied audio");
      this.state = "running";
    }
    createOscillator() {
      const oscillator = {
        frequency: { value: 0 }, type: "", onended: null,
        connect() {}, disconnect() {}, stop() {},
        start() { notes.push(oscillator.frequency.value); },
      };
      return oscillator;
    }
    createGain() {
      return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    }
  }
  const audio = new FakeAudio();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    AudioContext: class { constructor() { return audio; } },
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
  } });
  try {
    assert.equal(learningSoundsEnabled(), true);
    await playLearningFeedback("correct");
    assert.deepEqual(notes, [523.25, 783.99]);
    assert.equal(resumes, 1);
    await playLearningFeedback("incorrect");
    assert.deepEqual(notes.slice(2), [246.94, 196]);
    await playLearningFeedback("complete");
    assert.deepEqual(notes.slice(4), [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]);
    setLearningSoundsEnabled(false);
    assert.equal(values.get("learning-feedback-sounds"), "off");
    await playLearningFeedback("correct");
    await playLearningFeedback("complete");
    assert.equal(notes.length, 10);
    setLearningSoundsEnabled(true);
    audio.state = "suspended";
    rejectResume = true;
    await assert.doesNotReject(playLearningFeedback("correct"));
    assert.equal(notes.length, 10);
    assert.equal(resumes, 2);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
