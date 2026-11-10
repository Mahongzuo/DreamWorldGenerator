"""Render the original Linqi soundtrack. Requires NumPy and macOS afconvert."""
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np

RATE = 24000
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio"
# BPM, scale, harmony roots, 8-bar melody, lead and accompaniment instruments.
SCORES = {
    "forest": (76, [0, 2, 4, 5, 7, 9, 11], [0, 4, 5, 3, 0, 3, 1, 4],
               [[4, 2, 0], [1, 4, 3], [2, 4, 5], [4, 2, 0], [7, 6, 4], [3, 2, 0], [1, 3, 5], [4, 1, None]], "piano", "piano"),
    "garden": (70, [0, 2, 4, 7, 9], [0, 3, 4, 2, 0, 1, 3, 0],
               [[3, 2, 1], [0, 1, 3], [4, 3, 2], [2, 1, None], [5, 4, 3], [1, 2, 3], [4, 2, 1], [0, None, None]], "zither", "pad"),
    "village": (98, [0, 2, 3, 5, 7, 9, 10], [0, 3, 6, 0, 0, 3, 6, 0],
                [[0, 2, 4], [5, 4, 3], [2, 3, 1], [0, 2, 4], [7, 6, 4], [5, 7, 5], [4, 3, 1], [0, None, None]], "flute", "zither"),
    "coast": (96, [0, 2, 4, 5, 7, 9, 11], [0, 5, 1, 4, 0, 3, 1, 4],
              [[2, 4, 6], [7, 4, 2], [3, 5, 7], [6, 4, 1], [4, 6, 9], [8, 7, 5], [3, 5, 2], [1, 4, None]], "mallet", "piano"),
    "night": (58, [0, 2, 3, 5, 7, 8, 10], [0, 5, 2, 6, 0, 3, 5, 4],
              [[4, None, 2], [3, None, None], [6, 4, None], [1, None, None], [7, None, 4], [3, 2, None], [5, None, 2], [1, None, None]], "bell", "pad"),
}


def render(name, score):
    bpm, scale, roots, melody, lead, backing = score
    beat = 60 / bpm
    bar = 3 if name == "village" else 4
    length = round(16 * bar * beat * RATE)
    mix = np.zeros((length, 2))
    tonic = {"forest": 60, "garden": 62, "village": 62, "coast": 65, "night": 57}[name]

    def note(degree, at, duration, tone, level, pan=0, octave=0):
        midi = tonic + scale[degree % len(scale)] + 12 * (degree // len(scale) + octave)
        hz = 440 * 2 ** ((midi - 69) / 12)
        t = np.arange(round(duration * RATE)) / RATE
        phase = 2 * np.pi * hz * t
        if tone == "pad":
            sample = (.54 * np.sin(phase) + .28 * np.sin(phase * 1.003) + .18 * np.sin(phase * 2)) * np.minimum(1, t / .55)
        elif tone == "flute":
            sample = (np.sin(phase + .36 * np.sin(2 * np.pi * 5 * t)) + .17 * np.sin(2 * phase)) * np.minimum(1, t / .085)
        else:
            partials = {
                "piano": [(1, 1, 2.3), (2.002, .34, 4), (3.009, .15, 6), (4.02, .08, 10)],
                "zither": [(1, .86, 3.1), (2, .45, 5.8), (3, .24, 9), (4.03, .13, 12)],
                "mallet": [(1, 1, 3.6), (4.01, .23, 10), (9.8, .06, 24)],
                "bell": [(1, 1, 1.5), (2.01, .27, 2.5), (2.76, .17, 4)],
            }[tone]
            sample = sum(weight * np.sin(phase * ratio) * np.exp(-decay * t) for ratio, weight, decay in partials)
            sample *= np.minimum(1, t / .012)
        sample *= level * np.clip((duration - t) / min(duration * .45, .5), 0, 1)
        start = round(at * beat * RATE)
        for delay, echo, spread in [(0, 1, pan), (.163, .14, -pan), (.281, .07, pan * .5)]:
            indices = (start + round(delay * RATE) + np.arange(len(t))) % length
            mix[indices] += sample[:, None] * echo * np.sqrt([(1 - spread) / 2, (1 + spread) / 2])

    for i in range(16):
        root = roots[i % 8]
        at = i * bar
        note(root, at, beat * (bar + .35), "pad" if name == "night" else "piano", .16, octave=-2)
        if backing == "pad":
            for j, interval in enumerate([0, 2, 4]):
                note(root + interval, at, beat * (bar + .55), backing, .075, (j - 1) * .55, -1)
        else:
            pattern = [0, 4, 2, 4, 7, 4] if name == "village" else [0, 4, 2, 4, 6, 4, 2, 4]
            for j, interval in enumerate(pattern):
                note(root + interval, at + j * .5, beat * 1.4, backing, .10 if j % 2 == 0 else .072, (-1)**j * .3, -1)
        for j, degree in enumerate(melody[i % 8]):
            if degree is not None:
                offset = ([.25, 1.25, 2.05] if bar == 3 else [0.25, 1.65, 2.8])[j]
                if i >= 8 and i % 4 == 2:
                    offset -= .18
                note(degree, at + offset, beat * (1.2 if lead == "flute" else 2.05), lead, .24, .15)
        if name == "coast":
            note(root + 4, at + 3.5, beat * .6, "mallet", .10, -.35, -1)
    mix *= .70 / max(np.max(np.abs(mix)), .01)
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "score.wav"
        with wave.open(str(source), "wb") as out:
            out.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
            out.writeframes((mix * 32767).astype("<i2").tobytes())
        subprocess.run(["afconvert", str(source), str(OUTPUT / f"{name}.m4a"), "-f", "m4af", "-d", "aac", "-b", "64000"], check=True)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, score in SCORES.items():
        render(name, score)
