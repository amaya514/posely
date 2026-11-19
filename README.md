# Posely – Pose Guide Camera

Pick a pose, line up with the see-through guide on your camera, and take a better photo.

- Pose pictures live in `guides/` (made with the prompts in `PROMPTS.md`). The app removes the plain background automatically.
- Live pose matching uses Google's MediaPipe Pose Landmarker (Apache 2.0), bundled in `vendor/mediapipe` and `models/`.
- Works offline and can be installed to the home screen.
