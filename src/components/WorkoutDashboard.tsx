'use client'

import React, { useState } from 'react'
import PoseTracker from './PoseTracker'
import { ExerciseType } from '@/utils/fitness'
import { createGroup, joinGroup } from '@/app/workout/actions'
import { useRouter } from 'next/navigation'

interface FeedItem {
    id: string
    exercise_type: string
    reps: number
    duration_seconds: number
    created_at: string
    users: {
        display_name: string
        avatar_url: string | null
    }
}

interface GroupInfo {
    id: string
    name: string
}

export default function WorkoutDashboard({
    userName,
    groups,
    feed,
}: {
    userName: string
    groups: GroupInfo[]
    feed: FeedItem[]
}) {
    const router = useRouter()
    const [currentExercise, setCurrentExercise] = useState<ExerciseType>('squat')

    // Form States
    const [isCreating, setIsCreating] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const [joinError, setJoinError] = useState<string | null>(null)

    const exercises: { id: ExerciseType; label: string; icon: string }[] = [
        { id: 'squat', label: 'スクワット', icon: '🦵' },
        { id: 'pushup', label: '腕立て伏せ', icon: '💪' },
        { id: 'situp', label: '腹筋 (クランチ)', icon: '🔥' },
        { id: 'plank', label: 'プランク', icon: '⏱️' },
    ]

    const getExerciseLabel = (type: string) => {
        return exercises.find(e => e.id === type)?.label || type
    }

    const getTimeAgo = (dateStr: string) => {
        const min = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
        if (min < 60) return `${min}分前`
        const hours = Math.floor(min / 60)
        if (hours < 24) return `${hours}時間前`
        return `${Math.floor(hours / 24)}日前`
    }

    const handleCreateGroup = async (formData: FormData) => {
        setIsCreating(true)
        setCreateError(null)
        const result = await createGroup(formData)
        if (result.error) {
            setCreateError(result.error)
        } else {
            const form = document.getElementById('create-group-form') as HTMLFormElement
            if (form) form.reset()
            router.refresh()
        }
        setIsCreating(false)
    }

    const handleJoinGroup = async (formData: FormData) => {
        setIsJoining(true)
        setJoinError(null)
        const result = await joinGroup(formData)
        if (result.error) {
            setJoinError(result.error)
        } else {
            const form = document.getElementById('join-group-form') as HTMLFormElement
            if (form) form.reset()
            router.refresh()
        }
        setIsJoining(false)
    }

    return (
        <div className="w-full flex flex-col md:flex-row gap-6 p-4">
            {/* Left Column: Camera and AI Feedback */}
            <div className="flex-1 flex flex-col gap-4">

                {/* Exercise Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {exercises.map((ex) => (
                        <button
                            key={ex.id}
                            onClick={() => setCurrentExercise(ex.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl whitespace-nowrap transition-all duration-200 font-bold ${currentExercise === ex.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
                                }`}
                        >
                            <span className="text-xl">{ex.icon}</span>
                            {ex.label}
                        </button>
                    ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 tracking-wide">
                            <span className="relative flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                            </span>
                            AI TRACKING
                        </h2>
                        <div className="px-4 py-1.5 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-300 rounded-full text-sm font-bold border border-indigo-500/30 shadow-inner block">
                            TARGET: {exercises.find(e => e.id === currentExercise)?.label}
                        </div>
                    </div>

                    <PoseTracker exercise={currentExercise} />

                </div>
            </div>

            {/* Right Column: Squad Feed & Stats */}
            <div className="w-full md:w-80 flex flex-col gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">
                        Squad アクティビティ
                    </h3>

                    <div className="flex flex-col gap-5 flex-1">
                        {feed && feed.length > 0 ? feed.map(item => (
                            <div key={item.id} className="flex items-start gap-4 p-3 rounded-xl bg-gray-800/80 border border-gray-700 shadow-md">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg uppercase">
                                    {item.users.display_name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-200 leading-tight">
                                        <span className="font-bold text-white block mb-1">{item.users.display_name}</span>
                                        {getExerciseLabel(item.exercise_type)}を{' '}
                                        <span className="text-indigo-400 font-bold">
                                            {item.exercise_type === 'plank' ? `${item.duration_seconds}秒` : `${item.reps}回`}
                                        </span> 達成！🔥
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2 font-medium">{getTimeAgo(item.created_at)}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-sm text-center py-4">まだアクティビティがありません。最初の運動を始めましょう！</p>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-800/50">
                        <h4 className="text-sm font-bold text-gray-400 mb-3">あなたのSquad</h4>
                        {groups && groups.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {groups.map(g => (
                                    <span key={g.id} className="px-3 py-1 bg-gray-800 rounded-full text-xs text-indigo-300 border border-gray-700">
                                        {g.name} (ID: <span className="text-gray-500 font-mono">{g.id.split('-')[0]}...</span>)
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-red-400 mb-4 bg-red-900/20 p-2 rounded-md">
                                現在どのグループにも所属していません。
                            </p>
                        )}

                        <div className="flex flex-col gap-3 mt-4">
                            <form id="create-group-form" action={handleCreateGroup} className="flex flex-col gap-1">
                                <div className="flex gap-2">
                                    <input type="text" name="name" placeholder="新しいグループ名" required disabled={isCreating} className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50" />
                                    <button disabled={isCreating} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-md font-bold whitespace-nowrap transition disabled:opacity-50">
                                        {isCreating ? '作成中...' : '作成'}
                                    </button>
                                </div>
                                {createError && <p className="text-xs text-red-400 pl-1">{createError}</p>}
                            </form>
                            <form id="join-group-form" action={handleJoinGroup} className="flex flex-col gap-1">
                                <div className="flex gap-2">
                                    <input type="text" name="groupId" placeholder="グループID (UUID)" required disabled={isJoining} className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 text-sm focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50" />
                                    <button disabled={isJoining} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-md font-bold whitespace-nowrap transition disabled:opacity-50">
                                        {isJoining ? '参加中...' : '参加'}
                                    </button>
                                </div>
                                {joinError && <p className="text-xs text-red-400 pl-1">{joinError}</p>}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
