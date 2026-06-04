export type NormalizedFaceBox = {
    x: number;
    y: number;
    width: number;
    height: number;
    score?: number;
};

export type FaceWebViewMessage =
    | { type: 'log'; message: string }
    | { type: 'models_loaded' }
    | { type: 'face_box'; box: NormalizedFaceBox }
    | { type: 'descriptor'; descriptor: number[] }
    | { type: 'no_face'; message?: string }
    | { type: 'error'; message: string };

export type FaceScanPhase = 'idle' | 'loading_models' | 'scanning' | 'submitting';
