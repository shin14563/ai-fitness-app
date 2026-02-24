// Utility functions for calculating angles and determining exercise states from MediaPipe landmarks

export type ExerciseType = 'squat' | 'pushup' | 'situp' | 'plank'

export interface Point {
    x: number
    y: number
    z?: number
    visibility?: number
}

export interface ExerciseState {
    reps: number
    stage: 'up' | 'down' | 'hold' | 'unknown'
    feedback: string
    holdTimeSec: number // For planks
    lastFrameTimeMs: number
}

// Calculate angle between three points (A, B, C) where B is the vertex
export function calculateAngle(a: Point, b: Point, c: Point): number {
    if (!a || !b || !c) return 0

    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
    let angle = Math.abs((radians * 180.0) / Math.PI)

    if (angle > 180.0) {
        angle = 360.0 - angle
    }

    return angle
}

// Ensure points are visible enough to trust the calculation
export function arePointsVisible(points: Point[], threshold = 0.5): boolean {
    return points.every(p => (p.visibility || 0) > threshold)
}

// --- Exercise Logic Analyzers ---

export function analyzeSquat(landmarks: Point[], state: ExerciseState): ExerciseState {
    const newState = { ...state }

    // Use left side by default, fallback to right if better visibility
    const leftHip = landmarks[23]
    const leftKnee = landmarks[25]
    const leftAnkle = landmarks[27]
    const rightHip = landmarks[24]
    const rightKnee = landmarks[26]
    const rightAnkle = landmarks[28]

    // Choose the side with better average visibility
    const leftVis = (leftHip.visibility! + leftKnee.visibility! + leftAnkle.visibility!) / 3
    const rightVis = (rightHip.visibility! + rightKnee.visibility! + rightAnkle.visibility!) / 3

    const isLeft = leftVis > rightVis
    const hip = isLeft ? leftHip : rightHip
    const knee = isLeft ? leftKnee : rightKnee
    const ankle = isLeft ? leftAnkle : rightAnkle

    if (!arePointsVisible([hip, knee, ankle])) {
        newState.feedback = '全身（腰〜足首）をカメラに映してください'
        return newState
    }

    const angle = calculateAngle(hip, knee, ankle)

    if (angle > 160) {
        if (newState.stage === 'down') {
            newState.reps += 1
            newState.feedback = 'Good!'
        }
        newState.stage = 'up'
        if (newState.feedback === 'Good!') {
            // Keep "Good!" for a moment, then reset
        } else {
            newState.feedback = '腰を落としてください'
        }
    } else if (angle < 90) {
        newState.stage = 'down'
        newState.feedback = 'そのまま立ち上がってください'
    } else {
        newState.feedback = 'さらに深く腰を落としましょう'
    }

    return newState
}

export function analyzePushup(landmarks: Point[], state: ExerciseState): ExerciseState {
    const newState = { ...state }

    const leftShoulder = landmarks[11]
    const leftElbow = landmarks[13]
    const leftWrist = landmarks[15]
    const rightShoulder = landmarks[12]
    const rightElbow = landmarks[14]
    const rightWrist = landmarks[16]

    const leftVis = (leftShoulder.visibility! + leftElbow.visibility! + leftWrist.visibility!) / 3
    const rightVis = (rightShoulder.visibility! + rightElbow.visibility! + rightWrist.visibility!) / 3

    const isLeft = leftVis > rightVis
    const shoulder = isLeft ? leftShoulder : rightShoulder
    const elbow = isLeft ? leftElbow : rightElbow
    const wrist = isLeft ? leftWrist : rightWrist

    if (!arePointsVisible([shoulder, elbow, wrist])) {
        newState.feedback = '上半身（肩〜手首）をカメラに映してください'
        return newState
    }

    const angle = calculateAngle(shoulder, elbow, wrist)

    if (angle > 160) {
        if (newState.stage === 'down') {
            newState.reps += 1
            newState.feedback = 'Good!'
        }
        newState.stage = 'up'
        if (newState.feedback !== 'Good!') {
            newState.feedback = '体を沈めてください'
        }
    } else if (angle < 90) {
        newState.stage = 'down'
        newState.feedback = '体を押し上げてください'
    } else {
        newState.feedback = 'さらに深く肘を曲げましょう'
    }

    return newState
}

