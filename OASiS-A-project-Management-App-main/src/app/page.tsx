import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-washi">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-ink-900 sm:text-5xl">
            <span className="block text-indigo-600">OASiS</span>
            <span className="block mt-2">プロジェクト管理システム</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-ink-600 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            モダンで効率的なプロジェクト管理を実現します。チームの生産性を向上させ、プロジェクトを成功に導きましょう。
          </p>
          <div className="mt-10 flex justify-center">
            <div className="rounded-md shadow">
              <Link 
                href="/login" 
                className="btn btn-primary py-3 px-8"
              >
                ログイン
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 