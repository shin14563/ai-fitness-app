import { signup } from '@/app/auth/actions'

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string, token?: string }>
}) {
    const params = await searchParams
    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
            <form
                className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
            >
                <h1 className="text-3xl font-bold mb-2 text-center text-white">AI Fitness Squad に参加</h1>
                <p className="text-gray-400 text-center mb-6 text-sm">
                    登録には有効な招待トークンが必要です。
                </p>

                <label className="text-md text-gray-300" htmlFor="token">
                    招待トークン
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-gray-800 border border-gray-700 text-white mb-4 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                    name="token"
                    defaultValue={params?.token || ''}
                    placeholder="abc-123..."
                    required
                />

                <label className="text-md text-gray-300" htmlFor="displayName">
                    表示名 (ニックネーム)
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-gray-800 border border-gray-700 text-white mb-4 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                    name="displayName"
                    placeholder="フィットネス忍者"
                    required
                />

                <label className="text-md text-gray-300" htmlFor="email">
                    メールアドレス
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-gray-800 border border-gray-700 text-white mb-4 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                    name="email"
                    placeholder="you@example.com"
                    required
                />

                <label className="text-md text-gray-300" htmlFor="password">
                    パスワード
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-gray-800 border border-gray-700 text-white mb-6 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />

                <button
                    formAction={signup}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 text-foreground mb-2 transition-colors font-medium"
                >
                    アカウント作成
                </button>

                <div className="mt-4 text-center text-sm text-gray-400">
                    すでにアカウントをお持ちですか？{' '}
                    <a href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        ログインする
                    </a>
                </div>

                {params?.message && (
                    <p className="mt-4 p-4 bg-red-900/50 border border-red-800 text-red-200 text-center rounded-md">
                        {params.message}
                    </p>
                )}
            </form>
        </div>
    )
}