export function analyzeSitup(landmarks: Point[], state: ExerciseState): ExerciseState {
    const newState = { ...state }

    const leftShoulder = landmarks[11]
    const leftHip = landmarks[23]
    const leftKnee = landmarks[25]
    const rightShoulder = landmarks[12]
    const rightHip = landmarks[24]
    const rightKnee = landmarks[26]

    const leftVis = (leftShoulder.visibility! + leftHip.visibility! + leftKnee.visibility!) / 3
    const rightVis = (rightShoulder.visibility! + rightHip.visibility! + rightKnee.visibility!) / 3

    const isLeft = leftVis > rightVis
    const shoulder = isLeft ? leftShoulder : rightShoulder
    const hip = isLeft ? leftHip : rightHip
    const knee = isLeft ? leftKnee : rightKnee

    if (!arePointsVisible([shoulder, hip, knee])) {
        newState.feedback = '横向きになり、肩〜膝をカメラに映してください'
        return newState
    }

    const angle = calculateAngle(shoulder, hip, knee)

    if (angle > 140) { // Lying down
        if (newState.stage === 'up') {
            newState.reps += 1
            newState.feedback = 'Good!'
        }
        newState.stage = 'down'
        if (newState.feedback !== 'Good!') {
            newState.feedback = '上体を起こしてください'
        }
    } else if (angle < 70) { // Sitting up
        newState.stage = 'up'
        newState.feedback = 'ゆっくり背中を下ろしてください'
    }

    return newState
}

export function analyzePlank(landmarks: Point[], state: ExerciseState, currentTimeMs: number): ExerciseState {
    const newState = { ...state }

    // Check straight body alignment: Shoulder - Hip - Ankle
    const leftShoulder = landmarks[11]
    const leftHip = landmarks[23]
    const leftAnkle = landmarks[27]
    const rightShoulder = landmarks[12]
    const rightHip = landmarks[24]
    const rightAnkle = landmarks[28]

    const leftVis = (leftShoulder.visibility! + leftHip.visibility! + leftAnkle.visibility!) / 3
    const rightVis = (rightShoulder.visibility! + rightHip.visibility! + rightAnkle.visibility!) / 3

    const isLeft = leftVis > rightVis
    const shoulder = isLeft ? leftShoulder : rightShoulder
    const hip = isLeft ? leftHip : rightHip
    const ankle = isLeft ? leftAnkle : rightAnkle

    if (!arePointsVisible([shoulder, hip, ankle])) {
        newState.feedback = '横向きになり、全身をカメラに映してください'
        newState.stage = 'unknown'
        newState.lastFrameTimeMs = currentTimeMs // reset timer logic
        return newState
    }

    const angle = calculateAngle(shoulder, hip, ankle)

    // A perfect plank is generally 170-180 degrees. Allow some sag (down to 150)
    if (angle > 160 && angle <= 180) {
        if (newState.stage !== 'hold') {
            newState.stage = 'hold'
        }
        newState.feedback = '綺麗な姿勢です！キープして！'

        // Increment timer
        const deltaSec = (currentTimeMs - newState.lastFrameTimeMs) / 1000
        if (deltaSec > 0 && deltaSec < 1) { // Guard against massive jumps
            newState.holdTimeSec += deltaSec
        }
    } else if (angle <= 160) {
        newState.stage = 'unknown'
        newState.feedback = 'お尻が下がっています（または上がっています）。体を一直線に保ってください'
    }

    newState.lastFrameTimeMs = currentTimeMs
    return newState
}
