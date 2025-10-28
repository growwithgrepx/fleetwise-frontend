// src/app/not-authorized/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext"; // Adjust import if needed

export default function NotAuthorizedPage() {
  const router = useRouter();
  const { isLoggedIn } = useUser(); // Or your auth hook/context

  const backLink = isLoggedIn ? "/dashboard" : "/login";
  const backText = isLoggedIn ? "Go back to Dashboard" : "Go to Login";

  return (
    <div className="flex flex-col h-[80vh] justify-center items-center text-center">
      <h1 className="text-3xl font-bold text-red-600">403 - Not Authorized</h1>
      <p className="text-gray-600 mt-2">
        You do not have permission to view this page.
      </p>
      <a
        href={backLink}
        className="mt-4 text-primary underline hover:text-primary/80 transition"
      >
        {backText}
      </a>
    </div>
  );
}
