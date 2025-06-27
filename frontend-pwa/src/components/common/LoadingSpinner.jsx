export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="spinner"></div>
        <p className="text-gray-600">로딩 중...</p>
      </div>
    </div>
  );
}
