'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils,
} from '@mediapipe/tasks-vision'
import {
    ExerciseType,
    ExerciseState,
    analyzeSquat,
    analyzePushup,
    analyzeSitup,
    analyzePlank,
} from '@/utils/fitness'
import { recordWorkoutSession } from '@/app/workout/actions'

interface PoseTrackerProps {
    exercise: ExerciseType
}

export default function PoseTracker({ exercise }: PoseTrackerProps) {
    const webcamRef = useRef<Webcam>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null)
    const [isModelLoading, setIsModelLoading] = useState(true)
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)

    const requestRef = useRef<number>(0)

    // Exercise State Ref (using ref instead of state to avoid dependency loops in requestAnimationFrame)
    const exerciseStateRef = useRef<ExerciseState>({
        reps: 0,
        stage: 'unknown',
        feedback: 'カメラに全身を写してください',
        holdTimeSec: 0,
        lastFrameTimeMs: 0
    })

    // State for UI to re-render
    const [uiState, setUiState] = useState<ExerciseState>(exerciseStateRef.current)

    // Track last saved values to prevent spamming DB
    const lastSavedRef = useRef<{ reps: number, timeSec: number }>({ reps: 0, timeSec: 0 })

    // Reset state when exercise type changes
    useEffect(() => {
        exerciseStateRef.current = {
            reps: 0,
            stage: 'unknown',
            feedback: '設定完了です。準備はいいですか？',
            holdTimeSec: 0,
            lastFrameTimeMs: performance.now()
        }
        setUiState(exerciseStateRef.current)
        lastSavedRef.current = { reps: 0, timeSec: 0 }
    }, [exercise])

    // Initialize MediaPipe PoseLandmarker
    useEffect(() => {
        const initModel = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1
                });
                setPoseLandmarker(landmarker);
                setIsModelLoading(false);
            } catch (error) {
                console.error("Error loading MediaPipe model:", error)
                setIsModelLoading(false)
            }
        }

        initModel()

        return () => {
            if (poseLandmarker) {
                poseLandmarker.close()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Detection Loop
    const detect = useCallback(() => {
        if (
            typeof webcamRef.current !== "undefined" &&
            webcamRef.current !== null &&
            webcamRef.current.video?.readyState === 4 &&
            poseLandmarker &&
            canvasRef.current
        ) {
            const video = webcamRef.current.video;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            if (ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const startTimeMs = performance.now();
                const results = poseLandmarker.detectForVideo(video, startTimeMs);

                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (results.landmarks && results.landmarks[0]) {
                    const landmarks = results.landmarks[0]

                    // --- Process Exercise Logic ---
                    let nextState = { ...exerciseStateRef.current }

                    switch (exercise) {
                        case 'squat':
                            nextState = analyzeSquat(landmarks, nextState)
                            break
                        case 'pushup':
                            nextState = analyzePushup(landmarks, nextState)
                            break
                        case 'situp':
                            nextState = analyzeSitup(landmarks, nextState)
                            break
                        case 'plank':
                            nextState = analyzePlank(landmarks, nextState, startTimeMs)
                            break
                    }

                    // Always update time for planks explicitly in case it didn't
                    if (exercise !== 'plank') {
                        nextState.lastFrameTimeMs = startTimeMs
                    }

                    // Update ref holding logic state
                    exerciseStateRef.current = nextState

                    // Update UI state occasionally or if major change (for performance)
                    setUiState(nextState)

                    // --- Save logic ---
                    // Save every 5 reps, or every 10 seconds of planking
                    const currentReps = nextState.reps
                    const currentHold = Math.floor(nextState.holdTimeSec)
                    const lastReps = lastSavedRef.current.reps
                    const lastHold = lastSavedRef.current.timeSec

                    if (exercise !== 'plank' && currentReps > 0 && currentReps % 5 === 0 && currentReps !== lastReps) {
                        lastSavedRef.current.reps = currentReps
                        recordWorkoutSession(exercise, 5, 0).catch(console.error) // Save batch of 5
                    } else if (exercise === 'plank' && currentHold > 0 && currentHold % 10 === 0 && currentHold !== lastHold) {
                        lastSavedRef.current.timeSec = currentHold
                        recordWorkoutSession(exercise, 0, 10).catch(console.error) // Save batch of 10s
                    }

                    // --- Draw skeleton ---
                    const drawingUtils = new DrawingUtils(ctx);
                    drawingUtils.drawLandmarks(landmarks, {
                        radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 2),
                        color: '#818cf8',
                        fillColor: '#ffffff'
                    });
                    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                        color: '#c7d2fe',
                        lineWidth: 3
                    });
                }
                ctx.restore();
            }
        }
        requestRef.current = requestAnimationFrame(detect);
    }, [poseLandmarker, exercise])

    useEffect(() => {
        if (poseLandmarker && cameraPermission) {
            requestRef.current = requestAnimationFrame(detect);
        }
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }
    }, [poseLandmarker, cameraPermission, detect]);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-3xl gap-4">
            {/* Realtime Feedback Overlay */}
            <div className="w-full flex justify-between items-center px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl shadow-lg relative z-10">
                <div className="flex flex-col text-left">
                    <span className="text-sm text-gray-400 font-medium tracking-wide">AI コーチ</span>
                    <span className={`text-lg font-bold ${uiState.feedback.includes('Good') ? 'text-green-400' : 'text-amber-400'}`}>
                        {uiState.feedback}
                    </span>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-400 font-medium tracking-wide">
                        {exercise === 'plank' ? 'タイム' : '回数'}
                    </span>
                    <span className="text-3xl font-extrabold text-white">
                        {exercise === 'plank' ? `${Math.floor(uiState.holdTimeSec)}秒` : uiState.reps}
                    </span>
                </div>
            </div>

            <div className="relative w-full aspect-video bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 ring-1 ring-white/10">

                {isModelLoading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-md">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                        <p className="text-lg font-medium text-white tracking-widest">AIモデルを読み込み中...</p>
                    </div>
                )}

                {cameraPermission === false && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-md text-red-200 p-8 text-center">
                        カメラへのアクセスが拒否されました。<br />ブラウザの設定からカメラの許可をオンにしてください。
                    </div>
                )}

                <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="absolute inset-0 w-full h-full object-cover -scale-x-100 opacity-90"
                    onUserMedia={() => setCameraPermission(true)}
                    onUserMediaError={() => setCameraPermission(false)}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none"
                />
            </div>
        </div>
    )
}
