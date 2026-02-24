import { login } from '@/app/auth/actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const params = await searchParams
    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
            <form
                className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
            >
                <h1 className="text-3xl font-bold mb-6 text-center text-white">おかえりなさい</h1>

                <label className="text-md text-gray-300" htmlFor="email">
                    メールアドレス
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-gray-800 border border-gray-700 text-white mb-4 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    name="email"
                    placeholder="you@example.com"
                    required
                />

                <label className="text-md text-gray-300" htmlFor="password">
                    パスワード
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-gray-800 border border-gray-700 text-white mb-6 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />

                <button
                    formAction={login}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 text-foreground mb-2 transition-colors font-medium"
                >
                    ログイン
                </button>

                <div className="mt-4 text-center text-sm text-gray-400">
                    アカウントをお持ちでないですか？{' '}
                    <a href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        招待URLから登録する
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
