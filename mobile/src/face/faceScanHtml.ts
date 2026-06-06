import {
    FACE_API_CDN,
    FACE_API_MODEL_URL,
    FACE_DESCRIPTOR_DETECTOR_INPUT_SIZE,
    FACE_DESCRIPTOR_SCORE_THRESHOLD,
    FACE_TRACK_DETECTOR_INPUT_SIZE,
    FACE_TRACK_SCORE_THRESHOLD,
} from '../constants/face';

/**
 * Hidden WebView runs @vladmandic/face-api (128-D). Native camera sends JPEG
 * frames via window.__trackSnapshot / window.__processSnapshot.
 */
export function buildFaceScanHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>html, body { margin: 0; padding: 0; background: transparent; }</style>
</head>
<body>
  <script src="${FACE_API_CDN}/dist/face-api.js"></script>
  <script>
    const MODEL_URL = ${JSON.stringify(FACE_API_MODEL_URL)};
    const TRACK_DETECTOR = new faceapi.TinyFaceDetectorOptions({
      inputSize: ${FACE_TRACK_DETECTOR_INPUT_SIZE},
      scoreThreshold: ${FACE_TRACK_SCORE_THRESHOLD},
    });
    const PROCESS_DETECTOR = new faceapi.TinyFaceDetectorOptions({
      inputSize: ${FACE_DESCRIPTOR_DETECTOR_INPUT_SIZE},
      scoreThreshold: ${FACE_DESCRIPTOR_SCORE_THRESHOLD},
    });
    let modelsReady = false;
    let trackBusy = false;
    let descriptorBusy = false;
    let trackMisses = 0;
    let faceWasVisible = false;

    function post(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    async function loadModels() {
      if (modelsReady) return;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsReady = true;
      post({ type: 'models_loaded' });
    }

    function getFaceBox(face) {
      if (!face) return null;
      if (face.box) return face.box;
      if (face.detection && face.detection.box) return face.detection.box;
      return null;
    }

    function getFaceScore(face) {
      if (!face) return undefined;
      if (typeof face.score === 'number') return face.score;
      if (face.detection && typeof face.detection.score === 'number') {
        return face.detection.score;
      }
      return undefined;
    }

    function normalizeBox(face, imageWidth, imageHeight) {
      const box = getFaceBox(face);
      if (!box || !imageWidth || !imageHeight) return null;
      return {
        x: box.x / imageWidth,
        y: box.y / imageHeight,
        width: box.width / imageWidth,
        height: box.height / imageHeight,
        score: getFaceScore(face),
      };
    }

    window.__trackSnapshot = async function (dataUrl) {
      if (trackBusy || !dataUrl) return;
      trackBusy = true;
      try {
        if (!modelsReady) await loadModels();
        const img = await faceapi.fetchImage(dataUrl);
        const detection = await faceapi.detectSingleFace(img, TRACK_DETECTOR);
        if (!detection) {
          trackMisses += 1;
          if (faceWasVisible && trackMisses >= 2) {
            faceWasVisible = false;
            post({ type: 'no_face' });
          }
        } else {
          trackMisses = 0;
          const box = normalizeBox(detection, img.width, img.height);
          if (box) {
            faceWasVisible = true;
            post({ type: 'face_box', box: box });
          }
        }
      } catch (err) {
        trackMisses += 1;
      } finally {
        trackBusy = false;
      }
    };

    window.__processSnapshot = async function (dataUrl) {
      if (descriptorBusy || !dataUrl) return;
      descriptorBusy = true;
      try {
        if (!modelsReady) await loadModels();
        const img = await faceapi.fetchImage(dataUrl);
        const detection = await faceapi
          .detectSingleFace(img, PROCESS_DETECTOR)
          .withFaceLandmarks(true)
          .withFaceDescriptor();
        if (!detection || !detection.descriptor) {
          post({ type: 'no_face', message: 'No face detected. Look at the camera.' });
        } else {
          const box = normalizeBox(detection, img.width, img.height);
          if (box) {
            faceWasVisible = true;
            trackMisses = 0;
            post({ type: 'face_box', box: box });
          }
          post({ type: 'descriptor', descriptor: Array.from(detection.descriptor) });
        }
      } catch (err) {
        post({ type: 'error', message: err && err.message ? err.message : 'Face scan failed.' });
      } finally {
        descriptorBusy = false;
      }
    };

    loadModels().catch(function (err) {
      post({ type: 'error', message: err && err.message ? err.message : 'Failed to load face models.' });
    });
  </script>
</body>
</html>`;
}
