"use client";
import DriverForm from "@/components/organisms/DriverForm";
import { useParams } from "next/navigation";

export default function EditDriverPage() {
  const params = useParams();
  const id = params?.id as string;
  return <DriverForm mode="edit" id={id} />;
} 