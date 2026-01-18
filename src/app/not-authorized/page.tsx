"use client";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { getUserRole } from "@/utils/roleUtils";

export default function NotAuthorizedPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useUser(); // make sure user includes role

  let backLink = "/login";
  let backText = "Go to Login";
  const role = getUserRole(user);
  if (isLoggedIn && role) {
    // ✅ Role-based redirect paths
    switch (role) {
      case "admin":
        backLink = "/dashboard";
        backText = "Go back to Dashboard";
        break;
      case "manager":
      case "accountant":
      case "driver":
      case "customer":
        backLink = "/jobs/dashboard/customer";
        backText = "Go back to Customer Dashboard";
        break;
      default:
        backLink = "/dashboard";
        backText = "Go back Home";
    }
  }

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
