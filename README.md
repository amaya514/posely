# Posely – Pose Guide Camera

A web app (inspired by pose-guide camera apps) that puts a see-through 3D mannequin pose on top of your live camera so you can line up and take better photos.

## Features
- 16 realistic 3D mannequin pose guides (solo, couple, friends), rendered in the browser with WebGL
- Live camera with the guide overlaid: drag to move, pinch to resize, adjust transparency, mirror
- Load your own photo as a guide
- Grid, 3s / 10s timer, front/back camera switch
- Sri Lankan photo spots with a suggested pose for each
- In-app gallery (the guide is not saved in the photo)

## Run it
It's a single file, `index.html`. No build step.

The camera only works on a secure link (https), so host it with GitHub Pages:
1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**.
3. Open `https://<your-username>.github.io/<repo-name>/`.

## Install on iPhone
1. Open the GitHub Pages link in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open Posely from the home screen and tap **Allow** when it asks for the camera.
