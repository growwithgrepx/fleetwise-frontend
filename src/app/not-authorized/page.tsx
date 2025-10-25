export default function NotAuthorizedPage() {
  return (
    <div className="flex flex-col h-[80vh] justify-center items-center text-center">
      <h1 className="text-3xl font-bold text-red-600">403 - Not Authorized</h1>
      <p className="text-gray-600 mt-2">
        You do not have permission to view this page.
      </p>
      <a href="/dashboard" className="mt-4 text-primary underline">
        Go back to Dashboard
      </a>
    </div>
  );
}
