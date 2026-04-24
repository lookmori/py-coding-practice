import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">页面不存在</h1>
      <p className="text-gray-500 mb-8">你访问的页面不存在或已被移除。</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}
